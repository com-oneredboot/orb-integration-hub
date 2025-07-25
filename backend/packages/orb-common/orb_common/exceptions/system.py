"""System-related exceptions."""

from typing import Optional
from .base import OrbError


class SystemError(OrbError):
    """Base class for system-related exceptions."""
    pass


class ConfigurationError(SystemError):
    """Raised when system configuration is invalid."""
    
    def __init__(self, config_name: str, reason: str = None, **kwargs):
        if reason:
            message = f"Invalid configuration '{config_name}': {reason}"
        else:
            message = f"Invalid configuration '{config_name}'"
        
        super().__init__(message, **kwargs)
        self.config_name = config_name
        self.reason = reason


class DependencyError(SystemError):
    """Raised when a required dependency is not available."""
    
    def __init__(self, dependency_name: str, reason: str = None, **kwargs):
        if reason:
            message = f"Dependency '{dependency_name}' error: {reason}"
        else:
            message = f"Dependency '{dependency_name}' is not available"
        
        super().__init__(message, **kwargs)
        self.dependency_name = dependency_name
        self.reason = reason


class ServiceUnavailableError(SystemError):
    """Raised when a required service is unavailable."""
    
    def __init__(self, service_name: str, retry_after: Optional[int] = None, **kwargs):
        message = f"Service '{service_name}' is temporarily unavailable"
        if retry_after:
            message = f"{message}. Retry after {retry_after} seconds"
        
        super().__init__(message, **kwargs)
        self.service_name = service_name
        self.retry_after = retry_after


class CircuitBreakerOpenError(ServiceUnavailableError):
    """Raised when circuit breaker is open for a service."""
    
    def __init__(self, service_name: str, **kwargs):
        super().__init__(service_name, **kwargs)
        self.message = f"Circuit breaker is open for service '{service_name}'"


class RateLimitExceededError(SystemError):
    """Raised when rate limit is exceeded."""
    
    def __init__(self, limit: int, window: str, retry_after: Optional[int] = None, **kwargs):
        message = f"Rate limit exceeded: {limit} requests per {window}"
        if retry_after:
            message = f"{message}. Retry after {retry_after} seconds"
        
        super().__init__(message, **kwargs)
        self.limit = limit
        self.window = window
        self.retry_after = retry_after


class QuotaExceededError(SystemError):
    """Raised when quota is exceeded."""
    
    def __init__(self, resource: str, quota: int, current: int = None, **kwargs):
        if current is not None:
            message = f"Quota exceeded for {resource}: {current}/{quota}"
        else:
            message = f"Quota exceeded for {resource}: limit is {quota}"
        
        super().__init__(message, **kwargs)
        self.resource = resource
        self.quota = quota
        self.current = current


class DatabaseError(OrbError):
    """Raised when database operations fail."""
    
    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code="ORB-SYS-001",
            status_code=500,
            details=details
        )


class ExternalServiceError(OrbError):
    """Raised when external service calls fail."""
    
    def __init__(
        self,
        message: str,
        service: str,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code="ORB-API-004",
            status_code=502,
            details={"service": service, **(details or {})}
        )


class BadRequestError(OrbError):
    """Raised when the request is malformed or invalid."""
    
    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code="ORB-DATA-004",
            status_code=400,
            details=details
        )


class InternalServerError(OrbError):
    """Raised when an internal server error occurs."""
    
    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code="ORB-SYS-002",
            status_code=500,
            details=details
        )


class ServiceError(OrbError):
    """Raised when a service encounters an error."""
    
    def __init__(
        self,
        message: str,
        service_name: str = None,
        details: Optional[Dict[str, Any]] = None
    ):
        service_details = details or {}
        if service_name:
            service_details['service'] = service_name
            
        super().__init__(
            message=message,
            error_code="ORB-SVC-001",
            status_code=503,
            details=service_details
        )