"""Tests for GraphQL schema generator."""

import pytest
from pathlib import Path
from datetime import datetime

from orb_schema_generator.core.models import (
    Schema, SchemaCollection, SchemaField, SchemaType, 
    Operation, OperationType, AuthConfig
)
from orb_schema_generator.generators.graphql_generator import (
    GraphQLGenerator, GraphQLGeneratorConfig
)


@pytest.fixture
def graphql_generator(tmp_path):
    """Create a GraphQL generator instance."""
    config = GraphQLGeneratorConfig(output_dir=tmp_path)
    return GraphQLGenerator(config)


@pytest.fixture
def dynamodb_schema():
    """Create a sample DynamoDB schema."""
    return Schema(
        name="User",
        schema_type=SchemaType.DYNAMODB,
        table_name="Users",
        partition_key="id",
        sort_key="createdAt",
        description="User entity schema",
        fields=[
            SchemaField(
                name="id",
                type="String",
                required=True,
                description="User ID"
            ),
            SchemaField(
                name="createdAt",
                type="String",
                required=True,
                description="Creation timestamp"
            ),
            SchemaField(
                name="email",
                type="String",
                required=True,
                unique=True,
                description="User email"
            ),
            SchemaField(
                name="status",
                type="String",
                enum_type="UserStatus",
                enum_values=["ACTIVE", "INACTIVE", "PENDING"],
                description="User status"
            ),
            SchemaField(
                name="roles",
                type="List",
                items={"type": "String"},
                description="User roles"
            )
        ],
        operations=[
            Operation(
                name="getUser",
                operation_type=OperationType.QUERY,
                description="Get a user by ID",
                table_name="Users"
            ),
            Operation(
                name="updateUser",
                operation_type=OperationType.MUTATION,
                description="Update user details",
                table_name="Users"
            )
        ]
    )


@pytest.fixture
def graphql_type_schema():
    """Create a sample GraphQL type schema."""
    return Schema(
        name="Organization",
        schema_type=SchemaType.GRAPHQL,
        description="Organization type",
        fields=[
            SchemaField(
                name="id",
                type="ID",
                required=True,
                description="Organization ID"
            ),
            SchemaField(
                name="name",
                type="String",
                required=True,
                description="Organization name"
            ),
            SchemaField(
                name="type",
                type="String",
                enum_type="OrganizationType",
                enum_values=["ENTERPRISE", "STARTUP", "NON_PROFIT"],
                description="Organization type"
            )
        ]
    )


@pytest.fixture
def lambda_schema():
    """Create a sample Lambda schema."""
    return Schema(
        name="Analytics",
        schema_type=SchemaType.LAMBDA,
        description="Analytics lambda functions",
        fields=[
            SchemaField(
                name="metricType",
                type="String",
                required=True,
                description="Type of metric"
            ),
            SchemaField(
                name="value",
                type="Float",
                required=True,
                description="Metric value"
            )
        ],
        operations=[
            Operation(
                name="getMetrics",
                operation_type=OperationType.QUERY,
                description="Get analytics metrics",
                resolver_type="lambda"
            )
        ]
    )


@pytest.fixture
def schema_collection(dynamodb_schema, graphql_type_schema, lambda_schema):
    """Create a collection with multiple schema types."""
    collection = SchemaCollection()
    collection.add_schema(dynamodb_schema)
    collection.add_schema(graphql_type_schema)
    collection.add_schema(lambda_schema)
    return collection


def test_generate_graphql_schema(graphql_generator, schema_collection):
    """Test generating a complete GraphQL schema."""
    results = graphql_generator.generate(schema_collection)
    
    assert 'generated_files' in results
    assert 'errors' in results
    assert len(results['errors']) == 0
    assert len(results['generated_files']) == 1
    
    # Check the generated file
    output_file = Path(results['generated_files'][0])
    assert output_file.exists()
    assert output_file.name == "schema.graphql"
    
    # Read and validate content
    content = output_file.read_text()
    
    # Check schema declaration
    assert "schema {" in content
    assert "query: Query" in content
    assert "mutation: Mutation" in content
    
    # Check enums
    assert "enum UserStatus {" in content
    assert "ACTIVE" in content
    assert "INACTIVE" in content
    assert "PENDING" in content
    assert "enum OrganizationType {" in content
    assert "ENTERPRISE" in content
    assert "STARTUP" in content
    assert "NON_PROFIT" in content
    
    # Check types
    assert "type User {" in content
    assert "id: String!" in content
    assert "email: String!" in content
    assert "status: UserStatus" in content
    assert "roles: [String]" in content
    
    assert "type Organization {" in content
    assert "id: ID!" in content
    assert "name: String!" in content
    assert "type: OrganizationType" in content
    
    # Check operations
    assert "type Query {" in content
    assert "getUser" in content
    assert "getMetrics" in content
    
    assert "type Mutation {" in content
    assert "updateUser" in content


