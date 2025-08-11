"""Tests for Python code generator."""

import pytest
from pathlib import Path
from datetime import datetime
from orb_schema_generator.generators.python_generator import (
    PythonGenerator,
    PythonGeneratorConfig
)
from orb_schema_generator.core.models import (
    Schema,
    SchemaCollection,
    SchemaField,
    SchemaIndex
)


@pytest.fixture
def generator_config(tmp_path):
    """Create a generator configuration."""
    templates_dir = Path(__file__).parent.parent.parent / "templates"
    return PythonGeneratorConfig(
        output_dir=tmp_path / "output",
        template_dir=templates_dir
    )


@pytest.fixture
def python_generator(generator_config):
    """Create a Python generator instance."""
    return PythonGenerator(generator_config)


@pytest.fixture
def sample_schema():
    """Create a sample schema for testing."""
    from orb_schema_generator.core.models import SchemaType, IndexType
    return Schema(
        name="User",
        schema_type=SchemaType.DYNAMODB,
        table_name="Users",
        partition_key="user_id",
        sort_key="created_at",
        fields=[
            SchemaField(
                name="user_id",
                type="string",
                required=True,
                description="User ID"
            ),
            SchemaField(
                name="email",
                type="string",
                required=True,
                description="User email"
            ),
            SchemaField(
                name="status",
                type="string",
                required=True,
                enum_type="UserStatus",
                enum_values=["ACTIVE", "INACTIVE", "SUSPENDED"],
                description="User status"
            ),
            SchemaField(
                name="created_at",
                type="timestamp",
                required=True,
                description="Creation timestamp"
            ),
            SchemaField(
                name="updated_at",
                type="timestamp",
                required=False,
                description="Update timestamp"
            ),
            SchemaField(
                name="is_verified",
                type="boolean",
                required=False,
                description="Email verification status"
            ),
            SchemaField(
                name="tags",
                type="array",
                required=False,
                description="User tags"
            )
        ],
        indexes=[
            SchemaIndex(
                name="EmailIndex",
                type=IndexType.GSI,
                partition_key="email",
                projection_type="ALL"
            )
        ]
    )


def test_generator_initialization(python_generator):
    """Test that the generator initializes correctly."""
    assert python_generator is not None
    assert python_generator.env is not None
    assert python_generator.case_converter is not None


def test_generate_empty_collection(python_generator):
    """Test generating from an empty collection."""
    collection = SchemaCollection()
    results = python_generator.generate(collection)
    
    # Empty collection still generates init files
    assert len(results['generated_files']) >= 2  # At least models and enums __init__.py
    assert results['errors'] == []


def test_generate_single_model(python_generator, sample_schema):
    """Test generating a single Python model."""
    collection = SchemaCollection(schemas=[sample_schema])
    results = python_generator.generate(collection)
    
    # Check results
    assert len(results['errors']) == 0
    assert len(results['generated_files']) >= 3  # Model, enums, and init files
    
    # Check model file was created
    model_file = Path(results['generated_files'][0])
    assert model_file.exists()
    assert model_file.name == "UserModel.py"
    
    # Check content
    content = model_file.read_text()
    assert "class User(BaseModel):" in content
    assert "class UserCreateInput(BaseModel):" in content
    assert "class UserUpdateInput(BaseModel):" in content
    assert "user_id: str" in content
    assert "email: str" in content
    assert "from .UserStatusEnum import UserStatus" in content


def test_generate_enum_files(python_generator, sample_schema):
    """Test that enum files are generated correctly."""
    collection = SchemaCollection(schemas=[sample_schema])
    results = python_generator.generate(collection)
    
    # Find enum file
    enum_files = [f for f in results['generated_files'] if 'UserStatusEnum.py' in f]
    assert len(enum_files) == 1
    
    enum_file = Path(enum_files[0])
    assert enum_file.exists()
    
    content = enum_file.read_text()
    assert "class UserStatus(Enum):" in content
    assert 'ACTIVE = "ACTIVE"' in content
    assert 'INACTIVE = "INACTIVE"' in content
    assert 'SUSPENDED = "SUSPENDED"' in content


