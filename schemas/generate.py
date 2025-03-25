# files: schemas/generate.py
# author: Corey Dale Peters
# date: 2025-02-20
# description: This file is used to generate TypeScript, Python, and GraphQL schema models from schema files
# defined in index.yml. The generator follows these conventions:

# Standard library imports
import os
import sys
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
from dataclasses import dataclass

# 3rd party imports
import yaml
from jinja2 import Template, Environment, FileSystemLoader, select_autoescape
from pydantic import BaseModel, Field
from pydantic import validator

# Set up logging
logger = logging.getLogger('schema_generator')
logger.setLevel(logging.INFO)

# Create handlers
console_handler = logging.StreamHandler(sys.stdout)
file_handler = logging.FileHandler('schema_generator.log')

# Create formatters and add to handlers
log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
console_handler.setFormatter(logging.Formatter(log_format))
file_handler.setFormatter(logging.Formatter(log_format))

# Add handlers to logger
logger.addHandler(console_handler)
logger.addHandler(file_handler)

# Get the directory where this script is located
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

class SchemaValidationError(Exception):
    """Raised when schema validation fails"""
    pass

class SchemaField(BaseModel):
    """Schema field definition"""
    type: str
    required: bool = False
    description: Optional[str] = None
    validation: Optional[Dict[str, Any]] = None
    enum_type: Optional[str] = None
    items: Optional[Dict[str, Any]] = None

class SchemaIndex(BaseModel):
    """Schema index definition"""
    type: str = Field(..., description="Type of index (GSI or LSI)")
    partition: str = Field(..., description="Partition key for the index")
    sort: Optional[str] = Field(None, description="Sort key for the index")
    name: Optional[str] = Field(None, description="Name of the index")
    description: Optional[str] = Field(None, description="Description of the index")
    projection_type: str = Field("ALL", description="Projection type: ALL, KEYS_ONLY, or INCLUDE")
    projected_attributes: Optional[List[str]] = Field(None, description="List of attributes to project when projection_type is INCLUDE")

    @validator('type')
    def validate_index_type(cls, v):
        if v not in ['GSI', 'LSI']:
            raise ValueError('Index type must be either GSI or LSI')
        return v

    @validator('projection_type')
    def validate_projection_type(cls, v):
        if v not in ['ALL', 'KEYS_ONLY', 'INCLUDE']:
            raise ValueError('Projection type must be ALL, KEYS_ONLY, or INCLUDE')
        return v

    @validator('projected_attributes')
    def validate_projected_attributes(cls, v, values):
        if 'projection_type' in values and values['projection_type'] == 'INCLUDE' and not v:
            raise ValueError('projected_attributes is required when projection_type is INCLUDE')
        return v

    @validator('name')
    def validate_index_name(cls, v):
        if v:
            # DynamoDB index name requirements:
            # - 3-255 characters long
            # - Only alphanumeric characters, underscores, and hyphens
            # - Must start with a letter
            if not (3 <= len(v) <= 255):
                raise ValueError('Index name must be between 3 and 255 characters')
            if not v[0].isalpha():
                raise ValueError('Index name must start with a letter')
            if not all(c.isalnum() or c in ['_', '-'] for c in v):
                raise ValueError('Index name can only contain alphanumeric characters, underscores, and hyphens')
        return v

class SchemaModel(BaseModel):
    """Schema model definition"""
    version: str
    keys: Dict[str, Any]
    attributes: Dict[str, SchemaField]
    indexes: Optional[List[SchemaIndex]] = None

@dataclass
class Attribute:
    name: str
    type: str  # 'S' for string, 'N' for number

@dataclass
class TableSchema:
    table_name: str
    attributes: List[Attribute]
    partition_key: str
    sort_key: Optional[str] = None

