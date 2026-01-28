# file: apps/api/lambdas/application_api_keys/index.py
# author: AI Assistant
# created: 2026-01-27
# description: Lambda resolver for ApplicationApiKeys GraphQL operations
# Feature: application-access-management, Task 12.1

"""
ApplicationApiKeys Lambda Resolver

Provides API key management operations:
- Generate new API keys with secure random generation
- Validate API keys (hash lookup)
- Rotate keys (dual validity during rotation)
- Revoke keys immediately
- Key format: orb_{env}_{random32chars}
- Only hash stored in database (never the plaintext key)

Properties validated:
- Property 8: API Key Uniqueness
- Property 9: API Key Validation Round-Trip
- Property 10: API Key Revocation Enforcement
- Property 11: API Key Rotation Dual Validity
"""

import hashlib
import json
import logging
import os
import secrets
import uuid
from datetime import datetime, timezone
from typing import Any

import boto3
from boto3.dynamodb.conditions import Attr, Key
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Valid environments
VALID_ENVIRONMENTS = {"PRODUCTION", "STAGING", "DEVELOPMENT", "TEST", "PREVIEW"}

# Environment prefixes for key format
ENV_PREFIXES = {
    "PRODUCTION": "prod",
    "STAGING": "stag",
    "DEVELOPMENT": "dev",
    "TEST": "test",
    "PREVIEW": "prev",
}


