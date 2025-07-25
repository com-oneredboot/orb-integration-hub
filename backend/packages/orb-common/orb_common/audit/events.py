"""Audit event definitions and utilities."""

from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional


class BaseAuditEventType(Enum):
    """Base audit event types shared across all entities."""

    # Authentication and Session Events
    LOGIN_SUCCESS = "LOGIN_SUCCESS"
    LOGIN_FAILED = "LOGIN_FAILED"
    LOGOUT = "LOGOUT"
    SESSION_EXPIRED = "SESSION_EXPIRED"
    TOKEN_REFRESHED = "TOKEN_REFRESHED"

    # Authorization Events
    ACCESS_GRANTED = "ACCESS_GRANTED"
    ACCESS_DENIED = "ACCESS_DENIED"
    PERMISSION_CHECK_FAILED = "PERMISSION_CHECK_FAILED"
    CROSS_ACCESS_ATTEMPTED = "CROSS_ACCESS_ATTEMPTED"

    # Security Events
    PASSWORD_CHANGED = "PASSWORD_CHANGED"
    MFA_ENABLED = "MFA_ENABLED"
    MFA_DISABLED = "MFA_DISABLED"
    MFA_VERIFIED = "MFA_VERIFIED"
    SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"

    # Data Operations
    DATA_CREATED = "DATA_CREATED"
    DATA_UPDATED = "DATA_UPDATED"
    DATA_DELETED = "DATA_DELETED"
    DATA_VIEWED = "DATA_VIEWED"
    DATA_EXPORTED = "DATA_EXPORTED"
    DATA_IMPORTED = "DATA_IMPORTED"

    # Privacy and Compliance
    CONSENT_GRANTED = "CONSENT_GRANTED"
    CONSENT_REVOKED = "CONSENT_REVOKED"
    DATA_DELETION_REQUESTED = "DATA_DELETION_REQUESTED"
    DATA_DELETION_COMPLETED = "DATA_DELETION_COMPLETED"
    DATA_RETENTION_EXTENDED = "DATA_RETENTION_EXTENDED"

    # System Events
    CONFIGURATION_CHANGED = "CONFIGURATION_CHANGED"
    SYSTEM_ERROR = "SYSTEM_ERROR"
    AUDIT_LOG_ACCESSED = "AUDIT_LOG_ACCESSED"


class AuditEventType(BaseAuditEventType):
    """Extended audit event types - can be customized per service."""

    pass


class AuditEventCategory(Enum):
    """Event categories for reporting and filtering."""

    AUTHENTICATION = "AUTHENTICATION"
    AUTHORIZATION = "AUTHORIZATION"
    DATA_ACCESS = "DATA_ACCESS"
    DATA_MODIFICATION = "DATA_MODIFICATION"
    SECURITY = "SECURITY"
    PRIVACY = "PRIVACY"
    COMPLIANCE = "COMPLIANCE"
    SYSTEM = "SYSTEM"


@dataclass
class AuditEvent:
    """Audit event data structure."""

    event_type: str
    timestamp: datetime
    user_id: Optional[str]
    resource_type: Optional[str]
    resource_id: Optional[str]
    details: Dict[str, Any]
    compliance_flags: List[str]
    severity: str = "LOW"
    category: str = "SYSTEM"


def categorize_event(event_type: Enum) -> AuditEventCategory:
    """Categorize an event for reporting."""
    event_name = event_type.value.upper()

    if any(keyword in event_name for keyword in ["LOGIN", "LOGOUT", "SESSION", "TOKEN"]):
        return AuditEventCategory.AUTHENTICATION
    elif any(keyword in event_name for keyword in ["ACCESS", "PERMISSION", "DENIED", "GRANTED"]):
        return AuditEventCategory.AUTHORIZATION
    elif any(keyword in event_name for keyword in ["VIEWED", "EXPORTED", "SEARCH"]):
        return AuditEventCategory.DATA_ACCESS
    elif any(keyword in event_name for keyword in ["CREATED", "UPDATED", "DELETED", "MODIFIED"]):
        return AuditEventCategory.DATA_MODIFICATION
    elif any(keyword in event_name for keyword in ["PASSWORD", "MFA", "SUSPICIOUS", "SECURITY"]):
        return AuditEventCategory.SECURITY
    elif any(keyword in event_name for keyword in ["CONSENT", "DELETION", "PRIVACY"]):
        return AuditEventCategory.PRIVACY
    elif any(keyword in event_name for keyword in ["COMPLIANCE", "RETENTION", "AUDIT"]):
        return AuditEventCategory.COMPLIANCE
    else:
        return AuditEventCategory.SYSTEM


def determine_severity(event_type: Enum) -> str:
    """Determine event severity for alerting."""
    event_name = event_type.value.upper()

    # Critical events
    if any(
        keyword in event_name
        for keyword in ["DELETED", "SUSPICIOUS", "BREACH", "CRITICAL", "EMERGENCY"]
    ):
        return "CRITICAL"

    # High severity events
    elif any(
        keyword in event_name
        for keyword in ["FAILED", "DENIED", "UNAUTHORIZED", "PASSWORD", "ROLE", "PERMISSION"]
    ):
        return "HIGH"

    # Medium severity events
    elif any(
        keyword in event_name for keyword in ["CHANGED", "MODIFIED", "EXPORTED", "RATE_LIMIT"]
    ):
        return "MEDIUM"

    # Low severity events
    else:
        return "LOW"


def log_audit_event(
    event_type: AuditEventType,
    user_id: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    compliance_flags: Optional[List[str]] = None,
) -> None:
    """Log an audit event."""
    # Placeholder implementation
    pass


def log_event(event_type: str, **kwargs) -> None:
    """Simple event logging."""
    # Placeholder implementation
    pass


def create_audit_event(event_type: AuditEventType, **kwargs) -> AuditEvent:
    """Create audit event object."""
    return AuditEvent(
        event_type=event_type.value,
        timestamp=datetime.utcnow(),
        user_id=kwargs.get("user_id"),
        resource_type=kwargs.get("resource_type"),
        resource_id=kwargs.get("resource_id"),
        details=kwargs.get("details", {}),
        compliance_flags=kwargs.get("compliance_flags", []),
        severity=determine_severity(event_type),
        category=categorize_event(event_type).value,
    )
