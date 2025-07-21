# Users Security Layer
"""
Security layer for user-related operations including authentication,
authorization, and audit logging.
"""

from .user_context_middleware import (
    user_context_required,
    requires_self_or_admin,
    admin_required,
    UserContext,
    UserContextExtractor
)
from .users_audit_logger import (
    UserAuditEventType,
    log_user_audit_event,
    ComplianceFlag
)
from .aws_audit_logger import AWSAuditLogger

__all__ = [
    # Middleware
    'user_context_required',
    'requires_self_or_admin',
    'admin_required',
    'UserContext',
    'UserContextExtractor',
    # Audit
    'UserAuditEventType',
    'log_user_audit_event',
    'ComplianceFlag',
    'AWSAuditLogger'
]