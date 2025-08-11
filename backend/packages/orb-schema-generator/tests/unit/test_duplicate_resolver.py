"""Tests for the duplicate resolver system."""

import pytest
from typing import List

from orb_schema_generator.core.models import (
    Schema, SchemaType, Operation, OperationType,
    SchemaField, SchemaCollection
)
from orb_schema_generator.core.duplicate_resolver import (
    DuplicateDetector, DuplicateResolver, TypeScriptDuplicateResolver,
    ResolutionStrategy, DuplicateInfo, ResolutionResult
)
from orb_schema_generator.core.exceptions import DuplicateError


class TestDuplicateDetector:
    """Test duplicate detection functionality."""
    
    def test_detect_duplicate_operations(self):
        """Test detection of duplicate GraphQL operations."""
        # Create schemas with duplicate operations
        schema1 = Schema(name="Users", schema_type=SchemaType.GRAPHQL)
        schema1.operations = [
            Operation(name="getUser", operation_type=OperationType.QUERY),
            Operation(name="createUser", operation_type=OperationType.MUTATION),
        ]
        
        schema2 = Schema(name="UserManagement", schema_type=SchemaType.GRAPHQL)
        schema2.operations = [
            Operation(name="getUser", operation_type=OperationType.QUERY),  # Duplicate
            Operation(name="updateUser", operation_type=OperationType.MUTATION),
        ]
        
        collection = SchemaCollection()
        collection.add_schema(schema1)
        collection.add_schema(schema2)
        
        # Detect duplicates
        detector = DuplicateDetector()
        duplicates = detector.detect_in_collection(collection)
        
        # Should find one duplicate (getUser query)
        assert len(duplicates) == 1
        assert duplicates[0].name == "query:getUser"
        assert duplicates[0].count == 2
        
    def test_detect_identical_vs_different_operations(self):
        """Test detection differentiates between identical and different operations."""
        schema1 = Schema(name="Users", schema_type=SchemaType.GRAPHQL)
        op1 = Operation(
            name="getUser",
            operation_type=OperationType.QUERY,
            input_type="UserInput",
            output_type="User"
        )
        
        schema2 = Schema(name="UserManagement", schema_type=SchemaType.GRAPHQL)
        op2 = Operation(
            name="getUser",
            operation_type=OperationType.QUERY,
            input_type="UserInput",
            output_type="User"
        )
        
        schema3 = Schema(name="AdminUsers", schema_type=SchemaType.GRAPHQL)
        op3 = Operation(
            name="getUser",
            operation_type=OperationType.QUERY,
            input_type="AdminUserInput",  # Different input
            output_type="AdminUser"       # Different output
        )
        
        schema1.operations = [op1]
        schema2.operations = [op2]
        schema3.operations = [op3]
        
        collection = SchemaCollection()
        collection.add_schema(schema1)
        collection.add_schema(schema2)
        collection.add_schema(schema3)
        
        detector = DuplicateDetector()
        duplicates = detector.detect_in_collection(collection)
        
        assert len(duplicates) == 1
        assert duplicates[0].count == 3
        # First two should be identical
        assert duplicates[0].hashes[0] == duplicates[0].hashes[1]
        # Third should be different
        assert duplicates[0].hashes[0] != duplicates[0].hashes[2]
        assert not duplicates[0].is_identical()
        
    def test_no_duplicates_detected(self):
        """Test that no duplicates are detected when there are none."""
        schema = Schema(name="Users", schema_type=SchemaType.GRAPHQL)
        schema.operations = [
            Operation(name="getUser", operation_type=OperationType.QUERY),
            Operation(name="listUsers", operation_type=OperationType.QUERY),
            Operation(name="createUser", operation_type=OperationType.MUTATION),
        ]
        
        collection = SchemaCollection()
        collection.add_schema(schema)
        
        detector = DuplicateDetector()
        duplicates = detector.detect_in_collection(collection)
        
        assert len(duplicates) == 0