class ApiKeyService:
    """Service for managing application API keys."""

    def __init__(self) -> None:
        self.dynamodb = boto3.resource("dynamodb")
        self.api_keys_table = self.dynamodb.Table(
            os.environ.get(
                "APPLICATION_API_KEYS_TABLE", "orb-integration-hub-dev-application-api-keys"
            )
        )
        self.applications_table = self.dynamodb.Table(
            os.environ.get("APPLICATIONS_TABLE", "orb-integration-hub-dev-applications")
        )

    def generate_key(self, event: dict[str, Any]) -> dict[str, Any]:
        """Generate a new API key for an application environment.

        Key format: orb_{env}_{random32chars}
        Example: orb_dev_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

        Only the hash is stored in the database. The plaintext key is returned
        ONCE and must be saved by the caller.

        Implements Property 8: API Key Uniqueness
        """
        try:
            args = event.get("arguments", {}).get("input", {})
            application_id = args.get("applicationId")
            organization_id = args.get("organizationId")
            environment = args.get("environment")
            expires_at = args.get("expiresAt")

            # Validate required fields
            if not application_id:
                return self._error_response("AAM002", "applicationId is required")
            if not organization_id:
                return self._error_response("AAM002", "organizationId is required")
            if not environment:
                return self._error_response("AAM006", "environment is required")

            # Validate environment
            if environment not in VALID_ENVIRONMENTS:
                return self._error_response(
                    "AAM006",
                    f"Invalid environment. Must be one of: {', '.join(VALID_ENVIRONMENTS)}",
                )

            # Check if an active key already exists for this app+env
            existing = self._get_active_key(application_id, environment)
            if existing:
                return self._error_response(
                    "AAM008",
                    f"An active API key already exists for this application in {environment}. "
                    "Use rotate or revoke first.",
                )

            # Generate the key
            env_prefix = ENV_PREFIXES.get(environment, "unk")
            random_part = secrets.token_hex(16)  # 32 hex chars
            plaintext_key = f"orb_{env_prefix}_{random_part}"

            # Hash the key for storage
            key_hash = self._hash_key(plaintext_key)

            # Key prefix for display (first 12 chars)
            key_prefix = plaintext_key[:12]

            # Generate record ID
            key_id = str(uuid.uuid4())
            now = int(datetime.now(tz=timezone.utc).timestamp())

            key_data = {
                "applicationApiKeyId": key_id,
                "applicationId": application_id,
                "organizationId": organization_id,
                "environment": environment,
                "keyHash": key_hash,
                "keyPrefix": key_prefix,
                "status": "ACTIVE",
                "createdAt": now,
                "updatedAt": now,
            }

            if expires_at:
                key_data["expiresAt"] = expires_at

            # Write to DynamoDB
            self.api_keys_table.put_item(
                Item=key_data,
                ConditionExpression="attribute_not_exists(applicationApiKeyId)",
            )

            logger.info(f"Generated API key {key_id} for app {application_id} env {environment}")

            # Return the plaintext key ONCE - it cannot be retrieved again
            return {
                "code": 200,
                "success": True,
                "message": "API key generated successfully. Save this key - it cannot be retrieved again.",
                "item": {
                    "applicationApiKeyId": key_id,
                    "applicationId": application_id,
                    "environment": environment,
                    "keyPrefix": key_prefix,
                    "key": plaintext_key,  # Only returned on creation!
                    "status": "ACTIVE",
                    "createdAt": now,
                },
            }

        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                return self._error_response("AAM008", "Key ID already exists")
            logger.error(f"DynamoDB error generating key: {e}")
            return self._error_response("AAM008", f"Database error: {e}")
        except Exception as e:
            logger.error(f"Error generating key: {e}")
            return self._error_response("AAM008", f"Internal error: {e}")

    def validate_key(self, event: dict[str, Any]) -> dict[str, Any]:
        """Validate an API key and return context.

        Used by Lambda authorizer to validate incoming API keys.

        Implements Property 9: API Key Validation Round-Trip
        """
        try:
            args = event.get("arguments", {})
            key = args.get("key")

            if not key:
                return self._error_response("AAM008", "key is required")

            # Hash the incoming key
            key_hash = self._hash_key(key)

            # Look up by hash
            response = self.api_keys_table.query(
                IndexName="KeyLookupIndex",
                KeyConditionExpression=Key("keyHash").eq(key_hash),
            )

            items = response.get("Items", [])

            if not items:
                # Check if it might be a "next" key during rotation
                return self._check_rotation_key(key_hash)

            key_record = items[0]
            status = key_record.get("status")

            # Check status
            if status == "REVOKED":
                return self._error_response("AAM010", "API key has been revoked")

            if status == "EXPIRED":
                return self._error_response("AAM009", "API key has expired")

            # Check expiration
            expires_at = key_record.get("expiresAt")
            if expires_at:
                now = int(datetime.now(tz=timezone.utc).timestamp())
                if now > expires_at:
                    # Mark as expired
                    self._mark_key_expired(key_record["applicationApiKeyId"])
                    return self._error_response("AAM009", "API key has expired")

            # Update last used timestamp
            self._update_last_used(key_record["applicationApiKeyId"])

            # Return context
            return {
                "code": 200,
                "success": True,
                "item": {
                    "applicationApiKeyId": key_record.get("applicationApiKeyId"),
                    "applicationId": key_record.get("applicationId"),
                    "organizationId": key_record.get("organizationId"),
                    "environment": key_record.get("environment"),
                    "status": status,
                    "valid": True,
                },
            }

        except Exception as e:
            logger.error(f"Error validating key: {e}")
            return self._error_response("AAM008", f"Internal error: {e}")

    def rotate_key(self, event: dict[str, Any]) -> dict[str, Any]:
        """Rotate an API key.

        Creates a new key and stores its hash in nextKeyHash.
        Both the current key and the new key are valid during rotation.

        Implements Property 11: API Key Rotation Dual Validity
        """
        try:
            args = event.get("arguments", {}).get("input", {})
            application_id = args.get("applicationId")
            environment = args.get("environment")

            if not application_id:
                return self._error_response("AAM002", "applicationId is required")
            if not environment:
                return self._error_response("AAM006", "environment is required")

            # Get current active key
            current_key = self._get_active_key(application_id, environment)
            if not current_key:
                return self._error_response(
                    "AAM008", "No active API key found for this application/environment"
                )

            # Generate new key
            env_prefix = ENV_PREFIXES.get(environment, "unk")
            random_part = secrets.token_hex(16)
            new_plaintext_key = f"orb_{env_prefix}_{random_part}"
            new_key_hash = self._hash_key(new_plaintext_key)
            new_key_prefix = new_plaintext_key[:12]

            now = int(datetime.now(tz=timezone.utc).timestamp())

            # Update the record with new key hash and ROTATING status
            self.api_keys_table.update_item(
                Key={"applicationApiKeyId": current_key["applicationApiKeyId"]},
                UpdateExpression="SET nextKeyHash = :nextHash, #status = :rotating, "
                "updatedAt = :now",
                ExpressionAttributeNames={"#status": "status"},
                ExpressionAttributeValues={
                    ":nextHash": new_key_hash,
                    ":rotating": "ROTATING",
                    ":now": now,
                },
            )

            logger.info(
                f"Rotating API key {current_key['applicationApiKeyId']} for app {application_id}"
            )

            return {
                "code": 200,
                "success": True,
                "message": "API key rotation started. Both old and new keys are now valid. "
                "Save the new key - it cannot be retrieved again.",
                "item": {
                    "applicationApiKeyId": current_key["applicationApiKeyId"],
                    "applicationId": application_id,
                    "environment": environment,
                    "oldKeyPrefix": current_key.get("keyPrefix"),
                    "newKeyPrefix": new_key_prefix,
                    "newKey": new_plaintext_key,  # Only returned on rotation!
                    "status": "ROTATING",
                },
            }

        except Exception as e:
            logger.error(f"Error rotating key: {e}")
            return self._error_response("AAM008", f"Internal error: {e}")

    def complete_rotation(self, event: dict[str, Any]) -> dict[str, Any]:
        """Complete a key rotation by making the new key the primary key.

        After this, only the new key is valid.
        """
        try:
            args = event.get("arguments", {}).get("input", {})
            key_id = args.get("applicationApiKeyId")

            if not key_id:
                return self._error_response("AAM008", "applicationApiKeyId is required")

            # Get the key record
            response = self.api_keys_table.get_item(Key={"applicationApiKeyId": key_id})
            key_record = response.get("Item")

            if not key_record:
                return self._error_response("AAM008", "API key not found")

            if key_record.get("status") != "ROTATING":
                return self._error_response("AAM008", "Key is not in ROTATING status")

            next_key_hash = key_record.get("nextKeyHash")
            if not next_key_hash:
                return self._error_response(
                    "AAM008", "No next key hash found - rotation not started"
                )

            now = int(datetime.now(tz=timezone.utc).timestamp())

            # Swap the keys - new key becomes primary
            self.api_keys_table.update_item(
                Key={"applicationApiKeyId": key_id},
                UpdateExpression="SET keyHash = :newHash, #status = :active, "
                "updatedAt = :now REMOVE nextKeyHash",
                ExpressionAttributeNames={"#status": "status"},
                ExpressionAttributeValues={
                    ":newHash": next_key_hash,
                    ":active": "ACTIVE",
                    ":now": now,
                },
            )

            logger.info(f"Completed rotation for API key {key_id}")

            return {
                "code": 200,
                "success": True,
                "message": "Key rotation completed. Only the new key is now valid.",
                "item": {
                    "applicationApiKeyId": key_id,
                    "status": "ACTIVE",
                },
            }

        except Exception as e:
            logger.error(f"Error completing rotation: {e}")
            return self._error_response("AAM008", f"Internal error: {e}")

    def revoke_key(self, event: dict[str, Any]) -> dict[str, Any]:
        """Revoke an API key immediately.

        Implements Property 10: API Key Revocation Enforcement
        """
        try:
            args = event.get("arguments", {}).get("input", {})
            key_id = args.get("applicationApiKeyId")
            application_id = args.get("applicationId")
            environment = args.get("environment")

            # Can revoke by ID or by app+env
            if key_id:
                key_record = self._get_key_by_id(key_id)
            elif application_id and environment:
                key_record = self._get_active_key(application_id, environment)
            else:
                return self._error_response(
                    "AAM008",
                    "Either applicationApiKeyId or applicationId+environment required",
                )

            if not key_record:
                return self._error_response("AAM008", "API key not found")

            if key_record.get("status") == "REVOKED":
                return self._error_response("AAM008", "API key already revoked")

            actual_key_id = key_record["applicationApiKeyId"]
            now = int(datetime.now(tz=timezone.utc).timestamp())

            # Revoke the key
            self.api_keys_table.update_item(
                Key={"applicationApiKeyId": actual_key_id},
                UpdateExpression="SET #status = :revoked, updatedAt = :now",
                ExpressionAttributeNames={"#status": "status"},
                ExpressionAttributeValues={
                    ":revoked": "REVOKED",
                    ":now": now,
                },
            )

            logger.info(f"Revoked API key {actual_key_id}")

            return {
                "code": 200,
                "success": True,
                "message": "API key revoked successfully",
                "item": {
                    "applicationApiKeyId": actual_key_id,
                    "status": "REVOKED",
                },
            }

        except Exception as e:
            logger.error(f"Error revoking key: {e}")
            return self._error_response("AAM008", f"Internal error: {e}")

    def list_keys(self, event: dict[str, Any]) -> dict[str, Any]:
        """List API keys for an application."""
        try:
            args = event.get("arguments", {})
            application_id = args.get("applicationId")
            environment = args.get("environment")
            limit = args.get("limit", 50)
            next_token = args.get("nextToken")

            if not application_id:
                return self._error_response("AAM002", "applicationId is required")

            query_params: dict[str, Any] = {
                "IndexName": "AppEnvKeyIndex",
                "Limit": limit,
            }

            if environment:
                query_params["KeyConditionExpression"] = Key("applicationId").eq(
                    application_id
                ) & Key("environment").eq(environment)
            else:
                query_params["KeyConditionExpression"] = Key("applicationId").eq(application_id)

            if next_token:
                query_params["ExclusiveStartKey"] = json.loads(next_token)

            response = self.api_keys_table.query(**query_params)

            # Remove sensitive fields from response
            items = []
            for item in response.get("Items", []):
                items.append(
                    {
                        "applicationApiKeyId": item.get("applicationApiKeyId"),
                        "applicationId": item.get("applicationId"),
                        "environment": item.get("environment"),
                        "keyPrefix": item.get("keyPrefix"),
                        "status": item.get("status"),
                        "lastUsedAt": item.get("lastUsedAt"),
                        "expiresAt": item.get("expiresAt"),
                        "createdAt": item.get("createdAt"),
                    }
                )

            result: dict[str, Any] = {
                "code": 200,
                "success": True,
                "items": items,
            }

            if "LastEvaluatedKey" in response:
                result["nextToken"] = json.dumps(response["LastEvaluatedKey"])

            return result

        except Exception as e:
            logger.error(f"Error listing keys: {e}")
            return self._error_response("AAM008", f"Internal error: {e}")

    def _hash_key(self, key: str) -> str:
        """Hash an API key using SHA-256."""
        return hashlib.sha256(key.encode()).hexdigest()

    def _get_active_key(self, application_id: str, environment: str) -> dict[str, Any] | None:
        """Get the active API key for an application/environment."""
        try:
            response = self.api_keys_table.query(
                IndexName="AppEnvKeyIndex",
                KeyConditionExpression=Key("applicationId").eq(application_id)
                & Key("environment").eq(environment),
                FilterExpression=Attr("status").is_in(["ACTIVE", "ROTATING"]),
            )
            items = response.get("Items", [])
            return items[0] if items else None
        except Exception as e:
            logger.error(f"Error getting active key: {e}")
            return None

    def _get_key_by_id(self, key_id: str) -> dict[str, Any] | None:
        """Get an API key by ID."""
        try:
            response = self.api_keys_table.get_item(Key={"applicationApiKeyId": key_id})
            return response.get("Item")
        except Exception as e:
            logger.error(f"Error getting key by ID: {e}")
            return None

    def _check_rotation_key(self, key_hash: str) -> dict[str, Any]:
        """Check if a key hash matches a nextKeyHash during rotation."""
        try:
            # Scan for keys in ROTATING status with matching nextKeyHash
            # Note: In production, consider a GSI on nextKeyHash for efficiency
            response = self.api_keys_table.scan(
                FilterExpression=Attr("status").eq("ROTATING") & Attr("nextKeyHash").eq(key_hash),
            )

            items = response.get("Items", [])
            if items:
                key_record = items[0]
                # Update last used
                self._update_last_used(key_record["applicationApiKeyId"])

                return {
                    "code": 200,
                    "success": True,
                    "item": {
                        "applicationApiKeyId": key_record.get("applicationApiKeyId"),
                        "applicationId": key_record.get("applicationId"),
                        "organizationId": key_record.get("organizationId"),
                        "environment": key_record.get("environment"),
                        "status": "ROTATING",
                        "valid": True,
                        "isRotationKey": True,
                    },
                }

            return self._error_response("AAM008", "Invalid API key")

        except Exception as e:
            logger.error(f"Error checking rotation key: {e}")
            return self._error_response("AAM008", "Invalid API key")

    def _update_last_used(self, key_id: str) -> None:
        """Update the lastUsedAt timestamp for a key."""
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
    """Main Lambda handler for ApplicationApiKeys GraphQL operations."""
    try:
        logger.info(f"ApplicationApiKeys resolver invoked with event: {json.dumps(event)}")

        service = ApiKeyService()

        # Extract operation type from event
        field_name = event.get("info", {}).get("fieldName")

        # Route to appropriate method based on GraphQL field
        handlers = {
            "ApplicationApiKeysGenerate": service.generate_key,
            "ApplicationApiKeysValidate": service.validate_key,
            "ApplicationApiKeysRotate": service.rotate_key,
            "ApplicationApiKeysCompleteRotation": service.complete_rotation,
            "ApplicationApiKeysRevoke": service.revoke_key,
            "ApplicationApiKeysList": service.list_keys,
            "ApplicationApiKeysListByApplicationId": service.list_keys,
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
        logger.error(f"Unhandled error in ApplicationApiKeys resolver: {e}")
        return {
            "code": 500,
            "success": False,
            "message": "Internal server error",
        }