def test_generate_empty_collection(graphql_generator):
    """Test generating with empty collection."""
    collection = SchemaCollection()
    results = graphql_generator.generate(collection)
    
    assert len(results['errors']) == 0
    assert len(results['generated_files']) == 1
    
    # Check the generated file has minimal content
    output_file = Path(results['generated_files'][0])
    content = output_file.read_text()
    
    assert "schema {" in content
    assert "type Query {" in content
    assert "type Mutation {" in content


def test_extract_enums(graphql_generator):
    """Test enum extraction from schemas."""
    schemas = [
        Schema(
            name="Test1",
            schema_type=SchemaType.DYNAMODB,
            fields=[
                SchemaField(
                    name="status",
                    type="String",
                    enum_type="Status",
                    enum_values=["A", "B", "C"]
                )
            ]
        ),
        Schema(
            name="Test2",
            schema_type=SchemaType.GRAPHQL,
            fields=[
                SchemaField(
                    name="type",
                    type="String",
                    enum_type="Type",
                    enum_values=["X", "Y", "Z"]
                ),
                SchemaField(
                    name="status",
                    type="String",
                    enum_type="Status",
                    enum_values=["A", "B", "C"]  # Same enum, same values
                )
            ]
        )
    ]
    
    enums = graphql_generator._extract_enums(schemas)
    
    assert len(enums) == 2
    assert "Status" in enums
    assert enums["Status"] == ["A", "B", "C"]
    assert "Type" in enums
    assert enums["Type"] == ["X", "Y", "Z"]


def test_conflicting_enums_warning(graphql_generator, caplog):
    """Test warning for conflicting enum values."""
    schemas = [
        Schema(
            name="Test1",
            schema_type=SchemaType.DYNAMODB,
            fields=[
                SchemaField(
                    name="status",
                    type="String",
                    enum_type="Status",
                    enum_values=["A", "B", "C"]
                )
            ]
        ),
        Schema(
            name="Test2",
            schema_type=SchemaType.GRAPHQL,
            fields=[
                SchemaField(
                    name="status",
                    type="String",
                    enum_type="Status",
                    enum_values=["X", "Y", "Z"]  # Different values for same enum
                )
            ]
        )
    ]
    
    enums = graphql_generator._extract_enums(schemas)
    
    # Should keep the first definition
    assert enums["Status"] == ["A", "B", "C"]
    
    # Should log a warning
    assert "Enum Status has conflicting values" in caplog.text


def test_prepare_context(graphql_generator, schema_collection):
    """Test context preparation for templates."""
    context = graphql_generator._prepare_context(schema_collection)
    
    assert "table_schemas" in context
    assert "graphql_types" in context
    assert "lambda_types" in context
    assert "enums" in context
    assert "timestamp" in context
    
    # DynamoDB + Lambda with operations go in table_schemas
    assert len(context["table_schemas"]) == 2
    # GraphQL type + Lambda type go in graphql_types
    assert len(context["graphql_types"]) == 2
    # lambda_types is kept for compatibility but not used by templates
    assert len(context["lambda_types"]) == 0
    assert len(context["enums"]) == 2  # UserStatus and OrganizationType
    
    # Check timestamp format
    timestamp = datetime.fromisoformat(context["timestamp"])
    assert timestamp is not None


def test_custom_template_dir(tmp_path):
    """Test using custom template directory."""
    template_dir = tmp_path / "custom_templates"
    template_dir.mkdir()
    
    # Create a simple custom template
    custom_template = template_dir / "graphql_schema.jinja"
    custom_template.write_text("# Custom GraphQL Schema\n# Generated at {{ timestamp }}")
    
    config = GraphQLGeneratorConfig(
        output_dir=tmp_path / "output",
        template_dir=template_dir
    )
    generator = GraphQLGenerator(config)
    
    collection = SchemaCollection()
    results = generator.generate(collection)
    
    assert len(results['errors']) == 0
    assert len(results['generated_files']) == 1
    
    # Check custom template was used
    output_file = Path(results['generated_files'][0])
    content = output_file.read_text()
    assert "# Custom GraphQL Schema" in content
    assert "# Generated at" in content


def test_template_rendering_error(graphql_generator, tmp_path):
    """Test handling of template rendering errors."""
    # Create a bad template that will cause a syntax error
    bad_template = tmp_path / "graphql_schema.jinja"
    bad_template.write_text("{% for item in %}bad syntax{% endfor %}")
    
    # Override the template directory
    graphql_generator.config.template_dir = tmp_path
    graphql_generator._setup_template_environment()
    
    collection = SchemaCollection()
    
    # Should raise an exception due to template syntax error
    with pytest.raises(Exception) as exc_info:
        graphql_generator.generate(collection)
    
    # Check that we got an exception (the specific error message varies)
    assert exc_info.value is not None