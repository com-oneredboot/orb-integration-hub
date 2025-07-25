"""Base exception classes for ORB Integration Hub."""

from typing import Any, Dict, Optional


class OrbBaseException(Exception):
    """Base exception class for all ORB exceptions."""

    def __init__(
        self,
        message: str,
        error_code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        """Initialize base exception.

        Args:
            message: Human-readable error message
            error_code: Machine-readable error code
            details: Additional error details
        """
        super().__init__(message)
        self.message = message
        self.error_code = error_code or self.__class__.__name__
        self.details = details or {}

    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary format."""
        return {
            "error": self.error_code,
            "message": self.message,
            "details": self.details,
        }


class OrbError(Exception):
    """Base exception for all ORB Integration Hub errors.

    This is the main base class used by the existing codebase.
    """

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

    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary format."""
        return {
            "statusCode": self.status_code,
            "body": {
                "error": {"code": self.error_code, "message": self.message, "details": self.details}
            },
        }


class OrbWarning(OrbBaseException):
    """Base class for warning conditions."""

    pass


def format_error_response(error: OrbError) -> Dict[str, Any]:
    """
    Format an error response in a consistent way.

    Args:
        error: The OrbError instance to format

    Returns:
        Dict containing the formatted error response
    """
    return error.to_dict()
