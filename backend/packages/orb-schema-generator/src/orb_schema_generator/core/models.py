"""Core domain models for schema processing.

This module contains the core data structures used throughout the schema generator:
- Schema: Main schema definition with type-specific fields
- SchemaField: Individual field definitions with validation
- SchemaIndex: DynamoDB index definitions
- AuthConfig: Authentication and authorization configuration
- Operation: GraphQL operation definitions
- SchemaCollection: Container for managing multiple schemas
"""

import logging
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Union
from enum import Enum

from pydantic import BaseModel, Field as PydanticField, field_validator, model_validator


logger = logging.getLogger(__name__)


class SchemaType(str, Enum):
    """Types of schemas that can be generated."""
    DYNAMODB = "dynamodb"
    GRAPHQL = "graphql"
    LAMBDA = "lambda"
    STANDARD = "standard"
    REGISTRY = "registry"
    STATIC = "static"  # Alias for standard


class IndexType(str, Enum):
    """DynamoDB index types."""
    GSI = "GSI"  # Global Secondary Index
    LSI = "LSI"  # Local Secondary Index


class ProjectionType(str, Enum):
    """DynamoDB index projection types."""
    ALL = "ALL"
    KEYS_ONLY = "KEYS_ONLY"
    INCLUDE = "INCLUDE"


class AuthProvider(str, Enum):
    """Authentication providers."""
    COGNITO = "cognito"
    API_KEY = "api_key"
    IAM = "iam"


class OperationType(str, Enum):
    """GraphQL operation types."""
    QUERY = "query"
    MUTATION = "mutation"
    SUBSCRIPTION = "subscription"


class SchemaField(BaseModel):
    """Schema field definition with validation."""
    name: str = PydanticField(..., description="Field name in camelCase")
    type: str = PydanticField(..., description="Field data type")
    required: bool = PydanticField(default=False, description="Whether field is required")
    description: Optional[str] = PydanticField(default=None, description="Field description")
    validation: Optional[Dict[str, Any]] = PydanticField(default=None, description="Validation rules")
    enum_type: Optional[str] = PydanticField(default=None, description="Enum type reference")
    enum_values: Optional[List[str]] = PydanticField(default=None, description="Inline enum values")
    items: Optional[Dict[str, Any]] = PydanticField(default=None, description="Array item definition")
    unique: bool = PydanticField(default=False, description="Whether field must be unique")
    indexed: bool = PydanticField(default=False, description="Whether field is indexed")
    default: Optional[Any] = PydanticField(default=None, description="Default value")

    @field_validator('name')
    @classmethod
    def validate_field_name(cls, v: str) -> str:
        """Ensure field names are in camelCase."""
        if not v:
            raise ValueError("Field name cannot be empty")
        if not v[0].islower() and not v[0].isdigit():
            logger.warning(f"Field name '{v}' does not follow camelCase convention")
            raise ValueError(f"Field name '{v}' must start with lowercase letter (camelCase)")
        return v


class SchemaIndex(BaseModel):
    """Schema index definition for DynamoDB tables."""
    name: str = PydanticField(..., description="Index name in PascalCase")
    type: IndexType = PydanticField(..., description="Type of index (GSI or LSI)")
    partition_key: str = PydanticField(..., description="Partition key field name")
    sort_key: Optional[str] = PydanticField(default=None, description="Sort key field name")
    projection_type: ProjectionType = PydanticField(
        default=ProjectionType.ALL, 
        description="Projection type"
    )
    projected_attributes: Optional[List[str]] = PydanticField(
        default=None, 
        description="Attributes to project when projection_type is INCLUDE"
    )
    description: Optional[str] = PydanticField(default=None, description="Index description")

    @field_validator('name')
    @classmethod
    def validate_index_name(cls, v: str) -> str:
        """Validate index name follows DynamoDB requirements."""
        if not v:
            raise ValueError("Index name cannot be empty")
        if not (3 <= len(v) <= 255):
            raise ValueError("Index name must be between 3 and 255 characters")
        if not v[0].isalpha():
            raise ValueError("Index name must start with a letter")
        if not all(c.isalnum() for c in v):
            raise ValueError("Index name can only contain alphanumeric characters")
        if not v[0].isupper():
            raise ValueError("Index name must be in PascalCase format (e.g., RoleIndex)")
        return v

    @model_validator(mode='after')
    def validate_projection_attributes(self) -> 'SchemaIndex':
        """Ensure projected_attributes is provided when projection_type is INCLUDE."""
        if self.projection_type == ProjectionType.INCLUDE and not self.projected_attributes:
            raise ValueError("projected_attributes is required when projection_type is INCLUDE")
        return self


