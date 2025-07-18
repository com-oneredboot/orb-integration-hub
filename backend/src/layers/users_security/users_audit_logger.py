# file: backend/src/layers/users_security/users_audit_logger.py
# author: AI Assistant
# created: 2025-07-17
# description: Users-specific audit logger extending base audit logger

import os
from enum import Enum
from typing import Dict, Any, List, Optional

# Import from common security layer
from common.security import (
    BaseAuditLogger,
    BaseAuditEventType,
    ComplianceFlag,
    determine_compliance_flags
)
from common.security_exceptions import AuditLogError


class UserAuditEventType(Enum):
    """User-specific audit event types extending base types."""
    
    # User lifecycle events
    USER_CREATED = "USER_CREATED"
    USER_UPDATED = "USER_UPDATED"
    USER_DELETED = "USER_DELETED"
    USER_RESTORED = "USER_RESTORED"
    USER_MERGED = "USER_MERGED"
    
    # Profile events
    USER_PROFILE_VIEWED = "USER_PROFILE_VIEWED"
    USER_PROFILE_EXPORTED = "USER_PROFILE_EXPORTED"
    USER_AVATAR_CHANGED = "USER_AVATAR_CHANGED"
    USER_PREFERENCES_UPDATED = "USER_PREFERENCES_UPDATED"
    
    # Authentication events (extending base)
    USER_LOGIN_SUCCESS = "USER_LOGIN_SUCCESS"
    USER_LOGIN_FAILED = "USER_LOGIN_FAILED"
    USER_LOGOUT = "USER_LOGOUT"
    USER_SESSION_EXPIRED = "USER_SESSION_EXPIRED"
    USER_PASSWORD_CHANGED = "USER_PASSWORD_CHANGED"
    USER_PASSWORD_RESET_REQUESTED = "USER_PASSWORD_RESET_REQUESTED"
    USER_PASSWORD_RESET_COMPLETED = "USER_PASSWORD_RESET_COMPLETED"
    
    # MFA events
    USER_MFA_ENABLED = "USER_MFA_ENABLED"
    USER_MFA_DISABLED = "USER_MFA_DISABLED"
    USER_MFA_METHOD_ADDED = "USER_MFA_METHOD_ADDED"
    USER_MFA_METHOD_REMOVED = "USER_MFA_METHOD_REMOVED"
    USER_MFA_VERIFIED = "USER_MFA_VERIFIED"
    USER_MFA_FAILED = "USER_MFA_FAILED"
    
    # Status events
    USER_STATUS_CHANGED = "USER_STATUS_CHANGED"
    USER_ACTIVATED = "USER_ACTIVATED"
    USER_SUSPENDED = "USER_SUSPENDED"
    USER_DEACTIVATED = "USER_DEACTIVATED"
    USER_VERIFICATION_COMPLETED = "USER_VERIFICATION_COMPLETED"
    
    # Organization events
    USER_ORGANIZATION_JOINED = "USER_ORGANIZATION_JOINED"
    USER_ORGANIZATION_LEFT = "USER_ORGANIZATION_LEFT"
    USER_ORGANIZATION_ROLE_CHANGED = "USER_ORGANIZATION_ROLE_CHANGED"
    USER_ORGANIZATION_INVITED = "USER_ORGANIZATION_INVITED"
    
    # Privacy events
    USER_CONSENT_GRANTED = "USER_CONSENT_GRANTED"
    USER_CONSENT_REVOKED = "USER_CONSENT_REVOKED"
    USER_DATA_DELETION_REQUESTED = "USER_DATA_DELETION_REQUESTED"
    USER_DATA_DELETION_COMPLETED = "USER_DATA_DELETION_COMPLETED"
    USER_DATA_ANONYMIZED = "USER_DATA_ANONYMIZED"
    USER_MARKETING_OPT_IN = "USER_MARKETING_OPT_IN"
    USER_MARKETING_OPT_OUT = "USER_MARKETING_OPT_OUT"
    
    # Security violations
    USER_ACCESS_DENIED = "USER_ACCESS_DENIED"
    USER_CROSS_ACCESS_ATTEMPTED = "USER_CROSS_ACCESS_ATTEMPTED"
    USER_SUSPICIOUS_ACTIVITY = "USER_SUSPICIOUS_ACTIVITY"
    USER_RATE_LIMIT_EXCEEDED = "USER_RATE_LIMIT_EXCEEDED"
    USER_API_KEY_CREATED = "USER_API_KEY_CREATED"
    USER_API_KEY_REVOKED = "USER_API_KEY_REVOKED"


