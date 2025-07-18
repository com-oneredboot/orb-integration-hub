# file: backend/src/layers/users_security/aws_audit_logger.py
# author: AI Assistant
# created: 2025-07-17
# description: AWS Audit Logger for User operations with compliance support

import json
import logging
import time
from datetime import datetime
from typing import Dict, Any, Optional, List
from enum import Enum
import boto3
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)


class AuditEventType(Enum):
    """User-specific audit event types."""
    # User lifecycle events
    USER_CREATED = "USER_CREATED"
    USER_UPDATED = "USER_UPDATED"
    USER_DELETED = "USER_DELETED"
    USER_RESTORED = "USER_RESTORED"
    
    # Authentication events
    USER_LOGIN = "USER_LOGIN"
    USER_LOGOUT = "USER_LOGOUT"
    USER_SESSION_EXPIRED = "USER_SESSION_EXPIRED"
    USER_LOGIN_FAILED = "USER_LOGIN_FAILED"
    USER_TOKEN_REFRESHED = "USER_TOKEN_REFRESHED"
    
    # Profile and data access events
    USER_PROFILE_VIEWED = "USER_PROFILE_VIEWED"
    USER_DATA_EXPORTED = "USER_DATA_EXPORTED"
    USER_DATA_IMPORTED = "USER_DATA_IMPORTED"
    USER_SEARCH_PERFORMED = "USER_SEARCH_PERFORMED"
    
    # Security events
    USER_PASSWORD_CHANGED = "USER_PASSWORD_CHANGED"
    USER_PASSWORD_RESET_REQUESTED = "USER_PASSWORD_RESET_REQUESTED"
    USER_PASSWORD_RESET_COMPLETED = "USER_PASSWORD_RESET_COMPLETED"
    USER_MFA_ENABLED = "USER_MFA_ENABLED"
    USER_MFA_DISABLED = "USER_MFA_DISABLED"
    USER_MFA_VERIFIED = "USER_MFA_VERIFIED"
    USER_MFA_FAILED = "USER_MFA_FAILED"
    
    # Status and permission events
    USER_STATUS_CHANGED = "USER_STATUS_CHANGED"
    USER_SUSPENDED = "USER_SUSPENDED"
    USER_ACTIVATED = "USER_ACTIVATED"
    USER_ROLE_CHANGED = "USER_ROLE_CHANGED"
    USER_PERMISSIONS_UPDATED = "USER_PERMISSIONS_UPDATED"
    USER_ORGANIZATION_JOINED = "USER_ORGANIZATION_JOINED"
    USER_ORGANIZATION_LEFT = "USER_ORGANIZATION_LEFT"
    
    # Privacy and compliance events
    USER_CONSENT_GRANTED = "USER_CONSENT_GRANTED"
    USER_CONSENT_REVOKED = "USER_CONSENT_REVOKED"
    USER_DATA_DELETION_REQUESTED = "USER_DATA_DELETION_REQUESTED"
    USER_DATA_DELETION_COMPLETED = "USER_DATA_DELETION_COMPLETED"
    USER_DATA_RETENTION_EXTENDED = "USER_DATA_RETENTION_EXTENDED"
    
    # Security violations
    USER_ACCESS_DENIED = "USER_ACCESS_DENIED"
    USER_SUSPICIOUS_ACTIVITY = "USER_SUSPICIOUS_ACTIVITY"
    USER_RATE_LIMIT_EXCEEDED = "USER_RATE_LIMIT_EXCEEDED"
    USER_CROSS_ACCESS_ATTEMPTED = "USER_CROSS_ACCESS_ATTEMPTED"


class ComplianceFlag(Enum):
    """Compliance and regulatory flags."""
    GDPR = "GDPR"  # General Data Protection Regulation
    CCPA = "CCPA"  # California Consumer Privacy Act
    HIPAA = "HIPAA"  # Health Insurance Portability and Accountability Act
    SOX = "SOX"  # Sarbanes-Oxley Act
    SOC_2 = "SOC_2"  # Service Organization Control 2
    PCI_DSS = "PCI_DSS"  # Payment Card Industry Data Security Standard
    FERPA = "FERPA"  # Family Educational Rights and Privacy Act


@dataclass
class StateChange:
    """Represents a field-level state change."""
    field: str
    old_value: Any
    new_value: Any
    classification: str = "standard"  # standard, sensitive, pii, protected


