"""
Security module for orb-common.

This module provides shared security components including:
- Audit logging with compliance support
- Security context extraction
- Authentication and authorization decorators
- State tracking for audit trails
"""

# Audit components
from ..audit import (AuditEventCategory, AuditLogQuery, BaseAuditEventType,
                     BaseAuditLogger, ComplianceFlag, FieldClassification,
                     StateTracker, categorize_event,
                     determine_compliance_flags, determine_severity)

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
]
