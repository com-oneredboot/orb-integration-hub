"""
Common exceptions module for the ORB Integration Hub backend.

This module provides a standardized set of exceptions for consistent error handling
across the backend services.
"""

from typing import Any, Dict, Optional


class OrbError(Exception):
    """Base exception for all ORB Integration Hub errors."""

    def __init__(
        self,
        message: str,
        error_code: str,
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)


class ValidationError(OrbError):
    """Raised when input validation fails."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message, error_code="ORB-DATA-001", status_code=400, details=details
        )


class AuthenticationError(OrbError):
    """Raised when authentication fails."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message, error_code="ORB-AUTH-002", status_code=401, details=details
        )


class AuthorizationError(OrbError):
    """Raised when authorization fails."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message, error_code="ORB-AUTH-003", status_code=403, details=details
        )


class ResourceNotFoundError(OrbError):
    """Raised when a requested resource is not found."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message, error_code="ORB-DATA-002", status_code=404, details=details
        )


class DatabaseError(OrbError):
    """Raised when database operations fail."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message, error_code="ORB-SYS-001", status_code=500, details=details
        )


class ExternalServiceError(OrbError):
    """Raised when external service calls fail."""

    def __init__(
        self, message: str, service: str, details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code="ORB-API-004",
            status_code=502,
            details={"service": service, **(details or {})},
        )


def format_error_response(error: OrbError) -> Dict[str, Any]:
    """
    Format an error response in a consistent way.

    Args:
        error: The OrbError instance to format

    Returns:
        Dict containing the formatted error response
    """
    return {
        "statusCode": error.status_code,
        "body": {
            "error": {
                "code": error.error_code,
                "message": error.message,
                "details": error.details,
            }
        },
    }
