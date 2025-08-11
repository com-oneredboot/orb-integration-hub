"""Tests for the TypeScript code generator."""

import pytest
from pathlib import Path
import tempfile
import shutil

from orb_schema_generator.generators.typescript_generator import (
    TypeScriptGenerator, TypeScriptGeneratorConfig
)
from orb_schema_generator.core.models import (
    Schema, SchemaField, SchemaCollection, SchemaType,
    Operation, OperationType
)


class TestTypeScriptGenerator:
    """Test the TypeScript code generator."""
    
    @pytest.fixture
    def temp_dir(self):
        """Create a temporary directory for test output."""
        temp_dir = tempfile.mkdtemp()
        yield Path(temp_dir)
        shutil.rmtree(temp_dir)
        
    @pytest.fixture
    def sample_schema(self):
        """Create a sample schema for testing."""
        schema = Schema(name="User", schema_type=SchemaType.DYNAMODB)
        schema.attributes = [
            SchemaField(name="id", type="string", required=True),
            SchemaField(name="email", type="string", required=True),
            SchemaField(name="name", type="string", required=True),
            SchemaField(name="age", type="number", required=False),
            SchemaField(name="isActive", type="boolean", required=True),
            SchemaField(name="tags", type="array", required=False),
            SchemaField(name="metadata", type="object", required=False),
            SchemaField(name="createdAt", type="timestamp", required=True),
        ]
        schema.partition_key = "id"
        schema.sort_key = "createdAt"
        return schema
        
    @pytest.fixture
    def sample_collection(self, sample_schema):
        """Create a sample schema collection."""
        collection = SchemaCollection()
        collection.add_schema(sample_schema)
        
        # Add another schema
        org_schema = Schema(name="Organization", schema_type=SchemaType.DYNAMODB)
        org_schema.attributes = [
            SchemaField(name="orgId", type="string", required=True),
            SchemaField(name="name", type="string", required=True),
            SchemaField(name="owner", type="User", required=True),  # Reference type
        ]
        collection.add_schema(org_schema)
        
        # Add operations
        operations = [
            Operation(
                name="getUser",
                operation_type=OperationType.QUERY,
                description="Get user by ID"
            ),
            Operation(
                name="createUser",
                operation_type=OperationType.MUTATION,
                description="Create a new user"
            ),
        ]
        
        # Add mock GQL for operations
        operations[0].gql = """
query getUser($id: ID!) {
  getUser(id: $id) {
    id
    email
    name
  }
}"""
        
        operations[1].gql = """
mutation createUser($input: UserCreateInput!) {
  createUser(input: $input) {
    id
    email
    name
  }
}"""
        
        for op in operations:
            collection.add_operation(op)
            
        return collection
        
    def test_generator_initialization(self, temp_dir):
        """Test generator initialization."""
        config = TypeScriptGeneratorConfig(output_dir=temp_dir)
        generator = TypeScriptGenerator(config)
        
        assert generator.config.output_dir == temp_dir
        assert generator.env is not None
        
    def test_simple_schema_generation(self, temp_dir, sample_schema):
        """Test generating TypeScript for a simple schema."""
        config = TypeScriptGeneratorConfig(output_dir=temp_dir)
        generator = TypeScriptGenerator(config)
        
        collection = SchemaCollection()
        collection.add_schema(sample_schema)
        
        results = generator.generate(collection)
        
        # Check results
        assert len(results['errors']) == 0
        assert len(results['generated_files']) > 0
        
        # Check generated file exists
        model_file = temp_dir / "UserModel.ts"
        assert model_file.exists()
        
        # Check file contents
        content = model_file.read_text()
        
        # Check key elements are present
        assert "export interface IUser {" in content
        assert "export class User implements IUser {" in content
        assert "export type UserResponse = {" in content
        assert "export type UserCreateInput = {" in content
        assert "export type UserUpdateInput = {" in content
        
    def test_collection_generation(self, temp_dir, sample_collection):
        """Test generating TypeScript for a collection of schemas."""
        config = TypeScriptGeneratorConfig(output_dir=temp_dir)
        generator = TypeScriptGenerator(config)
        
        results = generator.generate(sample_collection)
        
        # Check no errors
        assert len(results['errors']) == 0
        
        # Check multiple files generated
        assert len(results['generated_files']) >= 2  # User and Organization
        
        # Check User model
        user_file = temp_dir / "UserModel.ts"
        assert user_file.exists()
        
        # Check Organization model  
        org_file = temp_dir / "OrganizationModel.ts"
        assert org_file.exists()
        org_content = org_file.read_text()
        # The template should handle model imports based on model_imports list
        assert "owner: User" in org_content  # Should use User type
        
        # Check operations file if generated
        if sample_collection.operations:
            ops_file = temp_dir / "operations.graphql.ts"
            assert ops_file.exists()
            ops_content = ops_file.read_text()
            assert "export const getUser" in ops_content
            assert "export const createUser" in ops_content