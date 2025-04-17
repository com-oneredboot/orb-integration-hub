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
import re
import copy

# 3rd party imports
import yaml
from jinja2 import Template, Environment, FileSystemLoader, select_autoescape
from pydantic import BaseModel, Field
from pydantic import validator
from pydantic import field_validator

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

    @field_validator('type')
    @classmethod
    def validate_index_type(cls, v):
        if v not in ['GSI', 'LSI']:
            raise ValueError('Index type must be either GSI or LSI')
        return v

    @field_validator('projection_type')
    @classmethod
    def validate_projection_type(cls, v):
        if v not in ['ALL', 'KEYS_ONLY', 'INCLUDE']:
            raise ValueError('Projection type must be ALL, KEYS_ONLY, or INCLUDE')
        return v

    @field_validator('projected_attributes')
    @classmethod
    def validate_projected_attributes(cls, v, info):
        if info.data.get('projection_type') == 'INCLUDE' and not v:
            raise ValueError('projected_attributes is required when projection_type is INCLUDE')
        return v

    @field_validator('name')
    @classmethod
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
    type: str
    description: str = ""
    required: bool = True
    enum_type: Optional[str] = None
    enum_values: Optional[List[str]] = None

@dataclass
class TableSchema:
    """Table schema definition."""
    table: str
    attributes: List[Attribute]
    partition_key: str
    sort_key: str = 'None'  # Default to 'None' string
    secondary_indexes: Optional[List[Dict[str, Any]]] = None

    def __post_init__(self):
        """Post-initialization validation and defaults."""
        if self.sort_key is None:
            self.sort_key = 'None'
        if self.secondary_indexes is None:
            self.secondary_indexes = []

def to_python_type(attr_type: str) -> str:
    """Convert schema type to Python type."""
    type_mapping = {
        'S': 'str',
        'N': 'float',
        'BOOL': 'bool',
        'L': 'List[str]',
        'M': 'Dict[str, Any]',
        'NULL': 'None',
        'B': 'bytes'
    }
    return type_mapping.get(attr_type, 'str')

def to_typescript_type(attr_type: str) -> str:
    """Convert schema type to TypeScript type."""
    type_mapping = {
        'string': 'string',
        'number': 'number',
        'boolean': 'boolean',
        'array': 'string[]',
        'object': 'Record<string, any>',
        'timestamp': 'number'
    }
    return type_mapping.get(attr_type.lower(), 'string')

def to_dynamodb_type(attr_type: str) -> str:
    """Convert schema type to DynamoDB attribute type."""
    type_mapping = {
        'string': 'S',
        'number': 'N',
        'boolean': 'S',  # DynamoDB doesn't have a boolean type
        'array': 'S',    # DynamoDB doesn't have an array type
        'object': 'S',   # DynamoDB doesn't have an object type
        'timestamp': 'N' # Timestamps are stored as numbers
    }
    return type_mapping.get(attr_type.lower(), 'S')

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
    
    # Add case conversion filters
    env.filters['to_camel_case'] = to_camel_case
    env.filters['to_pascal_case'] = to_pascal_case
    env.filters['to_snake_case'] = to_snake_case
    env.filters['to_kebab_case'] = to_kebab_case
    env.filters['to_python_type'] = to_python_type
    env.filters['to_typescript_type'] = to_typescript_type
    env.filters['to_dynamodb_type'] = to_dynamodb_type
    return env

def to_camel_case(s: str) -> str:
    """Convert string to camelCase."""
    # First convert to PascalCase
    pascal = to_pascal_case(s)
    # Then lowercase the first character
    return pascal[0].lower() + pascal[1:]

def to_pascal_case(s: str) -> str:
    """Convert string to PascalCase."""
    # First split by underscores and hyphens
    words = re.split(r'[_-]', s)
    # Then capitalize each word and join them
    return ''.join(word.capitalize() for word in words)

def to_snake_case(s: str) -> str:
    """Convert string to snake_case."""
    # Handle camelCase and PascalCase
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', s)
    s2 = re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1)
    # Convert to lowercase and replace any remaining spaces with underscores
    return re.sub(r'[-\s]', '_', s2).lower()

def to_kebab_case(s: str) -> str:
    """Convert string to kebab-case."""
    # First convert to snake_case
    snake = to_snake_case(s)
    # Then replace underscores with hyphens
    return snake.replace('_', '-')