@dataclass
class AuthConfig:
    """Authentication configuration for a schema."""
    default_auth: str = "cognito"
    cognito_groups: Dict[str, List[str]] = field(default_factory=dict)
    api_key_operations: List[str] = field(default_factory=list)
    iam_operations: List[str] = field(default_factory=list)
    
    def get_auth_providers(self, operation: str) -> List[str]:
        """Get auth providers for a specific operation."""
        providers = []
        
        # Check Cognito groups
        for group, operations in self.cognito_groups.items():
            if '*' in operations or operation in operations:
                providers.append(AuthProvider.COGNITO)
                break
                
        # Check API key operations
        if operation in self.api_key_operations:
            providers.append(AuthProvider.API_KEY)
            
        # Check IAM operations
        if operation in self.iam_operations:
            providers.append(AuthProvider.IAM)
            
        return providers


@dataclass
class CustomQuery:
    """Custom query definition for advanced operations."""
    name: str
    query_type: str  # 'aggregation' or 'custom'
    description: str
    input_params: Dict[str, Any]
    return_type: str
    enrichments: Optional[List[Dict[str, Any]]] = None
    implementation_path: Optional[str] = None


@dataclass
class Operation:
    """Represents a GraphQL operation (query/mutation)."""
    name: str
    operation_type: OperationType
    description: Optional[str] = None
    input_type: Optional[str] = None
    output_type: Optional[str] = None
    auth_directives: List[str] = field(default_factory=list)
    arguments: Dict[str, SchemaField] = field(default_factory=dict)
    resolver_type: str = "dynamodb"  # dynamodb, lambda, local
    table_name: Optional[str] = None
    index_name: Optional[str] = None
    
    def __hash__(self) -> int:
        """Make Operation hashable for deduplication."""
        return hash((self.name, self.operation_type))
    
    def __eq__(self, other: object) -> bool:
        """Compare operations for equality."""
        if not isinstance(other, Operation):
            return False
        return self.name == other.name and self.operation_type == other.operation_type


