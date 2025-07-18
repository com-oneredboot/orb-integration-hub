# file: backend/src/layers/shared_security/audit/base_audit_logger.py
# author: AI Assistant
# created: 2025-07-17
# description: Base audit logger with CloudWatch integration

import json
import logging
import time
import os
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Dict, Any, Optional, List, Union
from enum import Enum

import boto3
from botocore.exceptions import ClientError

from .audit_events import (
    ComplianceFlag, 
    categorize_event, 
    determine_severity,
    determine_compliance_flags
)
from .state_tracker import StateTracker

logger = logging.getLogger(__name__)


class BaseAuditLogger(ABC):
    """Base audit logger for CloudWatch integration."""
    
    def __init__(self, entity_type: str, log_group_suffix: str = None):
        self.entity_type = entity_type
        self.logs_client = boto3.client('logs')
        self.log_group_name = self._get_log_group_name(log_group_suffix)
        self._ensure_log_group_exists()
        self.sequence_tokens = {}  # Track tokens per log stream
        self.state_tracker = StateTracker()
        
    def _get_log_group_name(self, suffix: str = None) -> str:
        """Get log group name from environment."""
        customer_id = os.environ.get('CUSTOMER_ID', 'orb')
        project_id = os.environ.get('PROJECT_ID', 'integration-hub')
        environment = os.environ.get('ENVIRONMENT', 'dev')
        
        base_name = f"/audit/{customer_id}-{project_id}-{environment}"
        if suffix:
            return f"{base_name}-{suffix}"
        return f"{base_name}-{self.entity_type.lower()}"
    
    def _ensure_log_group_exists(self):
        """Ensure the CloudWatch log group exists with proper retention."""
        try:
            self.logs_client.create_log_group(logGroupName=self.log_group_name)
            
            # Set retention policy based on compliance requirements
            retention_days = self._get_retention_days()
            self.logs_client.put_retention_policy(
                logGroupName=self.log_group_name,
                retentionInDays=retention_days
            )
            
            logger.info(f"Created audit log group: {self.log_group_name} with {retention_days} days retention")
            
        except self.logs_client.exceptions.ResourceAlreadyExistsException:
            pass
        except Exception as e:
            logger.error(f"Error creating log group: {str(e)}")
    
    def _get_retention_days(self) -> int:
        """Get retention days based on compliance requirements."""
        # Default to 7 years (2555 days) for compliance
        # Can be overridden by environment variable
        return int(os.environ.get('AUDIT_LOG_RETENTION_DAYS', '2555'))
    
    def log_event(
        self,
        event_type: Enum,
        user_context: Dict[str, Any],
        resource_id: str,
        action_details: Dict[str, Any],
        compliance_flags: List[ComplianceFlag] = None,
        state_changes: Dict[str, Any] = None,
        additional_context: Dict[str, Any] = None
    ):
        """Log an audit event to CloudWatch."""
        try:
            # Auto-determine compliance flags if not provided
            if compliance_flags is None:
                compliance_flags = determine_compliance_flags(event_type, action_details)
            
            # Build base audit event
            audit_event = {
                'version': '2.1',
                'timestamp': datetime.utcnow().isoformat(),
                'eventType': event_type.value,
                'eventCategory': categorize_event(event_type).value,
                'severity': determine_severity(event_type),
                'entityType': self.entity_type,
                'userContext': self._sanitize_user_context(user_context),
                'resource': {
                    'type': self.entity_type,
                    'id': resource_id
                },
                'action': action_details,
                'compliance': {
                    'flags': [flag.value for flag in compliance_flags],
                    'dataClassification': action_details.get('data_classification', 'internal')
                },
                'environment': {
                    'service': os.environ.get('AWS_LAMBDA_FUNCTION_NAME', 'unknown'),
                    'region': os.environ.get('AWS_REGION', 'unknown'),
                    'account': self._get_account_id()
                }
            }
            
            # Add optional fields
            if state_changes:
                audit_event['stateChanges'] = state_changes
            
            if additional_context:
                audit_event['additionalContext'] = additional_context
            
            # Add correlation ID if available
            if 'request_id' in action_details:
                audit_event['correlationId'] = action_details['request_id']
            
            # Add custom fields from subclasses
            audit_event = self._enrich_audit_event(audit_event)
            
            # Write to CloudWatch
            self._write_to_cloudwatch(audit_event)
            
            # Also write to application logs for debugging
            logger.info(f"Audit event logged: {event_type.value} for {self.entity_type} {resource_id}")
            
            # Call hook for additional processing
            self._post_log_hook(audit_event)
            
        except Exception as e:
            # CRITICAL: Audit logging failure should be logged but not fail the operation
            logger.critical(f"AUDIT_LOGGING_FAILURE for {self.entity_type}: {str(e)}")
            # Attempt fallback logging
            self._fallback_log(event_type, user_context, resource_id, action_details, str(e))
    
    def _sanitize_user_context(self, user_context: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize user context to remove sensitive information."""
        sanitized = user_context.copy()
        
        # Remove sensitive fields
        sensitive_fields = ['password', 'token', 'secret', 'key']
        for field in sensitive_fields:
            if field in sanitized:
                sanitized[field] = '***REDACTED***'
        
        # Ensure required fields
        sanitized.setdefault('userId', 'unknown')
        sanitized.setdefault('sessionId', 'unknown')
        
        return sanitized
    
    def _get_account_id(self) -> str:
        """Get AWS account ID."""
        try:
            # Try from Lambda context first
            context = os.environ.get('AWS_LAMBDA_FUNCTION_ARN', '')
            if context:
                return context.split(':')[4]
            
            # Fallback to STS
            sts = boto3.client('sts')
            return sts.get_caller_identity()['Account']
        except:
            return 'unknown'
    
    def _write_to_cloudwatch(self, event: Dict[str, Any]):
        """Write event to CloudWatch Logs."""
        try:
            # Use date-based log streams for easier navigation
            log_stream_name = datetime.utcnow().strftime('%Y/%m/%d')
            
            # Ensure log stream exists
            try:
                self.logs_client.create_log_stream(
                    logGroupName=self.log_group_name,
                    logStreamName=log_stream_name
                )
            except self.logs_client.exceptions.ResourceAlreadyExistsException:
                pass
            
            # Prepare log event
            log_params = {
                'logGroupName': self.log_group_name,
                'logStreamName': log_stream_name,
                'logEvents': [{
                    'timestamp': int(time.time() * 1000),
                    'message': json.dumps(event, default=str)
                }]
            }
            
            # Add sequence token if we have one for this stream
            if log_stream_name in self.sequence_tokens:
                log_params['sequenceToken'] = self.sequence_tokens[log_stream_name]
            
            # Put log event
            response = self.logs_client.put_log_events(**log_params)
            
            # Update sequence token
            if 'nextSequenceToken' in response:
                self.sequence_tokens[log_stream_name] = response['nextSequenceToken']
            
        except Exception as e:
            logger.error(f"Failed to write to CloudWatch: {str(e)}")
            raise
    
    def _fallback_log(
        self, 
        event_type: Enum,
        user_context: Dict[str, Any],
        resource_id: str,
        action_details: Dict[str, Any],
        error: str
    ):
        """Fallback logging mechanism when CloudWatch fails."""
        try:
            # Log to application logs as fallback
            fallback_event = {
                'type': 'AUDIT_FALLBACK',
                'originalError': error,
                'eventType': event_type.value,
                'entityType': self.entity_type,
                'resourceId': resource_id,
                'userId': user_context.get('userId', 'unknown'),
                'timestamp': datetime.utcnow().isoformat()
            }
            logger.error(f"AUDIT_FALLBACK: {json.dumps(fallback_event)}")
            
            # Could also write to S3, DynamoDB, or SQS as additional fallback
            
        except Exception as e:
            logger.critical(f"AUDIT_FALLBACK_FAILED: {str(e)}")
    
    @abstractmethod
    def _enrich_audit_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Hook for subclasses to add entity-specific fields."""
        pass
    
    def _post_log_hook(self, event: Dict[str, Any]):
        """Hook for additional processing after logging."""
        # Subclasses can override to send alerts, metrics, etc.
        pass
    
    def track_state_change(
        self,
        resource_id: str,
        old_state: Dict[str, Any],
        new_state: Dict[str, Any],
        sensitive_fields: List[str] = None
    ) -> Dict[str, Any]:
        """Track state changes for audit logging."""
        return self.state_tracker.capture_state_change(
            resource_type=self.entity_type,
            resource_id=resource_id,
            old_state=old_state,
            new_state=new_state,
            sensitive_fields=sensitive_fields
        )


class AuditLogQuery:
    """Helper class for querying audit logs."""
    
    def __init__(self, log_group_name: str):
        self.logs_client = boto3.client('logs')
        self.log_group_name = log_group_name
    
    def query_events(
        self,
        start_time: datetime,
        end_time: datetime,
        event_type: str = None,
        user_id: str = None,
        resource_id: str = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Query audit events from CloudWatch."""
        # Build query
        query_parts = ['fields @timestamp, @message']
        filters = []
        
        if event_type:
            filters.append(f'eventType = "{event_type}"')
        if user_id:
            filters.append(f'userContext.userId = "{user_id}"')
        if resource_id:
            filters.append(f'resource.id = "{resource_id}"')
        
        if filters:
            query_parts.append(f"| filter {' and '.join(filters)}")
        
        query_parts.append('| sort @timestamp desc')
        query_parts.append(f'| limit {limit}')
        
        query = '\n'.join(query_parts)
        
        # Execute query
        response = self.logs_client.start_query(
            logGroupName=self.log_group_name,
            startTime=int(start_time.timestamp()),
            endTime=int(end_time.timestamp()),
            queryString=query
        )
        
        query_id = response['queryId']
        
        # Wait for results
        while True:
            results = self.logs_client.get_query_results(queryId=query_id)
            if results['status'] == 'Complete':
                break
            time.sleep(0.5)
        
        # Parse results
        events = []
        for result in results['results']:
            message_field = next((field for field in result if field['field'] == '@message'), None)
            if message_field:
                try:
                    events.append(json.loads(message_field['value']))
                except:
                    pass
        
        return events