def setup_jinja_env() -> Environment:
    """
    Set up the Jinja environment with custom filters and globals.
    
    Returns:
        Configured Jinja environment
    """
    env = Environment(
        loader=FileSystemLoader(os.path.join(SCRIPT_DIR, 'templates')),
        autoescape=select_autoescape(['html', 'xml']),
        trim_blocks=True,
        lstrip_blocks=True
    )
    
    # Add custom filters
    def regex_search(value: str, pattern: str, group: int = 0) -> str:
        """Extract content using regex pattern"""
        import re
        if value is None:
            return ""
        match = re.search(pattern, value, re.DOTALL)
        if match and group in match.groups():
            group_index = match.groups().index(group) + 1
            return match.group(group_index)
        return ""
    
    env.filters['regex_search'] = regex_search
    
    # Add custom globals
    env.globals['now'] = lambda: datetime.now().isoformat()
    
    env.filters['to_camel_case'] = to_camel_case
    env.filters['to_pascal_case'] = to_pascal_case
    
    return env

def validate_schema(schema: Dict[str, Any]) -> None:
    """
    Validate schema structure and content.
    
    Args:
        schema: Schema dictionary to validate
        
    Raises:
        SchemaValidationError: If validation fails
    """
    try:
        # Validate required top-level keys
        required_keys = ['version', 'table_name', 'model', 'resource_name']
        for key in required_keys:
            if key not in schema:
                raise SchemaValidationError(f"Missing required key: {key}")
        
        # Validate model structure
        model = schema['model']
        if 'keys' not in model:
            raise SchemaValidationError("Model missing required 'keys' section")
        
        # Validate primary key
        if 'primary' not in model['keys']:
            raise SchemaValidationError("Model missing required 'primary' key")
        
        # Validate attributes
        if 'attributes' not in model:
            raise SchemaValidationError("Model missing required 'attributes' section")
        
        # Get all attribute names
        attribute_names = set(model['attributes'].keys())
        
        # Validate primary key fields exist in attributes
        primary_key = model['keys']['primary']
        if 'partition' in primary_key and primary_key['partition'] not in attribute_names:
            raise SchemaValidationError(f"Primary partition key '{primary_key['partition']}' not found in attributes")
        if 'sort' in primary_key and primary_key['sort'] not in attribute_names:
            raise SchemaValidationError(f"Primary sort key '{primary_key['sort']}' not found in attributes")
        
        # Validate secondary indexes
        if 'secondary' in model['keys']:
            for idx in model['keys']['secondary']:
                # Validate index name
                if 'name' not in idx:
                    raise SchemaValidationError("Secondary index missing required 'name' field")
                
                # Validate partition key exists in attributes
                if 'partition' not in idx or idx['partition'] not in attribute_names:
                    raise SchemaValidationError(f"Index '{idx['name']}' partition key '{idx.get('partition', '')}' not found in attributes")
                
                # Validate sort key exists in attributes if specified
                if 'sort' in idx and idx['sort'] not in attribute_names:
                    raise SchemaValidationError(f"Index '{idx['name']}' sort key '{idx['sort']}' not found in attributes")
                
                # Validate projected attributes exist if specified
                if 'projection_type' in idx and idx['projection_type'] == 'INCLUDE':
                    if 'projected_attributes' not in idx:
                        raise SchemaValidationError(f"Index '{idx['name']}' missing projected_attributes for INCLUDE projection")
                    for attr in idx['projected_attributes']:
                        if attr not in attribute_names:
                            raise SchemaValidationError(f"Index '{idx['name']}' projected attribute '{attr}' not found in attributes")
        
        # Validate each attribute
        for attr_name, attr_info in model['attributes'].items():
            if 'type' not in attr_info:
                raise SchemaValidationError(f"Attribute '{attr_name}' missing required 'type'")
            
            # Validate array items if present
            if attr_info['type'] == 'array' and 'items' in attr_info:
                if 'type' not in attr_info['items']:
                    raise SchemaValidationError(f"Array attribute '{attr_name}' items missing required 'type'")
    
    except Exception as e:
        raise SchemaValidationError(f"Schema validation failed: {str(e)}")

