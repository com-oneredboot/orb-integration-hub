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
import glob

# 3rd party imports
import yaml
from jinja2 import Template, Environment, FileSystemLoader, select_autoescape
from pydantic import BaseModel, Field
from pydantic import field_validator

# Set up logging
logger = logging.getLogger('schema_generator')
logger.setLevel(logging.WARN)

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
            # - Only alphanumeric characters
            # - Must start with a letter
            # - Must be in PascalCase format
            if not (3 <= len(v) <= 255):
                raise ValueError('Index name must be between 3 and 255 characters')
            if not v[0].isalpha():
                raise ValueError('Index name must start with a letter')
            if not all(c.isalnum() for c in v):
                raise ValueError('Index name can only contain alphanumeric characters')
            # Validate PascalCase format
            if not v[0].isupper():
                raise ValueError('Index name must be in PascalCase format (e.g., RoleIndex)')
            if any(c.isupper() and i > 0 and v[i-1].isupper() for i, c in enumerate(v)):
                raise ValueError('Index name must be in PascalCase format (e.g., RoleIndex)')
        return v

class SchemaModel(BaseModel):
    """Schema model definition"""
    version: str
    keys: Dict[str, Any]
    attributes: Dict[str, SchemaField]
    indexes: Optional[List[SchemaIndex]] = None
    auth_config: Optional[Dict[str, Any]] = None

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
    name: str
    attributes: List[Attribute]
    partition_key: str
    sort_key: str = 'None'  # Default to 'None' string
    secondary_indexes: Optional[List[Dict[str, Any]]] = None
    auth_config: Optional[Dict[str, Any]] = None
    type: str = 'dynamodb'  # Default to 'dynamodb' per new SchemaType
    stream: Optional[Dict[str, Any]] = None

    def __post_init__(self):
        """Post-initialization validation and defaults."""
        if self.sort_key is None:
            self.sort_key = 'None'
        if self.secondary_indexes is None:
            self.secondary_indexes = []
        if self.auth_config is None:
            self.auth_config = {
                'defaultAuth': 'user_pools',
                'apiKeyOperations': [],
                'cognitoOperations': []
            }

@dataclass
class GraphQLType:
    """GraphQL type definition."""
    name: str
    attributes: List[Attribute]
    description: Optional[str] = None
    auth_config: Optional[Dict[str, Any]] = None

@dataclass
class RegistryType:
    """Registry type definition (for static registries like ErrorRegistry)."""
    name: str
    items: dict
    description: Optional[str] = None
    type: str = 'registry'

@dataclass
class StandardType:
    """Standard model definition (plain object, not tied to a data source or API)."""
    name: str
    attributes: List[Attribute]
    description: Optional[str] = None
    type: str = 'standard'

