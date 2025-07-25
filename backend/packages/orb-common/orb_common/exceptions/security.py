"""Security-related exceptions."""

from typing import Any, Dict, List, Optional

from .base import OrbError


class SecurityException(OrbError):
    """Base exception for all security-related errors."""

    def __init__(
        self,
        message: str,
        error_code: str = None,
        status_code: int = 403,
        details: Optional[Dict[str, Any]] = None,
        severity: str = "MEDIUM",
    ):
        # Use provided error code or generate from class name
        if not error_code:
            error_code = f"ORB-SEC-{self.__class__.__name__.upper()}"

        super().__init__(
            message=message, error_code=error_code, status_code=status_code, details=details
        )
        self.severity = severity


class AuthenticationError(OrbError):
    """Raised when authentication fails."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message, error_code="ORB-AUTH-002", status_code=401, details=details
        )


class AuthorizationError(OrbError):
    """Raised when authorization fails."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message, error_code="ORB-AUTH-003", status_code=403, details=details
        )


class ContextExtractionError(SecurityException):
    """Raised when security context cannot be extracted from request."""

    def __init__(
        self,
        message: str = "Failed to extract security context",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(
            message=message, error_code="ORB-SEC-001", status_code=400, details=details
        )


class SecurityViolationError(SecurityException):
    """Raised when a security violation is detected."""

    def __init__(
        self,
        message: str,
        violation_type: str = None,
        severity: str = "HIGH",
        details: Optional[Dict[str, Any]] = None,
    ):
        violation_details = details or {}
        if violation_type:
            violation_details["violation_type"] = violation_type

        super().__init__(
            message=message,
            error_code="ORB-SEC-002",
            status_code=403,
            details=violation_details,
            severity=severity,
        )
        self.violation_type = violation_type


class RateLimitExceededError(SecurityException):
    """Raised when rate limit is exceeded."""

    def __init__(
        self,
        message: str = "Rate limit exceeded",
        retry_after: int = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        rate_limit_details = details or {}
        if retry_after:
            rate_limit_details["retry_after"] = retry_after

        super().__init__(
            message=message, error_code="ORB-SEC-003", status_code=429, details=rate_limit_details
        )
        self.retry_after = retry_after


class RateLimitError(RateLimitExceededError):
    """Alias for RateLimitExceededError for backward compatibility."""

    pass


class ComplianceViolationError(SecurityException):
    """Raised when a compliance requirement is violated."""

    def __init__(
        self,
        message: str,
        compliance_framework: str,
        requirement: str = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        compliance_details = details or {}
        compliance_details.update(
            {"compliance_framework": compliance_framework, "requirement": requirement}
        )

        super().__init__(
            message=message,
            error_code="ORB-SEC-005",
            status_code=403,
            details=compliance_details,
            severity="CRITICAL",
        )
        self.compliance_framework = compliance_framework
        self.requirement = requirement


class AuditLogError(SecurityException):
    """Raised when audit logging fails critically."""

    def __init__(
        self,
        message: str = "Audit logging failure",
        fallback_attempted: bool = False,
        details: Optional[Dict[str, Any]] = None,
    ):
        audit_details = details or {}
        audit_details["fallback_attempted"] = fallback_attempted

        # Audit failures should not block operations, so use 500 status
        super().__init__(
            message=message,
            error_code="ORB-SEC-006",
            status_code=500,
            details=audit_details,
            severity="CRITICAL",
        )
        self.fallback_attempted = fallback_attempted


class SessionExpiredError(SecurityException):
    """Raised when a user session has expired."""

    def __init__(self, message: str = "Session expired", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message, error_code="ORB-SEC-007", status_code=401, details=details
        )


class InvalidTokenError(SecurityException):
    """Raised when a token is invalid."""

    def __init__(
        self,
        message: str = "Invalid token",
        token_type: str = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        token_details = details or {}
        if token_type:
            token_details["token_type"] = token_type

        super().__init__(
            message=message, error_code="ORB-SEC-008", status_code=401, details=token_details
        )


class TokenExpiredError(InvalidTokenError):
    """Raised when authentication token has expired."""

    def __init__(self, **kwargs):
        super().__init__(message="Authentication token has expired", **kwargs)


class PermissionDeniedError(SecurityException):
    """Raised when a specific permission is denied."""

    def __init__(
        self,
        message: str = "Permission denied",
        required_permission: str = None,
        user_permissions: List[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        permission_details = details or {}
        if required_permission:
            permission_details["required_permission"] = required_permission
        if user_permissions:
            permission_details["user_permissions"] = user_permissions

        super().__init__(
            message=message, error_code="ORB-SEC-009", status_code=403, details=permission_details
        )
        self.required_permission = required_permission


class CrossAccessViolationError(SecurityException):
    """Raised when cross-entity access is attempted."""

    def __init__(
        self,
        message: str,
        source_entity: str,
        target_entity: str,
        entity_type: str,
        details: Optional[Dict[str, Any]] = None,
    ):
        access_details = details or {}
        access_details.update(
            {
                "source_entity": source_entity,
                "target_entity": target_entity,
                "entity_type": entity_type,
            }
        )

        super().__init__(
            message=message,
            error_code="ORB-SEC-010",
            status_code=403,
            details=access_details,
            severity="HIGH",
        )
        self.source_entity = source_entity
        self.target_entity = target_entity


class MFARequiredError(SecurityException):
    """Raised when MFA is required but not provided."""

    def __init__(
        self,
        message: str = "Multi-factor authentication required",
        mfa_type: str = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        mfa_details = details or {}
        if mfa_type:
            mfa_details["mfa_type"] = mfa_type

        super().__init__(
            message=message, error_code="ORB-SEC-011", status_code=403, details=mfa_details
        )


class SuspiciousActivityError(SecurityException):
    """Raised when suspicious activity is detected."""

    def __init__(
        self,
        message: str,
        activity_type: str,
        risk_score: float = None,
        details: Optional[Dict[str, Any]] = None,
    ):
        activity_details = details or {}
        activity_details.update({"activity_type": activity_type, "risk_score": risk_score})

        super().__init__(
            message=message,
            error_code="ORB-SEC-012",
            status_code=403,
            details=activity_details,
            severity="CRITICAL",
        )
        self.activity_type = activity_type
        self.risk_score = risk_score
