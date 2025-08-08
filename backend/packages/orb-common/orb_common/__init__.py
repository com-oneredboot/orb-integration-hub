"""
orb-common: Common utilities and exceptions for ORB Integration Hub Lambda functions.

This package provides shared functionality across all Lambda functions and layers
in the ORB Integration Hub project.
"""

from ._version import __version__

__author__ = "ORB Integration Hub Team"
__email__ = "team@orb-integration-hub.com"

# Import commonly used items at package level
from .audit import (
    AuditEventType,
    BaseAuditEventType,
    FieldClassification,
    StateTracker,
    get_audit_logger,
    log_audit_event,
)
from .exceptions import (
    AuditLogError,
    AuthenticationError,
    AuthorizationError,
    BadRequestError,
    ComplianceViolationError,
    ConflictError,
    ContextExtractionError,
    CrossAccessViolationError,
    DatabaseError,
    DataValidationError,
    ExternalServiceError,
    InternalServerError,
    InvalidTokenError,
    MFARequiredError,
    NotFoundError,
    OrbError,
    PermissionDeniedError,
    RateLimitError,
    RateLimitExceededError,
    ResourceConflictError,
    ResourceNotFoundError,
    SecurityException,
    SecurityViolationError,
    ServiceError,
    SessionExpiredError,
    SuspiciousActivityError,
    ValidationError,
)
from .security import validate_token

# Package metadata
__all__ = [
    # Metadata
    "__version__",
    "__author__",
    "__email__",
    # Modules
    "exceptions",
    "security",
    "audit",
    # Standard exceptions
    "OrbError",
    "ValidationError",
    "AuthenticationError",
    "AuthorizationError",
    "ResourceNotFoundError",
    "DatabaseError",
    "ExternalServiceError",
    "ConflictError",
    "BadRequestError",
    "NotFoundError",
    "InternalServerError",
    "ServiceError",
    # Security exceptions
    "SecurityException",
    "ContextExtractionError",
    "SecurityViolationError",
    "DataValidationError",
    "RateLimitExceededError",
    "RateLimitError",
    "ResourceConflictError",
    "ComplianceViolationError",
    "AuditLogError",
    "SessionExpiredError",
    "InvalidTokenError",
    "PermissionDeniedError",
    "CrossAccessViolationError",
    "MFARequiredError",
    "SuspiciousActivityError",
    # Audit components
    "BaseAuditEventType",
    "AuditEventType",
    "get_audit_logger",
    "StateTracker",
    "FieldClassification",
    "log_audit_event",
    # Security functions
    "validate_token",
]
