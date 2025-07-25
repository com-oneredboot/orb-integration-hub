"""Validation-related exceptions."""

from typing import Any, Dict, Optional

from .base import OrbError


class ValidationError(OrbError):
    """Raised when input validation fails."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message, error_code="ORB-DATA-001", status_code=400, details=details
        )


class DataValidationError(OrbError):
    """Raised when security-related data validation fails.

    This is used specifically for security validation contexts.
    """

    def __init__(
        self,
        message: str = "Data validation failed",
        validation_errors: Dict[str, Any] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        validation_details = details or {}
        if validation_errors:
            validation_details["validation_errors"] = validation_errors

        super().__init__(
            message=message, error_code="ORB-SEC-004", status_code=400, details=validation_details
        )


class InvalidInputError(DataValidationError):
    """Raised when input data is invalid."""

    pass


class MissingRequiredFieldError(DataValidationError):
    """Raised when a required field is missing."""

    def __init__(self, field_name: str, **kwargs):
        message = f"Required field '{field_name}' is missing"
        super().__init__(message, **kwargs)
        self.field_name = field_name


class InvalidFormatError(DataValidationError):
    """Raised when data format is invalid."""

    def __init__(self, field_name: str, expected_format: str, **kwargs):
        message = f"Invalid format for field '{field_name}'. Expected: {expected_format}"
        super().__init__(message, **kwargs)
        self.field_name = field_name
        self.expected_format = expected_format


class ValueOutOfRangeError(DataValidationError):
    """Raised when a value is outside acceptable range."""

    def __init__(self, field_name: str, min_value=None, max_value=None, **kwargs):
        if min_value is not None and max_value is not None:
            message = f"Value for '{field_name}' must be between {min_value} and {max_value}"
        elif min_value is not None:
            message = f"Value for '{field_name}' must be at least {min_value}"
        elif max_value is not None:
            message = f"Value for '{field_name}' must be at most {max_value}"
        else:
            message = f"Value for '{field_name}' is out of range"

        super().__init__(message, **kwargs)
        self.field_name = field_name
        self.min_value = min_value
        self.max_value = max_value
