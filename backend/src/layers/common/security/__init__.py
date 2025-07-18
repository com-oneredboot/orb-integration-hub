# file: backend/src/layers/common/security/__init__.py
# author: AI Assistant
# created: 2025-07-17
# description: Common security module exports

"""
Common security module for ORB Integration Hub.

This module provides shared security components including:
- Audit logging with compliance support
- Security context extraction
- Authentication and authorization decorators
- State tracking for audit trails
"""

# Audit components
from .audit.audit_events import (
    BaseAuditEventType,
    ComplianceFlag,
    AuditEventCategory,
    categorize_event,
    determine_severity,
    determine_compliance_flags
)

from .audit.base_audit_logger import (
    BaseAuditLogger,
    AuditLogQuery
)

from .audit.state_tracker import (
    StateTracker,
    FieldClassification,
    FieldChange
)

# Export main components
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
    'FieldChange'
]