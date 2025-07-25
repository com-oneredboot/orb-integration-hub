"""
Security module for orb-common.

This module provides shared security components including:
- Audit logging with compliance support
- Security context extraction
- Authentication and authorization decorators
- State tracking for audit trails
"""

# Audit components
from ..audit import (
    AuditEventCategory,
    AuditLogQuery,
    BaseAuditEventType,
    BaseAuditLogger,
    ComplianceFlag,
    FieldClassification,
    StateTracker,
    categorize_event,
    determine_compliance_flags,
    determine_severity,
)

# Security functions
from .auth import validate_token
from .permissions import check_permissions
from .validators import validate_email

# Re-export audit components for backward compatibility
__all__ = [
    # Audit Events
    "BaseAuditEventType",
    "ComplianceFlag",
    "AuditEventCategory",
    "categorize_event",
    "determine_severity",
    "determine_compliance_flags",
    # Audit Logger
    "BaseAuditLogger",
    "AuditLogQuery",
    # State Tracking
    "StateTracker",
    "FieldClassification",
    # Security functions
    "validate_token",
    "check_permissions",
    "validate_email",
]
