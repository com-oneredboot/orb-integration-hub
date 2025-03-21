# files: schemas/generate.py
# author: Corey Dale Peters
# date: 2025-02-20
# description: This file is used to generate TypeScript, Python, and GraphQL schema models from schema files
# defined in index.yml.

# Standard library imports
import os
import sys
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime

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

def setup_jinja_env() -> Environment:
    """
    Set up the Jinja environment with custom filters and globals.
    
    Returns:
        Configured Jinja environment
    """
    env = Environment(
        loader=FileSystemLoader(os.path.join(SCRIPT_DIR, 'templates')),
        autoescape=select_autoescape(['html', 'xml'])
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
        required_keys = ['version', 'table', 'model']
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

def generate_python_model(table_name: str, schema_path: str, jinja_env: Environment) -> bool:
    """
    Generate Python model from schema.
    
    Args:
        table_name: Name of the table/model to generate
        schema_path: Path to the schema file
        jinja_env: Jinja environment
        
    Returns:
        Boolean indicating success or failure
    """
    try:
        # Load and validate schema
        schema = load_schema(schema_path)
        validate_schema(schema)
        
        # Process field types
        for field_name, field_info in schema['model']['attributes'].items():
            schema['model']['attributes'][field_name] = process_field_type(field_name, field_info)
        
        # Generate model name
        model_name = table_name[:-1].capitalize() if table_name.endswith('s') else table_name.capitalize()
        
        # Load template and render
        template = jinja_env.get_template('python_model.jinja')
        output = template.render(
            model_name=model_name,
            version=schema['version'],
            attributes=schema['model']['attributes']
        )
        
        # Write output
        output_path = os.path.join(SCRIPT_DIR, '..', 'backend', 'src', 'models', f'{table_name}.py')
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        with open(output_path, 'w') as f:
            f.write(output)
        
        logger.info(f"Generated Python model for {table_name}")
        return True
        
    except Exception as e:
        logger.error(f"Error generating Python model for {table_name}: {str(e)}")
        return False

def generate_typescript_model(table_name: str, schema_path: str, jinja_env: Environment) -> bool:
    """
    Generate TypeScript model from schema.
    
    Args:
        table_name: Name of the table/model to generate
        schema_path: Path to the schema file
        jinja_env: Jinja environment
        
    Returns:
        Boolean indicating success or failure
    """
    try:
        # Load and validate schema
        schema = load_schema(schema_path)
        validate_schema(schema)
        
        # Process field types
        for field_name, field_info in schema['model']['attributes'].items():
            schema['model']['attributes'][field_name] = process_field_type(field_name, field_info)
        
        # Generate model name
        model_name = table_name[:-1].capitalize() if table_name.endswith('s') else table_name.capitalize()
        
        # Load template and render
        template = jinja_env.get_template('typescript_model.jinja')
        output = template.render(
            model_name=model_name,
            version=schema['version'],
            attributes=schema['model']['attributes']
        )
        
        # Write output
        output_path = os.path.join(SCRIPT_DIR, '..', 'frontend', 'src', 'app', 'core', 'models', f'{table_name}.model.ts')
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        with open(output_path, 'w') as f:
            f.write(output)
        
        logger.info(f"Generated TypeScript model for {table_name}")
        return True
        
    except Exception as e:
        logger.error(f"Error generating TypeScript model for {table_name}: {str(e)}")
        return False

def generate_dynamodb_table(table_name: str, schema_path: str, jinja_env: Environment) -> bool:
    """
    Generate DynamoDB table definition.
    
    Args:
        table_name: Name of the table
        schema_path: Path to the schema file
        jinja_env: Jinja environment
        
    Returns:
        True if successful, False otherwise
    """
    try:
        schema = load_schema(schema_path)
        validate_schema(schema)
        
        # Get template
        template = jinja_env.get_template('dynamodb_table.jinja')
        
        # Generate table definition
        table_content = template.render(
            table_name=table_name,
            model_name=table_name.replace('_', ' ').title(),
            **schema['model']
        )
        
        # Write table definition to file
        output_dir = os.path.join(SCRIPT_DIR, '../backend/infrastructure/cloudformation')
        os.makedirs(output_dir, exist_ok=True)
        
        # Use snake_case for file name
        file_name = f"{table_name}_table.yml"
        output_path = os.path.join(output_dir, file_name)
        
        with open(output_path, 'w') as f:
            f.write(table_content)
            
        logger.info(f"Generated DynamoDB table definition for {table_name}")
        return True
        
    except Exception as e:
        logger.error(f"Error generating DynamoDB table definition for {table_name}: {str(e)}")
        return False

def generate_graphql_schema(table_name: str, schema_path: str, jinja_env: Environment) -> bool:
    """
    Generate GraphQL schema for a table.
    
    Args:
        table_name: Name of the table
        schema_path: Path to the schema file
        jinja_env: Jinja environment
        
    Returns:
        True if successful, False otherwise
    """
    try:
        schema = load_schema(schema_path)
        validate_schema(schema)
        
        # Get template
        template = jinja_env.get_template('graphql_schema.jinja')
        
        # Generate schema
        schema_content = template.render(
            table_name=table_name,
            model_name=table_name.replace('_', ' ').title().replace(' ', ''),
            attributes=schema['model']['attributes'],
            partition_key=schema['model']['keys']['primary']['partition'],
            sort_key=schema['model']['keys']['primary'].get('sort'),
            auth_config=schema['model'].get('auth_config', {})
        )
        
        # Write schema to file
        output_dir = os.path.join(SCRIPT_DIR, '../backend/infrastructure/cloudformation')
        os.makedirs(output_dir, exist_ok=True)
        
        # Use snake_case for file name
        file_name = f"{table_name}_schema.graphql"
        output_path = os.path.join(output_dir, file_name)
        
        with open(output_path, 'w') as f:
            f.write(schema_content)
            
        logger.info(f"Generated GraphQL schema for {table_name}")
        return True
        
    except Exception as e:
        logger.error(f"Error generating GraphQL schema for {table_name}: {str(e)}")
        return False

def generate_graphql_base_schema(schemas: List[Dict[str, Any]], jinja_env: Environment) -> bool:
    """
    Generate base GraphQL schema that includes all model schemas.
    
    Args:
        schemas: List of schema dictionaries
        jinja_env: Jinja environment
        
    Returns:
        Boolean indicating success or failure
    """
    try:
        # Load template and render
        template = jinja_env.get_template('graphql_schema_base.jinja')
        
        # Prepare model schemas
        model_schemas = []
        for schema in schemas:
            table_name = schema['table']
            model_name = table_name[:-1].capitalize() if table_name.endswith('s') else table_name.capitalize()
            
            # Read the generated schema file
            schema_file = os.path.join(SCRIPT_DIR, '../backend/infrastructure/cloudformation', f"{table_name}_schema.graphql")
            try:
                with open(schema_file, 'r') as f:
                    model_schemas.append(f.read())
            except FileNotFoundError:
                logger.error(f"Error generating base GraphQL schema: [Errno 2] No such file or directory: '{schema_file}'")
                return False
        
        # Generate base schema
        base_schema = template.render(
            model_schemas=model_schemas,
            timestamp=datetime.now().strftime('%Y%m%d_%H%M%S')
        )
        
        # Write base schema to file
        output_dir = os.path.join(SCRIPT_DIR, '../backend/infrastructure/cloudformation')
        os.makedirs(output_dir, exist_ok=True)
        
        # Generate timestamped schema file
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_path = os.path.join(output_dir, f'appsync_{timestamp}.graphql')
        
        with open(output_path, 'w') as f:
            f.write(base_schema)
            
        logger.info(f"Generated timestamped schema file: appsync_{timestamp}.graphql")
        return True
        
    except Exception as e:
        logger.error(f"Error generating base GraphQL schema: {str(e)}")
        return False

def generate_cloudformation_template(schemas: List[Dict[str, Any]], jinja_env: Environment) -> bool:
    """
    Generate the main CloudFormation template that combines all table definitions.
    
    Args:
        schemas: List of schema dictionaries
        jinja_env: Jinja environment
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Load the base template
        template = jinja_env.get_template('dynamodb_cloudformation_base.jinja')
        
        # Generate the template content
        template_content = template.render(schemas=schemas)
        
        # Write the template to the output file
        output_path = os.path.join(SCRIPT_DIR, '..', 'backend', 'infrastructure', 'cloudformation', 'dynamodb.yml')
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        with open(output_path, 'w') as f:
            f.write(template_content)
            
        logger.info("Generated CloudFormation template")
        return True
        
    except Exception as e:
        logger.error(f"Failed to generate CloudFormation template: {str(e)}")
        return False

def generate_timestamped_schema(schema_content: str) -> str:
    """
    Generate a timestamped schema file name and write the content.
    
    Args:
        schema_content: The content of the schema to write
        
    Returns:
        The filename of the generated schema
    """
    try:
        # Generate timestamp in format YYYYMMDD_HHMMSS
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"appsync_{timestamp}.graphql"
        
        # Write the schema file to backend/infrastructure/cloudformation directory
        output_path = os.path.join(SCRIPT_DIR, '..', 'backend', 'infrastructure', 'cloudformation', filename)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        with open(output_path, 'w') as f:
            f.write(schema_content)
        
        logger.info(f"Generated timestamped schema file: {filename}")
        return filename
        
    except Exception as e:
        logger.error(f"Error generating timestamped schema: {str(e)}")
        return None

def main():
    """Main entry point for schema generation"""
    try:
        # Set up Jinja environment
        jinja_env = setup_jinja_env()
        
        # Load schema registry
        index = load_index()
        
        # Process each table
        schemas = []
        for table in index['schemaRegistry']['tables']:
            table_name = table['name']
            schema_path = table['path']
            
            logger.info(f"Processing table: {table_name}")
            
            try:
                # Load schema for later use
                schema = load_schema(schema_path)
                schemas.append(schema)
                
                # Generate models and infrastructure
                python_success = generate_python_model(table_name, schema_path, jinja_env)
                typescript_success = generate_typescript_model(table_name, schema_path, jinja_env)
                dynamodb_success = generate_dynamodb_table(table_name, schema_path, jinja_env)
                graphql_success = generate_graphql_schema(table_name, schema_path, jinja_env)
                
                if not python_success or not typescript_success or not dynamodb_success or not graphql_success:
                    logger.error(f"Failed to generate files for table: {table_name}")
                    sys.exit(1)
            except Exception as e:
                logger.error(f"Failed to process table {table_name}: {str(e)}")
                sys.exit(1)
        
        # Generate base GraphQL schema
        if not generate_graphql_base_schema(schemas, jinja_env):
            logger.error("Failed to generate base GraphQL schema")
            sys.exit(1)
            
        # Find the latest generated schema file
        cloudformation_dir = os.path.join(SCRIPT_DIR, '..', 'backend', 'infrastructure', 'cloudformation')
        schema_files = [f for f in os.listdir(cloudformation_dir) if f.startswith('appsync_') and f.endswith('.graphql')]
        if not schema_files:
            logger.error("No generated schema files found")
            sys.exit(1)
            
        latest_schema = max(schema_files, key=lambda x: os.path.getctime(os.path.join(cloudformation_dir, x)))
        schema_path = os.path.join(cloudformation_dir, latest_schema)
        
        # Read the latest schema
        with open(schema_path, 'r') as f:
            schema_content = f.read()
            
        # Generate timestamped schema
        timestamped_filename = generate_timestamped_schema(schema_content)
        if not timestamped_filename:
            logger.error("Failed to generate timestamped schema")
            sys.exit(1)
            
        # Generate CloudFormation template
        if not generate_cloudformation_template(schemas, jinja_env):
            logger.error("Failed to generate CloudFormation template")
            sys.exit(1)
        
        logger.info("Schema generation completed successfully")
        
    except Exception as e:
        logger.error(f"Schema generation failed: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main()