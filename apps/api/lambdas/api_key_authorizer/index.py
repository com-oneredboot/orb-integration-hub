# file: apps/api/lambdas/api_key_authorizer/index.py
# author: AI Assistant
# created: 2026-01-27
# description: Lambda authorizer for API key validation
# Feature: application-access-management, Task 14.1

"""
API Key Lambda Authorizer

Validates API keys for AppSync/API Gateway requests.
Returns IAM policy allowing or denying access based on key validity.

Features:
- Validates API key by hash lookup
- Returns application/organization/environment context
- Handles invalid/expired/revoked keys with 401
- Supports rate limiting (Task 14.2)
- Audit logging for key usage (Task 14.3)

Requirements validated:
- 7.1: Lambda authorizer validates keys correctly
- 7.2: Returns context on valid key
- 7.3: Returns 401 on invalid/expired/revoked keys
- 7.4: Audit logging for API key usage
- 7.5: Rate limiting for API key requests
"""

import hashlib
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any

import boto3
from boto3.dynamodb.conditions import Attr, Key

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Rate limiting configuration
RATE_LIMIT_WINDOW_SECONDS = 60  # 1 minute window
RATE_LIMIT_MAX_REQUESTS = int(os.environ.get("RATE_LIMIT_MAX_REQUESTS", "100"))


