"""Webhook Event Publisher.

Utility module for publishing webhook events to the SQS queue.
Used by other Lambda functions to trigger webhook deliveries.

@see .kiro/specs/application-environment-config/design.md
_Requirements: 20.1, 20.2, 20.3_
"""

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any

import boto3

logger = logging.getLogger(__name__)

# Environment variable for webhook queue URL
WEBHOOK_QUEUE_URL = os.environ.get("WEBHOOK_QUEUE_URL", "")

# SQS client (lazy initialization)
_sqs_client = None


def get_sqs_client():
    """Get or create SQS client."""
    global _sqs_client
    if _sqs_client is None:
        _sqs_client = boto3.client("sqs")
    return _sqs_client


class WebhookEventType:
    """Webhook event type constants."""

    # User events
    USER_CREATED = "USER_CREATED"
    USER_UPDATED = "USER_UPDATED"
    USER_DELETED = "USER_DELETED"

    # Group events
    GROUP_CREATED = "GROUP_CREATED"
    GROUP_UPDATED = "GROUP_UPDATED"
    GROUP_DELETED = "GROUP_DELETED"

    # Role events
    ROLE_ASSIGNED = "ROLE_ASSIGNED"
    ROLE_REVOKED = "ROLE_REVOKED"


def publish_webhook_event(
    application_id: str,
    organization_id: str,
    environment: str,
    event_type: str,
    resource_type: str,
    resource_id: str,
    data: dict[str, Any] | None = None,
    actor_id: str | None = None,
) -> bool:
    """Publish a webhook event to the SQS queue.

    Args:
        application_id: Application ID the event belongs to
        organization_id: Organization ID
        environment: Environment (DEVELOPMENT, STAGING, PRODUCTION)
        event_type: Type of event (e.g., USER_CREATED)
        resource_type: Type of resource (e.g., "user", "group")
        resource_id: ID of the affected resource
        data: Additional event data
        actor_id: ID of the user who triggered the event

    Returns:
        True if event was published successfully, False otherwise
    """
    if not WEBHOOK_QUEUE_URL:
        logger.warning("WEBHOOK_QUEUE_URL not configured, skipping webhook event")
        return False

    event = {
        "eventId": str(uuid.uuid4()),
        "eventType": event_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "applicationId": application_id,
        "organizationId": organization_id,
        "environment": environment,
        "resource": {
            "type": resource_type,
            "id": resource_id,
        },
        "data": data or {},
        "actor": {"id": actor_id} if actor_id else None,
    }

    try:
        sqs = get_sqs_client()
        response = sqs.send_message(
            QueueUrl=WEBHOOK_QUEUE_URL,
            MessageBody=json.dumps(event, default=str),
            MessageGroupId=application_id,  # For FIFO queues (if used)
            MessageDeduplicationId=event["eventId"],
        )
        logger.info(
            f"Published webhook event: type={event_type}, "
            f"app={application_id}, resource={resource_type}/{resource_id}, "
            f"messageId={response.get('MessageId')}"
        )
        return True

    except Exception as e:
        logger.error(f"Failed to publish webhook event: {e}")
        return False


def publish_user_event(
    application_id: str,
    organization_id: str,
    environment: str,
    event_type: str,
    user_id: str,
    user_data: dict[str, Any] | None = None,
    actor_id: str | None = None,
) -> bool:
    """Publish a user-related webhook event.

    Args:
        application_id: Application ID
        organization_id: Organization ID
        environment: Environment
        event_type: USER_CREATED, USER_UPDATED, or USER_DELETED
        user_id: ID of the affected user
        user_data: User data to include in event
        actor_id: ID of the user who triggered the event

    Returns:
        True if event was published successfully
    """
    return publish_webhook_event(
        application_id=application_id,
        organization_id=organization_id,
        environment=environment,
        event_type=event_type,
        resource_type="user",
        resource_id=user_id,
        data=user_data,
        actor_id=actor_id,
    )


def publish_group_event(
    application_id: str,
    organization_id: str,
    environment: str,
    event_type: str,
    group_id: str,
    group_data: dict[str, Any] | None = None,
    actor_id: str | None = None,
) -> bool:
    """Publish a group-related webhook event.

    Args:
        application_id: Application ID
        organization_id: Organization ID
        environment: Environment
        event_type: GROUP_CREATED, GROUP_UPDATED, or GROUP_DELETED
        group_id: ID of the affected group
        group_data: Group data to include in event
        actor_id: ID of the user who triggered the event

    Returns:
        True if event was published successfully
    """
    return publish_webhook_event(
        application_id=application_id,
        organization_id=organization_id,
        environment=environment,
        event_type=event_type,
        resource_type="group",
        resource_id=group_id,
        data=group_data,
        actor_id=actor_id,
    )


def publish_role_event(
    application_id: str,
    organization_id: str,
    environment: str,
    event_type: str,
    user_id: str,
    role_id: str,
    role_data: dict[str, Any] | None = None,
    actor_id: str | None = None,
) -> bool:
    """Publish a role assignment/revocation webhook event.

    Args:
        application_id: Application ID
        organization_id: Organization ID
        environment: Environment
        event_type: ROLE_ASSIGNED or ROLE_REVOKED
        user_id: ID of the user whose role changed
        role_id: ID of the role
        role_data: Additional role data
        actor_id: ID of the user who triggered the event

    Returns:
        True if event was published successfully
    """
    data = role_data or {}
    data["roleId"] = role_id

    return publish_webhook_event(
        application_id=application_id,
        organization_id=organization_id,
        environment=environment,
        event_type=event_type,
        resource_type="user_role",
        resource_id=f"{user_id}:{role_id}",
        data=data,
        actor_id=actor_id,
    )