def validate_case_conventions(schema: Dict[str, Any], file_path: str) -> None:
    """Validate case conventions in schema files."""
    # Validate file name is snake_case
    file_name = os.path.basename(file_path)
    if not re.match(r'^[a-z][a-z0-9_]*(_[a-z0-9]+)*\.yml$', file_name):
        raise SchemaValidationError(f"Schema file name '{file_name}' must be in snake_case")

    # Validate table name is PascalCase
    if not re.match(r'^[A-Z][a-zA-Z0-9]*$', schema['table']):
        raise SchemaValidationError(f"Table name '{schema['table']}' must be in PascalCase")

    # Validate index names are kebab-case
    if 'model' in schema and 'keys' in schema['model'] and 'secondary' in schema['model']['keys']:
        for index in schema['model']['keys']['secondary']:
            if not re.match(r'^[a-z][a-z0-9]*(-[a-z0-9]+)*$', index['name']):
                raise SchemaValidationError(f"Index name '{index['name']}' must be in kebab-case")

    # Validate attribute names are snake_case
    if 'model' in schema and 'attributes' in schema['model']:
        for attr_name in schema['model']['attributes']:
            if not re.match(r'^[a-z][a-z0-9]*(_[a-z0-9]+)*$', attr_name):
                raise SchemaValidationError(f"Attribute name '{attr_name}' must be in snake_case")

def load_schemas() -> Dict[str, TableSchema]:
    """Load all schemas from index.yml."""
    try:
        # List all files in the schemas/entities directory
        entities = [f for f in os.listdir(os.path.join(SCRIPT_DIR, 'entities')) if f.endswith('.yml')]
            
        schemas = {}
        for entity in entities:
            print(f"Reading entity: {entity}")
            # Load the schema file
            with open(os.path.join(SCRIPT_DIR, 'entities', entity), 'r') as f:
                schema_data = yaml.safe_load(f)

                # Use the table name from the schema file
                table = schema_data['table']
                print(f"table: {table}")
                
            # Extract attributes and keys
            attributes = []
            for attr_name, attr_data in schema_data['model']['attributes'].items():
                # Get basic attribute info
                attr_type = attr_data['type']
                description = attr_data.get('description', '')
                required = attr_data.get('required', True)
                
                # Get enum info if present
                enum_type = attr_data.get('enum_type')
                enum_values = attr_data.get('enum_values', []) if enum_type else None
                
                attributes.append(Attribute(
                    name=attr_name,
                    type=attr_type,
                    description=description,
                    required=required,
                    enum_type=enum_type,
                    enum_values=enum_values
                ))
                
            # Get partition and sort keys
            partition_key = schema_data['model']['keys']['primary']['partition']
            sort_key = schema_data['model']['keys'].get('sort', 'None')  # Default to 'None' string
            
            # Get secondary indexes
            secondary_indexes = []
            if 'secondary' in schema_data['model']['keys']:
                for index in schema_data['model']['keys']['secondary']:
                    secondary_indexes.append({
                        'name': index['name'],
                        'type': index['type'],
                        'partition': index['partition'],
                        'sort': index.get('sort', 'None'),  # Default to 'None' string
                        'projection_type': index.get('projection_type', 'ALL'),
                        'projected_attributes': index.get('projected_attributes')
                    })
            
            # Create TableSchema
            schemas[table] = TableSchema(
                table=table,
                attributes=attributes,
                partition_key=partition_key,
                sort_key=sort_key,
                secondary_indexes=secondary_indexes
            )
            
        return schemas
        
    except Exception as e:
        logger.error(f'Failed to load schemas: {str(e)}')
        raise

def load_schema(schema_path: str) -> Dict[str, Any]:
    """Load and validate a schema file."""
    try:
        with open(schema_path, 'r') as f:
            schema = yaml.safe_load(f)
        
        # Validate case conventions
        validate_case_conventions(schema, schema_path)
        
        return schema
    except Exception as e:
        raise SchemaValidationError(f"Failed to load schema {schema_path}: {str(e)}")