class ApiKeyAuthorizer:
    """Lambda authorizer for API key validation."""

    def __init__(self) -> None:
        self.dynamodb = boto3.resource("dynamodb")
        self.api_keys_table = self.dynamodb.Table(
            os.environ.get(
                "APPLICATION_API_KEYS_TABLE", "orb-integration-hub-dev-application-api-keys"
            )
        )
        # Optional: Rate limiting table
        self.rate_limit_table_name = os.environ.get("RATE_LIMIT_TABLE")
        self.rate_limit_table = (
            self.dynamodb.Table(self.rate_limit_table_name) if self.rate_limit_table_name else None
        )
        # Optional: Audit log table
        self.audit_log_table_name = os.environ.get("AUDIT_LOG_TABLE")
        self.audit_log_table = (
            self.dynamodb.Table(self.audit_log_table_name) if self.audit_log_table_name else None
        )

    def authorize(self, event: dict[str, Any]) -> dict[str, Any]:
        """Main authorization handler.

        Extracts API key from request, validates it, and returns
        an IAM policy document.
        """
        try:
            # Extract API key from request
            api_key = self._extract_api_key(event)

            if not api_key:
                logger.warning("No API key provided in request")
                return self._deny_policy(event, "No API key provided")

            # Validate the key
            key_context = self._validate_key(api_key)

            if not key_context:
                logger.warning("Invalid API key")
                return self._deny_policy(event, "Invalid API key")

            # Check rate limiting
            if not self._check_rate_limit(key_context["applicationApiKeyId"]):
                logger.warning(f"Rate limit exceeded for key {key_context['applicationApiKeyId']}")
                return self._deny_policy(event, "Rate limit exceeded", status_code=429)

            # Log the usage
            self._log_usage(key_context, event)

            # Return allow policy with context
            return self._allow_policy(event, key_context)

        except Exception as e:
            logger.error(f"Authorization error: {e}")
            return self._deny_policy(event, "Authorization error")

    def _extract_api_key(self, event: dict[str, Any]) -> str | None:
        """Extract API key from the request.

        Supports multiple locations:
        - Authorization header: "Bearer orb_..."
        - x-api-key header
        - Query parameter: apiKey
        """
        # Check Authorization header
        auth_header = event.get("headers", {}).get("Authorization", "")
        if auth_header.startswith("Bearer "):
            return auth_header[7:]

        # Check x-api-key header
        api_key_header = event.get("headers", {}).get("x-api-key")
        if api_key_header:
            return api_key_header

        # Check query parameters
        query_params = event.get("queryStringParameters", {}) or {}
        api_key_param = query_params.get("apiKey")
        if api_key_param:
            return api_key_param

        # For AppSync, check authorizationToken
        auth_token = event.get("authorizationToken")
        if auth_token:
            if auth_token.startswith("Bearer "):
                return auth_token[7:]
            return auth_token

        return None

    def _validate_key(self, api_key: str) -> dict[str, Any] | None:
        """Validate an API key and return context.

        Returns None if key is invalid, expired, or revoked.
        """
        try:
            # Hash the key
            key_hash = self._hash_key(api_key)

            # Look up by hash
            response = self.api_keys_table.query(
                IndexName="KeyLookupIndex",
                KeyConditionExpression=Key("keyHash").eq(key_hash),
            )

            items = response.get("Items", [])

            if not items:
                # Check if it's a rotation key
                return self._check_rotation_key(key_hash)

            key_record = items[0]
            status = key_record.get("status")

            # Check status
            if status == "REVOKED":
                logger.info(f"Revoked key attempted: {key_record.get('keyPrefix')}")
                return None

            if status == "EXPIRED":
                logger.info(f"Expired key attempted: {key_record.get('keyPrefix')}")
                return None

            # Check expiration timestamp
            expires_at = key_record.get("expiresAt")
            if expires_at:
                now = int(datetime.now(tz=timezone.utc).timestamp())
                if now > expires_at:
                    # Mark as expired
                    self._mark_key_expired(key_record["applicationApiKeyId"])
                    return None

            # Update last used
            self._update_last_used(key_record["applicationApiKeyId"])

            return {
                "applicationApiKeyId": key_record.get("applicationApiKeyId"),
                "applicationId": key_record.get("applicationId"),
                "organizationId": key_record.get("organizationId"),
                "environment": key_record.get("environment"),
                "status": status,
            }

        except Exception as e:
            logger.error(f"Error validating key: {e}")
            return None

    def _check_rotation_key(self, key_hash: str) -> dict[str, Any] | None:
        """Check if a key hash matches a nextKeyHash during rotation."""
        try:
            response = self.api_keys_table.scan(
                FilterExpression=Attr("status").eq("ROTATING") & Attr("nextKeyHash").eq(key_hash),
            )

            items = response.get("Items", [])
            if items:
                key_record = items[0]
                self._update_last_used(key_record["applicationApiKeyId"])

                return {
                    "applicationApiKeyId": key_record.get("applicationApiKeyId"),
                    "applicationId": key_record.get("applicationId"),
                    "organizationId": key_record.get("organizationId"),
                    "environment": key_record.get("environment"),
                    "status": "ROTATING",
                    "isRotationKey": True,
                }

            return None

        except Exception as e:
            logger.error(f"Error checking rotation key: {e}")
            return None

    def _check_rate_limit(self, key_id: str) -> bool:
        """Check if the key has exceeded rate limits.

        Returns True if within limits, False if exceeded.
        """
        if not self.rate_limit_table:
            # Rate limiting not configured
            return True

        try:
            now = int(time.time())
            window_start = now - RATE_LIMIT_WINDOW_SECONDS

            # Get current count for this window
            response = self.rate_limit_table.get_item(
                Key={
                    "keyId": key_id,
                    "windowStart": window_start,
                }
            )

            item = response.get("Item", {})
            current_count = item.get("requestCount", 0)

            if current_count >= RATE_LIMIT_MAX_REQUESTS:
                return False

            # Increment counter
            self.rate_limit_table.update_item(
                Key={
                    "keyId": key_id,
                    "windowStart": window_start,
                },
                UpdateExpression="SET requestCount = if_not_exists(requestCount, :zero) + :inc, "
                "expiresAt = :ttl",
                ExpressionAttributeValues={
                    ":zero": 0,
                    ":inc": 1,
                    ":ttl": now + RATE_LIMIT_WINDOW_SECONDS * 2,  # TTL for cleanup
                },
            )

            return True

        except Exception as e:
            logger.error(f"Error checking rate limit: {e}")
            # Fail open - allow request if rate limiting fails
            return True

    def _log_usage(self, key_context: dict[str, Any], event: dict[str, Any]) -> None:
        """Log API key usage for audit purposes."""
        if not self.audit_log_table:
            # Audit logging not configured
            return

        try:
            now = int(datetime.now(tz=timezone.utc).timestamp())

            # Extract request details
            source_ip = event.get("requestContext", {}).get("identity", {}).get("sourceIp")
            user_agent = event.get("headers", {}).get("User-Agent")
            path = event.get("path") or event.get("requestContext", {}).get("path")
            method = event.get("httpMethod") or event.get("requestContext", {}).get("httpMethod")

            self.audit_log_table.put_item(
                Item={
                    "logId": f"{key_context['applicationApiKeyId']}#{now}",
                    "applicationApiKeyId": key_context["applicationApiKeyId"],
                    "applicationId": key_context["applicationId"],
                    "organizationId": key_context["organizationId"],
                    "environment": key_context["environment"],
                    "timestamp": now,
                    "sourceIp": source_ip,
                    "userAgent": user_agent,
                    "path": path,
                    "method": method,
                    "expiresAt": now + 86400 * 30,  # 30 day TTL
                }
            )

        except Exception as e:
            logger.error(f"Error logging usage: {e}")
            # Don't fail the request if logging fails

    def _hash_key(self, key: str) -> str:
        """Hash an API key using SHA-256."""
        return hashlib.sha256(key.encode()).hexdigest()

    def _update_last_used(self, key_id: str) -> None:
        """Update the lastUsedAt timestamp."""
        try:
            now = int(datetime.now(tz=timezone.utc).timestamp())
            self.api_keys_table.update_item(
                Key={"applicationApiKeyId": key_id},
                UpdateExpression="SET lastUsedAt = :now",
                ExpressionAttributeValues={":now": now},
            )
        except Exception as e:
            logger.error(f"Error updating last used: {e}")

    def _mark_key_expired(self, key_id: str) -> None:
        """Mark a key as expired."""
        try:
            now = int(datetime.now(tz=timezone.utc).timestamp())
            self.api_keys_table.update_item(
                Key={"applicationApiKeyId": key_id},
                UpdateExpression="SET #status = :expired, updatedAt = :now",
                ExpressionAttributeNames={"#status": "status"},
                ExpressionAttributeValues={
                    ":expired": "EXPIRED",
                    ":now": now,
                },
            )
        except Exception as e:
            logger.error(f"Error marking key expired: {e}")

    def _allow_policy(self, event: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
        """Generate an allow policy with context."""
        # Get the method ARN for the policy
        method_arn = event.get("methodArn", "*")

        # For AppSync, use a different format
        if "requestContext" in event and "apiId" in event.get("requestContext", {}):
            api_id = event["requestContext"]["apiId"]
            method_arn = f"arn:aws:appsync:*:*:apis/{api_id}/*"

        return {
            "principalId": context["applicationApiKeyId"],
            "policyDocument": {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Action": "execute-api:Invoke",
                        "Effect": "Allow",
                        "Resource": method_arn,
                    }
                ],
            },
            "context": {
                "applicationApiKeyId": context["applicationApiKeyId"],
                "applicationId": context["applicationId"],
                "organizationId": context["organizationId"],
                "environment": context["environment"],
                "isApiKeyAuth": "true",
            },
        }

    def _deny_policy(
        self,
        event: dict[str, Any],
        reason: str,
        status_code: int = 401,
    ) -> dict[str, Any]:
        """Generate a deny policy."""
        method_arn = event.get("methodArn", "*")

        return {
            "principalId": "unauthorized",
            "policyDocument": {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Action": "execute-api:Invoke",
                        "Effect": "Deny",
                        "Resource": method_arn,
                    }
                ],
            },
            "context": {
                "error": reason,
                "statusCode": str(status_code),
            },
        }


# Lambda handler
def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Main Lambda handler for API key authorization."""
    logger.info(f"Authorizer invoked with event type: {event.get('type', 'unknown')}")

    authorizer = ApiKeyAuthorizer()
    return authorizer.authorize(event)
