# file: backend/src/layers/organizations_security/organizations_audit_logger.py
# author: AI Assistant
# created: 2025-08-08
# description: Organizations-specific audit logger that inherits from BaseAuditLogger

import os
from enum import Enum
from typing import Dict, Any, List, Optional

from orb_common.audit import BaseAuditLogger, ComplianceFlag


class OrganizationAuditEventType(Enum):
    """Organization-specific audit event types."""
    
    # Organization Management
    ORGANIZATION_CREATED = "ORGANIZATION_CREATED"
    ORGANIZATION_UPDATED = "ORGANIZATION_UPDATED"
    ORGANIZATION_DELETED = "ORGANIZATION_DELETED"
    ORGANIZATION_OWNERSHIP_TRANSFERRED = "ORGANIZATION_OWNERSHIP_TRANSFERRED"
    ORGANIZATION_SUSPENDED = "ORGANIZATION_SUSPENDED"
    ORGANIZATION_REACTIVATED = "ORGANIZATION_REACTIVATED"
    
    # User and Access Management
    USER_INVITED = "USER_INVITED"
    USER_INVITATION_ACCEPTED = "USER_INVITATION_ACCEPTED"
    USER_INVITATION_REJECTED = "USER_INVITATION_REJECTED"
    USER_ROLE_CHANGED = "USER_ROLE_CHANGED"
    USER_REMOVED = "USER_REMOVED"
    USER_SUSPENDED = "USER_SUSPENDED"
    USER_PERMISSION_GRANTED = "USER_PERMISSION_GRANTED"
    USER_PERMISSION_REVOKED = "USER_PERMISSION_REVOKED"
    
    # Application Lifecycle
    APPLICATION_CREATED = "APPLICATION_CREATED"
    APPLICATION_UPDATED = "APPLICATION_UPDATED"
    APPLICATION_DELETED = "APPLICATION_DELETED"
    APPLICATION_TRANSFERRED = "APPLICATION_TRANSFERRED"
    APPLICATION_SUSPENDED = "APPLICATION_SUSPENDED"
    
    # API Key Management
    API_KEY_GENERATED = "API_KEY_GENERATED"
    API_KEY_ROTATED = "API_KEY_ROTATED"
    API_KEY_REVOKED = "API_KEY_REVOKED"
    API_KEY_COMPROMISED = "API_KEY_COMPROMISED"
    
    # Security Events
    SECURITY_VIOLATION = "SECURITY_VIOLATION"
    PERMISSION_DENIED = "PERMISSION_DENIED"
    SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    
    # Billing and Financial
    BILLING_UPDATED = "BILLING_UPDATED"
    SUBSCRIPTION_CREATED = "SUBSCRIPTION_CREATED"
    SUBSCRIPTION_UPDATED = "SUBSCRIPTION_UPDATED"
    SUBSCRIPTION_CANCELLED = "SUBSCRIPTION_CANCELLED"
    
    # Data Operations
    DATA_EXPORTED = "DATA_EXPORTED"
    DATA_IMPORTED = "DATA_IMPORTED"
    DATA_DELETED = "DATA_DELETED"
    DATA_ANONYMIZED = "DATA_ANONYMIZED"