class StateTracker:
    """Tracks state changes for audit logging."""
    
    def capture_state_change(
        self, 
        resource_type: str,
        resource_id: str,
        old_state: Dict[str, Any],
        new_state: Dict[str, Any],
        sensitive_fields: List[str] = None
    ) -> Dict[str, Any]:
        """Capture and analyze state changes between old and new states."""
        if sensitive_fields is None:
            sensitive_fields = ['password', 'ssn', 'dateOfBirth', 'creditCard']
        
        changes = []
        
        # Find all changed fields
        all_fields = set(old_state.keys()) | set(new_state.keys())
        
        for field in all_fields:
            old_value = old_state.get(field)
            new_value = new_state.get(field)
            
            if old_value != new_value:
                # Determine field classification
                classification = "standard"
                if field in sensitive_fields:
                    classification = "sensitive"
                elif field in ['email', 'phoneNumber', 'address', 'name']:
                    classification = "pii"
                elif field in ['role', 'permissions', 'status']:
                    classification = "protected"
                
                # Mask sensitive values
                if classification in ["sensitive", "pii"]:
                    if old_value:
                        old_value = f"***{str(old_value)[-4:]}" if len(str(old_value)) > 4 else "****"
                    if new_value:
                        new_value = f"***{str(new_value)[-4:]}" if len(str(new_value)) > 4 else "****"
                
                changes.append({
                    'field': field,
                    'oldValue': old_value,
                    'newValue': new_value,
                    'classification': classification
                })
        
        return {
            'resourceType': resource_type,
            'resourceId': resource_id,
            'changeCount': len(changes),
            'changes': changes,
            'timestamp': datetime.utcnow().isoformat()
        }


# Global state tracker instance
state_tracker = StateTracker()


