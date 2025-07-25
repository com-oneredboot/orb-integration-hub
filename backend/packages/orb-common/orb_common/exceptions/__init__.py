"""
Exceptions module for orb-common.

This module provides standardized exception classes for consistent error handling
across all ORB Integration Hub services.
"""

from .audit import (AuditError, AuditLogError, AuditValidationError,
                    ComplianceViolationError)
from .base import OrbBaseException, OrbError, OrbWarning, format_error_response
from .resource import (ConflictError, NotFoundError,
                       ResourceAlreadyExistsError, ResourceConflictError,
                       ResourceError, ResourceExpiredError,
                       ResourceLockedError, ResourceNotFoundError)
from .security import (AuthenticationError, AuthorizationError,
                       ContextExtractionError, CrossAccessViolationError,
                       InvalidTokenError, MFARequiredError,
                       PermissionDeniedError, RateLimitError,
                       RateLimitExceededError, SecurityException,
                       SecurityViolationError, SessionExpiredError,
                       SuspiciousActivityError, TokenExpiredError)
from .system import (BadRequestError, CircuitBreakerOpenError,
                     ConfigurationError, DatabaseError, DependencyError,
                     ExternalServiceError, InternalServerError,
                     QuotaExceededError, ServiceError, ServiceUnavailableError,
                     SystemError)
from .validation import (DataValidationError, InvalidFormatError,
                         InvalidInputError, MissingRequiredFieldError,
                         ValidationError, ValueOutOfRangeError)

__all__ = [
    # Base exceptions
    "OrbBaseException",
    "OrbError",
    "OrbWarning",
    "format_error_response",
    # Validation exceptions
    "ValidationError",
    "DataValidationError",
    "InvalidInputError",
    "MissingRequiredFieldError",
    "InvalidFormatError",
    "ValueOutOfRangeError",
    # Security exceptions
    "SecurityException",
    "AuthenticationError",
    "AuthorizationError",
    "PermissionDeniedError",
    "TokenExpiredError",
    "InvalidTokenError",
    "SecurityViolationError",
    "ContextExtractionError",
    "CrossAccessViolationError",
    "MFARequiredError",
    "SuspiciousActivityError",
    "SessionExpiredError",
    "RateLimitExceededError",
    "RateLimitError",
    # Resource exceptions
    "ResourceError",
    "ResourceNotFoundError",
    "NotFoundError",
    "ResourceAlreadyExistsError",
    "ConflictError",
    "ResourceConflictError",
    "ResourceLockedError",
    "ResourceExpiredError",
    # System exceptions
    "SystemError",
    "ConfigurationError",
    "DependencyError",
    "ServiceUnavailableError",
    "ServiceError",
    "CircuitBreakerOpenError",
    "RateLimitExceededError",
    "QuotaExceededError",
    "DatabaseError",
    "ExternalServiceError",
    "BadRequestError",
    "InternalServerError",
    # Audit exceptions
    "AuditError",
    "AuditLogError",
    "AuditValidationError",
    "ComplianceViolationError",
]
