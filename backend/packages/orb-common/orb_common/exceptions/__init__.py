"""
Exceptions module for orb-common.

This module provides standardized exception classes for consistent error handling
across all ORB Integration Hub services.
"""

from .base import (
    OrbBaseException,
    OrbError,
    OrbWarning,
    format_error_response,
)

from .validation import (
    ValidationError,
    DataValidationError,
    InvalidInputError,
    MissingRequiredFieldError,
    InvalidFormatError,
    ValueOutOfRangeError,
)

from .security import (
    SecurityException,
    AuthenticationError,
    AuthorizationError,
    PermissionDeniedError,
    TokenExpiredError,
    InvalidTokenError,
    SecurityViolationError,
    ContextExtractionError,
    CrossAccessViolationError,
    MFARequiredError,
    SuspiciousActivityError,
    SessionExpiredError,
    RateLimitExceededError,
    RateLimitError,
)

from .resource import (
    ResourceError,
    ResourceNotFoundError,
    NotFoundError,
    ResourceAlreadyExistsError,
    ConflictError,
    ResourceConflictError,
    ResourceLockedError,
    ResourceExpiredError,
)

from .system import (
    SystemError,
    ConfigurationError,
    DependencyError,
    ServiceUnavailableError,
    ServiceError,
    CircuitBreakerOpenError,
    QuotaExceededError,
    DatabaseError,
    ExternalServiceError,
    BadRequestError,
    InternalServerError,
)

from .audit import (
    AuditError,
    AuditLogError,
    AuditValidationError,
    ComplianceViolationError,
)

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