class AWSAuditLogger:
    """AWS Audit Logger for CloudWatch integration."""
    
    def __init__(self, log_group_name: str = None):
        self.logs_client = boto3.client('logs')
        self.log_group_name = log_group_name or self._get_default_log_group()
        self._ensure_log_group_exists()
        self.sequence_token = None
        
    def _get_default_log_group(self) -> str:
        """Get default log group name from environment."""
        import os
        customer_id = os.environ.get('CUSTOMER_ID', 'orb')
        project_id = os.environ.get('PROJECT_ID', 'integration-hub')
        environment = os.environ.get('ENVIRONMENT', 'dev')
        return f"/audit/{customer_id}-{project_id}-{environment}-users"
    
    def _ensure_log_group_exists(self):
        """Ensure the CloudWatch log group exists."""
        try:
            self.logs_client.create_log_group(logGroupName=self.log_group_name)
            # Set retention policy to 7 years for compliance
            self.logs_client.put_retention_policy(
                logGroupName=self.log_group_name,
                retentionInDays=2555  # 7 years
            )
            logger.info(f"Created audit log group: {self.log_group_name}")
        except self.logs_client.exceptions.ResourceAlreadyExistsException:
            pass
        except Exception as e:
            logger.error(f"Error creating log group: {str(e)}")
    
    def log_audit_event(
        self,
        event_type: AuditEventType,
        user_context: Dict[str, Any],
        resource_id: str,
        action_details: Dict[str, Any],
        compliance_flags: List[ComplianceFlag] = None,
        state_changes: Dict[str, Any] = None
    ):
        """Log an audit event to CloudWatch."""
        try:
            # Build audit event
            audit_event = {
                'version': '2.0',
                'timestamp': datetime.utcnow().isoformat(),
                'eventType': event_type.value,
                'eventCategory': self._categorize_event(event_type),
                'severity': self._determine_severity(event_type),
                'userContext': {
                    'userId': user_context.get('user_id'),
                    'cognitoSub': user_context.get('cognito_sub'),
                    'sessionId': user_context.get('session_id'),
                    'ipAddress': user_context.get('ip_address'),
                    'userAgent': user_context.get('user_agent'),
                    'cognitoGroups': user_context.get('cognito_groups', [])
                },
                'resource': {
                    'type': 'USER',
                    'id': resource_id
                },
                'action': action_details,
                'compliance': {
                    'flags': [flag.value for flag in (compliance_flags or [])],
                    'dataClassification': action_details.get('data_classification', 'internal')
                }
            }
            
            # Add state changes if provided
            if state_changes:
                audit_event['stateChanges'] = state_changes
            
            # Add request correlation
            if 'request_id' in action_details:
                audit_event['correlationId'] = action_details['request_id']
            
            # Log to CloudWatch
            self._write_to_cloudwatch(audit_event)
            
            # Log locally for debugging
            logger.info(f"Audit event logged: {event_type.value} for user {user_context.get('user_id')}")
            
        except Exception as e:
            # CRITICAL: Audit logging failure should be logged but not fail the operation
            logger.critical(f"AUDIT_LOGGING_FAILURE: {str(e)}")
            # Could also send to backup audit storage (S3, etc.)
    
    def _categorize_event(self, event_type: AuditEventType) -> str:
        """Categorize event for reporting."""
        if 'LOGIN' in event_type.value or 'LOGOUT' in event_type.value:
            return 'AUTHENTICATION'
        elif 'PASSWORD' in event_type.value or 'MFA' in event_type.value:
            return 'SECURITY'
        elif 'CREATED' in event_type.value or 'UPDATED' in event_type.value or 'DELETED' in event_type.value:
            return 'DATA_MODIFICATION'
        elif 'VIEWED' in event_type.value or 'EXPORTED' in event_type.value:
            return 'DATA_ACCESS'
        elif 'CONSENT' in event_type.value or 'DELETION' in event_type.value:
            return 'PRIVACY'
        elif 'DENIED' in event_type.value or 'SUSPICIOUS' in event_type.value:
            return 'SECURITY_VIOLATION'
        else:
            return 'OTHER'
    
    def _determine_severity(self, event_type: AuditEventType) -> str:
        """Determine event severity for alerting."""
        critical_events = [
            AuditEventType.USER_DELETED,
            AuditEventType.USER_SUSPICIOUS_ACTIVITY,
            AuditEventType.USER_CROSS_ACCESS_ATTEMPTED,
            AuditEventType.USER_DATA_DELETION_COMPLETED
        ]
        
        high_events = [
            AuditEventType.USER_PASSWORD_CHANGED,
            AuditEventType.USER_ROLE_CHANGED,
            AuditEventType.USER_PERMISSIONS_UPDATED,
            AuditEventType.USER_ACCESS_DENIED,
            AuditEventType.USER_LOGIN_FAILED
        ]
        
        if event_type in critical_events:
            return 'CRITICAL'
        elif event_type in high_events:
            return 'HIGH'
        elif 'FAILED' in event_type.value or 'DENIED' in event_type.value:
            return 'MEDIUM'
        else:
            return 'LOW'
    
    def _write_to_cloudwatch(self, event: Dict[str, Any]):
        """Write event to CloudWatch Logs."""
        try:
            log_stream_name = datetime.utcnow().strftime('%Y/%m/%d')
            
            # Ensure log stream exists
            try:
                self.logs_client.create_log_stream(
                    logGroupName=self.log_group_name,
                    logStreamName=log_stream_name
                )
            except self.logs_client.exceptions.ResourceAlreadyExistsException:
                pass
            
            # Put log event
            log_params = {
                'logGroupName': self.log_group_name,
                'logStreamName': log_stream_name,
                'logEvents': [{
                    'timestamp': int(time.time() * 1000),
                    'message': json.dumps(event)
                }]
            }
            
            # Add sequence token if we have one
            if self.sequence_token:
                log_params['sequenceToken'] = self.sequence_token
            
            response = self.logs_client.put_log_events(**log_params)
            self.sequence_token = response.get('nextSequenceToken')
            
        except Exception as e:
            logger.error(f"Failed to write to CloudWatch: {str(e)}")
            # Could implement fallback to S3 or SQS here


# Global audit logger instance
audit_logger = AWSAuditLogger()


def log_user_audit_event(
    event_type: AuditEventType,
    user_context: Dict[str, Any],
    target_user_id: str,
    action_details: Dict[str, Any],
    compliance_flags: List[ComplianceFlag] = None,
    state_changes: Dict[str, Any] = None
):
    """Convenience function for logging user audit events."""
    # Auto-determine compliance flags based on event type
    if not compliance_flags:
        compliance_flags = []
        
        # GDPR applies to all EU user data operations
        if any(flag in event_type.value for flag in ['DATA', 'CONSENT', 'DELETION']):
            compliance_flags.append(ComplianceFlag.GDPR)
        
        # SOX applies to authentication and permission changes
        if any(flag in event_type.value for flag in ['LOGIN', 'ROLE', 'PERMISSION']):
            compliance_flags.append(ComplianceFlag.SOX)
        
        # SOC 2 applies to security events
        if any(flag in event_type.value for flag in ['PASSWORD', 'MFA', 'SECURITY']):
            compliance_flags.append(ComplianceFlag.SOC_2)
    
    audit_logger.log_audit_event(
        event_type=event_type,
        user_context=user_context,
        resource_id=target_user_id,
        action_details=action_details,
        compliance_flags=compliance_flags,
        state_changes=state_changes
    )