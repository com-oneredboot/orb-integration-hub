# file: apps/api/lambdas/environment_config/index.py
# author: AI Assistant
# created: 2026-02-03
# description: Lambda resolver for ApplicationEnvironmentConfig GraphQL operations
# Feature: application-environment-config

"""
ApplicationEnvironmentConfig Lambda Resolver

Provides environment configuration management:
- Get/update environment configuration
- Manage allowed origins for CORS
- Configure rate limits
- Manage webhook settings
- Manage feature flags

Properties validated:
- Origin validation accepts valid URLs and rejects invalid
- Webhook signature is deterministic for same payload+secret
- Rate limit headers are consistent with actual limits
"""

import json
import logging
import os
import re
import secrets
from datetime import datetime, timezone
from typing import Any

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Valid environments
VALID_ENVIRONMENTS = {"PRODUCTION", "STAGING", "DEVELOPMENT", "TEST", "PREVIEW"}

# Default rate limits
DEFAULT_RATE_LIMIT_PER_MINUTE = 60
DEFAULT_RATE_LIMIT_PER_DAY = 10000

# Max allowed origins per environment
MAX_ALLOWED_ORIGINS = 10

# Max feature flags per environment
MAX_FEATURE_FLAGS = 50

# Environments that allow localhost origins
LOCALHOST_ALLOWED_ENVS = {"DEVELOPMENT", "TEST"}

# URL pattern for origin validation
ORIGIN_PATTERN = re.compile(
    r"^https?://"  # http:// or https://
    r"(\*\.)?[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?"  # optional wildcard + domain
    r"(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*"  # additional domain parts
    r"(:\d+)?$"  # optional port
)

