"""Schema loading functionality."""

import os
import re
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Union
from datetime import datetime

import yaml

from orb_schema_generator.core.models import (
    Schema, SchemaType, SchemaField, SchemaIndex, 
    AuthConfig, CustomQuery, Operation, OperationType,
    IndexType, ProjectionType, SchemaCollection
)
from orb_schema_generator.core.exceptions import SchemaError, ValidationError


logger = logging.getLogger(__name__)


class SchemaLoader:
    """Loads schemas from YAML files and converts to domain models."""
    
    def __init__(self, base_path: Optional[str] = None):
        """Initialize loader with optional base path."""
        self.base_path = Path(base_path) if base_path else Path.cwd()
        self.loaded_schemas: SchemaCollection = SchemaCollection()
        
    def load_file(self, file_path: Union[str, Path]) -> Schema:
        """Load a single schema file.
        
        Args:
            file_path: Path to the schema YAML file
            
        Returns:
            Parsed Schema object
            
        Raises:
            SchemaError: If file not found or parsing fails
        """
        file_path = Path(file_path)
        if not file_path.is_absolute():
            file_path = self.base_path / file_path
            
        logger.info(f"Loading schema file: {file_path}")
        
        if not file_path.exists():
            logger.error(f"Schema file not found: {file_path}")
            raise SchemaError(f"Schema file not found: {file_path}")
            
        try:
            with open(file_path, 'r') as f:
                data = yaml.safe_load(f)
            logger.debug(f"Successfully parsed YAML from {file_path}")
        except yaml.YAMLError as e:
            logger.error(f"Failed to parse YAML file {file_path}: {e}")
            raise SchemaError(f"Failed to parse YAML file {file_path}: {e}")
            
        return self._parse_schema(data, str(file_path))
        
    def load_directory(self, directory: Union[str, Path], pattern: str = "*.yml") -> SchemaCollection:
        """Load all schema files from a directory."""
        directory = Path(directory)
        if not directory.is_absolute():
            directory = self.base_path / directory
            
        if not directory.exists():
            raise SchemaError(f"Schema directory not found: {directory}")
            
        schema_files = list(directory.glob(pattern))
        if not schema_files:
            logger.warning(f"No schema files found in {directory} matching pattern '{pattern}'")
            
        for file_path in schema_files:
            try:
                schema = self.load_file(file_path)
                self.loaded_schemas.add_schema(schema)
            except Exception as e:
                logger.error(f"Failed to load schema from {file_path}: {e}")
                raise
                
        return self.loaded_schemas
        
    def load_index_file(self, index_path: Union[str, Path]) -> SchemaCollection:
        """Load schemas referenced in an index.yml file."""
        index_path = Path(index_path)
        if not index_path.is_absolute():
            index_path = self.base_path / index_path
            
        try:
            with open(index_path, 'r') as f:
                index_data = yaml.safe_load(f)
        except yaml.YAMLError as e:
            raise SchemaError(f"Failed to parse index file {index_path}: {e}")
            
        # Load schemas from different sections
        sections = ['entities', 'core', 'types', 'registries']
        base_dir = index_path.parent
        
        for section in sections:
            if section in index_data:
                section_dir = base_dir / section
                for schema_file in index_data[section]:
                    file_path = section_dir / f"{schema_file}.yml"
                    try:
                        schema = self.load_file(file_path)
                        self.loaded_schemas.add_schema(schema)
                    except Exception as e:
                        logger.error(f"Failed to load schema from {file_path}: {e}")
                        raise
                        
        return self.loaded_schemas
        
    def _parse_schema(self, data: Dict[str, Any], file_path: str) -> Schema:
        """Parse schema data into domain model.
        
        Args:
            data: Parsed YAML data
            file_path: Source file path for error reporting
            
        Returns:
            Parsed Schema object
            
        Raises:
            ValidationError: If required fields are missing
        """
        # Validate required fields
        if 'name' not in data:
            raise ValidationError(f"Schema must have a 'name' field: {file_path}")
        if 'type' not in data:
            raise ValidationError(f"Schema must have a 'type' field: {file_path}")
            
        schema_name = data['name']
        logger.debug(f"Parsing schema '{schema_name}' from {file_path}")
        
        # Determine schema type
        schema_type = self._get_schema_type(data['type'])
        
        # Create base schema
        schema = Schema(
            name=schema_name,
            schema_type=schema_type,
            description=data.get('description'),
            version=data.get('version', '1.0.0'),
            source_file=file_path,
            last_modified=datetime.now().isoformat()
        )
        
        logger.info(f"Created {schema_type.value} schema '{schema_name}'")
        
        # Parse based on type
        if schema_type == SchemaType.REGISTRY:
            self._parse_registry_schema(schema, data)
        else:
            if 'model' not in data:
                raise ValidationError(f"Non-registry schema must have a 'model' field: {file_path}")
            self._parse_model_schema(schema, data['model'], schema_type)
            
        # Parse auth config if present
        if 'model' in data and 'authConfig' in data['model']:
            schema.auth_config = self._parse_auth_config(data['model']['authConfig'])
            
        return schema
        
    def _get_schema_type(self, type_str: str) -> SchemaType:
        """Convert string type to SchemaType enum."""
        type_mapping = {
            'dynamodb': SchemaType.DYNAMODB,
            'graphql': SchemaType.GRAPHQL,
            'lambda': SchemaType.LAMBDA,
            'standard': SchemaType.STANDARD,
            'static': SchemaType.STANDARD,  # static is alias for standard
            'registry': SchemaType.REGISTRY
        }
        
        schema_type = type_mapping.get(type_str.lower())
        if not schema_type:
            raise ValidationError(f"Unknown schema type: {type_str}")
            
        return schema_type
        
    def _parse_registry_schema(self, schema: Schema, data: Dict[str, Any]) -> None:
        """Parse registry-specific schema data."""
        if 'items' not in data:
            raise ValidationError(f"Registry schema '{schema.name}' must have an 'items' block")
            
        items = data['items']
        if not isinstance(items, dict):
            raise ValidationError(f"Registry 'items' must be a dict in '{schema.name}'")
            
        schema.registry_items = {}
        for code, entry in items.items():
            if not isinstance(entry, dict):
                raise ValidationError(f"Registry item '{code}' must be a dict in '{schema.name}'")
                
            # Validate required fields
            required_fields = ['message', 'description', 'solution']
            for field in required_fields:
                if field not in entry:
                    raise ValidationError(
                        f"Registry item '{code}' missing required field '{field}' in '{schema.name}'"
                    )
                    
            schema.registry_items[code] = entry
            
    def _parse_model_schema(self, schema: Schema, model: Dict[str, Any], schema_type: SchemaType) -> None:
        """Parse model-based schema data."""
        # Validate attributes exist
        if 'attributes' not in model:
            raise ValidationError(f"Schema model must have 'attributes' field")
            
        # Parse attributes into fields
        attributes = model['attributes']
        if not isinstance(attributes, dict):
            raise ValidationError(f"Model attributes must be a dictionary")
            
        for attr_name, attr_data in attributes.items():
            field = self._parse_field(attr_name, attr_data)
            schema.fields.append(field)
            
        # Parse DynamoDB-specific fields
        if schema_type == SchemaType.DYNAMODB:
            self._parse_dynamodb_model(schema, model)
            
        # Parse custom queries if present
        if 'customQueries' in model:
            for query_data in model['customQueries']:
                query = self._parse_custom_query(query_data)
                schema.custom_queries.append(query)
                
    def _parse_field(self, name: str, data: Union[Dict[str, Any], str]) -> SchemaField:
        """Parse a field definition."""
        # Handle simple string type
        if isinstance(data, str):
            return SchemaField(name=name, type=data)
            
        # Handle dictionary definition
        field_data = {
            'name': name,
            'type': data.get('type', 'string'),
            'required': data.get('required', False),
            'description': data.get('description'),
            'validation': data.get('validation'),
            'enum_type': data.get('enum'),
            'items': data.get('items'),
            'unique': data.get('unique', False),
            'indexed': data.get('indexed', False),
            'default': data.get('default')
        }
        
        # Handle enum values
        if 'values' in data:
            field_data['enum_values'] = data['values']
            
        return SchemaField(**field_data)
        
    def _parse_dynamodb_model(self, schema: Schema, model: Dict[str, Any]) -> None:
        """Parse DynamoDB-specific model data."""
        if 'keys' not in model:
            raise ValidationError(f"DynamoDB schema '{schema.name}' must have 'keys' field")
            
        keys = model['keys']
        
        # Parse primary key
        if 'primary' not in keys:
            raise ValidationError(f"DynamoDB schema '{schema.name}' must have primary key")
            
        primary = keys['primary']
        schema.partition_key = primary.get('partition')
        schema.sort_key = primary.get('sort', 'None')
        
        # Derive table name if not specified
        if 'table' in model:
            schema.table_name = model['table']
        else:
            # Convert PascalCase to snake_case for table name
            schema.table_name = self._to_snake_case(schema.name)
            
        # Parse secondary indexes
        if 'secondary' in keys:
            for index_data in keys['secondary']:
                index = self._parse_index(index_data)
                schema.indexes.append(index)
                
        # Parse stream configuration
        if 'stream' in model:
            schema.stream_config = model['stream']
            
    def _parse_index(self, data: Dict[str, Any]) -> SchemaIndex:
        """Parse an index definition."""
        index_type = IndexType.GSI if data.get('type', 'GSI').upper() == 'GSI' else IndexType.LSI
        
        index_data = {
            'name': data['name'],
            'type': index_type,
            'partition_key': data['partition'],
            'sort_key': data.get('sort'),
            'description': data.get('description')
        }
        
        # Parse projection
        if 'projection' in data:
            projection = data['projection']
            if isinstance(projection, str):
                index_data['projection_type'] = ProjectionType(projection.upper())
            elif isinstance(projection, dict):
                index_data['projection_type'] = ProjectionType(
                    projection.get('type', 'ALL').upper()
                )
                if 'attributes' in projection:
                    index_data['projected_attributes'] = projection['attributes']
                    
        return SchemaIndex(**index_data)
        
    def _parse_custom_query(self, data: Dict[str, Any]) -> CustomQuery:
        """Parse a custom query definition."""
        return CustomQuery(
            name=data['name'],
            query_type=data.get('type', 'custom'),
            description=data.get('description', ''),
            input_params=data.get('input', {}),
            return_type=data.get('returns', 'String'),
            enrichments=data.get('enrichments'),
            implementation_path=data.get('implementationPath')
        )
        
    def _parse_auth_config(self, data: Dict[str, Any]) -> AuthConfig:
        """Parse authentication configuration."""
        config = AuthConfig(
            default_auth=data.get('defaultAuth', 'cognito')
        )
        
        # Parse Cognito authentication
        if 'cognitoAuthentication' in data:
            cognito = data['cognitoAuthentication']
            if isinstance(cognito, dict) and 'groups' in cognito:
                config.cognito_groups = cognito['groups']
                
        # Parse API key operations
        if 'apiKeyAuthentication' in data:
            config.api_key_operations = data['apiKeyAuthentication']
            
        # Parse IAM operations
        if 'iamAuthentication' in data:
            config.iam_operations = data['iamAuthentication']
            
        return config
        
    def _to_snake_case(self, name: str) -> str:
        """Convert PascalCase to snake_case."""
        # Insert underscores before uppercase letters
        s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
        return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()