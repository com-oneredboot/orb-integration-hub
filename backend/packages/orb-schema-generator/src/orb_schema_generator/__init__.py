"""
orb-schema-generator: A comprehensive schema-driven code generator.

This package provides a powerful, extensible framework for generating code
from schema definitions, supporting TypeScript, Python, GraphQL, and CloudFormation.
"""

from orb_schema_generator.version import __version__
__author__ = "ORB Integration Hub Team"
__email__ = "team@orb-integration-hub.com"

# Public API
from orb_schema_generator.api.generator import OrbSchemaGenerator
from orb_schema_generator.core.exceptions import (
    SchemaError,
    ValidationError,
    GenerationError,
    DuplicateError,
)

__all__ = [
    "OrbSchemaGenerator",
    "SchemaError",
    "ValidationError", 
    "GenerationError",
    "DuplicateError",
    "__version__",
]