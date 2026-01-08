# file: apps/api/layers/organizations_security/aws_audit_logger.py
# author: AI Assistant
# created: 2025-06-23
# description: AWS-managed audit logging service with automatic retention and compliance

import json
import logging
import time
import hashlib
import os
from datetime import datetime
from typing import Dict, Any, Optional, List
from enum import Enum

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


class AuditEventType(Enum):
    """Comprehensive audit event classification."""
    
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
    
    # Authentication Events
    LOGIN_SUCCESS = "LOGIN_SUCCESS"
    LOGIN_FAILED = "LOGIN_FAILED"
    LOGOUT = "LOGOUT"
    SESSION_CREATED = "SESSION_CREATED"
    SESSION_EXPIRED = "SESSION_EXPIRED"
    SESSION_TERMINATED = "SESSION_TERMINATED"
    
    # Multi-Factor Authentication
    MFA_ENABLED = "MFA_ENABLED"
    MFA_DISABLED = "MFA_DISABLED"
    MFA_CHALLENGE_SENT = "MFA_CHALLENGE_SENT"
    MFA_CHALLENGE_SUCCESS = "MFA_CHALLENGE_SUCCESS"
    MFA_CHALLENGE_FAILED = "MFA_CHALLENGE_FAILED"
    MFA_BACKUP_CODE_USED = "MFA_BACKUP_CODE_USED"
    
    # Password Management
    PASSWORD_CHANGED = "PASSWORD_CHANGED"
    PASSWORD_RESET_REQUESTED = "PASSWORD_RESET_REQUESTED"
    PASSWORD_RESET_COMPLETED = "PASSWORD_RESET_COMPLETED"
    PASSWORD_RESET_FAILED = "PASSWORD_RESET_FAILED"
    
    # Financial and Billing
    BILLING_UPDATED = "BILLING_UPDATED"
    PAYMENT_METHOD_ADDED = "PAYMENT_METHOD_ADDED"
    PAYMENT_METHOD_UPDATED = "PAYMENT_METHOD_UPDATED"
    PAYMENT_METHOD_REMOVED = "PAYMENT_METHOD_REMOVED"
    SUBSCRIPTION_CREATED = "SUBSCRIPTION_CREATED"
    SUBSCRIPTION_UPDATED = "SUBSCRIPTION_UPDATED"
    SUBSCRIPTION_CANCELLED = "SUBSCRIPTION_CANCELLED"
    PAYMENT_PROCESSED = "PAYMENT_PROCESSED"
    PAYMENT_FAILED = "PAYMENT_FAILED"
    PAYMENT_DISPUTED = "PAYMENT_DISPUTED"
    REFUND_PROCESSED = "REFUND_PROCESSED"
    INVOICE_GENERATED = "INVOICE_GENERATED"
    
    # Data Operations
    DATA_EXPORTED = "DATA_EXPORTED"
    DATA_IMPORTED = "DATA_IMPORTED"
    DATA_DELETED = "DATA_DELETED"
    DATA_ANONYMIZED = "DATA_ANONYMIZED"
    BACKUP_CREATED = "BACKUP_CREATED"
    BACKUP_RESTORED = "BACKUP_RESTORED"
    
    # Security Events
    SECURITY_VIOLATION = "SECURITY_VIOLATION"
    FRAUD_DETECTED = "FRAUD_DETECTED"
    UNAUTHORIZED_ACCESS_ATTEMPT = "UNAUTHORIZED_ACCESS_ATTEMPT"
    PRIVILEGE_ESCALATION_ATTEMPT = "PRIVILEGE_ESCALATION_ATTEMPT"
    ACCOUNT_LOCKED = "ACCOUNT_LOCKED"
    ACCOUNT_UNLOCKED = "ACCOUNT_UNLOCKED"
    SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY"
    BRUTE_FORCE_DETECTED = "BRUTE_FORCE_DETECTED"
    
    # Compliance Events
    GDPR_REQUEST_RECEIVED = "GDPR_REQUEST_RECEIVED"
    GDPR_DATA_EXPORTED = "GDPR_DATA_EXPORTED"
    GDPR_DATA_DELETED = "GDPR_DATA_DELETED"
    DATA_RETENTION_APPLIED = "DATA_RETENTION_APPLIED"
    COMPLIANCE_REPORT_GENERATED = "COMPLIANCE_REPORT_GENERATED"
    AUDIT_LOG_ACCESSED = "AUDIT_LOG_ACCESSED"
    LEGAL_HOLD_APPLIED = "LEGAL_HOLD_APPLIED"
    LEGAL_HOLD_REMOVED = "LEGAL_HOLD_REMOVED"


