"""Schema validation functionality.

This module provides comprehensive validation for schemas:
- SchemaValidator: Validates individual schemas for structure and naming conventions
- CrossSchemaValidator: Validates relationships and consistency across multiple schemas

Validation includes:
- Naming convention enforcement (PascalCase for schemas, camelCase for fields)
- Type validation and cross-references
- DynamoDB-specific validation (keys, indexes)
- GraphQL-specific validation (operations, auth)
- Registry-specific validation (required fields)
"""

import re
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path

from orb_schema_generator.core.models import (
    Schema, SchemaType, SchemaField, SchemaIndex,
    AuthConfig, Operation, OperationType
)
from orb_schema_generator.core.exceptions import ValidationError


logger = logging.getLogger(__name__)


class SchemaValidator:
    """Validates schema structure and naming conventions."""
    
    def __init__(self, strict_mode: bool = True):
        """Initialize validator with strictness setting."""
        self.strict_mode = strict_mode
        self.errors: List[str] = []
        self.warnings: List[str] = []
        
    def validate_schema(self, schema: Schema) -> bool:
        """Validate a single schema. Returns True if valid.
        
        Args:
            schema: The schema to validate
            
        Returns:
            True if schema is valid, False otherwise
        """
        self.errors = []
        self.warnings = []
        
        logger.info(f"Validating schema '{schema.name}' (type: {schema.schema_type.value})")
        
        # Basic validation
        self._validate_name(schema)
        self._validate_fields(schema)
        
        # Type-specific validation
        if schema.schema_type == SchemaType.DYNAMODB:
            self._validate_dynamodb_schema(schema)
        elif schema.schema_type == SchemaType.GRAPHQL:
            self._validate_graphql_schema(schema)
        elif schema.schema_type == SchemaType.REGISTRY:
            self._validate_registry_schema(schema)
            
        # Auth validation if present
        if schema.auth_config:
            self._validate_auth_config(schema)
            
        # File name validation if source file is provided
        if schema.source_file:
            self._validate_file_name(schema)
            
        # Log validation results
        if self.errors:
            logger.error(f"Schema '{schema.name}' validation failed with {len(self.errors)} errors")
        elif self.warnings:
            logger.warning(f"Schema '{schema.name}' validated with {len(self.warnings)} warnings")
        else:
            logger.info(f"Schema '{schema.name}' validation passed")
            
        # Return false if there are any errors
        return len(self.errors) == 0
        
    def _validate_name(self, schema: Schema) -> None:
        """Validate schema name follows PascalCase convention."""
        if not schema.name:
            self._add_error("Schema name cannot be empty")
            return
            
        if not re.match(r'^[A-Z][a-zA-Z0-9]*$', schema.name):
            self._add_error(
                f"Schema name '{schema.name}' must be in PascalCase format (e.g., UserProfile)"
            )
            
    def _validate_fields(self, schema: Schema) -> None:
        """Validate all fields in the schema."""
        if not schema.fields and schema.schema_type != SchemaType.REGISTRY:
            self._add_warning("Schema has no fields defined")
            return
            
        field_names = set()
        for field in schema.fields:
            # Check for duplicate field names
            if field.name in field_names:
                self._add_error(f"Duplicate field name: '{field.name}'")
            field_names.add(field.name)
            
            # Validate field name is camelCase
            if not re.match(r'^[a-z][a-zA-Z0-9]*$', field.name):
                self._add_error(
                    f"Field name '{field.name}' must be in camelCase format"
                )
                
            # Validate field type
            self._validate_field_type(field)
            
            # Validate enum fields
            if field.enum_type and field.enum_values:
                self._add_warning(
                    f"Field '{field.name}' has both enum_type and enum_values. "
                    "Use enum_type for references, enum_values for inline definitions."
                )
                
    def _validate_field_type(self, field: SchemaField) -> None:
        """Validate field type is recognized."""
        valid_types = {
            'string', 'number', 'boolean', 'array', 'object',
            'timestamp', 'date', 'binary', 'map', 'set',
            'int', 'float', 'double', 'bigint', 'any'
        }
        
        # Check if it's a basic type
        if field.type.lower() in valid_types:
            return
            
        # Check if it's an array type
        if field.type.lower().startswith('array<'):
            return
            
        # Check if it's a model reference (starts with I)
        if field.type.startswith('I'):
            return
            
        # In strict mode, unknown types are errors
        if self.strict_mode:
            self._add_error(f"Unknown field type: '{field.type}' for field '{field.name}'")
        else:
            self._add_warning(f"Unrecognized field type: '{field.type}' for field '{field.name}'")
            
    def _validate_dynamodb_schema(self, schema: Schema) -> None:
        """Validate DynamoDB-specific requirements."""
        # Validate table name
        if not schema.table_name:
            self._add_error("DynamoDB schema requires a table name")
        elif not re.match(r'^[a-z][a-z0-9_]*$', schema.table_name):
            self._add_error(
                f"Table name '{schema.table_name}' must be in snake_case format"
            )
            
        # Validate partition key
        if not schema.partition_key:
            self._add_error("DynamoDB schema requires a partition key")
        else:
            # Check partition key exists in fields
            if not any(f.name == schema.partition_key for f in schema.fields):
                self._add_error(
                    f"Partition key '{schema.partition_key}' not found in schema fields"
                )
                
        # Validate sort key if present
        if schema.sort_key and schema.sort_key != 'None':
            if not any(f.name == schema.sort_key for f in schema.fields):
                self._add_error(
                    f"Sort key '{schema.sort_key}' not found in schema fields"
                )
                
        # Validate indexes
        index_names = set()
        for index in schema.indexes:
            # Check for duplicate index names
            if index.name in index_names:
                self._add_error(f"Duplicate index name: '{index.name}'")
            index_names.add(index.name)
            
            # Validate index fields exist
            if not any(f.name == index.partition_key for f in schema.fields):
                self._add_error(
                    f"Index '{index.name}' partition key '{index.partition_key}' "
                    "not found in schema fields"
                )
                
            if index.sort_key:
                if not any(f.name == index.sort_key for f in schema.fields):
                    self._add_error(
                        f"Index '{index.name}' sort key '{index.sort_key}' "
                        "not found in schema fields"
                    )
                    
    def _validate_graphql_schema(self, schema: Schema) -> None:
        """Validate GraphQL-specific requirements."""
        if not schema.operations:
            self._add_warning("GraphQL schema has no operations defined")
            
        operation_names = set()
        for operation in schema.operations:
            # Check for duplicate operation names
            full_name = f"{operation.operation_type.value}:{operation.name}"
            if full_name in operation_names:
                self._add_error(f"Duplicate operation: '{operation.name}'")
            operation_names.add(full_name)
            
            # Validate operation naming
            if operation.operation_type == OperationType.QUERY:
                if not operation.name.startswith(('get', 'list', 'search')):
                    self._add_warning(
                        f"Query '{operation.name}' should start with get/list/search"
                    )
            elif operation.operation_type == OperationType.MUTATION:
                if not operation.name.startswith(('create', 'update', 'delete')):
                    self._add_warning(
                        f"Mutation '{operation.name}' should start with create/update/delete"
                    )
                    
    def _validate_registry_schema(self, schema: Schema) -> None:
        """Validate registry-specific requirements."""
        if not schema.registry_items:
            self._add_error("Registry schema must have items defined")
            return
            
        for code, item in schema.registry_items.items():
            # Validate code format
            if not re.match(r'^[A-Z][A-Z0-9_]*$', code):
                self._add_error(
                    f"Registry code '{code}' must be in UPPER_SNAKE_CASE format"
                )
                
            # Validate required fields
            required_fields = ['message', 'description', 'solution']
            for field in required_fields:
                if field not in item:
                    self._add_error(
                        f"Registry item '{code}' missing required field: '{field}'"
                    )
                    
    def _validate_auth_config(self, schema: Schema) -> None:
        """Validate authentication configuration."""
        auth = schema.auth_config
        
        # Validate Cognito groups reference existing operations
        if schema.operations:
            operation_names = {op.name for op in schema.operations}
            
            for group, operations in auth.cognito_groups.items():
                for op in operations:
                    if op != '*' and op not in operation_names:
                        self._add_error(
                            f"Auth config references unknown operation '{op}' "
                            f"for group '{group}'"
                        )
                        
        # Validate API key operations
        if auth.api_key_operations and schema.operations:
            operation_names = {op.name for op in schema.operations}
            for op in auth.api_key_operations:
                if op not in operation_names:
                    self._add_error(
                        f"API key auth references unknown operation '{op}'"
                    )
                    
    def _validate_file_name(self, schema: Schema) -> None:
        """Validate schema file name matches schema name."""
        if not schema.source_file:
            return
            
        file_path = Path(schema.source_file)
        expected_file_name = f"{schema.name}.yml"
        
        if file_path.name != expected_file_name:
            self._add_error(
                f"File name '{file_path.name}' should match schema name: '{expected_file_name}'"
            )
            
    def _add_error(self, message: str) -> None:
        """Add an error message."""
        self.errors.append(message)
        logger.error(message)
        
    def _add_warning(self, message: str) -> None:
        """Add a warning message."""
        self.warnings.append(message)
        logger.warning(message)
        
    def get_validation_report(self) -> Dict[str, Any]:
        """Get detailed validation report."""
        return {
            'valid': len(self.errors) == 0,
            'error_count': len(self.errors),
            'warning_count': len(self.warnings),
            'errors': self.errors.copy(),
            'warnings': self.warnings.copy()
        }