class OrganizationsAuditLogger(BaseAuditLogger):
    """Organizations-specific audit logger with enhanced organization tracking."""
    
    def __init__(self):
        super().__init__(entity_type="ORGANIZATION", log_group_suffix="organizations")
        
    def log_organization_event(
        self,
        event_type: OrganizationAuditEventType,
        user_context: Dict[str, Any],
        organization_id: str,
        action_details: Dict[str, Any],
        compliance_flags: List[ComplianceFlag] = None,
        state_changes: Dict[str, Any] = None
    ):
        """Log an organization-specific audit event."""
        # Add organization-specific context
        enhanced_details = {
            **action_details,
            'organization_id': organization_id,
            'acting_user_id': user_context.get('user_id'),
            'acting_user_role': user_context.get('role'),
            'organization_context': user_context.get('organization_id') == organization_id
        }
        
        # Auto-determine compliance flags for organization events
        if not compliance_flags:
            compliance_flags = self._determine_organization_compliance_flags(event_type, enhanced_details)
        
        # Log using base logger
        self.log_event(
            event_type=event_type,
            user_context=user_context,
            resource_id=organization_id,
            action_details=enhanced_details,
            compliance_flags=compliance_flags,
            state_changes=state_changes
        )
    
    def log_access_control_event(
        self,
        event_type: OrganizationAuditEventType,
        user_context: Dict[str, Any],
        organization_id: str,
        target_user_id: str,
        permission_details: Dict[str, Any]
    ):
        """Log access control and permission change events."""
        action_details = {
            'target_user_id': target_user_id,
            'permission_change': permission_details.get('change_type'),
            'old_role': permission_details.get('old_role'),
            'new_role': permission_details.get('new_role'),
            'permissions_granted': permission_details.get('permissions_granted', []),
            'permissions_revoked': permission_details.get('permissions_revoked', []),
            'reason': permission_details.get('reason')
        }
        
        # Access control events need SOX compliance
        compliance_flags = [ComplianceFlag.SOX, ComplianceFlag.SOC_2]
        
        self.log_event(
            event_type=event_type,
            user_context=user_context,
            resource_id=organization_id,
            action_details=action_details,
            compliance_flags=compliance_flags
        )
    
    def log_billing_event(
        self,
        event_type: OrganizationAuditEventType,
        user_context: Dict[str, Any],
        organization_id: str,
        billing_details: Dict[str, Any]
    ):
        """Log billing and financial events with enhanced compliance."""
        action_details = {
            'billing_action': event_type.value,
            'amount': billing_details.get('amount'),
            'currency': billing_details.get('currency'),
            'payment_method': billing_details.get('payment_method_type'),
            'subscription_tier': billing_details.get('subscription_tier'),
            'billing_cycle': billing_details.get('billing_cycle')
        }
        
        # Financial events always need PCI DSS and SOX compliance
        compliance_flags = [ComplianceFlag.PCI_DSS, ComplianceFlag.SOX]
        
        self.log_event(
            event_type=event_type,
            user_context=user_context,
            resource_id=organization_id,
            action_details=action_details,
            compliance_flags=compliance_flags
        )
    
    def _determine_organization_compliance_flags(
        self, 
        event_type: OrganizationAuditEventType,
        action_details: Dict[str, Any]
    ) -> List[ComplianceFlag]:
        """Determine compliance flags specific to organization events."""
        flags = []
        event_name = event_type.value
        
        # SOX - Financial and access control
        if any(keyword in event_name for keyword in ['BILLING', 'SUBSCRIPTION', 'PAYMENT', 'ROLE', 'PERMISSION']):
            flags.append(ComplianceFlag.SOX)
        
        # SOC 2 - Security controls
        if any(keyword in event_name for keyword in ['SECURITY', 'API_KEY', 'SUSPENDED', 'VIOLATION']):
            flags.append(ComplianceFlag.SOC_2)
        
        # PCI DSS - Payment processing
        if any(keyword in event_name for keyword in ['PAYMENT', 'BILLING']):
            flags.append(ComplianceFlag.PCI_DSS)
        
        # GDPR - Data operations
        if any(keyword in event_name for keyword in ['DATA', 'DELETED', 'EXPORTED', 'ANONYMIZED']):
            flags.append(ComplianceFlag.GDPR)
        
        # HIPAA - If healthcare data is involved
        if action_details.get('industry') == 'healthcare':
            flags.append(ComplianceFlag.HIPAA)
        
        # FERPA - If educational data is involved
        if action_details.get('industry') == 'education':
            flags.append(ComplianceFlag.FERPA)
        
        return list(set(flags))
    
    def _extend_audit_event(
        self,
        audit_event: Dict[str, Any],
        user_context: Dict[str, Any],
        action_details: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Extend audit event with organization-specific data."""
        # Add organization-specific metadata
        audit_event['metadata'] = audit_event.get('metadata', {})
        audit_event['metadata']['entity_type'] = 'ORGANIZATION'
        
        # Add organization tenant information if available
        tenant_id = os.environ.get('TENANT_ID')
        if tenant_id:
            audit_event['metadata']['tenant_id'] = tenant_id
        
        # Add deployment environment
        audit_event['metadata']['environment'] = os.environ.get('ENVIRONMENT', 'unknown')
        
        # Add organization-specific context
        if 'organization_id' in action_details:
            audit_event['metadata']['organization_id'] = action_details['organization_id']
        
        return audit_event


# Global instance for convenience
organizations_audit_logger = OrganizationsAuditLogger()


# Convenience functions
def log_organization_audit_event(
    event_type: OrganizationAuditEventType,
    user_context: Dict[str, Any],
    organization_id: str,
    action_details: Dict[str, Any],
    compliance_flags: List[ComplianceFlag] = None,
    state_changes: Dict[str, Any] = None
):
    """Convenience function for logging organization audit events."""
    organizations_audit_logger.log_organization_event(
        event_type=event_type,
        user_context=user_context,
        organization_id=organization_id,
        action_details=action_details,
        compliance_flags=compliance_flags,
        state_changes=state_changes
    )