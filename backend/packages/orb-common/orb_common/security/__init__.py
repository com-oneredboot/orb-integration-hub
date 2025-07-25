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
    BaseAuditEventType,
    AuditEventCategory,
    ComplianceFlag,
    categorize_event,
    determine_severity,
    determine_compliance_flags,
    BaseAuditLogger,
    AuditLogQuery,
    StateTracker,
    FieldClassification,
)

# Re-export audit components for backward compatibility
__all__ = [
    # Audit Events
    'BaseAuditEventType',
    'ComplianceFlag', 
    'AuditEventCategory',
    'categorize_event',
    'determine_severity',
    'determine_compliance_flags',
    
    # Audit Logger
    'BaseAuditLogger',
    'AuditLogQuery',
    
    # State Tracking
    'StateTracker',
    'FieldClassification',
]