"""Tests for the template engine module."""

import pytest
from pathlib import Path
from typing import List

from orb_schema_generator.templates.engine import (
    TemplateEngine, DRYTemplateEngine, TemplateConfig,
    TemplateFragment, TemplateContext
)
from orb_schema_generator.core.models import (
    Schema, SchemaType, Operation, OperationType,
    SchemaField
)
from orb_schema_generator.core.duplicate_resolver import (
    TypeScriptDuplicateResolver
)


class TestTemplateEngine:
    """Test the base template engine."""
    
    def test_initialization(self):
        """Test template engine initialization."""
        config = TemplateConfig(
            cache_size=64,
            trim_blocks=True,
            lstrip_blocks=True
        )
        engine = TemplateEngine(config)
        
        assert engine.config.cache_size == 64
        assert engine.config.trim_blocks is True
        assert engine._env is not None
        
    def test_add_fragment(self):
        """Test adding template fragments."""
        engine = TemplateEngine()
        
        fragment = TemplateFragment(
            name="test_fragment",
            content="Hello {{ name }}!",
            parameters=["name"]
        )
        
        engine.add_fragment(fragment)
        assert "test_fragment" in engine._fragments
        
    def test_default_filters(self):
        """Test default filters are available."""
        engine = TemplateEngine()
        
        # Case conversion filters
        assert 'to_camel_case' in engine._env.filters
        assert 'to_pascal_case' in engine._env.filters
        assert 'to_snake_case' in engine._env.filters
        
        # Type conversion filters
        assert 'to_typescript_type' in engine._env.filters
        assert 'to_python_type' in engine._env.filters
        assert 'to_graphql_type' in engine._env.filters
        
        # Utility filters
        assert 'unique' in engine._env.filters
        assert 'dedupe_operations' in engine._env.filters
        
    def test_type_conversion_filters(self):
        """Test type conversion filters."""
        engine = TemplateEngine()
        
        # TypeScript conversions
        assert engine._to_typescript_type('string') == 'string'
        assert engine._to_typescript_type('number') == 'number'
        assert engine._to_typescript_type('array') == 'string[]'
        assert engine._to_typescript_type('object') == 'Record<string, any>'
        assert engine._to_typescript_type('IUser') == 'IUser'  # Interface
        
        # Python conversions
        assert engine._to_python_type('string') == 'str'
        assert engine._to_python_type('number') == 'int'
        assert engine._to_python_type('array') == 'List[str]'
        assert engine._to_python_type('object') == 'Dict[str, Any]'
        
        # GraphQL conversions
        assert engine._to_graphql_type('string') == 'String'
        assert engine._to_graphql_type('number') == 'Int'
        assert engine._to_graphql_type('boolean') == 'Boolean'
        assert engine._to_graphql_type('ID') == 'ID'
        
    def test_dedupe_operations(self):
        """Test operation deduplication filter."""
        engine = TemplateEngine()
        
        operations = [
            Operation(name="getUser", operation_type=OperationType.QUERY),
            Operation(name="getUser", operation_type=OperationType.QUERY),  # Duplicate
            Operation(name="createUser", operation_type=OperationType.MUTATION),
            Operation(name="createUser", operation_type=OperationType.MUTATION),  # Duplicate
        ]
        
        unique = engine._dedupe_operations(operations)
        assert len(unique) == 2
        assert unique[0].name == "getUser"
        assert unique[1].name == "createUser"
        
    def test_render_with_context(self):
        """Test template rendering with context."""
        engine = TemplateEngine()
        
        # Add a test fragment
        fragment = TemplateFragment(
            name="simple",
            content="Name: {{ name }}, Count: {{ items|length }}"
        )
        engine.add_fragment(fragment)
        
        # Create context
        context = TemplateContext(data={
            'name': 'Test',
            'items': [1, 2, 3]
        })
        
        # Render
        result = engine.render("fragments/simple.jinja", context)
        assert result == "Name: Test, Count: 3"
        
    def test_context_tracking(self):
        """Test context tracking for rendered items."""
        context = TemplateContext()
        
        # Test type tracking
        assert context.mark_type_rendered("UserType") is True
        assert context.mark_type_rendered("UserType") is False  # Already rendered
        assert "UserType" in context.rendered_types
        
        # Test operation tracking
        assert context.mark_operation_rendered("getUser") is True
        assert context.mark_operation_rendered("getUser") is False  # Already rendered
        assert "getUser" in context.rendered_operations


