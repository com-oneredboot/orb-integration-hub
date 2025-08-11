"""Tests for core domain models."""

import pytest
from datetime import datetime

from orb_schema_generator.core.models import (
    Schema, SchemaType, SchemaField, SchemaIndex,
    AuthConfig, Operation, OperationType, IndexType,
    ProjectionType, SchemaCollection
)


class TestSchemaField:
    """Test SchemaField model."""
    
    def test_valid_field(self):
        """Test creating a valid field."""
        field = SchemaField(
            name="userId",
            type="string",
            required=True,
            description="User identifier"
        )
        assert field.name == "userId"
        assert field.type == "string"
        assert field.required is True
        
    def test_field_name_validation(self):
        """Test field name must be camelCase."""
        # Valid camelCase
        field = SchemaField(name="userName", type="string")
        assert field.name == "userName"
        
        # Invalid PascalCase
        with pytest.raises(ValueError, match="must start with lowercase"):
            SchemaField(name="UserName", type="string")
            
    def test_optional_field_defaults(self):
        """Test optional field defaults."""
        field = SchemaField(name="optional", type="string")
        assert field.required is False
        assert field.description is None
        assert field.validation is None
        assert field.enum_type is None


class TestSchemaIndex:
    """Test SchemaIndex model."""
    
    def test_valid_gsi(self):
        """Test creating a valid GSI."""
        index = SchemaIndex(
            name="EmailIndex",
            type=IndexType.GSI,
            partition_key="email",
            sort_key="createdAt"
        )
        assert index.name == "EmailIndex"
        assert index.type == IndexType.GSI
        assert index.projection_type == ProjectionType.ALL
        
    def test_index_name_validation(self):
        """Test index name validation."""
        # Valid PascalCase
        index = SchemaIndex(name="UserIndex", type=IndexType.GSI, partition_key="userId")
        assert index.name == "UserIndex"
        
        # Invalid - starts with lowercase
        with pytest.raises(ValueError, match="must be in PascalCase"):
            SchemaIndex(name="userIndex", type=IndexType.GSI, partition_key="userId")
            
        # Invalid - too short
        with pytest.raises(ValueError, match="between 3 and 255 characters"):
            SchemaIndex(name="UI", type=IndexType.GSI, partition_key="userId")
            
    def test_projection_validation(self):
        """Test projection type validation."""
        # INCLUDE requires projected_attributes
        with pytest.raises(ValueError, match="projected_attributes is required"):
            SchemaIndex(
                name="TestIndex",
                type=IndexType.GSI,
                partition_key="id",
                projection_type=ProjectionType.INCLUDE
            )
            
        # Valid INCLUDE with attributes
        index = SchemaIndex(
            name="TestIndex",
            type=IndexType.GSI,
            partition_key="id",
            projection_type=ProjectionType.INCLUDE,
            projected_attributes=["name", "email"]
        )
        assert index.projected_attributes == ["name", "email"]


class TestAuthConfig:
    """Test AuthConfig model."""
    
    def test_auth_providers(self):
        """Test getting auth providers for operations."""
        auth = AuthConfig(
            cognito_groups={
                "admin": ["*"],
                "user": ["getUser", "listUsers"]
            },
            api_key_operations=["publicQuery"],
            iam_operations=["systemOperation"]
        )
        
        # Admin has access to all
        providers = auth.get_auth_providers("anyOperation")
        assert "cognito" in providers
        
        # User has specific access
        providers = auth.get_auth_providers("getUser")
        assert "cognito" in providers
        
        # API key operation
        providers = auth.get_auth_providers("publicQuery")
        assert "api_key" in providers
        
        # Multiple providers
        auth.api_key_operations.append("getUser")
        providers = auth.get_auth_providers("getUser")
        assert "cognito" in providers
        assert "api_key" in providers


class TestOperation:
    """Test Operation model."""
    
    def test_operation_hash(self):
        """Test operations are hashable and comparable."""
        op1 = Operation(name="getUser", operation_type=OperationType.QUERY)
        op2 = Operation(name="getUser", operation_type=OperationType.QUERY)
        op3 = Operation(name="getUser", operation_type=OperationType.MUTATION)
        
        # Same name and type are equal
        assert op1 == op2
        assert hash(op1) == hash(op2)
        
        # Different type means different operation
        assert op1 != op3
        assert hash(op1) != hash(op3)
        
        # Can be used in sets
        operations = {op1, op2, op3}
        assert len(operations) == 2