# Localhost pattern
LOCALHOST_PATTERN = re.compile(r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$")


class EnvironmentConfigService:
    """Service for managing application environment configurations."""

    def __init__(self) -> None:
        self.dynamodb = boto3.resource("dynamodb")
        self.config_table = self.dynamodb.Table(
            os.environ.get(
                "ENVIRONMENT_CONFIG_TABLE",
                "orb-integration-hub-dev-table-applicationenvironmentconfig",
            )
        )

    def get_config(self, event: dict[str, Any]) -> dict[str, Any]:
        """Get environment configuration for an application."""
        try:
            args = event.get("arguments", {})
            application_id = args.get("applicationId")
            environment = args.get("environment")

            if not application_id:
                return self._error_response("ENV001", "applicationId is required")
            if not environment:
                return self._error_response("ENV001", "environment is required")

            if environment not in VALID_ENVIRONMENTS:
                return self._error_response(
                    "ENV002",
                    f"Invalid environment. Must be one of: {', '.join(VALID_ENVIRONMENTS)}",
                )

            response = self.config_table.get_item(
                Key={"applicationId": application_id, "environment": environment}
            )

            item = response.get("Item")
            if not item:
                return self._error_response(
                    "ENV003", f"No configuration found for {application_id}/{environment}"
                )

            # Mask webhook secret in response
            if item.get("webhookSecret"):
                item["webhookSecret"] = "********"

            return {
                "code": 200,
                "success": True,
                "item": item,
            }

        except Exception as e:
            logger.error(f"Error getting config: {e}")
            return self._error_response("ENV999", f"Internal error: {e}")

    def create_config(self, event: dict[str, Any]) -> dict[str, Any]:
        """Create a new environment configuration."""
        try:
            args = event.get("arguments", {}).get("input", {})
            application_id = args.get("applicationId")
            environment = args.get("environment")
            organization_id = args.get("organizationId")

            if not application_id:
                return self._error_response("ENV001", "applicationId is required")
            if not environment:
                return self._error_response("ENV001", "environment is required")
            if not organization_id:
                return self._error_response("ENV001", "organizationId is required")

            if environment not in VALID_ENVIRONMENTS:
                return self._error_response(
                    "ENV002",
                    f"Invalid environment. Must be one of: {', '.join(VALID_ENVIRONMENTS)}",
                )

            now = int(datetime.now(tz=timezone.utc).timestamp())

            config_data = {
                "applicationId": application_id,
                "environment": environment,
                "organizationId": organization_id,
                "allowedOrigins": args.get("allowedOrigins", []),
                "rateLimitPerMinute": args.get("rateLimitPerMinute", DEFAULT_RATE_LIMIT_PER_MINUTE),
                "rateLimitPerDay": args.get("rateLimitPerDay", DEFAULT_RATE_LIMIT_PER_DAY),
                "webhookEnabled": False,
                "featureFlags": args.get("featureFlags", {}),
                "metadata": args.get("metadata", {}),
                "createdAt": now,
                "updatedAt": now,
            }

            # Validate allowed origins
            for origin in config_data["allowedOrigins"]:
                if not self._validate_origin(origin, environment):
                    return self._error_response("ENV004", f"Invalid origin: {origin}")

            self.config_table.put_item(
                Item=config_data,
                ConditionExpression="attribute_not_exists(applicationId)",
            )

            logger.info(f"Created config for {application_id}/{environment}")

            return {
                "code": 200,
                "success": True,
                "message": "Environment configuration created",
                "item": config_data,
            }

        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                return self._error_response("ENV005", "Configuration already exists")
            logger.error(f"DynamoDB error: {e}")
            return self._error_response("ENV999", f"Database error: {e}")
        except Exception as e:
            logger.error(f"Error creating config: {e}")
            return self._error_response("ENV999", f"Internal error: {e}")

    def update_config(self, event: dict[str, Any]) -> dict[str, Any]:
        """Update environment configuration."""
        try:
            args = event.get("arguments", {}).get("input", {})
            application_id = args.get("applicationId")
            environment = args.get("environment")

            if not application_id:
                return self._error_response("ENV001", "applicationId is required")
            if not environment:
                return self._error_response("ENV001", "environment is required")

            # Build update expression dynamically
            update_parts = []
            expr_names = {}
            expr_values = {":now": int(datetime.now(tz=timezone.utc).timestamp())}

            # Updatable fields
            updatable = [
                "rateLimitPerMinute",
                "rateLimitPerDay",
                "webhookEnabled",
                "featureFlags",
                "metadata",
            ]

            for field in updatable:
                if field in args:
                    safe_name = f"#{field}"
                    safe_value = f":{field}"
                    update_parts.append(f"{safe_name} = {safe_value}")
                    expr_names[safe_name] = field
                    expr_values[safe_value] = args[field]

            if not update_parts:
                return self._error_response("ENV001", "No fields to update")

            update_parts.append("updatedAt = :now")
            update_expr = "SET " + ", ".join(update_parts)

            response = self.config_table.update_item(
                Key={"applicationId": application_id, "environment": environment},
                UpdateExpression=update_expr,
                ExpressionAttributeNames=expr_names if expr_names else None,
                ExpressionAttributeValues=expr_values,
                ReturnValues="ALL_NEW",
                ConditionExpression="attribute_exists(applicationId)",
            )

            item = response.get("Attributes", {})

            # Mask webhook secret
            if item.get("webhookSecret"):
                item["webhookSecret"] = "********"

            logger.info(f"Updated config for {application_id}/{environment}")

            return {
                "code": 200,
                "success": True,
                "message": "Configuration updated",
                "item": item,
            }

        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                return self._error_response("ENV003", "Configuration not found")
            logger.error(f"DynamoDB error: {e}")
            return self._error_response("ENV999", f"Database error: {e}")
        except Exception as e:
            logger.error(f"Error updating config: {e}")
            return self._error_response("ENV999", f"Internal error: {e}")

    def add_allowed_origin(self, event: dict[str, Any]) -> dict[str, Any]:
        """Add an allowed origin to the configuration."""
        try:
            args = event.get("arguments", {}).get("input", {})
            application_id = args.get("applicationId")
            environment = args.get("environment")
            origin = args.get("origin")

            if not application_id:
                return self._error_response("ENV001", "applicationId is required")
            if not environment:
                return self._error_response("ENV001", "environment is required")
            if not origin:
                return self._error_response("ENV001", "origin is required")

            # Validate origin format
            if not self._validate_origin(origin, environment):
                return self._error_response("ENV004", f"Invalid origin format: {origin}")

            # Get current config to check limits
            response = self.config_table.get_item(
                Key={"applicationId": application_id, "environment": environment}
            )
            item = response.get("Item")

            if not item:
                return self._error_response("ENV003", "Configuration not found")

            current_origins = item.get("allowedOrigins", [])

            if origin in current_origins:
                return self._error_response("ENV006", "Origin already exists")

            if len(current_origins) >= MAX_ALLOWED_ORIGINS:
                return self._error_response(
                    "ENV007", f"Maximum {MAX_ALLOWED_ORIGINS} origins allowed"
                )

            now = int(datetime.now(tz=timezone.utc).timestamp())

            response = self.config_table.update_item(
                Key={"applicationId": application_id, "environment": environment},
                UpdateExpression="SET allowedOrigins = list_append(if_not_exists(allowedOrigins, :empty), :origin), updatedAt = :now",
                ExpressionAttributeValues={
                    ":origin": [origin],
                    ":empty": [],
                    ":now": now,
                },
                ReturnValues="ALL_NEW",
            )

            item = response.get("Attributes", {})
            if item.get("webhookSecret"):
                item["webhookSecret"] = "********"

            logger.info(f"Added origin {origin} to {application_id}/{environment}")

            return {
                "code": 200,
                "success": True,
                "message": f"Origin {origin} added",
                "item": item,
            }

        except Exception as e:
            logger.error(f"Error adding origin: {e}")
            return self._error_response("ENV999", f"Internal error: {e}")

    def remove_allowed_origin(self, event: dict[str, Any]) -> dict[str, Any]:
        """Remove an allowed origin from the configuration."""
        try:
            args = event.get("arguments", {}).get("input", {})
            application_id = args.get("applicationId")
            environment = args.get("environment")
            origin = args.get("origin")

            if not application_id:
                return self._error_response("ENV001", "applicationId is required")
            if not environment:
                return self._error_response("ENV001", "environment is required")
            if not origin:
                return self._error_response("ENV001", "origin is required")

            # Get current config
            response = self.config_table.get_item(
                Key={"applicationId": application_id, "environment": environment}
            )
            item = response.get("Item")

            if not item:
                return self._error_response("ENV003", "Configuration not found")

            current_origins = item.get("allowedOrigins", [])

            if origin not in current_origins:
                return self._error_response("ENV008", "Origin not found")

            # Remove the origin
            new_origins = [o for o in current_origins if o != origin]
            now = int(datetime.now(tz=timezone.utc).timestamp())

            response = self.config_table.update_item(
                Key={"applicationId": application_id, "environment": environment},
                UpdateExpression="SET allowedOrigins = :origins, updatedAt = :now",
                ExpressionAttributeValues={
                    ":origins": new_origins,
                    ":now": now,
                },
                ReturnValues="ALL_NEW",
            )

            item = response.get("Attributes", {})
            if item.get("webhookSecret"):
                item["webhookSecret"] = "********"

            logger.info(f"Removed origin {origin} from {application_id}/{environment}")

            return {
                "code": 200,
                "success": True,
                "message": f"Origin {origin} removed",
                "item": item,
            }

        except Exception as e:
            logger.error(f"Error removing origin: {e}")
            return self._error_response("ENV999", f"Internal error: {e}")

    def update_webhook_config(self, event: dict[str, Any]) -> dict[str, Any]:
        """Update webhook configuration."""
        try:
            args = event.get("arguments", {}).get("input", {})
            application_id = args.get("applicationId")
            environment = args.get("environment")

            if not application_id:
                return self._error_response("ENV001", "applicationId is required")
            if not environment:
                return self._error_response("ENV001", "environment is required")

            # Build update expression
            update_parts = []
            expr_values = {":now": int(datetime.now(tz=timezone.utc).timestamp())}

            webhook_fields = {
                "webhookUrl": "webhookUrl",
                "webhookEvents": "webhookEvents",
                "webhookEnabled": "webhookEnabled",
                "webhookMaxRetries": "webhookMaxRetries",
                "webhookRetryDelaySeconds": "webhookRetryDelaySeconds",
            }

            for arg_name, db_name in webhook_fields.items():
                if arg_name in args:
                    value = args[arg_name]
                    # Validate webhook URL
                    if arg_name == "webhookUrl" and value:
                        if not value.startswith("https://"):
                            return self._error_response("ENV009", "Webhook URL must use HTTPS")
                    update_parts.append(f"{db_name} = :{arg_name}")
                    expr_values[f":{arg_name}"] = value

            if not update_parts:
                return self._error_response("ENV001", "No webhook fields to update")

            # Generate webhook secret if enabling and no secret exists
            if args.get("webhookEnabled"):
                response = self.config_table.get_item(
                    Key={"applicationId": application_id, "environment": environment}
                )
                item = response.get("Item", {})
                if not item.get("webhookSecret"):
                    webhook_secret = secrets.token_hex(16)  # 32 chars
                    update_parts.append("webhookSecret = :secret")
                    expr_values[":secret"] = webhook_secret

            update_parts.append("updatedAt = :now")
            update_expr = "SET " + ", ".join(update_parts)

            response = self.config_table.update_item(
                Key={"applicationId": application_id, "environment": environment},
                UpdateExpression=update_expr,
                ExpressionAttributeValues=expr_values,
                ReturnValues="ALL_NEW",
                ConditionExpression="attribute_exists(applicationId)",
            )

            item = response.get("Attributes", {})
            if item.get("webhookSecret"):
                item["webhookSecret"] = "********"

            logger.info(f"Updated webhook config for {application_id}/{environment}")

            return {
                "code": 200,
                "success": True,
                "message": "Webhook configuration updated",
                "item": item,
            }

        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                return self._error_response("ENV003", "Configuration not found")
            logger.error(f"DynamoDB error: {e}")
            return self._error_response("ENV999", f"Database error: {e}")
        except Exception as e:
            logger.error(f"Error updating webhook config: {e}")
            return self._error_response("ENV999", f"Internal error: {e}")

    def regenerate_webhook_secret(self, event: dict[str, Any]) -> dict[str, Any]:
        """Regenerate the webhook secret."""
        try:
            args = event.get("arguments", {}).get("input", {})
            application_id = args.get("applicationId")
            environment = args.get("environment")

            if not application_id:
                return self._error_response("ENV001", "applicationId is required")
            if not environment:
                return self._error_response("ENV001", "environment is required")

            new_secret = secrets.token_hex(16)  # 32 chars
            now = int(datetime.now(tz=timezone.utc).timestamp())

            self.config_table.update_item(
                Key={"applicationId": application_id, "environment": environment},
                UpdateExpression="SET webhookSecret = :secret, updatedAt = :now",
                ExpressionAttributeValues={
                    ":secret": new_secret,
                    ":now": now,
                },
                ReturnValues="ALL_NEW",
                ConditionExpression="attribute_exists(applicationId)",
            )

            logger.info(f"Regenerated webhook secret for {application_id}/{environment}")

            # Return the new secret ONCE
            return {
                "code": 200,
                "success": True,
                "message": "Webhook secret regenerated. Save this secret - it cannot be retrieved again.",
                "webhookSecret": new_secret,
            }

        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                return self._error_response("ENV003", "Configuration not found")
            logger.error(f"DynamoDB error: {e}")
            return self._error_response("ENV999", f"Database error: {e}")
        except Exception as e:
            logger.error(f"Error regenerating webhook secret: {e}")
            return self._error_response("ENV999", f"Internal error: {e}")

    def set_feature_flag(self, event: dict[str, Any]) -> dict[str, Any]:
        """Set a feature flag value."""
        try:
            args = event.get("arguments", {}).get("input", {})
            application_id = args.get("applicationId")
            environment = args.get("environment")
            key = args.get("key")
            value = args.get("value")

            if not application_id:
                return self._error_response("ENV001", "applicationId is required")
            if not environment:
                return self._error_response("ENV001", "environment is required")
            if not key:
                return self._error_response("ENV001", "key is required")
            if value is None:
                return self._error_response("ENV001", "value is required")

            # Validate key format (snake_case)
            if not re.match(r"^[a-z][a-z0-9_]*$", key):
                return self._error_response(
                    "ENV010", "Feature flag key must be snake_case (e.g., my_feature)"
                )

            # Get current config to check limits
            response = self.config_table.get_item(
                Key={"applicationId": application_id, "environment": environment}
            )
            item = response.get("Item")

            if not item:
                return self._error_response("ENV003", "Configuration not found")

            current_flags = item.get("featureFlags", {})

            if key not in current_flags and len(current_flags) >= MAX_FEATURE_FLAGS:
                return self._error_response(
                    "ENV011", f"Maximum {MAX_FEATURE_FLAGS} feature flags allowed"
                )

            now = int(datetime.now(tz=timezone.utc).timestamp())

            # Update the specific flag
            response = self.config_table.update_item(
                Key={"applicationId": application_id, "environment": environment},
                UpdateExpression="SET featureFlags.#key = :value, updatedAt = :now",
                ExpressionAttributeNames={"#key": key},
                ExpressionAttributeValues={
                    ":value": value,
                    ":now": now,
                },
                ReturnValues="ALL_NEW",
            )

            item = response.get("Attributes", {})
            if item.get("webhookSecret"):
                item["webhookSecret"] = "********"

            logger.info(f"Set feature flag {key}={value} for {application_id}/{environment}")

            return {
                "code": 200,
                "success": True,
                "message": f"Feature flag {key} set",
                "item": item,
            }

        except Exception as e:
            logger.error(f"Error setting feature flag: {e}")
            return self._error_response("ENV999", f"Internal error: {e}")

    def delete_feature_flag(self, event: dict[str, Any]) -> dict[str, Any]:
        """Delete a feature flag."""
        try:
            args = event.get("arguments", {}).get("input", {})
            application_id = args.get("applicationId")
            environment = args.get("environment")
            key = args.get("key")

            if not application_id:
                return self._error_response("ENV001", "applicationId is required")
            if not environment:
                return self._error_response("ENV001", "environment is required")
            if not key:
                return self._error_response("ENV001", "key is required")

            now = int(datetime.now(tz=timezone.utc).timestamp())

            response = self.config_table.update_item(
                Key={"applicationId": application_id, "environment": environment},
                UpdateExpression="REMOVE featureFlags.#key SET updatedAt = :now",
                ExpressionAttributeNames={"#key": key},
                ExpressionAttributeValues={":now": now},
                ReturnValues="ALL_NEW",
                ConditionExpression="attribute_exists(applicationId)",
            )

            item = response.get("Attributes", {})
            if item.get("webhookSecret"):
                item["webhookSecret"] = "********"

            logger.info(f"Deleted feature flag {key} from {application_id}/{environment}")

            return {
                "code": 200,
                "success": True,
                "message": f"Feature flag {key} deleted",
                "item": item,
            }

        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                return self._error_response("ENV003", "Configuration not found")
            logger.error(f"DynamoDB error: {e}")
            return self._error_response("ENV999", f"Database error: {e}")
        except Exception as e:
            logger.error(f"Error deleting feature flag: {e}")
            return self._error_response("ENV999", f"Internal error: {e}")

    def _validate_origin(self, origin: str, environment: str) -> bool:
        """Validate an origin URL.

        Supports:
        - Standard URLs: https://example.com
        - Wildcard subdomains: https://*.example.com
        - Localhost (only for DEVELOPMENT/TEST): http://localhost:3000
        """
        if not origin:
            return False

        # Check localhost
        if LOCALHOST_PATTERN.match(origin):
            return environment in LOCALHOST_ALLOWED_ENVS

        # Check standard origin pattern
        return bool(ORIGIN_PATTERN.match(origin))

    def _error_response(self, code: str, message: str) -> dict[str, Any]:
        """Generate standardized error response."""
        return {
            "code": 400,
            "success": False,
            "message": f"[{code}] {message}",
            "item": None,
        }


# Lambda handler
def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Main Lambda handler for ApplicationEnvironmentConfig GraphQL operations."""
    try:
        logger.info(f"EnvironmentConfig resolver invoked with event: {json.dumps(event)}")

        service = EnvironmentConfigService()

        # Extract operation type from event
        field_name = event.get("info", {}).get("fieldName")

        # Route to appropriate method based on GraphQL field
        handlers = {
            # Queries
            "ApplicationEnvironmentConfigGet": service.get_config,
            "ApplicationEnvironmentConfigGetByBoth": service.get_config,
            # Mutations
            "ApplicationEnvironmentConfigCreate": service.create_config,
            "ApplicationEnvironmentConfigUpdate": service.update_config,
            "ApplicationEnvironmentConfigAddOrigin": service.add_allowed_origin,
            "ApplicationEnvironmentConfigRemoveOrigin": service.remove_allowed_origin,
            "ApplicationEnvironmentConfigUpdateWebhook": service.update_webhook_config,
            "ApplicationEnvironmentConfigRegenerateWebhookSecret": service.regenerate_webhook_secret,
            "ApplicationEnvironmentConfigSetFeatureFlag": service.set_feature_flag,
            "ApplicationEnvironmentConfigDeleteFeatureFlag": service.delete_feature_flag,
        }

        handler = handlers.get(field_name)
        if handler:
            return handler(event)

        return {
            "code": 400,
            "success": False,
            "message": f"Unknown operation: {field_name}",
        }

    except Exception as e:
        logger.error(f"Unhandled error in EnvironmentConfig resolver: {e}")
        return {
            "code": 500,
            "success": False,
            "message": "Internal server error",
        }
