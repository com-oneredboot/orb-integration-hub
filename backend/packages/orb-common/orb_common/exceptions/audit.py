"""Audit-related exceptions."""

from .base import OrbError


class AuditError(OrbError):
    """Base class for audit-related exceptions."""
    pass


class AuditLogError(AuditError):
    """Raised when audit logging fails."""
    
    def __init__(self, reason: str = None, **kwargs):
        if reason:
            message = f"Audit logging failed: {reason}"
        else:
            message = "Audit logging failed"
        
        super().__init__(message, **kwargs)
        self.reason = reason


class AuditValidationError(AuditError):
    """Raised when audit data validation fails."""
    
    def __init__(self, field: str = None, reason: str = None, **kwargs):
        if field and reason:
            message = f"Audit validation failed for field '{field}': {reason}"
        elif field:
            message = f"Audit validation failed for field '{field}'"
        elif reason:
            message = f"Audit validation failed: {reason}"
        else:
            message = "Audit validation failed"
        
        super().__init__(message, **kwargs)
        self.field = field
        self.reason = reason


class ComplianceViolationError(AuditError):
    """Raised when a compliance violation is detected."""
    
    def __init__(self, compliance_type: str, violation: str = None, **kwargs):
        if violation:
            message = f"{compliance_type} compliance violation: {violation}"
        else:
            message = f"{compliance_type} compliance violation detected"
        
        super().__init__(message, **kwargs)
        self.compliance_type = compliance_type
        self.violation = violation