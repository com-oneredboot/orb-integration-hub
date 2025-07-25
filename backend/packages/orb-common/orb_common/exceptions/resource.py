"""Resource-related exceptions."""

from typing import Optional, Any, Dict
from .base import OrbError


class ResourceError(OrbError):
    """Base class for resource-related exceptions."""
    
    def __init__(self, resource_type: str, resource_id: Optional[str] = None, message: str = None, **kwargs):
        if not message:
            if resource_id:
                message = f"{resource_type} '{resource_id}' error"
            else:
                message = f"{resource_type} error"
        
        # Set default error code and status if not provided
        if 'error_code' not in kwargs:
            kwargs['error_code'] = "ORB-RES-001"
        if 'status_code' not in kwargs:
            kwargs['status_code'] = 500
            
        super().__init__(message, **kwargs)
        self.resource_type = resource_type
        self.resource_id = resource_id


class ResourceNotFoundError(OrbError):
    """Raised when a requested resource is not found."""
    
    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code="ORB-DATA-002",
            status_code=404,
            details=details
        )


class NotFoundError(OrbError):
    """Raised when a resource is not found."""
    
    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code="ORB-DATA-005",
            status_code=404,
            details=details
        )


class ResourceAlreadyExistsError(ResourceError):
    """Raised when attempting to create a resource that already exists."""
    
    def __init__(self, resource_type: str, resource_id: Optional[str] = None, **kwargs):
        if resource_id:
            message = f"{resource_type} '{resource_id}' already exists"
        else:
            message = f"{resource_type} already exists"
        
        super().__init__(resource_type, resource_id, message, **kwargs)


class ConflictError(ResourceError):
    """Raised when a resource operation conflicts with current state."""
    
    def __init__(self, resource_type: str, resource_id: Optional[str] = None, conflict_reason: str = None, **kwargs):
        if conflict_reason:
            message = f"{resource_type} conflict: {conflict_reason}"
        else:
            message = f"{resource_type} operation conflicts with current state"
        
        super().__init__(resource_type, resource_id, message, **kwargs)
        self.conflict_reason = conflict_reason


class ResourceLockedError(ResourceError):
    """Raised when a resource is locked and cannot be modified."""
    
    def __init__(self, resource_type: str, resource_id: Optional[str] = None, locked_by: str = None, **kwargs):
        if resource_id:
            message = f"{resource_type} '{resource_id}' is locked"
        else:
            message = f"{resource_type} is locked"
        
        if locked_by:
            message = f"{message} by {locked_by}"
        
        super().__init__(resource_type, resource_id, message, **kwargs)
        self.locked_by = locked_by


class ResourceExpiredError(ResourceError):
    """Raised when a resource has expired."""
    
    def __init__(self, resource_type: str, resource_id: Optional[str] = None, **kwargs):
        if resource_id:
            message = f"{resource_type} '{resource_id}' has expired"
        else:
            message = f"{resource_type} has expired"
        
        super().__init__(resource_type, resource_id, message, **kwargs)


# Standard ConflictError from common layer
class ConflictError(OrbError):
    """Raised when a resource conflict occurs (e.g., duplicate entry)."""
    
    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code="ORB-DATA-003",
            status_code=409,
            details=details
        )


class ResourceConflictError(OrbError):
    """Raised when there's a conflict with resource state.
    
    This is the security-specific conflict error.
    """
    
    def __init__(
        self,
        message: str = "Resource conflict",
        resource_type: str = None,
        resource_id: str = None,
        details: Optional[Dict[str, Any]] = None
    ):
        conflict_details = details or {}
        if resource_type:
            conflict_details['resource_type'] = resource_type
        if resource_id:
            conflict_details['resource_id'] = resource_id
            
        super().__init__(
            message=message,
            error_code="ORB-SEC-013",
            status_code=409,
            details=conflict_details
        )