class ComplianceFlag(Enum):
    """Compliance framework flags for audit categorization."""
    SOX = "SOX"                    # Sarbanes-Oxley Act
    GDPR = "GDPR"                  # General Data Protection Regulation
    CCPA = "CCPA"                  # California Consumer Privacy Act
    HIPAA = "HIPAA"                # Health Insurance Portability and Accountability Act
    PCI_DSS = "PCI_DSS"           # Payment Card Industry Data Security Standard
    ISO_27001 = "ISO_27001"       # Information Security Management
    SOC_2 = "SOC_2"               # Service Organization Control 2


class AWSAuditLogger:
    """AWS-managed audit logging with automatic retention and compliance."""
    
    def __init__(self):
        self.cloudwatch_logs = boto3.client('logs')
        self.environment = os.getenv('ENVIRONMENT', 'production')
        
        # AWS-managed log groups with automatic retention
        self.log_groups = {
            'organizations': '/audit/organizations',
            'security': '/audit/security', 
            'financial': '/audit/financial',
            'access': '/audit/access',
            'api': '/audit/api'
        }
        
        # AWS automatically manages retention based on these policies
        self.retention_policies = {
            '/audit/organizations': 2557,   # 7 years (SOX, GDPR compliant)
            '/audit/security': 2557,        # 7 years (Security incidents)
            '/audit/financial': 2557,       # 7 years (SOX compliant)
            '/audit/access': 2190,          # 6 years (HIPAA compliant)
            '/audit/api': 365               # 1 year (PCI DSS compliant)
        }
        
        # Ensure log groups exist with proper retention
        self._setup_log_groups()
    
    def _setup_log_groups(self):
        """Setup CloudWatch log groups with AWS-managed retention."""
        
        for log_group, retention_days in self.retention_policies.items():
            try:
                # Check if log group exists
                self.cloudwatch_logs.describe_log_groups(
                    logGroupNamePrefix=log_group
                )
                
                # Set retention policy - AWS handles the rest
                self.cloudwatch_logs.put_retention_policy(
                    logGroupName=log_group,
                    retentionInDays=retention_days
                )
                
            except self.cloudwatch_logs.exceptions.ResourceNotFoundException:
                # Create log group with retention policy
                self.cloudwatch_logs.create_log_group(logGroupName=log_group)
                self.cloudwatch_logs.put_retention_policy(
                    logGroupName=log_group,
                    retentionInDays=retention_days
                )
                logger.info(f"Created log group {log_group} with {retention_days}-day AWS-managed retention")
                
            except Exception as e:
                logger.error(f"Error setting up log group {log_group}: {str(e)}")
    
    def log_audit_event(
        self,
        event_type: AuditEventType,
        user_context: Dict[str, Any],
        target_context: Dict[str, Any],
        action_details: Dict[str, Any],
        compliance_flags: List[ComplianceFlag] = None
    ) -> str:
        """Log comprehensive audit event with AWS-managed retention."""
        
        try:
            # Generate unique event ID
            event_id = f"evt_{int(time.time())}_{hashlib.md5(str(time.time()).encode()).hexdigest()[:8]}"
            
            # Build comprehensive audit entry
            audit_entry = self._build_audit_entry(
                event_id, event_type, user_context, target_context, 
                action_details, compliance_flags
            )
            
            # Determine appropriate log group
            log_group = self._determine_log_group(event_type, compliance_flags)
            
            # Create log stream for organization (for efficient querying)
            log_stream = self._get_log_stream_name(target_context.get('organization_id'))
            
            # Send to CloudWatch - AWS manages retention, archival, lifecycle
            self._send_to_cloudwatch(log_group, log_stream, audit_entry)
            
            return event_id
            
        except Exception as e:
            # Critical: Audit logging failure must be logged but not fail the operation
            logger.critical(f"AUDIT_LOGGING_FAILURE: {str(e)}", extra={
                'event_type': event_type.value if event_type else 'UNKNOWN',
                'organization_id': target_context.get('organization_id'),
                'user_id': user_context.get('user_id')
            })
            return f"failed_{int(time.time())}"
    
    def _build_audit_entry(
        self,
        event_id: str,
        event_type: AuditEventType,
        user_context: Dict[str, Any],
        target_context: Dict[str, Any],
        action_details: Dict[str, Any],
        compliance_flags: List[ComplianceFlag]
    ) -> Dict[str, Any]:
        """Build comprehensive audit entry for CloudWatch."""
        
        return {
            # Core audit information
            'event_id': event_id,
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'event_type': event_type.value,
            'version': '1.0',
            'environment': self.environment,
            
            # Actor information (who performed the action)
            'actor': {
                'user_id': user_context.get('user_id'),
                'session_id': user_context.get('session_id'),
                'ip_address': user_context.get('ip_address'),
                'user_agent': user_context.get('user_agent'),
                'cognito_groups': user_context.get('cognito_groups', []),
                'organization_context': user_context.get('organization_context'),
                'device_fingerprint': user_context.get('device_fingerprint'),
                'geolocation': user_context.get('geolocation')
            },
            
            # Target information (what was acted upon)
            'target': {
                'resource_type': target_context.get('resource_type'),
                'resource_id': target_context.get('resource_id'),
                'organization_id': target_context.get('organization_id'),  # Always present for multi-tenant context
                'parent_resource_id': target_context.get('parent_resource_id'),
                'resource_name': target_context.get('resource_name')
            },
            
            # Action information (what happened)
            'action': {
                'operation': action_details.get('operation'),
                'method': action_details.get('method'),  # GET, POST, PUT, DELETE
                'endpoint': action_details.get('endpoint'),
                'success': action_details.get('success', True),
                'error_code': action_details.get('error_code'),
                'error_message': action_details.get('error_message'),
                'permission_used': action_details.get('permission_used'),
                'rbac_context': action_details.get('rbac_context')
            },
            
            # Change tracking (before/after states)
            'changes': action_details.get('changes', {}),
            
            # Technical metadata
            'metadata': {
                'request_id': action_details.get('request_id'),
                'correlation_id': action_details.get('correlation_id'),
                'api_version': action_details.get('api_version', 'v1'),
                'client_version': action_details.get('client_version'),
                'service_name': 'orb-integration-hub',
                'aws_region': os.getenv('AWS_REGION', 'us-east-1'),
                'lambda_function': action_details.get('lambda_function'),
                'duration_ms': action_details.get('duration_ms')
            },
            
            # Compliance and legal
            'compliance': {
                'flags': [flag.value for flag in (compliance_flags or [])],
                'data_classification': action_details.get('data_classification', 'INTERNAL'),
                'legal_hold': action_details.get('legal_hold', False),
                'retention_category': self._determine_retention_category(event_type, compliance_flags)
            }
        }
    
    def _determine_log_group(
        self, 
        event_type: AuditEventType, 
        compliance_flags: List[ComplianceFlag]
    ) -> str:
        """Determine appropriate CloudWatch log group for event."""
        
        # Security events go to security log group
        if event_type.value in [
            'SECURITY_VIOLATION', 'FRAUD_DETECTED', 'UNAUTHORIZED_ACCESS_ATTEMPT',
            'PRIVILEGE_ESCALATION_ATTEMPT', 'SUSPICIOUS_ACTIVITY', 'BRUTE_FORCE_DETECTED',
            'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED'
        ]:
            return self.log_groups['security']
        
        # Financial events go to financial log group (SOX compliance)
        elif event_type.value.startswith(('BILLING_', 'PAYMENT_', 'SUBSCRIPTION_', 'INVOICE_', 'REFUND_')):
            return self.log_groups['financial']
        
        # Authentication events go to access log group
        elif event_type.value.startswith(('LOGIN_', 'LOGOUT', 'SESSION_', 'MFA_', 'PASSWORD_')):
            return self.log_groups['access']
        
        # API-related events
        elif event_type.value.startswith('API_KEY_'):
            return self.log_groups['api']
        
        # Default to organizations log group
        else:
            return self.log_groups['organizations']
    
    def _get_log_stream_name(self, organization_id: Optional[str]) -> str:
        """Generate log stream name for efficient organization-scoped queries."""
        
        if organization_id:
            return f"org-{organization_id}-{datetime.utcnow().strftime('%Y/%m/%d')}"
        else:
            return f"system-{datetime.utcnow().strftime('%Y/%m/%d')}"
    
    def _determine_retention_category(
        self, 
        event_type: AuditEventType, 
        compliance_flags: List[ComplianceFlag]
    ) -> str:
        """Determine retention category for AWS lifecycle management."""
        
        if compliance_flags:
            if ComplianceFlag.SOX in compliance_flags:
                return 'SOX_7_YEARS'
            elif ComplianceFlag.HIPAA in compliance_flags:
                return 'HIPAA_6_YEARS'
            elif ComplianceFlag.PCI_DSS in compliance_flags:
                return 'PCI_1_YEAR'
            elif ComplianceFlag.GDPR in compliance_flags:
                return 'GDPR_7_YEARS'
        
        return 'STANDARD_7_YEARS'
    
    def _send_to_cloudwatch(
        self, 
        log_group: str, 
        log_stream: str, 
        audit_entry: Dict[str, Any]
    ):
        """Send audit entry to CloudWatch with automatic retry."""
        
        try:
            # Ensure log stream exists
            self._ensure_log_stream_exists(log_group, log_stream)
            
            # Send log event - AWS handles retention, archival, compliance
            self.cloudwatch_logs.put_log_events(
                logGroupName=log_group,
                logStreamName=log_stream,
                logEvents=[{
                    'timestamp': int(time.time() * 1000),
                    'message': json.dumps(audit_entry, separators=(',', ':'))
                }]
            )
            
        except Exception as e:
            logger.error(f"Failed to send audit log to CloudWatch: {str(e)}")
            # Fallback: Log to application logs as backup
            logger.warning(f"AUDIT_FALLBACK: {json.dumps(audit_entry)}")
    
    def _ensure_log_stream_exists(self, log_group: str, log_stream: str):
        """Ensure log stream exists in CloudWatch."""
        
        try:
            self.cloudwatch_logs.create_log_stream(
                logGroupName=log_group,
                logStreamName=log_stream
            )
        except self.cloudwatch_logs.exceptions.ResourceAlreadyExistsException:
            # Log stream already exists, which is fine
            pass
        except Exception as e:
            logger.error(f"Error creating log stream {log_stream}: {str(e)}")