def generate_python_model(table: str, schema: TableSchema) -> None:
    """Generate Python model for a table."""
    try:
        # Get Jinja environment
        jinja_env = setup_jinja_env()
        template = jinja_env.get_template('python_model.jinja')
        
        # Generate model
        model_content = template.render(schema=schema)
        
        # Write to file
        output_path = os.path.join(SCRIPT_DIR, '..', 'backend', 'src', 'models', f'{to_snake_case(table)}.py')
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
        
        # Process attributes to include enum values
        processed_schema = copy.deepcopy(schema)
        for attr in processed_schema.attributes:
            if attr.enum_type and not attr.enum_values:
                # If enum type is specified but no values, try to get them from enums.yml
                enums_path = os.path.join(SCRIPT_DIR, 'core', 'enums.yml')
                if os.path.exists(enums_path):
                    with open(enums_path, 'r') as f:
                        enums_data = yaml.safe_load(f)
                        if attr.enum_type in enums_data:
                            attr.enum_values = enums_data[attr.enum_type]
                        else:
                            logger.warning(f"Enum type {attr.enum_type} not found in enums.yml")
        
        # Generate model
        model_content = template.render(schema=processed_schema)
        
        # Convert table name to PascalCase for TypeScript file name
        file_name = to_pascal_case(table)
        
        # Write to file
        output_path = os.path.join(SCRIPT_DIR, '..', 'frontend', 'src', 'models', f'{file_name}.ts')
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
        logger.info(f"Starting CloudFormation template generation with template: {template_path}")
        # Get Jinja environment
        jinja_env = setup_jinja_env()
        template = jinja_env.get_template(os.path.basename(template_path))
        
        # Process schemas into the format expected by the template
        processed_schemas = {}
        for table_name, schema in schemas.items():
            logger.info(f"Processing schema for table: {table_name}")
            logger.info(f"Schema data: table={schema.table}, partition_key={schema.partition_key}, sort_key={schema.sort_key}")
            
            # Process keys
            keys = [
                {
                    'name': schema.partition_key,
                    'type': 'HASH',
                    'attr_type': 'S'  # Default to string type
                }
            ]
            if schema.sort_key and schema.sort_key != 'None':
                keys.append({
                    'name': schema.sort_key,
                    'type': 'RANGE',
                    'attr_type': 'S'  # Default to string type
                })
            
            # Process indexes
            indexes = []
            if schema.secondary_indexes:
                for index in schema.secondary_indexes:
                    index_keys = [
                        {
                            'name': index['partition'],
                            'type': 'HASH'
                        }
                    ]
                    if index.get('sort'):
                        index_keys.append({
                            'name': index['sort'],
                            'type': 'RANGE'
                        })
                    indexes.append({
                        'name': index['name'],
                        'keys': index_keys,
                        'projection_type': index.get('projection_type', 'ALL'),
                        'projected_attributes': index.get('projected_attributes')
                    })
            
            processed_schemas[schema.table] = {
                'table': schema.table,
                'partition_key': schema.partition_key,
                'sort_key': schema.sort_key,
                'indexes': indexes
            }
            logger.info(f"Processed schema: {processed_schemas[schema.table]}")
        
        # Generate the template content
        logger.info("Rendering template...")
        template_content = template.render(schemas=processed_schemas)
        logger.info("Template rendered successfully")
        
        # Write the content
        with open(output_path, 'w') as f:
            f.write(template_content)
            
        logger.info('Generated DynamoDB CloudFormation template')
        
    except Exception as e:
        logger.error(f'Failed to generate CloudFormation template: {str(e)}')
        logger.error(f'Exception type: {type(e)}')
        import traceback
        logger.error(f'Traceback: {traceback.format_exc()}')
        raise

def generate_appsync_template(schemas: Dict[str, TableSchema], output_path: str) -> None:
    """Generate AppSync CloudFormation template."""
    try:
        logger.info("Starting AppSync template generation")
        # Get Jinja environment
        jinja_env = setup_jinja_env()
        template = jinja_env.get_template('appsync_cloudformation.jinja')

        # Process schemas into the format expected by the template
        processed_schemas = {}
        for table_name, schema in schemas.items():
            logger.info(f"Processing schema for table: {table_name}")
            logger.info(f"Schema data: table={schema.table}, partition_key={schema.partition_key}, sort_key={schema.sort_key}")
            processed_schemas[schema.table] = {
                'table': schema.table,
                'attributes': schema.attributes,
                'partition_key': schema.partition_key,
                'sort_key': schema.sort_key
            }
            logger.info(f"Processed schema: {processed_schemas[schema.table]}")

        # Generate template
        logger.info("Rendering template...")
        rendered = template.render(schemas=processed_schemas)
        logger.info("Template rendered successfully")

        # Write the processed template
        with open(output_path, 'w', newline='\n', encoding='utf-8') as f:
            f.write(rendered)

        logger.info('Generated AppSync CloudFormation template')
    except Exception as e:
        logger.error(f'Failed to generate AppSync CloudFormation template: {str(e)}')
        logger.error(f'Exception type: {type(e)}')
        import traceback
        logger.error(f'Traceback: {traceback.format_exc()}')
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
        schema_output_path = os.path.join(SCRIPT_DIR, '..', 'infrastructure', 'cloudformation', timestamped_schema)
        write_file(schema_output_path, graphql_schema)
        logger.info(f'Generated timestamped schema file: {timestamped_schema}')
        
        # Generate DynamoDB CloudFormation template
        dynamodb_template_path = os.path.join(SCRIPT_DIR, 'templates', 'dynamodb_cloudformation.jinja')
        dynamodb_output_path = os.path.join(SCRIPT_DIR, '..', 'infrastructure', 'cloudformation', 'dynamodb.yml')
        generate_cloudformation_template(schemas, dynamodb_template_path, dynamodb_output_path)
        
        # Generate AppSync CloudFormation template
        appsync_output_path = os.path.join(SCRIPT_DIR, '..', 'infrastructure', 'cloudformation', 'appsync.yml')
        generate_appsync_template(schemas, appsync_output_path)
        
        logger.info('Schema generation completed successfully')
        
    except Exception as e:
        logger.error(f'Schema generation failed: {str(e)}')
        sys.exit(1)

if __name__ == '__main__':
    main()