class UsersAuditLogger(BaseAuditLogger):
    """Users-specific audit logger with enhanced user tracking."""
    
    def __init__(self):
        super().__init__(entity_type="USER", log_group_suffix="users")
        
    def log_user_event(
        self,
        event_type: UserAuditEventType,
        acting_user_context: Dict[str, Any],
        target_user_id: str,
        action_details: Dict[str, Any],
        compliance_flags: List[ComplianceFlag] = None,
        state_changes: Dict[str, Any] = None
    ):
        """Log a user-specific audit event."""
        # Add user-specific context
        enhanced_details = {
            **action_details,
            'acting_user_id': acting_user_context.get('user_id'),
            'target_user_id': target_user_id,
            'is_self_action': acting_user_context.get('user_id') == target_user_id
        }
        
        # Auto-determine compliance flags for user events
        if not compliance_flags:
            compliance_flags = self._determine_user_compliance_flags(event_type, enhanced_details)
        
        # Log using base logger
        self.log_event(
            event_type=event_type,
            user_context=acting_user_context,
            resource_id=target_user_id,
            action_details=enhanced_details,
            compliance_flags=compliance_flags,
            state_changes=state_changes
        )
    
    def log_authentication_event(
        self,
        event_type: UserAuditEventType,
        user_id: str,
        auth_details: Dict[str, Any],
        success: bool,
        failure_reason: str = None
    ):
        """Log authentication-related events with enhanced tracking."""
        action_details = {
            'auth_method': auth_details.get('method', 'password'),
            'success': success,
            'mfa_used': auth_details.get('mfa_used', False),
            'device_fingerprint': auth_details.get('device_fingerprint'),
            'login_location': auth_details.get('location'),
            'session_duration': auth_details.get('session_duration')
        }
        
        if not success and failure_reason:
            action_details['failure_reason'] = failure_reason
        
        # Authentication events always need SOX compliance
        compliance_flags = [ComplianceFlag.SOX, ComplianceFlag.SOC_2]
        
        self.log_event(
            event_type=event_type,
            user_context={'user_id': user_id, **auth_details},
            resource_id=user_id,
            action_details=action_details,
            compliance_flags=compliance_flags
        )
    
    def log_privacy_event(
        self,
        event_type: UserAuditEventType,
        user_id: str,
        privacy_details: Dict[str, Any],
        acting_user_context: Dict[str, Any]
    ):
        """Log privacy-related events with GDPR/CCPA compliance."""
        action_details = {
            'privacy_action': event_type.value,
            'data_categories': privacy_details.get('data_categories', []),
            'retention_period': privacy_details.get('retention_period'),
            'deletion_scheduled': privacy_details.get('deletion_scheduled'),
            'anonymization_applied': privacy_details.get('anonymization_applied', False)
        }
        
        # Privacy events always need GDPR/CCPA compliance
        compliance_flags = [ComplianceFlag.GDPR]
        
        # Add CCPA if user is from California
        if privacy_details.get('user_location') == 'CA':
            compliance_flags.append(ComplianceFlag.CCPA)
        
        self.log_event(
            event_type=event_type,
            user_context=acting_user_context,
            resource_id=user_id,
            action_details=action_details,
            compliance_flags=compliance_flags
        )
    
    def _determine_user_compliance_flags(
        self, 
        event_type: UserAuditEventType,
        action_details: Dict[str, Any]
    ) -> List[ComplianceFlag]:
        """Determine compliance flags specific to user events."""
        flags = []
        event_name = event_type.value
        
        # GDPR - All user data operations
        if any(keyword in event_name for keyword in ['DATA', 'PROFILE', 'CONSENT', 'DELETION']):
            flags.append(ComplianceFlag.GDPR)
        
        # SOX - Authentication and access control
        if any(keyword in event_name for keyword in ['LOGIN', 'PASSWORD', 'MFA', 'API_KEY']):
            flags.append(ComplianceFlag.SOX)
        
        # SOC 2 - Security controls
        if any(keyword in event_name for keyword in ['SECURITY', 'SUSPICIOUS', 'DENIED']):
            flags.append(ComplianceFlag.SOC_2)
        
        # HIPAA - If healthcare data is involved
        if action_details.get('data_type') == 'healthcare':
            flags.append(ComplianceFlag.HIPAA)
        
        # FERPA - If educational data is involved
        if action_details.get('data_type') == 'education':
            flags.append(ComplianceFlag.FERPA)
        
        return list(set(flags))
    
    def _enrich_audit_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Add user-specific enrichments to audit events."""
        # Add user-specific metadata
        event['metadata'] = event.get('metadata', {})
        event['metadata']['entity_type'] = 'USER'
        
        # Add user pool information if available
        user_pool_id = os.environ.get('USER_POOL_ID')
        if user_pool_id:
            event['metadata']['user_pool_id'] = user_pool_id
        
        # Add deployment environment
        event['metadata']['environment'] = os.environ.get('ENVIRONMENT', 'unknown')
        
        return event


# Global instance for convenience
users_audit_logger = UsersAuditLogger()


# Convenience functions
def log_user_audit_event(
    event_type: UserAuditEventType,
    acting_user_context: Dict[str, Any],
    target_user_id: str,
    action_details: Dict[str, Any],
    compliance_flags: List[ComplianceFlag] = None,
    state_changes: Dict[str, Any] = None
):
    """Convenience function for logging user audit events."""
    users_audit_logger.log_user_event(
        event_type=event_type,
        acting_user_context=acting_user_context,
        target_user_id=target_user_id,
        action_details=action_details,
        compliance_flags=compliance_flags,
        state_changes=state_changes
    )