class CrossSchemaValidator:
    """Validates relationships and consistency across multiple schemas."""
    
    def __init__(self):
        """Initialize cross-schema validator."""
        self.errors: List[str] = []
        self.warnings: List[str] = []
        
    def validate_collection(self, schemas: List[Schema]) -> bool:
        """Validate a collection of schemas for consistency."""
        self.errors = []
        self.warnings = []
        
        # Build indexes for validation
        schema_by_name = {s.name: s for s in schemas}
        
        # Check for duplicate schema names
        self._check_duplicate_names(schemas)
        
        # Validate cross-references
        self._validate_cross_references(schemas, schema_by_name)
        
        # Validate enum references
        self._validate_enum_references(schemas, schema_by_name)
        
        return len(self.errors) == 0
        
    def _check_duplicate_names(self, schemas: List[Schema]) -> None:
        """Check for duplicate schema names."""
        names = {}
        for schema in schemas:
            if schema.name in names:
                self.errors.append(
                    f"Duplicate schema name '{schema.name}' found in files: "
                    f"{names[schema.name]} and {schema.source_file}"
                )
            else:
                names[schema.name] = schema.source_file
                
    def _validate_cross_references(self, schemas: List[Schema], 
                                    schema_by_name: Dict[str, Schema]) -> None:
        """Validate references between schemas."""
        for schema in schemas:
            for field in schema.fields:
                # Check model type references (e.g., IUser)
                if field.type.startswith('I'):
                    ref_name = field.type[1:]  # Remove 'I' prefix
                    if ref_name not in schema_by_name:
                        self.errors.append(
                            f"Schema '{schema.name}' field '{field.name}' references "
                            f"unknown type '{field.type}'"
                        )
                        
    def _validate_enum_references(self, schemas: List[Schema],
                                   schema_by_name: Dict[str, Schema]) -> None:
        """Validate enum type references."""
        # Find all enum schemas
        enum_schemas = {
            s.name: s for s in schemas 
            if any(f.enum_values for f in s.fields)
        }
        
        for schema in schemas:
            for field in schema.fields:
                if field.enum_type:
                    if field.enum_type not in enum_schemas:
                        self.warnings.append(
                            f"Schema '{schema.name}' field '{field.name}' references "
                            f"unknown enum type '{field.enum_type}'"
                        )
                        
    def get_validation_report(self) -> Dict[str, Any]:
        """Get detailed validation report."""
        return {
            'valid': len(self.errors) == 0,
            'error_count': len(self.errors),
            'warning_count': len(self.warnings),
            'errors': self.errors.copy(),
            'warnings': self.warnings.copy()
        }