def process_field_type(field_name: str, field_info: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process field type based on field name and configuration.
    
    Args:
        field_name: The name of the field
        field_info: The field's configuration info
        
    Returns:
        Modified field info with the correct type
    """
    result = field_info.copy()
    
    # Special handling for timestamp fields
    timestamp_fields = ['created_at', 'updated_at', 'deleted_at', 'last_modified', 'timestamp']
    if field_name in timestamp_fields or field_name.endswith('_at') or field_name.endswith('_date'):
        result['type'] = 'timestamp'
        if 'description' not in result:
            result['description'] = 'ISO 8601 formatted timestamp (e.g., 2025-03-07T16:23:17.488Z)'
    
    return result

def load_schema(schema_path: str, table_name: str = None) -> Dict[str, Any]:
    """
    Load and parse a schema file.
    
    Args:
        schema_path: Path to the schema file
        table_name: Optional table name from index.yml to override the one in the schema file
        
    Returns:
        Parsed schema dictionary
        
    Raises:
        SchemaValidationError: If schema file cannot be loaded or parsed
    """
    try:
        full_path = os.path.join(SCRIPT_DIR, schema_path)
        with open(full_path, 'r') as f:
            schema = yaml.safe_load(f)
            
        # Ensure we have a dictionary
        if not isinstance(schema, dict):
            raise SchemaValidationError(f"Schema file {schema_path} did not load as a dictionary")
            
        # Ensure required top-level keys
        if 'version' not in schema or 'table' not in schema or 'model' not in schema:
            raise SchemaValidationError(f"Schema file {schema_path} missing required top-level keys")
            
        # Ensure model is a dictionary
        if not isinstance(schema['model'], dict):
            raise SchemaValidationError(f"Schema file {schema_path} model is not a dictionary")
            
        # Ensure keys section exists and is a dictionary
        if 'keys' not in schema['model'] or not isinstance(schema['model']['keys'], dict):
            raise SchemaValidationError(f"Schema file {schema_path} missing or invalid keys section")
            
        # Ensure primary key exists and is a dictionary
        if 'primary' not in schema['model']['keys'] or not isinstance(schema['model']['keys']['primary'], dict):
            raise SchemaValidationError(f"Schema file {schema_path} missing or invalid primary key")
            
        # Ensure partition key exists
        if 'partition' not in schema['model']['keys']['primary']:
            raise SchemaValidationError(f"Schema file {schema_path} missing partition key")
            
        # Store the original table name for DynamoDB table names
        schema['table_name'] = table_name if table_name else schema['table']
        # Transform the table name for CloudFormation resource names
        schema['table'] = to_pascal_case(schema['table_name'])
            
        return schema
    except Exception as e:
        raise SchemaValidationError(f"Failed to load schema file {schema_path}: {str(e)}")

def load_index() -> Dict[str, Any]:
    """
    Load and parse the index.yml file.
    
    Returns:
        Parsed index dictionary
        
    Raises:
        SchemaValidationError: If index file cannot be loaded or parsed
    """
    try:
        index_path = os.path.join(SCRIPT_DIR, 'index.yml')
        with open(index_path, 'r') as f:
            index = yaml.safe_load(f)
        return index
    except Exception as e:
        raise SchemaValidationError(f"Failed to load index file: {str(e)}")

def write_file(output_path: str, content: str) -> None:
    """
    Write content to file with consistent UTF-8 encoding without BOM.
    
    Args:
        output_path: Path to write the file to
        content: Content to write
    """
    # Ensure content starts with no BOM and no extra whitespace
    content = content.lstrip('\ufeff').lstrip()
    
    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Write with explicit UTF-8 encoding
    with open(output_path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)

def generate_python_model(table_name: str, schema: TableSchema) -> None:
    """Generate Python model for a table."""
    try:
        # Get Jinja environment
        jinja_env = setup_jinja_env()
        template = jinja_env.get_template('python_model.jinja')
        
        # Generate model
        model_content = template.render(
            table_name=table_name,
            attributes=schema.attributes,
            partition_key=schema.partition_key,
            sort_key=schema.sort_key
        )
        
        # Write to file
        output_path = os.path.join(SCRIPT_DIR, '..', 'backend', 'models', f'{table_name}.py')
        write_file(output_path, model_content)
        logger.info(f'Generated Python model for {table_name}')
        
    except Exception as e:
        logger.error(f'Failed to generate Python model for {table_name}: {str(e)}')
        raise

def generate_typescript_model(table_name: str, schema: TableSchema) -> None:
    """Generate TypeScript model for a table."""
    try:
        # Get Jinja environment
        jinja_env = setup_jinja_env()
        template = jinja_env.get_template('typescript_model.jinja')
        
        # Generate model
        model_content = template.render(
            table_name=table_name,
            attributes=schema.attributes,
            partition_key=schema.partition_key,
            sort_key=schema.sort_key
        )
        
        # Write to file
        output_path = os.path.join(SCRIPT_DIR, '..', 'frontend', 'src', 'models', f'{table_name}.ts')
        write_file(output_path, model_content)
        logger.info(f'Generated TypeScript model for {table_name}')
        
    except Exception as e:
        logger.error(f'Failed to generate TypeScript model for {table_name}: {str(e)}')
        raise

def map_to_graphql_type(schema_type: str) -> str:
    """Map schema types to GraphQL types."""
    type_mapping = {
        'string': 'String',
        'number': 'Float',
        'boolean': 'Boolean',
        'array': '[String]',
        'object': 'AWSJSON',
        'timestamp': 'AWSDateTime'
    }
    return type_mapping.get(schema_type.lower(), 'String')

def to_camel_case(s: str) -> str:
    """Convert string to camelCase."""
    words = s.split('_')
    return words[0] + ''.join(word.title() for word in words[1:])

def to_pascal_case(s: str) -> str:
    """Convert string to PascalCase."""
    return ''.join(word.title() for word in s.split('_'))

def generate_graphql_schema(schemas: Dict[str, TableSchema], template_path: str) -> str:
    """Generate GraphQL schema from table schemas."""
    try:
        # Get Jinja environment
        jinja_env = setup_jinja_env()
        template = jinja_env.get_template(os.path.basename(template_path))
        
        # Generate schema
        schema_content = template.render(schemas=schemas)
        return schema_content
        
    except Exception as e:
        logger.error(f'Failed to generate GraphQL schema: {str(e)}')
        raise

def generate_timestamped_schema(schema_content: str) -> str:
    """Generate a timestamped schema file name."""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    return f'appsync_{timestamp}.graphql'

def load_schemas() -> Dict[str, TableSchema]:
    """Load all schemas from index.yml."""
    try:
        # Load index.yml
        with open(os.path.join(SCRIPT_DIR, 'index.yml'), 'r') as f:
            index = yaml.safe_load(f)
            
        schemas = {}
        for table in index['schemaRegistry']['tables']:
            table_name = table['name']
            schema_path = table['path']
            
            logger.info(f'Processing table: {table_name}')
            
            # Load schema file
            with open(os.path.join(SCRIPT_DIR, schema_path), 'r') as f:
                schema_data = yaml.safe_load(f)
                
            # Extract attributes and keys
            attributes = []
            for attr_name, attr_data in schema_data['model']['attributes'].items():
                attr_type = 'N' if attr_data['type'] == 'number' else 'S'
                attributes.append(Attribute(name=attr_name, type=attr_type))
                
            # Get partition and sort keys
            partition_key = schema_data['model']['keys']['primary']['partition']
            sort_key = schema_data['model']['keys']['primary'].get('sort')
            
            # Create TableSchema with original snake_case table name
            schemas[table_name] = TableSchema(
                table_name=table_name,  # Keep original snake_case for DynamoDB table name
                attributes=attributes,
                partition_key=partition_key,
                sort_key=sort_key
            )
            
        return schemas
        
    except Exception as e:
        logger.error(f'Failed to load schemas: {str(e)}')
        raise

def generate_cloudformation_template(schemas: Dict[str, TableSchema], template_path: str, output_path: str) -> None:
    """Generate a CloudFormation template for DynamoDB tables."""
    try:
        # Get Jinja environment
        jinja_env = setup_jinja_env()
        template = jinja_env.get_template(os.path.basename(template_path))
        
        # Generate the template content
        template_content = template.render(schemas=schemas)
        
        # Process the template to fix formatting
        fixed_lines = []
        current_table = None
        in_attributes = False
        in_key_schema = False
        
        for line in template_content.split('\n'):
            stripped = line.strip()
            
            # Track when we enter a new table definition
            if 'Type: AWS::DynamoDB::Table' in line:
                current_table = True
                in_attributes = False
                in_key_schema = False
                fixed_lines.append(line)
                continue
                
            # Track attribute definitions section
            if current_table and 'AttributeDefinitions:' in stripped:
                in_attributes = True
                fixed_lines.append('      AttributeDefinitions:')
                continue
                
            # Track key schema section    
            if current_table and 'KeySchema:' in stripped:
                in_key_schema = True
                in_attributes = False
                fixed_lines.append('      KeySchema:')
                continue
                
            # Handle attribute definition entries
            if in_attributes and 'AttributeName:' in stripped:
                name = stripped.split(':')[1].strip()
                fixed_lines.append(f'        - AttributeName: {name}')
                fixed_lines.append('          AttributeType: S')
                continue
                
            # Handle key schema entries    
            if in_key_schema and 'AttributeName:' in stripped:
                name = stripped.split(':')[1].strip()
                fixed_lines.append(f'        - AttributeName: {name}')
                fixed_lines.append('          KeyType: HASH')
                continue
                
            # Reset tracking when we exit a section
            if stripped == '':
                in_attributes = False
                in_key_schema = False
                
            # Add other lines as is
            if not (in_attributes or in_key_schema) or 'Properties:' in line:
                fixed_lines.append(line)
                
        # Write the fixed content
        with open(output_path, 'w') as f:
            f.write('\n'.join(fixed_lines))
            
        logger.info('Generated DynamoDB CloudFormation template')
        
    except Exception as e:
        logger.error(f'Failed to generate CloudFormation template: {str(e)}')
        raise

def main():
    """Main entry point for the schema generator."""
    try:
        # Set up Jinja environment
        jinja_env = setup_jinja_env()
        
        # Load schemas from index.yml
        schemas = load_schemas()
        
        # Generate Python and TypeScript models
        for table_name, schema in schemas.items():
            generate_python_model(table_name, schema)
            generate_typescript_model(table_name, schema)
            
        # Generate base GraphQL schema
        graphql_template_path = os.path.join(SCRIPT_DIR, 'templates', 'graphql_schema.jinja')
        graphql_schema = generate_graphql_schema(schemas, graphql_template_path)
        
        # Generate timestamped schema file
        timestamped_schema = generate_timestamped_schema(graphql_schema)
        schema_output_path = os.path.join(SCRIPT_DIR, '..', 'backend', 'infrastructure', 'cloudformation', timestamped_schema)
        write_file(schema_output_path, graphql_schema)
        logger.info(f'Generated timestamped schema file: {timestamped_schema}')
        
        # Generate DynamoDB CloudFormation template
        dynamodb_template_path = os.path.join(SCRIPT_DIR, 'templates', 'dynamodb_cloudformation_base.jinja')
        dynamodb_output_path = os.path.join(SCRIPT_DIR, '..', 'backend', 'infrastructure', 'cloudformation', 'dynamodb.yml')
        generate_cloudformation_template(schemas, dynamodb_template_path, dynamodb_output_path)
        
        logger.info('Schema generation completed successfully')
        
    except Exception as e:
        logger.error(f'Schema generation failed: {str(e)}')
        sys.exit(1)

if __name__ == '__main__':
    main()