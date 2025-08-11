"""
orb-schema-generator: A comprehensive schema-driven code generator.

This package provides a powerful, extensible framework for generating code
from schema definitions, supporting TypeScript, Python, GraphQL, and CloudFormation.
"""

__version__ = "0.1.0"
__author__ = "ORB Integration Hub Team"
__email__ = "team@orb-integration-hub.com"

# Public API - Core Models
from orb_schema_generator.core.models import (
    Schema,
    SchemaField,
    SchemaIndex,
    SchemaType,
    SchemaCollection,
    Operation,
    OperationType,
    AuthConfig,
    CustomQuery,
    IndexType,
    ProjectionType,
)

# Public API - Loaders
from orb_schema_generator.core.loaders import SchemaLoader

# Public API - Generators
from orb_schema_generator.generators.typescript_generator import (
    TypeScriptGenerator,
    TypeScriptGeneratorConfig,
)
from orb_schema_generator.generators.python_generator import (
    PythonGenerator,
    PythonGeneratorConfig,
)
from orb_schema_generator.generators.graphql_generator import (
    GraphQLGenerator,
    GraphQLGeneratorConfig,
)

# Public API - Exceptions
from orb_schema_generator.core.exceptions import (
    OrbSchemaGeneratorError,
    SchemaError,
    ValidationError,
    GenerationError,
    DuplicateError,
    TemplateError,
    ConfigurationError,
)

__all__ = [
    # Version info
    "__version__",
    "__author__",
    "__email__",
    # Core models
    "Schema",
    "SchemaField",
    "SchemaIndex",
    "SchemaType",
    "SchemaCollection",
    "Operation",
    "OperationType",
    "AuthConfig",
    "CustomQuery",
    "IndexType",
    "ProjectionType",
    # Loaders
    "SchemaLoader",
    # Generators
    "TypeScriptGenerator",
    "TypeScriptGeneratorConfig",
    "PythonGenerator",
    "PythonGeneratorConfig",
    "GraphQLGenerator",
    "GraphQLGeneratorConfig",
    # Exceptions
    "OrbSchemaGeneratorError",
    "SchemaError",
    "ValidationError",
    "GenerationError",
    "DuplicateError",
    "TemplateError",
    "ConfigurationError",
]