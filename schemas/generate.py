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
from typing import Dict, Any, List, Optional, Union
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

@dataclass
class GraphQLType:
    """GraphQL type definition."""
    name: str
    attributes: List[Attribute]
    description: Optional[str] = None

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
    # Extract array element type if it's an array
    if attr_type.lower().startswith('array<'):
        element_type = attr_type[6:-1]  # Extract type between array< and >
        return f"{to_typescript_type(element_type)}[]"
    
    # Handle model references (types starting with I)
    if attr_type.startswith('I'):
        return attr_type  # Keep the interface name as is
    
    type_mapping = {
        'string': 'string',
        'number': 'number',
        'boolean': 'boolean',
        'array': 'any[]',  # Fallback for untyped arrays
        'object': 'Record<string, any>',
        'timestamp': 'string',  # Changed to string for ISO 8601 format
        'date': 'string',      # Changed to string for ISO 8601 format
        'map': 'Record<string, any>',
        'set': 'Set<string>',
        'binary': 'Buffer',
        'null': 'null'
    }
    return type_mapping.get(attr_type.lower(), attr_type)  # Return the type as is if not in mapping

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
    """Convert string to camelCase, preserving internal capitalization."""
    # If already camelCase or PascalCase, just lowercase the first character
    if '_' not in s and '-' not in s:
        return s[0].lower() + s[1:] if s else s
    # Otherwise, convert snake_case or kebab-case to camelCase
    parts = re.split(r'[_-]', s)
    return parts[0].lower() + ''.join(word.capitalize() for word in parts[1:])

def to_pascal_case(s: str) -> str:
    """Convert string to PascalCase."""
    if not s:
        return s
    
    # First split by underscores and hyphens
    words = re.split(r'[_-]', s)
    result = []
    
    for word in words:
        # Handle empty strings
        if not word:
            continue
            
        # Split on camelCase boundaries
        # This will split "userId" into ["user", "Id"]
        # and "XMLHttpRequest" into ["XML", "Http", "Request"]
        parts = re.findall(r'[A-Z]?[a-z]+|[A-Z]{2,}(?=[A-Z][a-z]|\d|\W|\Z)|[A-Z]{2,}|[A-Z][a-z]+|\d+', word)
        
        # Handle case where the word starts with a lowercase letter
        if word[0].islower() and parts:
            parts[0] = parts[0].lower()
            
        result.extend(parts)
    
    # Capitalize each word and join them
    return ''.join(word.capitalize() for word in result)

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
    if 'name' not in schema:
        raise SchemaValidationError(f"Schema must have a 'name' field: {file_path}")
        
    schema_name = schema['name']
    file_name = os.path.basename(file_path)
    expected_file_name = f"{schema_name}.yml"
    
    if file_name != expected_file_name:
        raise SchemaValidationError(
            f"Schema file name '{file_name}' must match the schema name '{schema_name}' defined in the 'name' field."
        )

    if 'type' in schema and schema['type'] in ['graphql', 'static']:
        # Validate attribute names are camelCase
        for attr_name in schema['attributes']:
            if not re.match(r'^[a-z][a-zA-Z0-9]*$', attr_name):
                raise SchemaValidationError(f"Attribute name '{attr_name}' must be in camelCase")
    else:
        # Validate index names are kebab-case
        if 'model' in schema and 'keys' in schema['model'] and 'secondary' in schema['model']['keys']:
            for index in schema['model']['keys']['secondary']:
                if not re.match(r'^[a-z][a-z0-9]*(-[a-z0-9]+)*$', index['name']):
                    raise SchemaValidationError(f"Index name '{index['name']}' must be in kebab-case")

        # Validate attribute names are camelCase
        if 'model' in schema and 'attributes' in schema['model']:
            for attr_name in schema['model']['attributes']:
                if not re.match(r'^[a-z][a-zA-Z0-9]*$', attr_name):
                    raise SchemaValidationError(f"Attribute name '{attr_name}' must be in camelCase")

def load_schema(schema_path: str) -> Dict[str, Any]:
    """Load a schema file and return its contents."""
    try:
        with open(schema_path, 'r') as f:
            schema = yaml.safe_load(f)
            
        # Validate schema structure
        if 'type' not in schema:
            raise SchemaValidationError(f"Schema must have a 'type' field: {schema_path}")
        if 'name' not in schema:
            raise SchemaValidationError(f"Schema must have a 'name' field: {schema_path}")
            
        # Additional validation based on type
        if schema['type'] in ['graphql', 'static']:
            if 'attributes' not in schema:
                raise SchemaValidationError(f"GraphQL/static type schema must have an 'attributes' field: {schema_path}")
        else:
            if 'version' not in schema:
                raise SchemaValidationError(f"Table schema must have a 'version' field: {schema_path}")
            if 'model' not in schema:
                raise SchemaValidationError(f"Table schema must have a 'model' field: {schema_path}")
            
        return schema
    except yaml.YAMLError as e:
        raise SchemaValidationError(f"Error parsing schema file {schema_path}: {str(e)}")
    except Exception as e:
        raise SchemaValidationError(f"Error loading schema file {schema_path}: {str(e)}")

