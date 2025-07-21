# Common layer initialization
"""
Common layer for shared functionality across Lambda functions.
"""

# Make security_exceptions available at package level
from .security_exceptions import *
from .exceptions import *

# Mark as package
__all__ = [
    # From security_exceptions
    'SecurityViolationError',
    'DataValidationError', 
    'AuthenticationError',
    'AuthorizationError',
    'ResourceNotFoundError',
    'ResourceConflictError',
    'RateLimitError',
    'ServiceError',
    # From exceptions
    'ConflictError',
    'BadRequestError',
    'NotFoundError',
    'InternalServerError'
]