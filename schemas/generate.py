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
import shutil

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
    try:
        jinja_env = setup_jinja_env()
        template = jinja_env.get_template('python_model.jinja')
        model_content = template.render(schema=schema)
        file_name = f'{table}.model.py'
        output_path = os.path.join(SCRIPT_DIR, '..', 'backend', 'src', 'core', 'models', file_name)
        write_file(output_path, model_content)
        logger.info(f'Generated Python model for {table}')
    except Exception as e:
        logger.error(f'Failed to generate Python model for {table}: {str(e)}')
        raise

def generate_typescript_model(table: str, schema: TableSchema) -> None:
    try:
        jinja_env = setup_jinja_env()
        template = jinja_env.get_template('typescript_model.jinja')
        processed_schema = copy.deepcopy(schema)
        for attr in processed_schema.attributes:
            attr.type = to_typescript_type(attr.type)
            if attr.enum_type and not attr.enum_values:
                enums_path = os.path.join(SCRIPT_DIR, 'core', 'enums.yml')
                if os.path.exists(enums_path):
                    with open(enums_path, 'r') as f:
                        enums_data = yaml.safe_load(f)
                        if attr.enum_type in enums_data:
                            attr.enum_values = enums_data[attr.enum_type]
                        else:
                            logger.warning(f"Enum type {attr.enum_type} not found in enums.yml")
        model_content = template.render(schema=processed_schema)
        file_name = f'{table}.model.ts'
        output_path = os.path.join(SCRIPT_DIR, '..', 'frontend', 'src', 'app', 'core', 'models', file_name)
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
            key_schema = [
                {
                    'name': schema.partition_key,
                    'type': 'HASH',
                    'attr_type': 'S'  # Default to string type
                }
            ]
            if schema.sort_key and schema.sort_key != 'None':
                key_schema.append({
                    'name': schema.sort_key,
                    'type': 'RANGE',
                    'attr_type': 'S'  # Default to string type
                })

            # Process indexes
            global_secondary_indexes = []
            local_secondary_indexes = []
            attribute_names = set([schema.partition_key])
            if schema.sort_key and schema.sort_key != 'None':
                attribute_names.add(schema.sort_key)
            if schema.secondary_indexes:
                for index in schema.secondary_indexes:
                    # Add index attribute names
                    attribute_names.add(index['partition'])
                    if index.get('sort') and index['sort'] != 'None':
                        attribute_names.add(index['sort'])
                    proj_type = index.get('projection_type', 'ALL')
                    proj_attrs = index.get('projected_attributes')
                    index_def = {
                        'IndexName': index['name'],
                        'KeySchema': [
                            {'AttributeName': index['partition'], 'KeyType': 'HASH'}
                        ],
                        'Projection': {'ProjectionType': proj_type}
                    }
                    if index.get('sort') and index['sort'] != 'None':
                        index_def['KeySchema'].append({'AttributeName': index['sort'], 'KeyType': 'RANGE'})
                    if proj_type == 'INCLUDE' and proj_attrs:
                        index_def['Projection']['NonKeyAttributes'] = proj_attrs
                    if index['type'] == 'GSI':
                        global_secondary_indexes.append(index_def)
                    elif index['type'] == 'LSI':
                        local_secondary_indexes.append(index_def)

            # Build AttributeDefinitions
            attribute_definitions = [
                {'AttributeName': name, 'AttributeType': 'S'} for name in attribute_names
            ]

            processed_schemas[schema.table] = {
                'table': schema.table,
                'partition_key': schema.partition_key,
                'sort_key': schema.sort_key,
                'key_schema': key_schema,
                'attribute_definitions': attribute_definitions,
                'global_secondary_indexes': global_secondary_indexes,
                'local_secondary_indexes': local_secondary_indexes
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
        resolver_resources = []
        for table_name, schema in schemas.items():
            logger.info(f"Processing schema for table: {schema.table}")
            logger.info(f"Schema data: table={schema.table}, partition_key={schema.partition_key}, sort_key={schema.sort_key}")
            processed_schemas[schema.table] = {
                'table': schema.table,
                'attributes': schema.attributes,
                'partition_key': schema.partition_key,
                'sort_key': schema.sort_key,
                'secondary_indexes': schema.secondary_indexes or []
            }
            # Generate resolvers for each secondary index
            if schema.secondary_indexes:
                for index in schema.secondary_indexes:
                    resolver_resources.append({
                        'table': schema.table,
                        'index': index,
                        'field': f"{schema.table}QueryBy{index['partition'][0].upper() + index['partition'][1:]}" if index.get('partition') else '',
                        'type': 'Query',
                        'data_source': f"{schema.table}DataSource",
                        'request_template': '# DynamoDB Query request mapping template',
                        'response_template': '# DynamoDB Query response mapping template'
                    })

        # Generate template
        logger.info("Rendering template...")
        rendered = template.render(schemas=processed_schemas, resolver_resources=resolver_resources)
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

def generate_typescript_graphql_ops(table: str, schema: TableSchema) -> None:
    try:
        jinja_env = setup_jinja_env()
        template = jinja_env.get_template('typescript_graphql_ops.jinja')
        operations = []
        # Partition key in PascalCase
        pk_pascal = to_pascal_case(schema.partition_key)
        # CRUD operation names
        op_names = {
            'create': f'{table}Create',
            'update': f'{table}Update',
            'delete': f'{table}Delete',
            'query_by_pk': f'{table}QueryBy{pk_pascal}'
        }
        # Create
        operations.append({
            'name': op_names['create'] + 'Mutation',
            'gql': f"""
mutation {op_names['create']}($input: {op_names['create']}Input!) {{
  {op_names['create']}(input: $input) {{
    StatusCode
    Message
    Data {{ ...fields }}
  }}
}}
"""
        })
        # Update
        operations.append({
            'name': op_names['update'] + 'Mutation',
            'gql': f"""
mutation {op_names['update']}($input: {op_names['update']}Input!) {{
  {op_names['update']}(input: $input) {{
    StatusCode
    Message
    Data {{ ...fields }}
  }}
}}
"""
        })
        # Delete
        operations.append({
            'name': op_names['delete'] + 'Mutation',
            'gql': f"""
mutation {op_names['delete']}($input: {op_names['delete']}Input!) {{
  {op_names['delete']}(input: $input) {{
    StatusCode
    Message
    Data {{ ...fields }}
  }}
}}
"""
        })
        # Query by partition key
        operations.append({
            'name': op_names['query_by_pk'],
            'gql': f"""
query {op_names['query_by_pk']}($input: {op_names['query_by_pk']}Input!) {{
  {op_names['query_by_pk']}(input: $input) {{
    StatusCode
    Message
    Data {{ ...fields }}
  }}
}}
"""
        })
        content = template.render(schema=schema, operations=operations)
        output_path = os.path.join(SCRIPT_DIR, '..', 'frontend', 'src', 'app', 'core', 'graphql', f'{table}.graphql.ts')
        write_file(output_path, content)
        logger.info(f'Generated TypeScript GraphQL ops for {table}')
    except Exception as e:
        logger.error(f'Failed to generate TypeScript GraphQL ops for {table}: {str(e)}')
        raise

def generate_typescript_model_file(table: str, schema: TableSchema) -> None:
    try:
        jinja_env = setup_jinja_env()
        template = jinja_env.get_template('typescript_model.jinja')
        processed_schema = copy.deepcopy(schema)
        for attr in processed_schema.attributes:
            attr.type = to_typescript_type(attr.type)
        model_content = template.render(schema=processed_schema)
        file_name = f'{table}.model.ts'
        output_path = os.path.join(SCRIPT_DIR, '..', 'frontend', 'src', 'app', 'core', 'models', file_name)
        write_file(output_path, model_content)
        logger.info(f'Generated TypeScript .model.ts for {table}')
    except Exception as e:
        logger.error(f'Failed to generate TypeScript .model.ts for {table}: {str(e)}')
        raise

def generate_typescript_enum(enum_name: str, enum_values: list) -> None:
    try:
        jinja_env = setup_jinja_env()
        template = jinja_env.get_template('typescript_enum.jinja')
        enum_content = template.render(enum_name=enum_name, enum_values=enum_values)
        file_name = f'{enum_name}.enum.ts'
        output_path = os.path.join(SCRIPT_DIR, '..', 'frontend', 'src', 'app', 'core', 'models', file_name)
        write_file(output_path, enum_content)
        logger.info(f'Generated TypeScript enum for {enum_name}')
    except Exception as e:
        logger.error(f'Failed to generate TypeScript enum for {enum_name}: {str(e)}')
        raise

def generate_python_enum(enum_name: str, enum_values: list) -> None:
    try:
        jinja_env = setup_jinja_env()
        template = jinja_env.get_template('python_enum.jinja')
        enum_content = template.render(enum_name=enum_name, enum_values=enum_values)
        file_name = f'{enum_name}.enum.py'
        output_path = os.path.join(SCRIPT_DIR, '..', 'backend', 'src', 'core', 'models', file_name)
        write_file(output_path, enum_content)
        logger.info(f'Generated Python enum for {enum_name}')
    except Exception as e:
        logger.error(f'Failed to generate Python enum for {enum_name}: {str(e)}')
        raise

def cleanup_old_files(valid_model_names, valid_enum_names, valid_graphql_names):
    """Remove files that do not match the current PascalCase table and enum names from schemas and enums.yml."""
    ts_model_dir = os.path.join(SCRIPT_DIR, '..', 'frontend', 'src', 'app', 'core', 'models')
    ts_graphql_dir = os.path.join(SCRIPT_DIR, '..', 'frontend', 'src', 'app', 'core', 'graphql')
    py_model_dir = os.path.join(SCRIPT_DIR, '..', 'backend', 'src', 'core', 'models')

    # TypeScript models
    for fname in os.listdir(ts_model_dir):
        if fname.endswith('.model.ts') and fname not in valid_model_names:
            os.remove(os.path.join(ts_model_dir, fname))
            logger.info(f'Removed old/incorrect TS model file: {fname}')
        if fname.endswith('.enum.ts') and fname not in valid_enum_names:
            os.remove(os.path.join(ts_model_dir, fname))
            logger.info(f'Removed old/incorrect TS enum file: {fname}')
    # TypeScript GraphQL
    for fname in os.listdir(ts_graphql_dir):
        if fname.endswith('.graphql.ts') and fname not in valid_graphql_names:
            os.remove(os.path.join(ts_graphql_dir, fname))
            logger.info(f'Removed old/incorrect TS GraphQL file: {fname}')
    # Python models/enums
    for fname in os.listdir(py_model_dir):
        if fname.endswith('.model.py') and fname not in valid_model_names:
            os.remove(os.path.join(py_model_dir, fname))
            logger.info(f'Removed old/incorrect Python model file: {fname}')
        if fname.endswith('.enum.py') and fname not in valid_enum_names:
            os.remove(os.path.join(py_model_dir, fname))
            logger.info(f'Removed old/incorrect Python enum file: {fname}')

def generate_all_enums():
    """Generate enums for all entries in enums.yml for both TypeScript and Python, using exact enum names."""
    enums_path = os.path.join(SCRIPT_DIR, 'core', 'enums.yml')
    if not os.path.exists(enums_path):
        logger.warning('enums.yml not found, skipping enum generation.')
        return
    with open(enums_path, 'r') as f:
        enums_data = yaml.safe_load(f)
    for enum_name, enum_values in enums_data.items():
        if not isinstance(enum_values, list):
            continue
        generate_typescript_enum(enum_name, enum_values)
        generate_python_enum(enum_name, enum_values)

def main():
    """Main entry point for the schema generator."""
    try:
        jinja_env = setup_jinja_env()
        schemas = load_schemas()
        # Build valid file name sets
        valid_model_names = set()
        valid_enum_names = set()
        valid_graphql_names = set()
        for table in schemas:
            valid_model_names.add(f'{table}.model.ts')
            valid_model_names.add(f'{table}.model.py')
            valid_graphql_names.add(f'{table}.graphql.ts')
        enums_path = os.path.join(SCRIPT_DIR, 'core', 'enums.yml')
        if os.path.exists(enums_path):
            with open(enums_path, 'r') as f:
                enums_data = yaml.safe_load(f)
            for enum_name in enums_data:
                if isinstance(enums_data[enum_name], list):
                    valid_enum_names.add(f'{enum_name}.enum.ts')
                    valid_enum_names.add(f'{enum_name}.enum.py')
        # Cleanup old files before generation
        cleanup_old_files(valid_model_names, valid_enum_names, valid_graphql_names)
        # Generate models and GraphQL ops
        for table, schema in schemas.items():
            generate_python_model(table, schema)
            generate_typescript_model(table, schema)
            generate_typescript_graphql_ops(table, schema)
        # Generate all enums from enums.yml
        generate_all_enums()
        # Generate base GraphQL schema
        graphql_template_path = os.path.join(SCRIPT_DIR, 'templates', 'graphql_schema.jinja')
        graphql_schema = generate_graphql_schema(schemas, graphql_template_path)
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