def load_schemas() -> Dict[str, Union[TableSchema, GraphQLType]]:
    """Load all schema files and return a dictionary of schemas."""
    schemas = {}
    schema_dir = os.path.join(SCRIPT_DIR, 'entities')
    
    # Load all schema files
    for filename in os.listdir(schema_dir):
        if filename.endswith('.yml') or filename.endswith('.yaml'):
            schema_path = os.path.join(schema_dir, filename)
            schema = load_schema(schema_path)
            
            # Validate case conventions
            validate_case_conventions(schema, schema_path)
            
            if 'type' in schema and schema['type'] == 'graphql':
                # Handle GraphQL type schema
                name = schema['name']
                attributes = []
                for attr_name, attr_info in schema['attributes'].items():
                    attributes.append(Attribute(
                        name=attr_name,
                        type=attr_info['type'],
                        description=attr_info.get('description', ''),
                        required=attr_info.get('required', True),
                        enum_type=attr_info.get('enum_type'),
                        enum_values=attr_info.get('enum_values')
                    ))
                schemas[name] = GraphQLType(
                    name=name,
                    attributes=attributes,
                    description=schema.get('description')
                )
            elif 'type' in schema and schema['type'] == 'static':
                # Handle static type schema
                name = schema['name']
                attributes = []
                for attr_name, attr_info in schema['attributes'].items():
                    attributes.append(Attribute(
                        name=attr_name,
                        type=attr_info['type'],
                        description=attr_info.get('description', ''),
                        required=attr_info.get('required', True),
                        enum_type=attr_info.get('enum_type'),
                        enum_values=attr_info.get('enum_values')
                    ))
                schemas[name] = GraphQLType(
                    name=name,
                    attributes=attributes,
                    description=schema.get('description')
                )
            else:
                # Handle table schema
                name = schema['name']
                model = schema['model']
                attributes = []
                
                # Process attributes
                for attr_name, attr_info in model['attributes'].items():
                    attributes.append(Attribute(
                        name=attr_name,
                        type=attr_info['type'],
                        description=attr_info.get('description', ''),
                        required=attr_info.get('required', True),
                        enum_type=attr_info.get('enum_type'),
                        enum_values=attr_info.get('enum_values')
                    ))
                
                # Get primary key
                partition_key = model['keys']['primary']['partition']
                sort_key = model['keys']['primary'].get('sort', 'None')
                
                # Get secondary indexes
                secondary_indexes = []
                if 'secondary' in model['keys']:
                    for index in model['keys']['secondary']:
                        secondary_indexes.append({
                            'name': index['name'],
                            'type': index['type'],
                            'partition': index['partition'],
                            'sort': index.get('sort'),
                            'projection_type': index.get('projection_type', 'ALL'),
                            'projected_attributes': index.get('projected_attributes', [])
                        })
                
                schemas[name] = TableSchema(
                    table=name,
                    attributes=attributes,
                    partition_key=partition_key,
                    sort_key=sort_key,
                    secondary_indexes=secondary_indexes
                )
    
    return schemas

def generate_python_model(table: str, schema: Union[TableSchema, GraphQLType]) -> None:
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