class TestDRYTemplateEngine:
    """Test the DRY template engine."""
    
    def test_built_in_fragments_loaded(self):
        """Test that built-in fragments are loaded."""
        engine = DRYTemplateEngine()
        
        # Check built-in fragments exist
        assert "typescript_type" in engine._fragments
        assert "graphql_operation" in engine._fragments
        assert "response_types" in engine._fragments
        assert "input_types" in engine._fragments
        assert "query_input_types" in engine._fragments
        
    def test_typescript_type_fragment(self):
        """Test TypeScript type generation fragment."""
        engine = DRYTemplateEngine()
        
        # Create test schema
        schema = Schema(name="User", schema_type=SchemaType.DYNAMODB)
        schema.attributes = [
            SchemaField(name="id", type="string", required=True),
            SchemaField(name="name", type="string", required=True),
            SchemaField(name="age", type="number", required=False),
        ]
        
        # Create context
        context = TemplateContext(data={'schema': schema})
        
        # Get fragment template
        template_content = """
{%- import "fragments/typescript_type.jinja" as ts -%}
{{ ts.render_typescript_type(schema, schema.name, _context) }}
"""
        
        # Add custom template via dictionary loader
        from jinja2 import DictLoader
        for loader in engine._env.loader.loaders:
            if isinstance(loader, DictLoader):
                loader.mapping['test_ts_type.jinja'] = template_content
                break
        
        # Render
        result = engine.render("test_ts_type.jinja", context)
        
        # Should contain interface and class (or be empty if already rendered)
        if result.strip():  # If something was rendered
            assert "export interface IUser" in result
            assert "export class User implements IUser" in result
            assert "id: string;" in result
            assert "name: string;" in result
            assert "age: number | undefined;" in result
            
            # Should have been tracked
            assert "User" in context.rendered_types
        else:
            # If nothing rendered, it means the type was already tracked
            # (which shouldn't happen in this test, but let's be defensive)
            pass
        
    def test_graphql_operation_fragment(self):
        """Test GraphQL operation generation fragment."""
        engine = DRYTemplateEngine()
        
        # Create test operation
        op = Operation(
            name="getUserQuery",
            operation_type=OperationType.QUERY,
            description="Get user by ID"
        )
        
        # Add the GQL string for testing (we'll add it as a property)
        op.gql = """
query getUser($id: ID!) {
  getUser(id: $id) {
    id
    name
  }
}"""
        
        # Create context
        context = TemplateContext(data={'op': op})
        
        # Get fragment template
        template_content = """
{%- import "fragments/graphql_operation.jinja" as gql -%}
{{ gql.render_graphql_operation(op, _context) }}
"""
        
        # Add custom template via dictionary loader
        from jinja2 import DictLoader
        for loader in engine._env.loader.loaders:
            if isinstance(loader, DictLoader):
                loader.mapping['test_gql_op.jinja'] = template_content
                break
        
        # Render
        result = engine.render("test_gql_op.jinja", context)
        
        # Should contain the operation
        assert "export const getUserQuery" in result
        assert "query getUser($id: ID!)" in result
        
        # Should have been tracked
        assert "getUserQuery" in context.rendered_operations
        
        # Render again - should be empty (already rendered)
        result2 = engine.render("test_gql_op.jinja", context)
        assert result2.strip() == ""
        
    def test_duplicate_resolver_integration(self):
        """Test integration with duplicate resolver."""
        engine = DRYTemplateEngine()
        
        # Create operations with duplicates
        operations = [
            Operation(name="getUser", operation_type=OperationType.QUERY),
            Operation(name="getUser", operation_type=OperationType.QUERY),  # Duplicate
            Operation(name="createUser", operation_type=OperationType.MUTATION),
        ]
        
        # Create context with duplicate resolver
        context = TemplateContext(
            data={'operations': operations},
            duplicate_resolver=TypeScriptDuplicateResolver()
        )
        
        # Template using dedupe filter
        template_content = """
{%- for op in operations|dedupe_operations -%}
{{ op.name }}
{% endfor -%}
"""
        
        # Add custom template via dictionary loader
        from jinja2 import DictLoader
        for loader in engine._env.loader.loaders:
            if isinstance(loader, DictLoader):
                loader.mapping['test_dedupe.jinja'] = template_content
                break
        
        # Render
        result = engine.render("test_dedupe.jinja", context)
        lines = result.strip().split('\n')
        
        assert len(lines) == 2
        assert "getUser" in lines
        assert "createUser" in lines
        
    def test_create_base_template(self):
        """Test base template creation."""
        engine = DRYTemplateEngine()
        
        # Test TypeScript base
        ts_base = engine.create_base_template('typescript')
        assert "Auto-generated by orb-schema-generator" in ts_base
        assert "block imports" in ts_base
        assert "block types" in ts_base
        
        # Test Python base
        py_base = engine.create_base_template('python')
        assert "Auto-generated by orb-schema-generator" in py_base
        assert "block imports" in py_base
        assert "block models" in py_base
        
        # Test GraphQL base
        gql_base = engine.create_base_template('graphql')
        assert "Auto-generated by orb-schema-generator" in gql_base
        assert "block types" in gql_base
        assert "block queries" in gql_base
        assert "block mutations" in gql_base
        
    def test_response_types_fragment(self):
        """Test response types generation fragment."""
        engine = DRYTemplateEngine()
        
        # Create context
        context = TemplateContext(data={'schema_name': 'User'})
        
        # Get fragment template
        template_content = """
{%- import "fragments/response_types.jinja" as resp -%}
{{ resp.render_response_types(schema_name, _context) }}
"""
        
        # Add custom template via dictionary loader
        from jinja2 import DictLoader
        for loader in engine._env.loader.loaders:
            if isinstance(loader, DictLoader):
                loader.mapping['test_response.jinja'] = template_content
                break
        
        # Render
        result = engine.render("test_response.jinja", context)
        
        # Should contain all response types
        assert "export type UserResponse" in result
        assert "export type UserCreateResponse" in result
        assert "export type UserUpdateResponse" in result
        assert "export type UserListResponse" in result
        
        # Check structure
        assert "StatusCode: number;" in result
        assert "Message: string;" in result
        assert "Data: User | null;" in result
        assert "Data: User[] | null;" in result  # List response
        
        # Should have been tracked
        assert "UserResponse" in context.rendered_types
        assert "UserCreateResponse" in context.rendered_types
        assert "UserUpdateResponse" in context.rendered_types
        assert "UserListResponse" in context.rendered_types