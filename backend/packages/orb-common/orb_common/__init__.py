"""
orb-common: Common utilities and exceptions for ORB Integration Hub Lambda functions.

This package provides shared functionality across all Lambda functions and layers
in the ORB Integration Hub project.
"""

__version__ = "0.1.0"
__author__ = "ORB Integration Hub Team"
__email__ = "team@orb-integration-hub.com"

# Import main modules for easy access
from . import exceptions
from . import security
from . import audit
from . import utils

# Import commonly used items at package level
# Standard exceptions
from .exceptions import (
    OrbError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    ResourceNotFoundError,
    DatabaseError,
    ExternalServiceError,
    ConflictError,
    BadRequestError,
    NotFoundError,
    InternalServerError,
    ServiceError,
)

# Security exceptions
from .exceptions import (
    SecurityException,
    ContextExtractionError,
    SecurityViolationError,
    DataValidationError,
    RateLimitExceededError,
    RateLimitError,
    ResourceConflictError,
    ComplianceViolationError,
    AuditLogError,
    SessionExpiredError,
    InvalidTokenError,
    PermissionDeniedError,
    CrossAccessViolationError,
    MFARequiredError,
    SuspiciousActivityError,
)

# Audit components
from .audit import (
    BaseAuditEventType,
    AuditEventType,
    get_audit_logger,
    StateTracker,
    FieldClassification,
)

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
    "utils",
    
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
]