def generate_typescript_model(table: str, schema: Union[TableSchema, GraphQLType], is_static=False, model_type=None, all_model_names=None) -> None:
    """Generate TypeScript model from schema."""
    template_name = None
    
    # Determine template based on model type
    if isinstance(schema, TableSchema):
        template_name = 'typescript_dynamodb_model.jinja'
    elif is_static:
        template_name = 'typescript_static_model.jinja'
    else:
        template_name = 'typescript_graphql_model.jinja'
    
    # Get template
    env = setup_jinja_env()
    template = env.get_template(template_name)
    
    # Track generated query types to prevent duplicates
    generated_query_types = set()
    if isinstance(schema, TableSchema):
        generated_query_types.add('QueryBy' + to_pascal_case(schema.partition_key) + 'Input')
        if schema.sort_key and schema.sort_key != 'None':
            generated_query_types.add('QueryBy' + to_pascal_case(schema.sort_key) + 'Input')
            generated_query_types.add('QueryByBothInput')
        if schema.secondary_indexes:
            for index in schema.secondary_indexes:
                generated_query_types.add('QueryBy' + to_pascal_case(index['partition']) + 'Input')
    
    # Prepare model imports
    model_imports = []
    if all_model_names:
        for attr in schema.attributes:
            # Check for direct model references
            if attr.type in all_model_names and attr.type != table:
                model_imports.append(attr.type)
            # Check for interface references (IModel)
            elif attr.type.startswith('I') and attr.type[1:] in all_model_names and attr.type[1:] != table:
                model_imports.append(attr.type[1:])  # Import the model class, not the interface
            # Check for model references in array types
            elif attr.type.startswith('array<') and attr.type[6:-1] in all_model_names and attr.type[6:-1] != table:
                model_imports.append(attr.type[6:-1])
            # Check for interface references in array types
            elif attr.type.startswith('array<I') and attr.type[7:-1] in all_model_names and attr.type[7:-1] != table:
                model_imports.append(attr.type[7:-1])
    
    # Render template
    content = template.render(
        schema=schema,
        model_imports=sorted(set(model_imports)),
        generated_query_types=generated_query_types
    )
    
    # Write to file
    output_path = os.path.join(SCRIPT_DIR, '..', 'frontend', 'src', 'app', 'core', 'models', f'{table}.model.ts')
    write_file(output_path, content)

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

def generate_graphql_schema(schemas: Dict[str, Union[TableSchema, GraphQLType]], template_path: str) -> str:
    """Generate GraphQL schema from schemas."""
    env = setup_jinja_env()
    template = env.get_template(os.path.basename(template_path))
    
    # Separate table schemas and GraphQL types
    table_schemas = {name: schema for name, schema in schemas.items() if isinstance(schema, TableSchema)}
    graphql_types = {name: schema for name, schema in schemas.items() if isinstance(schema, GraphQLType)}
    
    # Generate schema content
    schema_content = template.render(
        schemas=table_schemas,
        graphql_types=graphql_types,
        timestamp=datetime.now().strftime('%Y%m%d_%H%M%S')
    )
    
    return schema_content

def generate_timestamped_schema(schema_content: str) -> str:
    """Generate a timestamped schema file name."""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    return f'appsync_{timestamp}.graphql'

def generate_cloudformation_template(schemas: Dict[str, Union[TableSchema, GraphQLType]], template_path: str, output_path: str) -> None:
    """Generate a CloudFormation template for DynamoDB tables."""
    try:
        logger.info(f"Starting CloudFormation template generation with template: {template_path}")
        # Get Jinja environment
        jinja_env = setup_jinja_env()
        template = jinja_env.get_template(os.path.basename(template_path))
        
        # Process only table schemas
        table_schemas = {name: schema for name, schema in schemas.items() if isinstance(schema, TableSchema)}
        
        # Process schemas into the format expected by the template
        processed_schemas = {}
        for table_name, schema in table_schemas.items():
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
        
        # Write the template to file
        write_file(output_path, template_content)
        logger.info(f"Generated CloudFormation template: {output_path}")
    except Exception as e:
        logger.error(f"Failed to generate CloudFormation template: {str(e)}")
        raise

def generate_appsync_template(schemas: Dict[str, Union[TableSchema, GraphQLType]], output_path: str) -> None:
    """Generate an AppSync CloudFormation template."""
    try:
        logger.info("Starting AppSync template generation")
        # Get Jinja environment
        jinja_env = setup_jinja_env()
        template = jinja_env.get_template('appsync_cloudformation.jinja')
        
        # Process only table schemas
        table_schemas = {name: schema for name, schema in schemas.items() if isinstance(schema, TableSchema)}
        
        # Process schemas into the format expected by the template
        processed_schemas = {}
        for table_name, schema in table_schemas.items():
            logger.info(f"Processing schema for table: {table_name}")
            processed_schemas[table_name] = {
                'table': table_name,
                'partition_key': schema.partition_key,
                'sort_key': schema.sort_key,
                'attributes': [
                    {
                        'name': attr.name,
                        'type': map_to_graphql_type(attr.type),
                        'required': attr.required
                    }
                    for attr in schema.attributes
                ]
            }
            logger.info(f"Processed schema: {processed_schemas[table_name]}")
        
        # Generate the template content
        logger.info("Rendering template...")
        template_content = template.render(schemas=processed_schemas)
        
        # Write the template to file
        write_file(output_path, template_content)
        logger.info(f"Generated AppSync template: {output_path}")
    except Exception as e:
        logger.error(f"Failed to generate AppSync template: {str(e)}")
        raise

def write_file(output_path: str, content: str) -> None:
    """
    Write content to file with consistent UTF-8 encoding without BOM.
    
    Args:
        output_path: Path to write the file to
        content: Content to write
    """
    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
   
    # Write with explicit UTF-8 encoding
    with open(output_path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)