class StateChangeTracker:
    """Track before/after states for audit logging."""
    
    def __init__(self):
        self.sensitive_fields = {
            'password', 'secret', 'key', 'token', 'credential', 
            'private', 'confidential', 'ssn', 'credit_card'
        }
    
    def capture_state_change(
        self,
        resource_type: str,
        resource_id: str,
        old_state: Dict[str, Any],
        new_state: Dict[str, Any],
        changed_fields: List[str] = None
    ) -> Dict[str, Any]:
        """Capture detailed state change information for audit."""
        
        if changed_fields is None:
            changed_fields = self._calculate_changed_fields(old_state, new_state)
        
        field_changes = {}
        
        for field in changed_fields:
            old_value = self._get_nested_value(old_state, field)
            new_value = self._get_nested_value(new_state, field)
            
            # Handle sensitive data
            if self._is_sensitive_field(field):
                old_value = self._mask_sensitive_data(old_value)
                new_value = self._mask_sensitive_data(new_value)
            
            field_changes[field] = {
                'before': old_value,
                'after': new_value,
                'change_type': self._determine_change_type(old_value, new_value)
            }
        
        return {
            'resource_type': resource_type,
            'resource_id': resource_id,
            'total_fields_changed': len(changed_fields),
            'field_changes': field_changes,
            'change_summary': {
                'created_fields': [f for f in changed_fields if self._get_nested_value(old_state, f) is None],
                'deleted_fields': [f for f in changed_fields if self._get_nested_value(new_state, f) is None],
                'modified_fields': [f for f in changed_fields if 
                                   self._get_nested_value(old_state, f) is not None and 
                                   self._get_nested_value(new_state, f) is not None]
            }
        }
    
    def _calculate_changed_fields(self, old_state: Dict, new_state: Dict) -> List[str]:
        """Calculate which fields changed between states."""
        
        all_fields = set(old_state.keys()) | set(new_state.keys())
        changed_fields = []
        
        for field in all_fields:
            old_value = old_state.get(field)
            new_value = new_state.get(field)
            
            if old_value != new_value:
                changed_fields.append(field)
        
        return changed_fields
    
    def _get_nested_value(self, data: Dict, key: str) -> Any:
        """Get value from nested dictionary using dot notation."""
        
        if '.' not in key:
            return data.get(key)
        
        keys = key.split('.')
        value = data
        
        for k in keys:
            if isinstance(value, dict):
                value = value.get(k)
            else:
                return None
        
        return value
    
    def _is_sensitive_field(self, field_name: str) -> bool:
        """Check if field contains sensitive data."""
        
        field_lower = field_name.lower()
        return any(sensitive in field_lower for sensitive in self.sensitive_fields)
    
    def _mask_sensitive_data(self, value: Any) -> str:
        """Mask sensitive data while preserving audit capability."""
        
        if value is None:
            return None
        
        # Hash sensitive data to detect changes without storing actual values
        return f"[MASKED:SHA256:{hashlib.sha256(str(value).encode()).hexdigest()[:16]}]"
    
    def _determine_change_type(self, old_value: Any, new_value: Any) -> str:
        """Determine the type of change made to a field."""
        
        if old_value is None and new_value is not None:
            return 'CREATED'
        elif old_value is not None and new_value is None:
            return 'DELETED'
        elif old_value != new_value:
            return 'MODIFIED'
        else:
            return 'NO_CHANGE'


