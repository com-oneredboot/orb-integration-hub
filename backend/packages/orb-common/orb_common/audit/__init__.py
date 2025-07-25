"""
Audit module for orb-common.

This module provides audit logging and compliance features for tracking
and monitoring activities in ORB Integration Hub services.
"""

from .compliance import (
    ComplianceCheck,
    ComplianceFlag,
    apply_retention_policy,
    check_gdpr_compliance,
    check_hipaa_compliance,
    determine_compliance_flags,
    determine_compliance_flags_for_data,
)
from .events import (
    AuditEvent,
    AuditEventCategory,
    AuditEventType,
    BaseAuditEventType,
    categorize_event,
    create_audit_event,
    determine_severity,
    log_audit_event,
    log_event,
)
from .logger import (
    AuditLogger,
    AuditLogQuery,
    BaseAuditLogger,
    configure_audit_logger,
    get_audit_logger,
)
from .tracker import (
    FieldClassification,
    StateTracker,
    classify_field,
    get_field_changes,
    track_state_change,
)

__all__ = [
    # Logger
    "AuditLogger",
    "BaseAuditLogger",
    "AuditLogQuery",
    "get_audit_logger",
    "configure_audit_logger",
    # Events
    "AuditEvent",
    "AuditEventType",
    "BaseAuditEventType",
    "AuditEventCategory",
    "categorize_event",
    "determine_severity",
    "log_event",
    "log_audit_event",
    "create_audit_event",
    # Compliance
    "ComplianceFlag",
    "ComplianceCheck",
    "determine_compliance_flags",
    "determine_compliance_flags_for_data",
    "check_gdpr_compliance",
    "check_hipaa_compliance",
    "apply_retention_policy",
    # Tracker
    "StateTracker",
    "FieldClassification",
    "track_state_change",
    "get_field_changes",
    "classify_field",
]
