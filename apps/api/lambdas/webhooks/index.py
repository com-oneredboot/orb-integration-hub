"""Webhook Delivery Lambda Handler.

Processes webhook events from SQS queue and delivers them to configured endpoints.
Implements HMAC-SHA256 signature generation and retry logic with exponential backoff.

@see .kiro/specs/application-environment-config/design.md
_Requirements: 3.1, 3.2, 3.3, 3.4, 19.1, 19.2, 19.3, 19.4, 19.5_
"""

import hashlib
import hmac
import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

import boto3

# Configure logging
logger = logging.getLogger()
logger.setLevel(os.environ.get("LOGGING_LEVEL", "INFO"))

# Environment variables
ENVIRONMENT_CONFIG_TABLE_NAME = os.environ.get("ENVIRONMENT_CONFIG_TABLE_NAME", "")
METRICS_NAMESPACE = os.environ.get("METRICS_NAMESPACE", "Webhooks")

# AWS clients
dynamodb = boto3.resource("dynamodb")
cloudwatch = boto3.client("cloudwatch")


def generate_signature(payload: str, secret: str) -> str:
    """Generate HMAC-SHA256 signature for webhook payload.

    Args:
        payload: JSON string payload to sign
        secret: Webhook secret key

    Returns:
        Hex-encoded HMAC-SHA256 signature
    """
    return hmac.new(
        secret.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def get_webhook_config(application_id: str, environment: str) -> dict[str, Any] | None:
    """Get webhook configuration from DynamoDB.

    Args:
        application_id: Application ID
        environment: Environment (DEVELOPMENT, STAGING, PRODUCTION)

    Returns:
        Webhook configuration dict or None if not found/disabled
    """
    if not ENVIRONMENT_CONFIG_TABLE_NAME:
        logger.error("ENVIRONMENT_CONFIG_TABLE_NAME not configured")
        return None

    table = dynamodb.Table(ENVIRONMENT_CONFIG_TABLE_NAME)

    try:
        response = table.get_item(
            Key={
                "applicationId": application_id,
                "environment": environment,
            }
        )

        item = response.get("Item")
        if not item:
            logger.warning(
                f"No config found for app={application_id}, env={environment}"
            )
            return None

        # Check if webhooks are enabled
        if not item.get("webhookEnabled", False):
            logger.info(
                f"Webhooks disabled for app={application_id}, env={environment}"
            )
            return None

        # Check if webhook URL is configured
        webhook_url = item.get("webhookUrl")
        if not webhook_url:
            logger.warning(
                f"No webhook URL for app={application_id}, env={environment}"
            )
            return None

        return {
            "url": webhook_url,
            "secret": item.get("webhookSecret", ""),
            "events": item.get("webhookEvents", []),
            "maxRetries": item.get("webhookMaxRetries", 3),
            "retryDelaySeconds": item.get("webhookRetryDelaySeconds", 60),
        }

    except Exception as e:
        logger.error(f"Error getting webhook config: {e}")
        return None


def deliver_webhook(
    url: str,
    payload: dict[str, Any],
    secret: str,
    timeout: int = 10,
) -> tuple[bool, int, str]:
    """Deliver webhook to endpoint.

    Args:
        url: Webhook endpoint URL
        payload: Event payload to deliver
        secret: Webhook secret for signature
        timeout: Request timeout in seconds

    Returns:
        Tuple of (success, status_code, error_message)
    """
    payload_json = json.dumps(payload, default=str)
    signature = generate_signature(payload_json, secret)
    timestamp = int(time.time())

    headers = {
        "Content-Type": "application/json",
        "X-Webhook-Signature": f"sha256={signature}",
        "X-Webhook-Timestamp": str(timestamp),
        "X-Webhook-Event": payload.get("eventType", "unknown"),
        "User-Agent": "OrbIntegrationHub-Webhook/1.0",
    }

    try:
        request = Request(
            url,
            data=payload_json.encode("utf-8"),
            headers=headers,
            method="POST",
        )

        with urlopen(request, timeout=timeout) as response:
            status_code = response.status
            if 200 <= status_code < 300:
                return True, status_code, ""
            return False, status_code, f"Unexpected status: {status_code}"

    except HTTPError as e:
        return False, e.code, str(e.reason)
    except URLError as e:
        return False, 0, str(e.reason)
    except TimeoutError:
        return False, 0, "Request timed out"
    except Exception as e:
        return False, 0, str(e)


def put_metric(metric_name: str, value: float, dimensions: list[dict]) -> None:
    """Put CloudWatch metric for webhook delivery.

    Args:
        metric_name: Name of the metric
        value: Metric value
        dimensions: List of dimension dicts with Name and Value
    """
    try:
        cloudwatch.put_metric_data(
            Namespace=METRICS_NAMESPACE,
            MetricData=[
                {
                    "MetricName": metric_name,
                    "Value": value,
                    "Unit": "Count",
                    "Dimensions": dimensions,
                    "Timestamp": datetime.now(timezone.utc),
                }
            ],
        )
    except Exception as e:
        logger.warning(f"Failed to put metric {metric_name}: {e}")


def process_webhook_event(event_data: dict[str, Any]) -> bool:
    """Process a single webhook event.

    Args:
        event_data: Webhook event data from SQS message

    Returns:
        True if delivery succeeded, False otherwise
    """
    application_id = event_data.get("applicationId")
    environment = event_data.get("environment")
    event_type = event_data.get("eventType")

    if not all([application_id, environment, event_type]):
        logger.error(f"Missing required fields in event: {event_data}")
        return False

    # Get webhook configuration
    config = get_webhook_config(application_id, environment)
    if not config:
        # No config or webhooks disabled - consider this a success (skip)
        return True

    # Check if this event type is subscribed
    subscribed_events = config.get("events", [])
    if subscribed_events and event_type not in subscribed_events:
        logger.info(f"Event {event_type} not subscribed for app={application_id}")
        return True

    # Prepare dimensions for metrics
    dimensions = [
        {"Name": "ApplicationId", "Value": application_id},
        {"Name": "Environment", "Value": environment},
        {"Name": "EventType", "Value": event_type},
    ]

    # Deliver webhook
    start_time = time.time()
    success, status_code, error = deliver_webhook(
        url=config["url"],
        payload=event_data,
        secret=config["secret"],
    )
    duration_ms = (time.time() - start_time) * 1000

    # Record metrics
    put_metric("DeliveryAttempts", 1, dimensions)
    if success:
        put_metric("DeliverySuccess", 1, dimensions)
        logger.info(
            f"Webhook delivered: app={application_id}, env={environment}, "
            f"event={event_type}, status={status_code}, duration={duration_ms:.0f}ms"
        )
    else:
        put_metric("DeliveryFailure", 1, dimensions)
        logger.error(
            f"Webhook failed: app={application_id}, env={environment}, "
            f"event={event_type}, status={status_code}, error={error}"
        )

    return success


def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Lambda handler for webhook delivery.

    Processes SQS messages containing webhook events and delivers them
    to configured endpoints. Supports partial batch response for
    individual message failure handling.

    Args:
        event: SQS event with Records
        context: Lambda context

    Returns:
        Batch item failures response for SQS
    """
    logger.info(f"Processing {len(event.get('Records', []))} webhook events")

    batch_item_failures = []

    for record in event.get("Records", []):
        message_id = record.get("messageId")

        try:
            # Parse SQS message body
            body = json.loads(record.get("body", "{}"))

            # Process the webhook event
            success = process_webhook_event(body)

            if not success:
                # Add to failures for retry
                batch_item_failures.append({"itemIdentifier": message_id})

        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in message {message_id}: {e}")
            # Don't retry invalid JSON - it will never succeed
        except Exception as e:
            logger.error(f"Error processing message {message_id}: {e}")
            batch_item_failures.append({"itemIdentifier": message_id})

    logger.info(
        f"Processed {len(event.get('Records', []))} events, "
        f"{len(batch_item_failures)} failures"
    )

    return {"batchItemFailures": batch_item_failures}