# Global audit logger instance
audit_logger = AWSAuditLogger()
state_tracker = StateChangeTracker()


def log_organization_audit_event(
    event_type: AuditEventType,
    user_context: Dict[str, Any],
    organization_id: str,
    action_details: Dict[str, Any],
    compliance_flags: List[ComplianceFlag] = None
) -> str:
    """Convenience function for logging organization audit events."""
    
    target_context = {
        'resource_type': 'ORGANIZATION',
        'resource_id': organization_id,
        'organization_id': organization_id
    }
    
    return audit_logger.log_audit_event(
        event_type=event_type,
        user_context=user_context,
        target_context=target_context,
        action_details=action_details,
        compliance_flags=compliance_flags or [ComplianceFlag.SOX, ComplianceFlag.GDPR]
    )


def log_security_audit_event(
    event_type: AuditEventType,
    user_context: Dict[str, Any],
    security_details: Dict[str, Any],
    organization_id: str = None
) -> str:
    """Convenience function for logging security audit events."""
    
    target_context = {
        'resource_type': 'SECURITY_EVENT',
        'organization_id': organization_id
    }
    
    return audit_logger.log_audit_event(
        event_type=event_type,
        user_context=user_context,
        target_context=target_context,
        action_details=security_details,
        compliance_flags=[ComplianceFlag.SOC_2, ComplianceFlag.ISO_27001]
    )