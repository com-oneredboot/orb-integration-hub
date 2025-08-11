"""Core domain models and functionality for schema processing."""

from orb_schema_generator.core.models import (
    Schema, SchemaField, SchemaType, Operation,
    OperationType, SchemaIndex, AuthConfig, SchemaCollection
)
from orb_schema_generator.core.loaders import SchemaLoader
from orb_schema_generator.core.validators import SchemaValidator
from orb_schema_generator.core.converters import TypeConverter, CaseConverter
from orb_schema_generator.core.duplicate_resolver import (
    DuplicateDetector, DuplicateResolver, TypeScriptDuplicateResolver,
    ResolutionStrategy, DuplicateInfo, ResolutionResult
)

__all__ = [
    "Schema",
    "SchemaField", 
    "SchemaType",
    "Operation",
    "OperationType",
    "SchemaIndex",
    "AuthConfig",
    "SchemaCollection",
    "SchemaLoader",
    "SchemaValidator",
    "TypeConverter",
    "CaseConverter",
    "DuplicateDetector",
    "DuplicateResolver",
    "TypeScriptDuplicateResolver",
    "ResolutionStrategy",
    "DuplicateInfo",
    "ResolutionResult",
]