def test_generate_init_files(python_generator, sample_schema):
    """Test that __init__.py files are generated."""
    collection = SchemaCollection(schemas=[sample_schema])
    results = python_generator.generate(collection)
    
    # Check models __init__.py
    models_init = python_generator.config.output_dir / "models" / "__init__.py"
    assert models_init.exists()
    
    content = models_init.read_text()
    assert "from .UserModel import User" in content
    assert "from .UserModel import UserResponse" in content
    assert "__all__ =" in content
    
    # Check enums __init__.py
    enums_init = python_generator.config.output_dir / "enums" / "__init__.py"
    assert enums_init.exists()
    
    content = enums_init.read_text()
    assert "from .UserStatusEnum import UserStatus" in content


def test_lambda_type_generation(python_generator):
    """Test generating Lambda-backed type."""
    from orb_schema_generator.core.models import SchemaType
    lambda_schema = Schema(
        name="Auth",
        schema_type=SchemaType.LAMBDA,
        fields=[
            SchemaField(
                name="access_token",
                type="string",
                required=True,
                description="JWT access token"
            ),
            SchemaField(
                name="refresh_token",
                type="string",
                required=True,
                description="JWT refresh token"
            ),
            SchemaField(
                name="expires_at",
                type="timestamp",
                required=True,
                description="Token expiration"
            )
        ]
    )
    
    collection = SchemaCollection(schemas=[lambda_schema])
    results = python_generator.generate(collection)
    
    assert len(results['errors']) == 0
    
    # Check model file
    model_files = [f for f in results['generated_files'] if 'AuthModel.py' in f]
    assert len(model_files) == 1
    
    content = Path(model_files[0]).read_text()
    assert "class Auth(BaseModel):" in content
    assert "access_token: str" in content
    assert "refresh_token: str" in content
    assert "expires_at: datetime" in content  # Lambda uses datetime


def test_skip_graphql_only_types(python_generator):
    """Test that GraphQL-only types are skipped."""
    from orb_schema_generator.core.models import SchemaType
    graphql_schema = Schema(
        name="Viewer",
        schema_type=SchemaType.GRAPHQL,
        fields=[
            SchemaField(
                name="id",
                type="string",
                required=True,
                description="Viewer ID"
            )
        ]
    )
    
    collection = SchemaCollection(schemas=[graphql_schema])
    results = python_generator.generate(collection)
    
    # Should only generate init files, no model files
    model_files = [f for f in results['generated_files'] if 'ViewerModel.py' in f]
    assert len(model_files) == 0


def test_type_conversion(python_generator):
    """Test Python type conversion."""
    assert python_generator._to_python_type("string") == "str"
    assert python_generator._to_python_type("number") == "float"
    assert python_generator._to_python_type("boolean") == "bool"
    assert python_generator._to_python_type("array") == "List[str]"
    assert python_generator._to_python_type("object") == "Dict[str, Any]"
    assert python_generator._to_python_type("timestamp") == "int"
    assert python_generator._to_python_type("S") == "str"  # DynamoDB type
    assert python_generator._to_python_type("N") == "float"  # DynamoDB type
    assert python_generator._to_python_type("unknown") == "str"  # Default


def test_error_handling(python_generator):
    """Test error handling during generation."""
    from orb_schema_generator.core.models import SchemaType
    # Create a schema that will cause template error by having an invalid template
    bad_schema = Schema(
        name="BadSchema",
        schema_type=SchemaType.STANDARD,
        fields=[]
    )
    
    # Temporarily modify the template mapping to use a non-existent template
    original_templates = python_generator.config.template_names.copy()
    python_generator.config.template_names['standard'] = 'non_existent_template.jinja'
    
    collection = SchemaCollection(schemas=[bad_schema])
    results = python_generator.generate(collection)
    
    # Restore original templates
    python_generator.config.template_names = original_templates
    
    # Should have errors but not crash
    assert len(results['errors']) > 0
    assert results['errors'][0]['schema'] == 'BadSchema'
    assert 'non_existent_template.jinja' in results['errors'][0]['error']