@dataclass
class Schema:
    """Main schema definition containing all metadata and structure."""
    name: str
    schema_type: SchemaType
    description: Optional[str] = None
    version: str = "1.0.0"
    
    # Common fields
    fields: List[SchemaField] = field(default_factory=list)
    auth_config: Optional[AuthConfig] = None
    
    # DynamoDB specific
    table_name: Optional[str] = None
    partition_key: Optional[str] = None
    sort_key: Optional[str] = None
    indexes: List[SchemaIndex] = field(default_factory=list)
    stream_config: Optional[Dict[str, Any]] = None
    custom_queries: List[CustomQuery] = field(default_factory=list)
    
    # GraphQL specific
    operations: List[Operation] = field(default_factory=list)
    subscriptions: List[str] = field(default_factory=list)
    
    # Registry specific
    registry_items: Optional[Dict[str, Dict[str, str]]] = None
    
    # File metadata
    source_file: Optional[str] = None
    last_modified: Optional[str] = None
    
    def get_field_by_name(self, name: str) -> Optional[SchemaField]:
        """Get a field by its name.
        
        Args:
            name: The field name to search for
            
        Returns:
            The SchemaField if found, None otherwise
        """
        return next((f for f in self.fields if f.name == name), None)
    
    def get_key_fields(self) -> List[SchemaField]:
        """Get partition and sort key fields for DynamoDB schemas.
        
        Returns:
            List containing partition key field and optionally sort key field
        """
        fields = []
        if self.partition_key:
            field = self.get_field_by_name(self.partition_key)
            if field:
                fields.append(field)
            else:
                logger.warning(f"Partition key '{self.partition_key}' not found in fields")
                
        if self.sort_key and self.sort_key != 'None':
            field = self.get_field_by_name(self.sort_key)
            if field:
                fields.append(field)
            else:
                logger.warning(f"Sort key '{self.sort_key}' not found in fields")
                
        return fields
    
    def get_operations_by_type(self, op_type: OperationType) -> List[Operation]:
        """Get all operations of a specific type.
        
        Args:
            op_type: The operation type to filter by
            
        Returns:
            List of operations matching the specified type
        """
        return [op for op in self.operations if op.operation_type == op_type]
    
    def validate(self) -> List[str]:
        """Validate the schema and return list of errors."""
        errors = []
        
        # Basic validation
        if not self.name:
            errors.append("Schema name is required")
        
        if not self.name[0].isupper():
            errors.append(f"Schema name '{self.name}' must be in PascalCase")
            
        # Type-specific validation
        if self.schema_type == SchemaType.DYNAMODB:
            if not self.table_name:
                errors.append("DynamoDB schema requires table_name")
            if not self.partition_key:
                errors.append("DynamoDB schema requires partition_key")
            
            # Validate keys exist in fields
            if self.partition_key and not self.get_field_by_name(self.partition_key):
                errors.append(f"Partition key '{self.partition_key}' not found in fields")
            if self.sort_key and self.sort_key != 'None':
                if not self.get_field_by_name(self.sort_key):
                    errors.append(f"Sort key '{self.sort_key}' not found in fields")
                    
        elif self.schema_type == SchemaType.REGISTRY:
            if not self.registry_items:
                errors.append("Registry schema requires registry_items")
                
        return errors
    
    # Compatibility properties for templates
    @property
    def type(self) -> str:
        """Get string representation of schema type for template compatibility."""
        return self.schema_type.value
    
    @property
    def attributes(self) -> List[SchemaField]:
        """Alias for fields to maintain template compatibility."""
        return self.fields
    
    @property
    def secondary_indexes(self) -> List[SchemaIndex]:
        """Get only secondary indexes (GSI/LSI) excluding primary index."""
        return [idx for idx in self.indexes if idx.type in (IndexType.GSI, IndexType.LSI)]


@dataclass  
class SchemaCollection:
    """Collection of schemas with lookup and validation capabilities."""
    schemas: List[Schema] = field(default_factory=list)
    operations: List[Operation] = field(default_factory=list)
    _name_index: Dict[str, Schema] = field(default_factory=dict, init=False)
    _type_index: Dict[SchemaType, List[Schema]] = field(default_factory=dict, init=False)
    
    def add_schema(self, schema: Schema) -> None:
        """Add a schema to the collection."""
        self.schemas.append(schema)
        self._name_index[schema.name] = schema
        
        if schema.schema_type not in self._type_index:
            self._type_index[schema.schema_type] = []
        self._type_index[schema.schema_type].append(schema)
        
    def get_by_name(self, name: str) -> Optional[Schema]:
        """Get schema by name."""
        return self._name_index.get(name)
        
    def get_by_type(self, schema_type: SchemaType) -> List[Schema]:
        """Get all schemas of a specific type."""
        return self._type_index.get(schema_type, [])
        
    def add_operation(self, operation: Operation) -> None:
        """Add an operation to the collection."""
        self.operations.append(operation)
        
    def get_all_operations(self) -> List[Operation]:
        """Get all operations from all schemas and collection."""
        operations = self.operations.copy()
        for schema in self.schemas:
            operations.extend(schema.operations)
        return operations
        
    def validate_all(self) -> Dict[str, List[str]]:
        """Validate all schemas and return errors by schema name."""
        errors = {}
        for schema in self.schemas:
            schema_errors = schema.validate()
            if schema_errors:
                errors[schema.name] = schema_errors
        return errors