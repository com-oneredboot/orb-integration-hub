"""Audit logging functionality."""

import json
import logging
import os
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union

# Placeholder boto3 imports - actual implementation would use real boto3
try:
    import boto3
    from botocore.exceptions import ClientError
except ImportError:
    # For development without boto3
    boto3 = None
    ClientError = Exception

from .compliance import ComplianceFlag, determine_compliance_flags
from .events import BaseAuditEventType, categorize_event, determine_severity
from .tracker import StateTracker

logger = logging.getLogger(__name__)


@dataclass
class AuditLogQuery:
    """Query parameters for audit log retrieval."""

    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    user_id: Optional[str] = None
    resource_id: Optional[str] = None
    event_type: Optional[str] = None
    limit: int = 100


class BaseAuditLogger(ABC):
    """Base audit logger for CloudWatch integration."""

    def __init__(self, entity_type: str, log_group_suffix: str = None):
        self.entity_type = entity_type
        self.log_group_name = self._get_log_group_name(log_group_suffix)
        self.sequence_tokens = {}  # Track tokens per log stream
        self.state_tracker = StateTracker()

        if boto3:
            self.logs_client = boto3.client("logs")
            self._ensure_log_group_exists()
        else:
            self.logs_client = None
            logger.warning("boto3 not available - audit logging disabled")

    def _get_log_group_name(self, suffix: str = None) -> str:
        """Get log group name from environment."""
        customer_id = os.environ.get("CUSTOMER_ID", "orb")
        project_id = os.environ.get("PROJECT_ID", "integration-hub")
        environment = os.environ.get("ENVIRONMENT", "dev")

        base_name = f"/audit/{customer_id}-{project_id}-{environment}"
        if suffix:
            return f"{base_name}-{suffix}"
        return f"{base_name}-{self.entity_type.lower()}"

    def _ensure_log_group_exists(self):
        """Ensure the CloudWatch log group exists with proper retention."""
        if not self.logs_client:
            return

        try:
            self.logs_client.create_log_group(logGroupName=self.log_group_name)

            # Set retention policy based on compliance requirements
            retention_days = self._get_retention_days()
            self.logs_client.put_retention_policy(
                logGroupName=self.log_group_name, retentionInDays=retention_days
            )

            logger.info(
                f"Created audit log group: {self.log_group_name} with {retention_days} days retention"
            )

        except Exception as e:
            if hasattr(e, "__class__") and e.__class__.__name__ == "ResourceAlreadyExistsException":
                pass
            else:
                logger.error(f"Error creating log group: {str(e)}")

    def _get_retention_days(self) -> int:
        """Get retention days based on compliance requirements."""
        # Default to 7 years (2555 days) for compliance
        # Can be overridden by environment variable
        return int(os.environ.get("AUDIT_LOG_RETENTION_DAYS", "2555"))

    def log_event(
        self,
        event_type: Enum,
        user_context: Dict[str, Any],
        resource_id: str,
        action_details: Dict[str, Any],
        compliance_flags: List[ComplianceFlag] = None,
        state_changes: Dict[str, Any] = None,
        additional_context: Dict[str, Any] = None,
    ):
        """Log an audit event to CloudWatch."""
        try:
            # Auto-determine compliance flags if not provided
            if compliance_flags is None:
                compliance_flags = determine_compliance_flags(event_type, action_details)

            # Build base audit event
            audit_event = {
                "version": "2.1",
                "timestamp": datetime.utcnow().isoformat(),
                "eventType": event_type.value,
                "eventCategory": categorize_event(event_type).value,
                "severity": determine_severity(event_type),
                "entityType": self.entity_type,
                "userContext": self._sanitize_user_context(user_context),
                "resourceId": resource_id,
                "actionDetails": action_details,
                "complianceFlags": [flag.value for flag in compliance_flags],
                "environmentContext": self._get_environment_context(),
            }

            # Add state changes if provided
            if state_changes:
                audit_event["stateChanges"] = self._sanitize_state_changes(state_changes)

            # Add additional context if provided
            if additional_context:
                audit_event["additionalContext"] = additional_context

            # Extend with entity-specific data
            audit_event = self._extend_audit_event(audit_event, user_context, action_details)

            # Log to CloudWatch
            self._write_to_cloudwatch(audit_event, user_context.get("userId", "system"))

            # Log locally for debugging
            logger.info(f"Audit Event: {event_type.value}", extra={"audit_event": audit_event})

        except Exception as e:
            logger.error(f"Failed to log audit event: {str(e)}", exc_info=True)
            # Audit logging should not break the application

    def _sanitize_user_context(self, user_context: Dict[str, Any]) -> Dict[str, Any]:
        """Remove sensitive data from user context."""
        sanitized = user_context.copy()
        sensitive_fields = ["password", "token", "secret", "key"]
        for field in sensitive_fields:
            if field in sanitized:
                sanitized[field] = "[REDACTED]"
        return sanitized

    def _sanitize_state_changes(self, state_changes: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize state changes using StateTracker classifications."""
        # Use state tracker to classify and sanitize fields
        return self.state_tracker.sanitize_changes(state_changes)

    def _get_environment_context(self) -> Dict[str, Any]:
        """Get environment context for audit event."""
        return {
            "customerId": os.environ.get("CUSTOMER_ID", "unknown"),
            "projectId": os.environ.get("PROJECT_ID", "unknown"),
            "environment": os.environ.get("ENVIRONMENT", "unknown"),
            "region": os.environ.get("AWS_REGION", "unknown"),
            "functionName": os.environ.get("AWS_LAMBDA_FUNCTION_NAME", "unknown"),
            "functionVersion": os.environ.get("AWS_LAMBDA_FUNCTION_VERSION", "$LATEST"),
        }

    def _write_to_cloudwatch(self, audit_event: Dict[str, Any], user_id: str):
        """Write audit event to CloudWatch."""
        if not self.logs_client:
            return

        log_stream_name = self._get_log_stream_name(user_id)

        try:
            # Ensure log stream exists
            self._ensure_log_stream_exists(log_stream_name)

            # Prepare log event
            log_event = {
                "timestamp": int(time.time() * 1000),
                "message": json.dumps(audit_event, default=str),
            }

            # Get sequence token
            sequence_token = self.sequence_tokens.get(log_stream_name)

            # Put log event
            kwargs = {
                "logGroupName": self.log_group_name,
                "logStreamName": log_stream_name,
                "logEvents": [log_event],
            }

            if sequence_token:
                kwargs["sequenceToken"] = sequence_token

            response = self.logs_client.put_log_events(**kwargs)

            # Update sequence token
            self.sequence_tokens[log_stream_name] = response.get("nextSequenceToken")

        except Exception as e:
            logger.error(f"Failed to write to CloudWatch: {str(e)}")

    def _get_log_stream_name(self, user_id: str) -> str:
        """Get log stream name for user."""
        date = datetime.utcnow().strftime("%Y/%m/%d")
        return f"{date}/{user_id}"

    def _ensure_log_stream_exists(self, log_stream_name: str):
        """Ensure log stream exists."""
        if not self.logs_client:
            return

        try:
            self.logs_client.create_log_stream(
                logGroupName=self.log_group_name, logStreamName=log_stream_name
            )
        except Exception as e:
            # Ignore if already exists
            if hasattr(e, "__class__") and e.__class__.__name__ != "ResourceAlreadyExistsException":
                logger.error(f"Error creating log stream: {str(e)}")

    @abstractmethod
    def _extend_audit_event(
        self,
        audit_event: Dict[str, Any],
        user_context: Dict[str, Any],
        action_details: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Extend audit event with entity-specific data."""
        pass

    def query_audit_logs(self, query: AuditLogQuery) -> List[Dict[str, Any]]:
        """Query audit logs from CloudWatch."""
        if not self.logs_client:
            return []

        try:
            # Build filter pattern
            filter_pattern = self._build_filter_pattern(query)

            # Query logs
            response = self.logs_client.filter_log_events(
                logGroupName=self.log_group_name,
                startTime=int(query.start_time.timestamp() * 1000) if query.start_time else None,
                endTime=int(query.end_time.timestamp() * 1000) if query.end_time else None,
                filterPattern=filter_pattern,
                limit=query.limit,
            )

            # Parse and return events
            events = []
            for event in response.get("events", []):
                try:
                    parsed = json.loads(event["message"])
                    events.append(parsed)
                except json.JSONDecodeError:
                    logger.error(f"Failed to parse audit event: {event['message']}")

            return events

        except Exception as e:
            logger.error(f"Failed to query audit logs: {str(e)}")
            return []

    def _build_filter_pattern(self, query: AuditLogQuery) -> str:
        """Build CloudWatch filter pattern from query."""
        patterns = []

        if query.user_id:
            patterns.append(f'{{ $.userContext.userId = "{query.user_id}" }}')

        if query.resource_id:
            patterns.append(f'{{ $.resourceId = "{query.resource_id}" }}')

        if query.event_type:
            patterns.append(f'{{ $.eventType = "{query.event_type}" }}')

        return " && ".join(patterns) if patterns else ""


class AuditLogger(BaseAuditLogger):
    """Main audit logger implementation."""

    def _extend_audit_event(
        self,
        audit_event: Dict[str, Any],
        user_context: Dict[str, Any],
        action_details: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Default implementation - no extension."""
        return audit_event


def get_audit_logger(service_name: str) -> AuditLogger:
    """Get audit logger instance for service."""
    return AuditLogger(service_name)


def configure_audit_logger(config: Dict[str, Any]) -> None:
    """Configure audit logger with given settings."""
    # Apply configuration
    for key, value in config.items():
        if key.upper().startswith("AUDIT_"):
            os.environ[key.upper()] = str(value)
