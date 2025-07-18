# file: backend/src/layers/shared_security/audit/audit_events.py
# author: AI Assistant
# created: 2025-07-17
# description: Shared audit event types and compliance flags

from enum import Enum
from typing import Dict, Any, List


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


class ComplianceFlag(Enum):
    """Compliance and regulatory flags."""
    GDPR = "GDPR"  # General Data Protection Regulation
    CCPA = "CCPA"  # California Consumer Privacy Act
    HIPAA = "HIPAA"  # Health Insurance Portability and Accountability Act
    SOX = "SOX"  # Sarbanes-Oxley Act
    SOC_2 = "SOC_2"  # Service Organization Control 2
    PCI_DSS = "PCI_DSS"  # Payment Card Industry Data Security Standard
    FERPA = "FERPA"  # Family Educational Rights and Privacy Act
    ISO_27001 = "ISO_27001"  # Information Security Management


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


def categorize_event(event_type: Enum) -> AuditEventCategory:
    """Categorize an event for reporting."""
    event_name = event_type.value.upper()
    
    if any(keyword in event_name for keyword in ['LOGIN', 'LOGOUT', 'SESSION', 'TOKEN']):
        return AuditEventCategory.AUTHENTICATION
    elif any(keyword in event_name for keyword in ['ACCESS', 'PERMISSION', 'DENIED', 'GRANTED']):
        return AuditEventCategory.AUTHORIZATION
    elif any(keyword in event_name for keyword in ['VIEWED', 'EXPORTED', 'SEARCH']):
        return AuditEventCategory.DATA_ACCESS
    elif any(keyword in event_name for keyword in ['CREATED', 'UPDATED', 'DELETED', 'MODIFIED']):
        return AuditEventCategory.DATA_MODIFICATION
    elif any(keyword in event_name for keyword in ['PASSWORD', 'MFA', 'SUSPICIOUS', 'SECURITY']):
        return AuditEventCategory.SECURITY
    elif any(keyword in event_name for keyword in ['CONSENT', 'DELETION', 'PRIVACY']):
        return AuditEventCategory.PRIVACY
    elif any(keyword in event_name for keyword in ['COMPLIANCE', 'RETENTION', 'AUDIT']):
        return AuditEventCategory.COMPLIANCE
    else:
        return AuditEventCategory.SYSTEM


def determine_severity(event_type: Enum) -> str:
    """Determine event severity for alerting."""
    event_name = event_type.value.upper()
    
    # Critical events
    if any(keyword in event_name for keyword in [
        'DELETED', 'SUSPICIOUS', 'BREACH', 'CRITICAL', 'EMERGENCY'
    ]):
        return 'CRITICAL'
    
    # High severity events
    elif any(keyword in event_name for keyword in [
        'FAILED', 'DENIED', 'UNAUTHORIZED', 'PASSWORD', 'ROLE', 'PERMISSION'
    ]):
        return 'HIGH'
    
    # Medium severity events
    elif any(keyword in event_name for keyword in [
        'CHANGED', 'MODIFIED', 'EXPORTED', 'RATE_LIMIT'
    ]):
        return 'MEDIUM'
    
    # Low severity events
    else:
        return 'LOW'


def determine_compliance_flags(event_type: Enum, operation_context: Dict[str, Any] = None) -> List[ComplianceFlag]:
    """Auto-determine applicable compliance flags based on event type."""
    flags = []
    event_name = event_type.value.upper()
    
    # GDPR - EU data protection
    if any(keyword in event_name for keyword in ['DATA', 'CONSENT', 'DELETION', 'PRIVACY', 'EXPORT']):
        flags.append(ComplianceFlag.GDPR)
    
    # CCPA - California privacy
    if any(keyword in event_name for keyword in ['DATA', 'PRIVACY', 'DELETION', 'CONSENT']):
        if operation_context and operation_context.get('user_location') == 'CA':
            flags.append(ComplianceFlag.CCPA)
    
    # SOX - Financial data integrity
    if any(keyword in event_name for keyword in ['LOGIN', 'ACCESS', 'ROLE', 'PERMISSION', 'AUDIT']):
        flags.append(ComplianceFlag.SOX)
    
    # SOC 2 - Security controls
    if any(keyword in event_name for keyword in ['SECURITY', 'PASSWORD', 'MFA', 'ACCESS']):
        flags.append(ComplianceFlag.SOC_2)
    
    # HIPAA - Healthcare data
    if operation_context and operation_context.get('data_type') == 'healthcare':
        flags.append(ComplianceFlag.HIPAA)
    
    # PCI DSS - Payment card data
    if operation_context and operation_context.get('data_type') == 'payment':
        flags.append(ComplianceFlag.PCI_DSS)
    
    return list(set(flags))  # Remove duplicates