class TestDuplicateResolver:
    """Test duplicate resolution functionality."""
    
    def test_merge_identical_duplicates(self):
        """Test merging of identical duplicates."""
        op1 = Operation(name="getUser", operation_type=OperationType.QUERY)
        op2 = Operation(name="getUser", operation_type=OperationType.QUERY)
        
        duplicate = DuplicateInfo(
            item_type="operation",
            name="query:getUser",
            occurrences=[op1, op2],
            hashes=["abc123", "abc123"],  # Same hash = identical
            locations=["schema1", "schema2"]
        )
        
        resolver = DuplicateResolver(strategy=ResolutionStrategy.MERGE)
        result = resolver.resolve([duplicate])
        
        assert result.removed_count == 1
        assert len(result.resolved_items) == 1
        assert result.resolved_items[0] == op1
        
    def test_merge_compatible_operations(self):
        """Test merging of compatible but non-identical operations."""
        op1 = Operation(
            name="getUser",
            operation_type=OperationType.QUERY,
            auth_directives=["@aws_auth(cognito_groups: [\"admin\"])"]
        )
        
        op2 = Operation(
            name="getUser",
            operation_type=OperationType.QUERY,
            auth_directives=["@aws_auth(cognito_groups: [\"user\"])"]
        )
        
        duplicate = DuplicateInfo(
            item_type="operation",
            name="query:getUser",
            occurrences=[op1, op2],
            hashes=["abc123", "def456"],  # Different hashes
            locations=["schema1", "schema2"]
        )
        
        resolver = DuplicateResolver(strategy=ResolutionStrategy.MERGE)
        result = resolver.resolve([duplicate])
        
        assert result.merged_count == 1
        assert len(result.resolved_items) == 1
        
        merged = result.resolved_items[0]
        assert "@aws_auth(cognito_groups: [\"admin\"])" in merged.auth_directives
        assert "@aws_auth(cognito_groups: [\"user\"])" in merged.auth_directives
        
    def test_error_strategy(self):
        """Test that error strategy raises exception."""
        duplicate = DuplicateInfo(
            item_type="operation",
            name="query:getUser",
            occurrences=[None, None],
            hashes=["abc", "def"],
            locations=["loc1", "loc2"]
        )
        
        resolver = DuplicateResolver(strategy=ResolutionStrategy.ERROR)
        
        with pytest.raises(DuplicateError) as exc_info:
            resolver.resolve([duplicate])
            
        assert "query:getUser" in str(exc_info.value)
        
    def test_prefer_first_strategy(self):
        """Test keeping first occurrence."""
        op1 = Operation(name="first", operation_type=OperationType.QUERY)
        op2 = Operation(name="second", operation_type=OperationType.QUERY)
        
        duplicate = DuplicateInfo(
            item_type="operation",
            name="test",
            occurrences=[op1, op2],
            hashes=["h1", "h2"],
            locations=["loc1", "loc2"]
        )
        
        resolver = DuplicateResolver(strategy=ResolutionStrategy.PREFER_FIRST)
        result = resolver.resolve([duplicate])
        
        assert result.removed_count == 1
        assert result.resolved_items[0] == op1
        
    def test_type_specific_strategies(self):
        """Test different strategies for different duplicate types."""
        resolver = DuplicateResolver(strategy=ResolutionStrategy.MERGE)
        resolver.set_type_strategy("operation", ResolutionStrategy.ERROR)
        resolver.set_type_strategy("type", ResolutionStrategy.MERGE)
        
        # Operation duplicate should error
        op_duplicate = DuplicateInfo(
            item_type="operation",
            name="test_op",
            occurrences=[None],
            hashes=["h1"],
            locations=["loc1"]
        )
        
        with pytest.raises(DuplicateError):
            resolver.resolve([op_duplicate])


class TestTypeScriptDuplicateResolver:
    """Test TypeScript-specific duplicate resolution."""
    
    def test_register_types(self):
        """Test type registration and duplicate detection."""
        resolver = TypeScriptDuplicateResolver()
        
        # First registration should succeed
        assert resolver.register_type("UserCreateInput", {})
        assert "UserCreateInput" in resolver.seen_types
        
        # Second registration should fail
        assert not resolver.register_type("UserCreateInput", {})
        
    def test_filter_duplicate_operations(self):
        """Test filtering of operations that generate duplicate types."""
        resolver = TypeScriptDuplicateResolver()
        
        operations = [
            Operation(name="getUser", operation_type=OperationType.QUERY),
            Operation(name="getUser", operation_type=OperationType.QUERY),  # Duplicate
            Operation(name="listUsers", operation_type=OperationType.QUERY),
            Operation(name="createUser", operation_type=OperationType.MUTATION),
            Operation(name="createUser", operation_type=OperationType.MUTATION),  # Duplicate
        ]
        
        unique = resolver.get_unique_operations(operations)
        
        assert len(unique) == 3
        assert unique[0].name == "getUser"
        assert unique[1].name == "listUsers"
        assert unique[2].name == "createUser"
        
    def test_deduplicate_template_data(self):
        """Test deduplication of template data."""
        resolver = TypeScriptDuplicateResolver()
        
        operations = [
            Operation(name="getUser", operation_type=OperationType.QUERY),
            Operation(name="getUser", operation_type=OperationType.QUERY),
            Operation(name="createUser", operation_type=OperationType.MUTATION),
        ]
        
        template_data = {
            'schema_name': 'User',
            'operations': operations,
            'other_data': 'preserved'
        }
        
        cleaned = resolver.deduplicate_template_data(template_data)
        
        assert len(cleaned['operations']) == 2
        assert cleaned['schema_name'] == 'User'
        assert cleaned['other_data'] == 'preserved'
        
    def test_type_tracking_reset(self):
        """Test that type tracking resets between template renders."""
        resolver = TypeScriptDuplicateResolver()
        
        # Register a type
        resolver.register_type("UserInput", {})
        assert "UserInput" in resolver.seen_types
        
        # Deduplicate should reset tracking
        resolver.deduplicate_template_data({'data': 'test'})
        assert len(resolver.seen_types) == 0
        
        # Can register same type again
        assert resolver.register_type("UserInput", {})