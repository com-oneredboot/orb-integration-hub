"""Exception classes for orb-schema-generator."""

from typing import Optional, Any


class OrbSchemaGeneratorError(Exception):
    """Base exception for all orb-schema-generator errors."""
    
    def __init__(self, message: str, details: Optional[dict[str, Any]] = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details or {}


class SchemaError(OrbSchemaGeneratorError):
    """Raised when there's an error with schema structure or content."""
    pass


class ValidationError(OrbSchemaGeneratorError):
    """Raised when schema validation fails."""
    pass


class GenerationError(OrbSchemaGeneratorError):
    """Raised when code generation fails."""
    pass


class DuplicateError(OrbSchemaGeneratorError):
    """Raised when duplicate definitions are found and cannot be resolved."""
    
    def __init__(
        self, 
        message: str, 
        duplicates: Optional[list[str]] = None,
        details: Optional[dict[str, Any]] = None
    ) -> None:
        super().__init__(message, details)
        self.duplicates = duplicates or []


class TemplateError(OrbSchemaGeneratorError):
    """Raised when template processing fails."""
    pass


class ConfigurationError(OrbSchemaGeneratorError):
    """Raised when configuration is invalid or missing."""
    pass