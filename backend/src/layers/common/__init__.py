# Common layer initialization
"""
Common layer for shared functionality across Lambda functions.
"""

# Make security_exceptions available at package level
from .security_exceptions import *
from .exceptions import *

# Mark as package
__all__ = [
    # From exceptions
    'OrbError',
    'ValidationError',
    'AuthenticationError',
    'AuthorizationError',
    'ResourceNotFoundError',
    'DatabaseError',
    'ExternalServiceError',
    'ConflictError',
    'BadRequestError',
    'NotFoundError',
    'InternalServerError',
    'ServiceError',
    # From security_exceptions
    'SecurityException',
    'ContextExtractionError',
    'SecurityViolationError',
    'RateLimitExceededError',
    'RateLimitError',
    'ResourceConflictError',
    'DataValidationError',
    'ComplianceViolationError',
    'AuditLogError',
    'SessionExpiredError',
    'InvalidTokenError',
    'PermissionDeniedError',
    'CrossAccessViolationError',
    'MFARequiredError',
    'SuspiciousActivityError'
]
