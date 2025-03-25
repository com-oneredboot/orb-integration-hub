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
    env.filters['to_snake_case'] = to_snake_case
    return env

def to_camel_case(s: str) -> str:
    """Convert string to camelCase."""
    words = s.split('_')
    return words[0] + ''.join(word.title() for word in words[1:])

def to_pascal_case(s: str) -> str:
    """Convert string to PascalCase."""
    return ''.join(word.title() for word in s.split('_'))

def to_snake_case(s: str) -> str:
    """Convert string to snake_case."""
    return ''.join(word.lower() for word in s.split('_'))

def load_schemas() -> Dict[str, TableSchema]:
    """Load all schemas from index.yml."""
    try:
        # List all files in the schemas/enitites directory
        entities = [f for f in os.listdir(os.path.join(SCRIPT_DIR, 'entities')) if f.endswith('.yml')]
            
        schemas = {}
        for entity in entities:
            # Load the schema file
            with open(os.path.join(SCRIPT_DIR, 'entities', entity), 'r') as f:
                schema_data = yaml.safe_load(f)

            # extract table name from entity file name
            table = entity[table]
                
            # Extract attributes and keys
            attributes = []
            for attr_name, attr_data in schema_data['model']['attributes'].items():
                attr_type = 'N' if attr_data['type'] == 'number' else 'S'
                attributes.append(Attribute(name=attr_name, type=attr_type))
                
            # Get partition and sort keys
            partition_key = schema_data['model']['keys']['primary']['partition']
            sort_key = schema_data['model']['keys']['primary'].get('sort')
            
            # Create TableSchema with original snake_case table name
            schemas[table] = TableSchema(
                table=table,
                attributes=attributes,
                partition_key=partition_key,
                sort_key=sort_key
            )
            
        return schemas
        
    except Exception as e:
        logger.error(f'Failed to load schemas: {str(e)}')
        raise

def load_schema(schema_path: str) -> Dict[str, Any]:
    """
    Load and parse a schema file.
    
    Args:
        schema_path: Path to the schema file
        
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
            
        return schema
    except Exception as e:
        raise SchemaValidationError(f"Failed to load schema file {schema_path}: {str(e)}")

def generate_python_model(table: str, schema: TableSchema) -> None:
    """Generate Python model for a table."""
    try:
        # Get Jinja environment
        jinja_env = setup_jinja_env()
        template = jinja_env.get_template('python_model.jinja')
        
        # Generate model
        model_content = template.render(
            table=table,
            attributes=schema.attributes,
            partition_key=schema.partition_key,
            sort_key=schema.sort_key
        )
        
        # Write to file
        output_path = os.path.join(SCRIPT_DIR, '..', 'backend', 'src','models', f'{table}.py')
        write_file(output_path, model_content)
        logger.info(f'Generated Python model for {table}')
        
    except Exception as e:
        logger.error(f'Failed to generate Python model for {table}: {str(e)}')
        raise

def generate_typescript_model(table: str, schema: TableSchema) -> None:
    """Generate TypeScript model for a table."""
    try:
        # Get Jinja environment
        jinja_env = setup_jinja_env()
        template = jinja_env.get_template('typescript_model.jinja')
        
        # Generate model
        model_content = template.render(
            table=table,
            attributes=schema.attributes,
            partition_key=schema.partition_key,
            sort_key=schema.sort_key
        )
        
        # Write to file
        output_path = os.path.join(SCRIPT_DIR, '..', 'frontend', 'src', 'models', f'{table}.ts')
        write_file(output_path, model_content)
        logger.info(f'Generated TypeScript model for {table}')
        
    except Exception as e:
        logger.error(f'Failed to generate TypeScript model for {table}: {str(e)}')
        raise

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

def write_file(output_path: str, content: str) -> None:
    """
    Write content to file with consistent UTF-8 encoding without BOM.
    
    Args:
        output_path: Path to write the file to
        content: Content to write
    """
   
    # Write with explicit UTF-8 encoding
    with open(output_path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)


def main():
    """Main entry point for the schema generator."""
    try:
        # Set up Jinja environment
        jinja_env = setup_jinja_env()
        
        # Load schemas
        schemas = load_schemas()

        # Generate Python and TypeScript models
        for table, schema in schemas.items():
            generate_python_model(table, schema)
            generate_typescript_model(table, schema)
            
        # Generate base GraphQL schema
        graphql_template_path = os.path.join(SCRIPT_DIR, 'templates', 'graphql_schema.jinja')
        graphql_schema = generate_graphql_schema(schemas, graphql_template_path)
        
        # Generate timestamped schema file
        timestamped_schema = generate_timestamped_schema(graphql_schema)
        schema_output_path = os.path.join(SCRIPT_DIR, '..', 'backend', 'infrastructure', 'cloudformation', timestamped_schema)
        write_file(schema_output_path, graphql_schema)
        logger.info(f'Generated timestamped schema file: {timestamped_schema}')
        
        # Generate DynamoDB CloudFormation template
        dynamodb_template_path = os.path.join(SCRIPT_DIR, 'templates', 'dynamodb_cloudformation.jinja')
        dynamodb_output_path = os.path.join(SCRIPT_DIR, '..', 'backend', 'infrastructure', 'cloudformation', 'dynamodb.yml')
        generate_cloudformation_template(schemas, dynamodb_template_path, dynamodb_output_path)
        
        logger.info('Schema generation completed successfully')
        
    except Exception as e:
        logger.error(f'Schema generation failed: {str(e)}')
        sys.exit(1)

if __name__ == '__main__':
    main()