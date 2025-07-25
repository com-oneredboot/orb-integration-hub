"""
Audit module for orb-common.

This module provides audit logging and compliance features for tracking
and monitoring activities in ORB Integration Hub services.
"""

from .logger import (
    AuditLogger,
    BaseAuditLogger,
    AuditLogQuery,
    get_audit_logger,
    configure_audit_logger,
)

from .events import (
    AuditEvent,
    AuditEventType,
    BaseAuditEventType,
    AuditEventCategory,
    categorize_event,
    determine_severity,
    log_event,
    log_audit_event,
    create_audit_event,
)

from .compliance import (
    ComplianceFlag,
    ComplianceCheck,
    determine_compliance_flags,
    determine_compliance_flags_for_data,
    check_gdpr_compliance,
    check_hipaa_compliance,
    apply_retention_policy,
)

from .tracker import (
    StateTracker,
    FieldClassification,
    track_state_change,
    get_field_changes,
    classify_field,
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