def generate_typescript_graphql_ops(table: str, schema: TableSchema) -> None:
    try:
        jinja_env = setup_jinja_env()
        template = jinja_env.get_template('typescript_graphql_ops.jinja')
        processed_schema = copy.deepcopy(schema)
        if not hasattr(processed_schema, 'secondary_indexes') or processed_schema.secondary_indexes is None:
            processed_schema.secondary_indexes = []
        pk_pascal = to_pascal_case(schema.partition_key)
        sk_pascal = to_pascal_case(schema.sort_key) if schema.sort_key and schema.sort_key != 'None' else None
        # Build CRUD operations
        operations = []
        # Build the field list for the Data selection set
        field_list = "\n      ".join([to_camel_case(attr.name) for attr in schema.attributes])
        # Create
        operations.append({
            'name': f'{table}CreateMutation',
            'gql': f'''
mutation {table}Create($input: {table}CreateInput!) {{
  {table}Create(input: $input) {{
    StatusCode
    Message
    Data {{
      {field_list}
    }}
  }}
}}'''
        })
        # Update
        operations.append({
            'name': f'{table}UpdateMutation',
            'gql': f'''
mutation {table}Update($input: {table}UpdateInput!) {{
  {table}Update(input: $input) {{
    StatusCode
    Message
    Data {{
      {field_list}
    }}
  }}
}}'''
        })
        # Delete
        operations.append({
            'name': f'{table}DeleteMutation',
            'gql': f'''
mutation {table}Delete($id: ID!) {{
  {table}Delete(id: $id) {{
    StatusCode
    Message
    Data {{
      {field_list}
    }}
  }}
}}'''
        })
        # Query by primary key
        operations.append({
            'name': f'{table}QueryBy{pk_pascal}',
            'gql': f'''
query {table}QueryBy{pk_pascal}($input: {table}QueryBy{pk_pascal}Input!) {{
  {table}QueryBy{pk_pascal}(input: $input) {{
    StatusCode
    Message
    Data {{
      {field_list}
    }}
  }}
}}'''
        })
        # Query by sort key (if present)
        if sk_pascal:
            operations.append({
                'name': f'{table}QueryBy{sk_pascal}',
                'gql': f'''
query {table}QueryBy{sk_pascal}($input: {table}QueryBy{sk_pascal}Input!) {{
  {table}QueryBy{sk_pascal}(input: $input) {{
    StatusCode
    Message
    Data {{
      {field_list}
    }}
  }}
}}'''
            })
            # Query by both
            operations.append({
                'name': f'{table}QueryByBoth',
                'gql': f'''
query {table}QueryByBoth($input: {table}QueryByBothInput!) {{
  {table}QueryByBoth(input: $input) {{
    StatusCode
    Message
    Data {{
      {field_list}
    }}
  }}
}}'''
            })
        # Query by secondary indexes
        for index in processed_schema.secondary_indexes:
            idx_pascal = to_pascal_case(index['partition'])
            operations.append({
                'name': f'{table}QueryBy{idx_pascal}',
                'gql': f'''
query {table}QueryBy{idx_pascal}($input: {table}QueryBy{idx_pascal}Input!) {{
  {table}QueryBy{idx_pascal}(input: $input) {{
    StatusCode
    Message
    Data {{
      {field_list}
    }}
  }}
}}'''
            })
        ops_content = template.render(schema=processed_schema, operations=operations)
        file_name = f'{table}.graphql.ts'
        output_path = os.path.join(SCRIPT_DIR, '..', 'frontend', 'src', 'app', 'core', 'graphql', file_name)
        write_file(output_path, ops_content)
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
        all_model_names = list(schemas.keys())
        for table, schema in schemas.items():
            if isinstance(schema, TableSchema):
                valid_model_names.add(f'{table}.model.ts')
                valid_model_names.add(f'{table}.model.py')
                valid_graphql_names.add(f'{table}.graphql.ts')
            elif isinstance(schema, GraphQLType):
                valid_model_names.add(f'{table}.model.ts')
                valid_model_names.add(f'{table}.model.py')
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
        # Generate models and GraphQL ops for table-backed schemas
        for table, schema in schemas.items():
            if isinstance(schema, TableSchema):
                generate_python_model(table, schema)
                generate_typescript_model(table, schema, is_static=False, model_type='table', all_model_names=all_model_names)
                generate_typescript_graphql_ops(table, schema)
            elif isinstance(schema, GraphQLType):
                generate_typescript_model(table, schema, is_static=True, model_type='graphql', all_model_names=all_model_names)
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