class TestSchema:
    """Test Schema model."""
    
    def test_dynamodb_schema(self):
        """Test creating a DynamoDB schema."""
        schema = Schema(
            name="User",
            schema_type=SchemaType.DYNAMODB,
            table_name="users",
            partition_key="id",
            sort_key="email"
        )
        
        # Add fields
        schema.fields.append(SchemaField(name="id", type="string", required=True))
        schema.fields.append(SchemaField(name="email", type="string", required=True))
        
        # Get key fields
        key_fields = schema.get_key_fields()
        assert len(key_fields) == 2
        assert key_fields[0].name == "id"
        assert key_fields[1].name == "email"
        
    def test_schema_validation(self):
        """Test schema validation."""
        # Valid schema
        schema = Schema(
            name="ValidSchema",
            schema_type=SchemaType.STANDARD
        )
        errors = schema.validate()
        assert len(errors) == 0
        
        # Invalid name
        schema = Schema(
            name="invalid_name",
            schema_type=SchemaType.STANDARD
        )
        errors = schema.validate()
        assert any("PascalCase" in e for e in errors)
        
        # DynamoDB without required fields
        schema = Schema(
            name="InvalidDynamoDB",
            schema_type=SchemaType.DYNAMODB
        )
        errors = schema.validate()
        assert any("table_name" in e for e in errors)
        assert any("partition_key" in e for e in errors)
        
    def test_get_operations_by_type(self):
        """Test filtering operations by type."""
        schema = Schema(name="Test", schema_type=SchemaType.GRAPHQL)
        
        schema.operations.extend([
            Operation(name="getUser", operation_type=OperationType.QUERY),
            Operation(name="listUsers", operation_type=OperationType.QUERY),
            Operation(name="createUser", operation_type=OperationType.MUTATION),
            Operation(name="userAdded", operation_type=OperationType.SUBSCRIPTION)
        ])
        
        queries = schema.get_operations_by_type(OperationType.QUERY)
        assert len(queries) == 2
        assert all(op.operation_type == OperationType.QUERY for op in queries)
        
        mutations = schema.get_operations_by_type(OperationType.MUTATION)
        assert len(mutations) == 1
        assert mutations[0].name == "createUser"


class TestSchemaCollection:
    """Test SchemaCollection model."""
    
    def test_add_and_lookup(self):
        """Test adding schemas and looking them up."""
        collection = SchemaCollection()
        
        # Add schemas
        user_schema = Schema(name="User", schema_type=SchemaType.DYNAMODB)
        role_schema = Schema(name="Role", schema_type=SchemaType.DYNAMODB)
        error_schema = Schema(name="ErrorRegistry", schema_type=SchemaType.REGISTRY)
        
        collection.add_schema(user_schema)
        collection.add_schema(role_schema)
        collection.add_schema(error_schema)
        
        # Lookup by name
        assert collection.get_by_name("User") == user_schema
        assert collection.get_by_name("NonExistent") is None
        
        # Lookup by type
        dynamodb_schemas = collection.get_by_type(SchemaType.DYNAMODB)
        assert len(dynamodb_schemas) == 2
        assert user_schema in dynamodb_schemas
        assert role_schema in dynamodb_schemas
        
        registry_schemas = collection.get_by_type(SchemaType.REGISTRY)
        assert len(registry_schemas) == 1
        assert error_schema in registry_schemas
        
    def test_get_all_operations(self):
        """Test getting all operations from collection."""
        collection = SchemaCollection()
        
        # Create schemas with operations
        schema1 = Schema(name="Users", schema_type=SchemaType.GRAPHQL)
        schema1.operations.extend([
            Operation(name="getUser", operation_type=OperationType.QUERY),
            Operation(name="createUser", operation_type=OperationType.MUTATION)
        ])
        
        schema2 = Schema(name="Posts", schema_type=SchemaType.GRAPHQL)
        schema2.operations.extend([
            Operation(name="getPost", operation_type=OperationType.QUERY),
            Operation(name="createPost", operation_type=OperationType.MUTATION)
        ])
        
        collection.add_schema(schema1)
        collection.add_schema(schema2)
        
        # Get all operations
        all_operations = collection.get_all_operations()
        assert len(all_operations) == 4
        operation_names = {op.name for op in all_operations}
        assert operation_names == {"getUser", "createUser", "getPost", "createPost"}