@dataclass
class LambdaType:
    """Lambda resolver model definition (for GraphQL Lambda-backed types)."""
    name: str
    attributes: List[Attribute]
    description: Optional[str] = None
    type: str = 'lambda'
    auth_config: Optional[Dict[str, Any]] = None

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
    if attr_type.lower() == 'array':
        return 'string[]'  # Default to string[] for untyped arrays
    # Handle model references (types starting with I)
    if attr_type.startswith('I'):
        return attr_type  # Keep the interface name as is
    type_mapping = {
        'string': 'string',
        'number': 'number',
        'boolean': 'boolean',
        'array': 'string[]',  # Default to string[]
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
    logger.debug('Setting up Jinja environment')
    env = Environment(
        loader=FileSystemLoader(os.path.join(SCRIPT_DIR, 'templates')),
        autoescape=select_autoescape(['html', 'xml']),
        trim_blocks=True,
        lstrip_blocks=True,
        keep_trailing_newline=True,
        extensions=['jinja2.ext.do']
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
    
    # Add graphql_type macro as a filter
    def graphql_type(type_name):
        mapping = {
            'string': 'String',
            'number': 'Int',
            'boolean': 'Boolean',
            'object': 'String',
            'array': '[String]',
            'timestamp': 'String',
            'ID': 'ID',
            'int': 'Int',
            'float': 'Float',
            'double': 'Float',
            'bigint': 'String',
            'IUsers': 'Users',
            'any': 'String',
        }
        return mapping.get(type_name, type_name)
    env.filters['graphql_type'] = graphql_type
    
    logger.debug('Loaded Jinja environment')
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
    
    # Validate schema name is in PascalCase
    if not re.match(r'^[A-Z][a-zA-Z0-9]*$', schema_name):
        raise SchemaValidationError(f"Schema name '{schema_name}' must be in PascalCase format (e.g., ApplicationRole)")
    
    file_name = os.path.basename(file_path)
    expected_file_name = f"{schema_name}.yml"
    
    if file_name.lower() != expected_file_name.lower():
        raise SchemaValidationError(
            f"Schema file name '{file_name}' must match the schema name '{schema_name}' defined in the 'name' field."
        )

    # Ensure the actual file name matches the expected case
    if file_name != expected_file_name:
        # Try to rename the file to match the expected case
        try:
            new_path = os.path.join(os.path.dirname(file_path), expected_file_name)
            os.rename(file_path, new_path)
            logger.info(f"Renamed {file_name} to {expected_file_name} to match schema name")
        except OSError as e:
            # If rename fails (e.g., due to case-insensitive file system), just log it
            logger.warning(f"Could not rename {file_name} to {expected_file_name}: {str(e)}")

    if 'type' in schema and schema['type'] in ['graphql', 'static']:
        # Validate attribute names are camelCase
        if 'model' in schema and 'attributes' in schema['model']:
            for attr_name in schema['model']['attributes']:
                if not re.match(r'^[a-z][a-zA-Z0-9]*$', attr_name):
                    raise SchemaValidationError(f"Attribute name '{attr_name}' must be in camelCase")
    else:
        # Validate index names are PascalCase
        if 'model' in schema and 'keys' in schema['model'] and 'secondary' in schema['model']['keys']:
            for index in schema['model']['keys']['secondary']:
                if not re.match(r'^[A-Z][a-zA-Z0-9]*$', index['name']):
                    raise SchemaValidationError(f"Index name '{index['name']}' must be in PascalCase format (e.g., RoleIndex)")
        # Validate attribute names are camelCase
        if 'model' in schema and 'attributes' in schema['model']:
            logger.debug(f"[DEBUG] {schema_name}: model['attributes'] type: {type(schema['model']['attributes'])}, value: {schema['model']['attributes']}")
            if not isinstance(schema['model']['attributes'], dict):
                raise SchemaValidationError(f"Schema '{schema_name}' has a non-dict 'attributes' section: {type(schema['model']['attributes'])}. Value: {schema['model']['attributes']}")
            for attr_name, attr_info in schema['model']['attributes'].items():
                if not re.match(r'^[a-z][a-zA-Z0-9]*$', attr_name):
                    raise SchemaValidationError(f"Attribute name '{attr_name}' must be in camelCase")

    if 'type' in schema and schema['type'] == 'registry':
        # Validate items block
        if 'items' not in schema:
            raise SchemaValidationError(f"Registry schema '{schema['name']}' must have an 'items' block: {file_path}")
        items = schema['items']
        if not isinstance(items, dict):
            raise SchemaValidationError(f"Registry 'items' must be a dict in '{schema['name']}'")
        for code, entry in items.items():
            if not isinstance(entry, dict):
                raise SchemaValidationError(f"Registry item '{code}' must be a dict in '{schema['name']}'")
            for field in ['message', 'description', 'solution']:
                if field not in entry:
                    raise SchemaValidationError(f"Registry item '{code}' missing required field '{field}' in '{schema['name']}'")
        return  # Skip other checks for registry

def get_auth_directives(operation_name: str, schema: Union[TableSchema, GraphQLType]) -> List[str]:
    """
    Generate auth directives for a GraphQL operation.
    - For each operation, include @aws_auth(cognito_groups: [...]) for all allowed groups (explicitly from YAML only)
    - If the operation is in apiKeyAuthentication, also add @aws_api_key
    - Raise SchemaValidationError if no group is found for the operation
    """
    directives = []
    allowed_groups = set()
    if not schema.auth_config:
        logger.error(f"No auth_config found for schema '{schema.name}' (operation: {operation_name})")
        raise SchemaValidationError(f"No auth_config found for schema '{schema.name}' (operation: {operation_name})")

    # Handle cognitoAuthentication (group-based)
    cognito_auth = schema.auth_config.get('cognitoAuthentication', {})
    if isinstance(cognito_auth, dict):
        groups = cognito_auth.get('groups', {})
        for group, ops in groups.items():
            if isinstance(ops, list):
                # '*' means all operations for this group
                if '*' in ops or operation_name in ops:
                    allowed_groups.add(group)
            else:
                logger.warning(f"Group '{group}' in cognitoAuthentication.groups is not a list in schema '{schema.name}'")
        if allowed_groups:
            group_list = ', '.join(f'"{g}"' for g in sorted(list(allowed_groups)))
            directives.append(f'@aws_auth(cognito_groups: [{group_list}])')
        else:
            logger.error(f"No cognitoAuthentication group found for operation '{operation_name}' in schema '{schema.name}'. Please explicitly assign this operation to a group in the YAML.")
            raise SchemaValidationError(f"No cognitoAuthentication group found for operation '{operation_name}' in schema '{schema.name}'. Please explicitly assign this operation to a group in the YAML.")
    else:
        logger.error(f"cognitoAuthentication is not a dict in schema '{schema.name}'")
        raise SchemaValidationError(f"cognitoAuthentication is not a dict in schema '{schema.name}'")

    # Handle apiKeyAuthentication
    api_key_ops = schema.auth_config.get('apiKeyAuthentication', [])
    if operation_name in api_key_ops:
            directives.append('@aws_api_key')

    return directives

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
        if schema['type'] == 'registry':
            if 'items' not in schema:
                raise SchemaValidationError(f"Registry schema '{schema['name']}' must have an 'items' block: {schema_path}")
            return schema
        if 'model' not in schema:
            raise SchemaValidationError(f"Schema must have a 'model' field: {schema_path}")
        # Debug: print model keys before checking for 'attributes'
        logger.debug(f"[DEBUG] Checking file: {schema_path}, model keys: {list(schema['model'].keys())}")
        if 'attributes' not in schema['model']:
            raise SchemaValidationError(f"Schema 'model' must have an 'attributes' field: {schema_path}")
            
        # Process auth config if present
        if 'authConfig' in schema['model']:
            schema['auth_config'] = schema['model']['authConfig']
            
        return schema
    except yaml.YAMLError as e:
        raise SchemaValidationError(f"Error parsing schema file {schema_path}: {str(e)}")
    except Exception as e:
        raise SchemaValidationError(f"Error loading schema file {schema_path}: {str(e)}")

def build_crud_operations_for_table(schema: TableSchema):
    """
    Attach CRUD and QueryBy operation definitions to the TableSchema instance for use in Jinja templates.
    Each operation includes:
      - name: e.g., 'Create', 'Update', 'Delete', 'Disable', 'QueryByUserId', etc.
      - type: 'Mutation' or 'Query'
      - field: e.g., 'UsersCreate', 'UsersQueryByUserId', etc.
      - dynamodb_op: e.g., 'PutItem', 'UpdateItem', 'DeleteItem', 'Query', etc.
      - index_partition: (for secondary index QueryBy) the partition key name
      - index_sort: (for secondary index QueryBy) the sort key name (if any)
      - index_name: (for secondary index QueryBy) the index name (if any)
      - response_auth_directives: list of decorators for the response type
    """
    def get_response_auth_directives(op_name):
        directives = []
        # API Key
        api_key_ops = schema.auth_config.get('apiKeyAuthentication', []) if schema.auth_config else []
        if op_name in api_key_ops:
            directives.append('@aws_api_key')
        # Cognito groups
        cognito_auth = schema.auth_config.get('cognitoAuthentication', {}) if schema.auth_config else {}
        if isinstance(cognito_auth, dict):
            groups = cognito_auth.get('groups', {})
            allowed_groups = []
            for group, ops in groups.items():
                if isinstance(ops, list) and ('*' in ops or op_name in ops):
                    allowed_groups.append(group)
            # Fallback: if no explicit mapping, use OWNER if present
            if not allowed_groups and 'OWNER' in groups:
                allowed_groups.append('OWNER')
            if allowed_groups:
                group_list = ', '.join(f'"{g}"' for g in sorted(allowed_groups))
                directives.append(f'@aws_auth(cognito_groups: [{group_list}])')
        return directives

    schema.operations = [
        {
            'name': 'Create',
            'type': 'Mutation',
            'field': f'{schema.name}Create',
            'dynamodb_op': 'PutItem',
            'response_auth_directives': get_response_auth_directives(f'{schema.name}Create'),
        },
        {
            'name': 'Update',
            'type': 'Mutation',
            'field': f'{schema.name}Update',
            'dynamodb_op': 'UpdateItem',
            'response_auth_directives': get_response_auth_directives(f'{schema.name}Update'),
        },
        {
            'name': 'Delete',
            'type': 'Mutation',
            'field': f'{schema.name}Delete',
            'dynamodb_op': 'DeleteItem',
            'response_auth_directives': get_response_auth_directives(f'{schema.name}Delete'),
        },
        {
            'name': 'Disable',
            'type': 'Mutation',
            'field': f'{schema.name}Disable',
            'dynamodb_op': 'UpdateItem',
            'response_auth_directives': get_response_auth_directives(f'{schema.name}Disable'),
        },
    ]

    # Add QueryBy operations for primary key
    pk_pascal = to_pascal_case(schema.partition_key)
    schema.operations.append({
        'name': f'QueryBy{pk_pascal}',
        'type': 'Query',
        'field': f'{schema.name}QueryBy{pk_pascal}',
        'dynamodb_op': 'Query',
        'index_partition': schema.partition_key,
        'index_sort': None,
        'index_name': None,
        'response_auth_directives': get_response_auth_directives(f'{schema.name}QueryBy{pk_pascal}'),
    })
    # Add QueryBy for sort key if present
    if schema.sort_key and schema.sort_key != 'None':
        sk_pascal = to_pascal_case(schema.sort_key)
        schema.operations.append({
            'name': f'QueryBy{sk_pascal}',
            'type': 'Query',
            'field': f'{schema.name}QueryBy{sk_pascal}',
            'dynamodb_op': 'Query',
            'index_partition': schema.sort_key,
            'index_sort': None,
            'index_name': None,
            'response_auth_directives': get_response_auth_directives(f'{schema.name}QueryBy{sk_pascal}'),
        })
        # QueryBy{Partition}And{Sort} for primary key
        pk_pascal = to_pascal_case(schema.partition_key)
        sk_pascal = to_pascal_case(schema.sort_key)
        schema.operations.append({
            'name': f'QueryBy{pk_pascal}And{sk_pascal}',
            'type': 'Query',
            'field': f'{schema.name}QueryBy{pk_pascal}And{sk_pascal}',
            'dynamodb_op': 'Query',
            'index_partition': schema.partition_key,
            'index_sort': schema.sort_key,
            'index_name': None,
            'response_auth_directives': get_response_auth_directives(f'{schema.name}QueryBy{pk_pascal}And{sk_pascal}'),
        })
    # Add QueryBy for each secondary index
    if schema.secondary_indexes:
        for index in schema.secondary_indexes:
            if index.get('sort') and index['sort'] != 'None':
                idx_pascal = to_pascal_case(index['partition'])
                sk_pascal = to_pascal_case(index['sort'])
                op_name = f'QueryBy{idx_pascal}And{sk_pascal}'
                field_name = f'{schema.name}{op_name}'
            else:
                idx_pascal = to_pascal_case(index['partition'])
                op_name = f'QueryBy{idx_pascal}'
                field_name = f'{schema.name}{op_name}'
            op = {
                'name': op_name,
                'type': 'Query',
                'field': field_name,
                'dynamodb_op': 'Query',
                'index_partition': index['partition'],
                'index_sort': index.get('sort'),
                'index_name': index['name'],
                'response_auth_directives': get_response_auth_directives(field_name),
            }
            schema.operations.append(op)

    # VALIDATION: Ensure every operation has at least one auth directive
    for op in schema.operations:
        if not op.get('response_auth_directives') or len(op['response_auth_directives']) == 0:
            raise SchemaValidationError(
                f"Operation '{op['field']}' in schema '{schema.name}' is missing an auth directive. "
                f"Please ensure authConfig is set correctly in the schema YAML."
            )

    # VALIDATION: Ensure every ListResponse type has at least one decorator
    list_response_decorators = set()
    for op in schema.operations:
        if op['type'] == 'Query':
            for d in op.get('response_auth_directives', []):
                list_response_decorators.add(d)
    if not list_response_decorators:
        raise SchemaValidationError(f"No auth decorators found for {schema.name}ListResponse. Please ensure at least one auth directive is present in the schema's authConfig for a Query operation.")

def generate_python_model(table: str, schema: Union[TableSchema, GraphQLType], template_name: str = 'python_model.jinja') -> None:
    logger.debug(f'generate_python_model called for {table}')
    try:
        jinja_env = setup_jinja_env()
        template = jinja_env.get_template(template_name)
        content = template.render(schema=schema, timestamp=datetime.utcnow().isoformat())
        file_name = f'{table}Model.py'
        output_path = os.path.join(SCRIPT_DIR, '..', 'backend', 'src', 'core', 'models', file_name)
        write_file(output_path, content)
        logger.info(f'Generated Python model for {table}')
    except Exception as e:
        logger.error(f'Failed to generate Python model for {table}: {str(e)}')
        raise

def generate_typescript_model(table: str, schema: Union[TableSchema, GraphQLType, StandardType, LambdaType], template_name: str, all_model_names=None, model_imports=None) -> None:
    logger.debug(f'generate_typescript_model called for {table}')
    try:
        jinja_env = setup_jinja_env()
        template = jinja_env.get_template(template_name)
        # Use model_imports from schema if not explicitly provided
        if model_imports is None and hasattr(schema, 'model_imports'):
            model_imports = getattr(schema, 'model_imports')
        content = template.render(schema=schema, timestamp=datetime.utcnow().isoformat(), all_model_names=all_model_names, model_imports=model_imports or [])
        file_name = f'{table}Model.ts'
        output_path = os.path.join(SCRIPT_DIR, '..', 'frontend', 'src', 'app', 'core', 'models', file_name)
        write_file(output_path, content)
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

def generate_graphql_schema(schemas: Dict[str, Union[TableSchema, GraphQLType]], template_path: str) -> str:
    logger.debug('Starting generate_graphql_schema')
    logger.debug(f'Template path: {template_path}')
    logger.debug(f'Schemas dictionary in generate_graphql_schema: {schemas}')
    try:
        jinja_env = setup_jinja_env()
        # Separate schemas by type
        table_schemas = {}
        graphql_types = {}
        for schema_name, schema in schemas.items():
            if isinstance(schema, TableSchema):
                table_schemas[schema_name] = schema
                # Convert TableSchema attributes to fields dictionary
                schema.fields = {attr.name: attr.type for attr in schema.attributes}
                # Always include the primary key as the first index
                primary_index = {
                    'name': 'PrimaryIndex',
                    'type': 'PRIMARY',
                    'partition': schema.partition_key,
                    'sort': schema.sort_key if schema.sort_key and schema.sort_key != 'None' else None,
                    'projection_type': 'ALL',
                    'projected_attributes': []
                }
                schema.indexes = [primary_index] + (schema.secondary_indexes or [])
                # Debug: Print auth_config for this schema
                logger.debug(f"Auth config for {schema.name}: {getattr(schema, 'auth_config', None)}")
                # Build per-query auth directives
                schema.query_auth_directives = {}
                for index in schema.indexes:
                    # QueryBy{Partition}
                    op_name = f"{schema.name}QueryBy{to_pascal_case(index['partition'])}"
                    schema.query_auth_directives[op_name] = get_auth_directives(op_name, schema)
                    # QueryBy{Partition}And{Sort} if sort exists
                    if index.get('sort') and index['sort'] != 'None':
                        op_name_and = f"{schema.name}QueryBy{to_pascal_case(index['partition'])}And{to_pascal_case(index['sort'])}"
                        schema.query_auth_directives[op_name_and] = get_auth_directives(op_name_and, schema)
                # Build per-mutation auth directives using full operation names
                schema.mutation_auth_directives = {}
                for op in ['Create', 'Update']:
                    full_op_name = f"{schema.name}{op}"
                    logger.debug(f"Checking mutation op: {full_op_name} for schema {schema.name}")
                    schema.mutation_auth_directives[full_op_name] = get_auth_directives(full_op_name, schema)
                    logger.debug(f"Directives for {schema.name} {full_op_name}: {schema.mutation_auth_directives[full_op_name]}")
            elif isinstance(schema, GraphQLType):
                graphql_types[schema_name] = schema
            elif isinstance(schema, LambdaType):
                graphql_types[schema_name] = schema
        # Load enums from enums.yml
        enums = {}
        enums_path = os.path.join(SCRIPT_DIR, 'core', 'enums.yml')
        if os.path.exists(enums_path):
            with open(enums_path, 'r') as f:
                enums = yaml.safe_load(f)
        logger.debug(f'Table schemas: {table_schemas}')
        logger.debug(f'GraphQL types: {graphql_types}')
        logger.debug(f'Enums: {enums}')
        # Use the main template
        template = jinja_env.get_template('graphql_schema.jinja')
        schema_content = template.render(
            timestamp=datetime.now().isoformat(),
            table_schemas=table_schemas,
            graphql_types=graphql_types,
            enums=enums
        )
        return schema_content
    except Exception as e:
        logger.error(f'Failed to generate GraphQL schema: {str(e)}')
        raise

def generate_timestamped_schema(schema_content: str) -> str:
    """Generate a timestamped schema file name."""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    return f'appsync_{timestamp}.graphql'

def generate_dynamodb_cloudformation_template(schemas: Dict[str, Union[TableSchema, GraphQLType]], output_path: str) -> None:
    """Generate CloudFormation template for DynamoDB tables only."""
    logger.debug('Starting generate_dynamodb_cloudformation_template')
    try:
        # Filter to only include TableSchema instances
        table_schemas = {name: schema for name, schema in schemas.items() if isinstance(schema, TableSchema)}
        
        # Prepare schemas for template rendering
        for schema in table_schemas.values():
            # Prepare key schema
            schema.key_schema = [
                {'name': schema.partition_key, 'type': 'HASH'}
            ]
            if schema.sort_key and schema.sort_key != 'None':
                schema.key_schema.append({'name': schema.sort_key, 'type': 'RANGE'})
            
            # Prepare attribute definitions
            schema.attribute_definitions = []
            # Add partition key
            schema.attribute_definitions.append({
                'AttributeName': schema.partition_key,
                'AttributeType': to_dynamodb_type(next(attr.type for attr in schema.attributes if attr.name == schema.partition_key))
            })
            # Add sort key if present
            if schema.sort_key and schema.sort_key != 'None':
                schema.attribute_definitions.append({
                    'AttributeName': schema.sort_key,
                    'AttributeType': to_dynamodb_type(next(attr.type for attr in schema.attributes if attr.name == schema.sort_key))
                })
            
            # Prepare GSIs
            if schema.secondary_indexes:
                schema.global_secondary_indexes = []
                schema.local_secondary_indexes = []
                for idx in schema.secondary_indexes:
                    if idx['type'] == 'GSI':
                        gsi = {
                            'IndexName': idx['name'],
                            'KeySchema': [
                                {'AttributeName': idx['partition'], 'KeyType': 'HASH'}
                            ],
                            'Projection': {
                                'ProjectionType': idx['projection_type']
                            }
                        }
                        if idx.get('sort'):
                            gsi['KeySchema'].append({'AttributeName': idx['sort'], 'KeyType': 'RANGE'})
                            # Add sort key to attribute definitions if not already present
                            sort_attr_def = {
                                'AttributeName': idx['sort'],
                                'AttributeType': to_dynamodb_type(next(attr.type for attr in schema.attributes if attr.name == idx['sort']))
                            }
                            if sort_attr_def not in schema.attribute_definitions:
                                schema.attribute_definitions.append(sort_attr_def)
                        
                        # Add partition key to attribute definitions if not already present
                        part_attr_def = {
                            'AttributeName': idx['partition'],
                            'AttributeType': to_dynamodb_type(next(attr.type for attr in schema.attributes if attr.name == idx['partition']))
                        }
                        if part_attr_def not in schema.attribute_definitions:
                            schema.attribute_definitions.append(part_attr_def)
                        
                        if idx['projection_type'] == 'INCLUDE':
                            gsi['Projection']['NonKeyAttributes'] = idx['projected_attributes']
                        
                        schema.global_secondary_indexes.append(gsi)
                    elif idx['type'] == 'LSI':
                        lsi = {
                            'IndexName': idx['name'],
                            'KeySchema': [
                                {'AttributeName': schema.partition_key, 'KeyType': 'HASH'},
                                {'AttributeName': idx['sort'], 'KeyType': 'RANGE'}
                            ],
                            'Projection': {
                                'ProjectionType': idx['projection_type']
                            }
                        }
                        
                        # Add sort key to attribute definitions if not already present
                        sort_attr_def = {
                            'AttributeName': idx['sort'],
                            'AttributeType': to_dynamodb_type(next(attr.type for attr in schema.attributes if attr.name == idx['sort']))
                        }
                        if sort_attr_def not in schema.attribute_definitions:
                            schema.attribute_definitions.append(sort_attr_def)
                        
                        if idx['projection_type'] == 'INCLUDE':
                            lsi['Projection']['NonKeyAttributes'] = idx['projected_attributes']
                        
                        schema.local_secondary_indexes.append(lsi)
        
        jinja_env = setup_jinja_env()
        template = jinja_env.get_template('dynamodb_cloudformation.jinja')
        template_content = template.render(schemas=table_schemas)
        write_file(output_path, template_content)
        logger.debug('Completed generate_dynamodb_cloudformation_template')

    except Exception as e:
        logger.error(f'Failed to generate DynamoDB CloudFormation template: {str(e)}')
        raise

def generate_appsync_cloudformation_template(schemas: Dict[str, Union[TableSchema, GraphQLType, StandardType, LambdaType]], output_path: str, schema_filename: str = None) -> None:
    """Generate CloudFormation template for AppSync, including DynamoDB and Lambda data sources and resolvers."""
    logger.debug('Starting generate_appsync_cloudformation_template')
    try:
        jinja_env = setup_jinja_env()
        # Render the main AppSync CloudFormation template, which now includes both DynamoDB and Lambda data sources/resolvers
        template = jinja_env.get_template('appsync_cloudformation.jinja')
        content = template.render(schemas=schemas, schema_filename=schema_filename)
        write_file(output_path, content)
        logger.info(f'Generated AppSync CloudFormation template at {output_path}')
    except Exception as e:
        logger.error(f'Failed to generate AppSync CloudFormation template: {str(e)}')
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
        template = jinja_env.get_template('typescript_dynamodb_graphql_operations.jinja')
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
        # Disable
        operations.append({
            'name': f'{table}DisableMutation',
            'gql': f'''
mutation {table}Disable($id: ID!) {{
  {table}Disable(id: $id) {{
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
            # QueryBy{Partition}And{Sort} for primary key
            operations.append({
                'name': f'{table}QueryBy{pk_pascal}And{sk_pascal}',
                'gql': f'''
query {table}QueryBy{pk_pascal}And{sk_pascal}($input: {table}QueryBy{pk_pascal}And{sk_pascal}Input!) {{
  {table}QueryBy{pk_pascal}And{sk_pascal}(input: $input) {{
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

def generate_typescript_lambda_graphql_ops(type_name: str, lambda_type) -> None:
    """Generate TypeScript GraphQL operations for lambda types."""
    try:
        jinja_env = setup_jinja_env()
        
        # For lambda-dynamodb types (which are TableSchema instances), build full CRUD operations
        if hasattr(lambda_type, 'partition_key'):
            template = jinja_env.get_template('typescript_lambda_dynamodb_graphql_operations.jinja')
            # This is a lambda-dynamodb type with DynamoDB backing
            processed_schema = copy.deepcopy(lambda_type)
            if not hasattr(processed_schema, 'secondary_indexes') or processed_schema.secondary_indexes is None:
                processed_schema.secondary_indexes = []
            
            pk_pascal = to_pascal_case(lambda_type.partition_key)
            sk_pascal = to_pascal_case(lambda_type.sort_key) if lambda_type.sort_key and lambda_type.sort_key != 'None' else None
            
            # Build CRUD operations
            operations = []
            field_list = "\n      ".join([to_camel_case(attr.name) for attr in lambda_type.attributes])
            
            # Create
            operations.append({
                'name': f'{type_name}CreateMutation',
                'gql': f'''
mutation {type_name}Create($input: {type_name}CreateInput!) {{
  {type_name}Create(input: $input) {{
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
                'name': f'{type_name}UpdateMutation',
                'gql': f'''
mutation {type_name}Update($input: {type_name}UpdateInput!) {{
  {type_name}Update(input: $input) {{
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
                'name': f'{type_name}DeleteMutation',
                'gql': f'''
mutation {type_name}Delete($id: ID!) {{
  {type_name}Delete(id: $id) {{
    StatusCode
    Message
    Data {{
      {field_list}
    }}
  }}
}}'''
            })
            
            # Disable
            operations.append({
                'name': f'{type_name}DisableMutation',
                'gql': f'''
mutation {type_name}Disable($id: ID!) {{
  {type_name}Disable(id: $id) {{
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
                'name': f'{type_name}QueryBy{pk_pascal}',
                'gql': f'''
query {type_name}QueryBy{pk_pascal}($input: {type_name}QueryBy{pk_pascal}Input!) {{
  {type_name}QueryBy{pk_pascal}(input: $input) {{
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
                    'name': f'{type_name}QueryBy{sk_pascal}',
                    'gql': f'''
query {type_name}QueryBy{sk_pascal}($input: {type_name}QueryBy{sk_pascal}Input!) {{
  {type_name}QueryBy{sk_pascal}(input: $input) {{
    StatusCode
    Message
    Data {{
      {field_list}
    }}
  }}
}}'''
                })
                
                # QueryBy{Partition}And{Sort}
                operations.append({
                    'name': f'{type_name}QueryBy{pk_pascal}And{sk_pascal}',
                    'gql': f'''
query {type_name}QueryBy{pk_pascal}And{sk_pascal}($input: {type_name}QueryBy{pk_pascal}And{sk_pascal}Input!) {{
  {type_name}QueryBy{pk_pascal}And{sk_pascal}(input: $input) {{
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
                    'name': f'{type_name}QueryBy{idx_pascal}',
                    'gql': f'''
query {type_name}QueryBy{idx_pascal}($input: {type_name}QueryBy{idx_pascal}Input!) {{
  {type_name}QueryBy{idx_pascal}(input: $input) {{
    StatusCode
    Message
    Data {{
      {field_list}
    }}
  }}
}}'''
                })
            
            content = template.render(schema=processed_schema, operations=operations)
        else:
            # This is a simple lambda type without DynamoDB backing
            template = jinja_env.get_template('typescript_lambda_graphql_operations.jinja')
            schema_data = {
                'name': type_name,
                'attributes': lambda_type.attributes
            }
            content = template.render(schema=schema_data)
        
        # Write to the GraphQL operations file
        output_path = os.path.join(
            SCRIPT_DIR, '..', 'frontend', 'src', 'app', 'core', 'graphql', f'{type_name}.graphql.ts'
        )
        
        write_file(output_path, content)
            
        logger.info(f'Generated TypeScript lambda GraphQL operations at {output_path}')
        
    except Exception as e:
        logger.error(f'Error generating TypeScript lambda GraphQL operations for {type_name}: {str(e)}')
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
    logger.debug(f'generate_typescript_enum called for {enum_name}')
    try:
        jinja_env = setup_jinja_env()
        template = jinja_env.get_template('typescript_enum.jinja')
        enum_content = template.render(enum_name=enum_name, enum_values=enum_values)
        file_name = f'{enum_name}Enum.ts'
        output_path = os.path.join(SCRIPT_DIR, '..', 'frontend', 'src', 'app', 'core', 'models', file_name)
        write_file(output_path, enum_content)
        logger.info(f'Generated TypeScript enum for {enum_name}')
    except Exception as e:
        logger.error(f'Failed to generate TypeScript enum for {enum_name}: {str(e)}')
        raise

def generate_python_enum(enum_name: str, enum_values: list) -> None:
    logger.debug(f'generate_python_enum called for {enum_name}')
    try:
        jinja_env = setup_jinja_env()
        template = jinja_env.get_template('python_enum.jinja')
        enum_content = template.render(enum_name=enum_name, enum_values=enum_values)
        file_name = f'{enum_name}Enum.py'
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
        if fname.endswith('Model.ts') and fname not in valid_model_names:
            os.remove(os.path.join(ts_model_dir, fname))
            logger.info(f'Removed old/incorrect TS model file: {fname}')
        if fname.endswith('Enum.ts') and fname not in valid_enum_names:
            os.remove(os.path.join(ts_model_dir, fname))
            logger.info(f'Removed old/incorrect TS enum file: {fname}')
    # TypeScript GraphQL
    for fname in os.listdir(ts_graphql_dir):
        if fname.endswith('.graphql.ts') and fname not in valid_graphql_names:
            os.remove(os.path.join(ts_graphql_dir, fname))
            logger.info(f'Removed old/incorrect TS GraphQL file: {fname}')
    # Python models/enums
    for fname in os.listdir(py_model_dir):
        if fname.endswith('Model.py') and fname not in valid_model_names:
            os.remove(os.path.join(py_model_dir, fname))
            logger.info(f'Removed old/incorrect Python model file: {fname}')
        if fname.endswith('Enum.py') and fname not in valid_enum_names:
            os.remove(os.path.join(py_model_dir, fname))
            logger.info(f'Removed old/incorrect Python enum file: {fname}')

def generate_all_enums():
    logger.debug('Starting generate_all_enums')
    enums_path = os.path.join(SCRIPT_DIR, 'core', 'enums.yml')
    if not os.path.exists(enums_path):
        logger.warning('enums.yml not found, skipping enum generation.')
        return
    with open(enums_path, 'r') as f:
        enums_data = yaml.safe_load(f)
    for enum_name, enum_values in enums_data.items():
        logger.debug(f'Processing enum: {enum_name}')
        if not isinstance(enum_values, list) or enum_values is None:
            logger.warning(f"Enum {enum_name} is not a list or is None, skipping.")
            continue
        logger.debug(f'Calling generate_typescript_enum for {enum_name}')
        generate_typescript_enum(enum_name, enum_values)
        logger.debug(f'Calling generate_python_enum for {enum_name}')
        generate_python_enum(enum_name, enum_values)
    logger.debug('Completed generate_all_enums')

def prevalidate_appsync_sdl(sdl_path):
    """Validate GraphQL SDL syntax using GraphQL-core library and check AppSync-specific constraints."""
    try:
        from graphql import build_schema, GraphQLError
    except ImportError:
        logger.warning("GraphQL-core not available, falling back to basic validation")
        return _basic_sdl_validation(sdl_path)
    
    with open(sdl_path, 'r', encoding='utf-8') as f:
        sdl = f.read()
    
    errors = []
    
    # Strip AppSync-specific directives for standard GraphQL validation
    # AppSync supports @aws_auth, @aws_api_key, @aws_iam, @aws_oidc, @aws_cognito_user_pools, etc.
    sdl_for_validation = sdl
    
    # Remove all AWS directives with their arguments: @aws_auth(cognito_groups: ["USER"])
    pattern = r'@aws_\w+(\([^)]*\))?'
    sdl_for_validation = re.sub(pattern, '', sdl_for_validation)
    
    # Clean up extra whitespace
    sdl_for_validation = re.sub(r'\s+', ' ', sdl_for_validation)
    sdl_for_validation = re.sub(r'\s*\n\s*', '\n', sdl_for_validation)
    
    # First, try to parse with GraphQL-core for proper SDL validation
    try:
        schema = build_schema(sdl_for_validation)
        logger.info(f"✅ GraphQL SDL syntax validation passed for {sdl_path}")
    except GraphQLError as e:
        errors.append(f"GraphQL SDL syntax error: {str(e)}")
    except Exception as e:
        errors.append(f"GraphQL schema parsing failed: {str(e)}")
    
    # Additional AppSync-specific checks
    lines = sdl.split('\n')
    
    # Check for triple-quoted docstrings (AppSync doesn't support them)
    if '"""' in sdl:
        errors.append("Triple-quoted docstrings (\"\"\" ... \"\"\") are not supported by AppSync")
    
    # Check for leading or trailing backticks
    if sdl.strip().startswith('```') or sdl.strip().endswith('```'):
        errors.append("Leading or trailing backticks (```) are not allowed")
    
    # Check for top-level # comments (AppSync doesn't support them)
    for line_num, line in enumerate(lines, 1):
        line_stripped = line.strip()
        if line_stripped.startswith('#'):
            errors.append(f"Line {line_num}: Top-level # comments are not supported by AppSync: {line_stripped}")
        
        # Check for very long lines that might cause parsing issues
        if len(line) > 500:
            errors.append(f"Line {line_num}: Very long line ({len(line)} chars) - may cause parsing issues")
    
    if errors:
        logger.error(f"[ERROR] AppSync SDL validation failed for {sdl_path}:")
        for error in errors:
            logger.error(f"  • {error}")
        sys.exit(1)
    
    logger.info(f"✅ AppSync SDL validation passed for {sdl_path}")

def _basic_sdl_validation(sdl_path):
    """Fallback basic validation when GraphQL-core is not available."""
    with open(sdl_path, 'r', encoding='utf-8') as f:
        sdl = f.read()
    
    errors = []
    
    # Basic checks
    if '"""' in sdl:
        errors.append("Triple-quoted docstrings are not allowed")
    
    if sdl.strip().startswith('```') or sdl.strip().endswith('```'):
        errors.append("Leading or trailing backticks are not allowed")
    
    if 'schema {' not in sdl:
        errors.append("Missing schema definition block")
    
    # Check for top-level comments
    for line_num, line in enumerate(sdl.split('\n'), 1):
        if line.strip().startswith('#'):
            errors.append(f"Line {line_num}: Top-level # comments are not allowed")
    
    if errors:
        logger.error(f"[ERROR] Basic SDL validation failed for {sdl_path}:")
        for error in errors:
            logger.error(f"  • {error}")
        sys.exit(1)
    
    logger.info(f"Basic SDL validation passed for {sdl_path}")

def generate_python_registry(name: str, schema: RegistryType) -> None:
    try:
        jinja_env = setup_jinja_env()
        template = jinja_env.get_template('python_registry.jinja')
        content = template.render(schema=schema)
        file_name = f'{name}Model.py'
        output_path = os.path.join(SCRIPT_DIR, '..', 'backend', 'src', 'core', 'models', file_name)
        write_file(output_path, content)
        logger.info(f'Generated Python registry model for {name}')
    except Exception as e:
        logger.error(f'Failed to generate Python registry model for {name}: {str(e)}')
        raise

def generate_typescript_registry(name: str, schema: RegistryType) -> None:
    try:
        jinja_env = setup_jinja_env()
        template = jinja_env.get_template('typescript_registry.jinja')
        content = template.render(schema=schema)
        file_name = f'{name}Model.ts'
        output_path = os.path.join(SCRIPT_DIR, '..', 'frontend', 'src', 'app', 'core', 'models', file_name)
        write_file(output_path, content)
        logger.info(f'Generated TypeScript registry model for {name}')
    except Exception as e:
        logger.error(f'Failed to generate TypeScript registry model for {name}: {str(e)}')
        raise

def load_schemas() -> dict:
    """
    Load all schema YAML files from schemas/entities/ and return a dict of schema objects keyed by name.
    """
    schemas_dir = os.path.join(SCRIPT_DIR, 'entities')
    schema_files = glob.glob(os.path.join(schemas_dir, '*.yml'))
    schemas = {}
    # First pass: collect all model names
    model_names = set()
    for schema_file in schema_files:
        schema_dict = load_schema(schema_file)
        schema_name = schema_dict.get('name')
        model_names.add(schema_name)
    for schema_file in schema_files:
        schema_dict = load_schema(schema_file)
        schema_type = schema_dict.get('type')
        schema_name = schema_dict.get('name')
        if schema_type == 'dynamodb':
            model = schema_dict['model']
            attributes = []
            for attr_name, attr_info in model['attributes'].items():
                dto_type = attr_info['type']
                if attr_name in ['emailVerified', 'phoneVerified', 'isSignedIn', 'needsMFA', 'needsMFASetup']:
                    dto_type = 'string | boolean'
                attr = Attribute(
                    name=attr_name,
                    type=attr_info['type'],
                    description=attr_info.get('description', ''),
                    required=attr_info.get('required', True),
                    enum_type=attr_info.get('enum_type'),
                    enum_values=attr_info.get('enum_values')
                )
                setattr(attr, 'dto_type', dto_type)
                # Patch: mark as model_reference if type matches a known model
                if attr.type in model_names:
                    setattr(attr, 'model_reference', attr.type)
                attributes.append(attr)
            keys = model['keys']
            partition_key = keys['primary']['partition']
            sort_key = keys['primary'].get('sort', 'None')
            secondary_indexes = keys.get('secondary', [])
            auth_config = model.get('authConfig')
            stream_config = model.get('stream')
            schema_obj = TableSchema(
                name=schema_name,
                attributes=attributes,
                partition_key=partition_key,
                sort_key=sort_key,
                secondary_indexes=secondary_indexes,
                auth_config=auth_config,
                type='dynamodb',
                stream=stream_config
            )
            schemas[schema_name] = schema_obj
        elif schema_type == 'registry':
            schema_obj = RegistryType(
                name=schema_name,
                items=schema_dict['items'],
                description=schema_dict.get('description'),
                type='registry'
            )
            schemas[schema_name] = schema_obj
        elif schema_type == 'standard':
            model = schema_dict['model']
            attributes = []
            referenced_models = set()
            for attr_name, attr_info in model['attributes'].items():
                attr = Attribute(
                    name=attr_name,
                    type=attr_info['type'],
                    description=attr_info.get('description', ''),
                    required=attr_info.get('required', True),
                    enum_type=attr_info.get('enum_type'),
                    enum_values=attr_info.get('enum_values')
                )
                # If the type matches a known model, mark as model_reference and add to referenced_models
                if attr.type in model_names:
                    setattr(attr, 'model_reference', attr.type)
                    referenced_models.add(attr.type)
                attributes.append(attr)
            schema_obj = StandardType(
                name=schema_name,
                attributes=attributes,
                description=schema_dict.get('description'),
                type='standard'
            )
            # Attach referenced models for use in template rendering
            setattr(schema_obj, 'model_imports', sorted(referenced_models))
            schemas[schema_name] = schema_obj
        elif schema_type == 'lambda':
            model = schema_dict['model']
            attributes = []
            referenced_models = set()
            for attr_name, attr_info in model['attributes'].items():
                attr = Attribute(
                    name=attr_name,
                    type=attr_info['type'],
                    description=attr_info.get('description', ''),
                    required=attr_info.get('required', True),
                    enum_type=attr_info.get('enum_type'),
                    enum_values=attr_info.get('enum_values')
                )
                # If the type matches a known model, mark as model_reference and add to referenced_models
                if attr.type in model_names:
                    setattr(attr, 'model_reference', attr.type)
                    referenced_models.add(attr.type)
                attributes.append(attr)
            
            # Extract auth_config from the model
            auth_config = model.get('authConfig')
            
            schema_obj = LambdaType(
                name=schema_name,
                attributes=attributes,
                description=schema_dict.get('description'),
                type='lambda',
                auth_config=auth_config
            )
            # Attach referenced models for use in template rendering
            setattr(schema_obj, 'model_imports', sorted(referenced_models))
            schemas[schema_name] = schema_obj
        elif schema_type == 'lambda-dynamodb':
            # lambda-dynamodb type: combines DynamoDB table generation with Lambda resolver
            model = schema_dict['model']
            attributes = []
            for attr_name, attr_info in model['attributes'].items():
                dto_type = attr_info['type']
                if attr_name in ['emailVerified', 'phoneVerified', 'isSignedIn', 'needsMFA', 'needsMFASetup']:
                    dto_type = 'string | boolean'
                attr = Attribute(
                    name=attr_name,
                    type=attr_info['type'],
                    description=attr_info.get('description', ''),
                    required=attr_info.get('required', True),
                    enum_type=attr_info.get('enum_type'),
                    enum_values=attr_info.get('enum_values')
                )
                setattr(attr, 'dto_type', dto_type)
                # Patch: mark as model_reference if type matches a known model
                if attr.type in model_names:
                    setattr(attr, 'model_reference', attr.type)
                attributes.append(attr)
            keys = model['keys']
            partition_key = keys['primary']['partition']
            sort_key = keys['primary'].get('sort', 'None')
            secondary_indexes = keys.get('secondary', [])
            auth_config = model.get('authConfig')
            stream_config = model.get('stream')
            schema_obj = TableSchema(
                name=schema_name,
                attributes=attributes,
                partition_key=partition_key,
                sort_key=sort_key,
                secondary_indexes=secondary_indexes,
                auth_config=auth_config,
                type='lambda-dynamodb',
                stream=stream_config
            )
            schemas[schema_name] = schema_obj
        else:
            # Fallback: treat as GraphQLType
            model = schema_dict['model']
            attributes = []
            for attr_name, attr_info in model['attributes'].items():
                dto_type = attr_info['type']
                if attr_name in ['emailVerified', 'phoneVerified', 'isSignedIn', 'needsMFA', 'needsMFASetup']:
                    dto_type = 'string | boolean'
                attr = Attribute(
                    name=attr_name,
                    type=attr_info['type'],
                    description=attr_info.get('description', ''),
                    required=attr_info.get('required', True),
                    enum_type=attr_info.get('enum_type'),
                    enum_values=attr_info.get('enum_values')
                )
                setattr(attr, 'dto_type', dto_type)
                # Patch: mark as model_reference if type matches a known model
                if attr.type in model_names:
                    setattr(attr, 'model_reference', attr.type)
                attributes.append(attr)
            auth_config = model.get('authConfig')
            schema_obj = GraphQLType(
                name=schema_name,
                attributes=attributes,
                description=schema_dict.get('description'),
                auth_config=auth_config
            )
            schemas[schema_name] = schema_obj
    return schemas

def generate_dynamodb_repository(schemas: dict) -> None:
    """
    Generate a Python file mapping entity names to DynamoDB table environment variable names.
    Output: backend/src/core/models/dynamodb.repository.py
    """
    output_path = os.path.join(SCRIPT_DIR, '..', 'backend', 'src', 'core', 'models', 'dynamodb.repository.py')
    lines = [
        '# Auto-generated by generate.py. Do not edit manually.',
        'ENTITY_TABLE_ENV = {'
    ]
    for entity, schema in schemas.items():
        if hasattr(schema, 'type') and getattr(schema, 'type', None) == 'dynamodb':
            env_var = f"{entity.upper()}_TABLE"
            lines.append(f'    "{entity}": "{env_var}",')
    lines.append('}')
    content = '\n'.join(lines) + '\n'
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)
    logger.info(f'Generated DynamoDB repository mapping at {output_path}')

def main():
    logger.debug('DEBUG: main() started')
    try:
        jinja_env = setup_jinja_env()
        logger.debug('Loaded Jinja environment')
        schemas = load_schemas()  # Use the correct load_schemas
        logger.debug('Loaded schemas')

        # Generate the DynamoDB repository mapping file
        generate_dynamodb_repository(schemas)
        # Attach CRUD operations to all TableSchema instances
        for table, schema in schemas.items():
            if isinstance(schema, TableSchema):
                build_crud_operations_for_table(schema)
                logger.info(f"Table {table} operations: {getattr(schema, 'operations', None)}")
        # Build valid file name sets
        valid_model_names = set()
        valid_enum_names = set()
        valid_graphql_names = set()
        all_model_names = list(schemas.keys())
        for table, schema in schemas.items():
            if isinstance(schema, TableSchema):
                valid_model_names.add(f'{table}Model.ts')
                valid_model_names.add(f'{table}Model.py')
                valid_graphql_names.add(f'{table}.graphql.ts')
            elif isinstance(schema, GraphQLType):
                valid_model_names.add(f'{table}Model.ts')
                valid_model_names.add(f'{table}Model.py')
            elif isinstance(schema, RegistryType):
                valid_model_names.add(f'{table}Model.py')
                valid_model_names.add(f'{table}Model.ts')
            elif isinstance(schema, LambdaType):
                valid_model_names.add(f'{table}Model.ts')
                valid_model_names.add(f'{table}Model.py')
            elif isinstance(schema, StandardType):
                valid_model_names.add(f'{table}Model.ts')
                valid_model_names.add(f'{table}Model.py')
        enums_path = os.path.join(SCRIPT_DIR, 'core', 'enums.yml')
        if os.path.exists(enums_path):
            with open(enums_path, 'r') as f:
                enums_data = yaml.safe_load(f)
            for enum_name in enums_data:
                if isinstance(enums_data[enum_name], list):
                    valid_enum_names.add(f'{enum_name}Enum.ts')
                    valid_enum_names.add(f'{enum_name}Enum.py')
        logger.debug('Cleaning up old files')
        cleanup_old_files(valid_model_names, valid_enum_names, valid_graphql_names)
        logger.debug('Generating models and GraphQL ops for table-backed schemas')
        for table, schema in schemas.items():
            schema_type = getattr(schema, 'type', None)
            if schema_type == 'dynamodb':
                logger.debug(f'Generating models and ops for table: {table}')
                generate_python_model(table, schema)
                generate_typescript_model(table, schema, template_name='typescript_dynamodb.jinja', all_model_names=all_model_names)
                generate_typescript_graphql_ops(table, schema)
            elif schema_type == 'standard':
                logger.debug(f'Generating standard model for type: {table}')
                generate_python_model(table, schema, template_name='python_standard.jinja')
                generate_typescript_model(table, schema, template_name='typescript_standard.jinja', all_model_names=all_model_names)
            elif schema_type == 'graphql':
                logger.debug(f'Generating GraphQL-only model for type: {table}')
                generate_typescript_model(table, schema, template_name='typescript_graphql_model.jinja', all_model_names=all_model_names)
            elif schema_type == 'registry':
                logger.debug(f'Generating registry model for type: {table}')
                generate_python_registry(table, schema)
                generate_typescript_registry(table, schema)
            elif schema_type == 'lambda':
                logger.debug(f'Generating lambda model for type: {table}')
                generate_python_model(table, schema, template_name='python_lambda.jinja')
                generate_typescript_model(table, schema, template_name='typescript_lambda_model.jinja', all_model_names=all_model_names)
                generate_typescript_lambda_graphql_ops(table, schema)
            elif schema_type == 'lambda-dynamodb':
                logger.debug(f'Generating lambda-dynamodb model for type: {table}')
                # Generate DynamoDB table (like dynamodb type)
                generate_python_model(table, schema)
                generate_typescript_model(table, schema, template_name='typescript_dynamodb.jinja', all_model_names=all_model_names)
                # Generate Lambda GraphQL operations (like lambda type)
                generate_typescript_lambda_graphql_ops(table, schema)
            else:
                logger.error(f'Unknown or unsupported schema type: {schema_type} for {table}')
                raise ValueError(f"Unknown schema type: {schema_type} for {table}")
        logger.debug('Generating all enums')
        generate_all_enums()
        logger.debug('Generating base GraphQL schema')
        graphql_template_path = os.path.join(SCRIPT_DIR, 'templates', 'graphql_schema.jinja')
        graphql_schema = generate_graphql_schema(schemas, graphql_template_path)
        timestamped_schema = generate_timestamped_schema(graphql_schema)
        schema_output_path = os.path.join(SCRIPT_DIR, '..', 'infrastructure', 'cloudformation', timestamped_schema)
        write_file(schema_output_path, graphql_schema)
        logger.info(f'Generated timestamped schema file: {timestamped_schema}')
        # Extra AppSync prevalidation
        prevalidate_appsync_sdl(schema_output_path)
        # (Manual) AWS CLI-based AppSync schema validation can be run separately if needed
        logger.debug('Generating DynamoDB CloudFormation template')
        dynamodb_output_path = os.path.join(SCRIPT_DIR, '..', 'infrastructure', 'cloudformation', 'dynamodb.yml')
        generate_dynamodb_cloudformation_template(schemas, dynamodb_output_path)
        # Generate AppSync CloudFormation template
        logger.debug('Generating AppSync CloudFormation template')
        appsync_output_path = os.path.join(SCRIPT_DIR, '..', 'infrastructure', 'cloudformation', 'appsync.yml')
        generate_appsync_cloudformation_template(schemas, appsync_output_path, timestamped_schema)
        logger.info('Schema generation completed successfully')
    except Exception as e:
        logger.error(f"DEBUG: Exception in main(): {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()