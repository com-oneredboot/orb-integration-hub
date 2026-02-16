# file: apps/api/lambdas/application_user_roles/index.py
# author: AI Assistant
# created: 2026-01-27
# description: Lambda resolver for ApplicationUserRoles GraphQL operations
# Feature: application-access-management, Task 4.3

"""
ApplicationUserRoles Lambda Resolver

Provides direct role assignment operations for users per environment:
- Assign roles directly to users for specific environments
- Remove direct role assignments
- List user roles by environment
- Support multiple roles per user per environment
"""

import json
import logging
import os
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


class ApplicationUserRoleService:
    """Service for managing direct user role assignments per environment."""

    def __init__(self) -> None:
        self.dynamodb = boto3.resource("dynamodb")
        self.user_roles_table = self.dynamodb.Table(
            os.environ.get(
                "APPLICATION_USER_ROLES_TABLE", "orb-integration-hub-dev-application-user-roles"
            )
        )
        self.users_table = self.dynamodb.Table(
            os.environ.get("USERS_TABLE", "orb-integration-hub-dev-users")
        )
        self.roles_table = self.dynamodb.Table(
            os.environ.get("ROLES_TABLE", "orb-integration-hub-dev-roles")
        )
        self.applications_table = self.dynamodb.Table(
            os.environ.get("APPLICATIONS_TABLE", "orb-integration-hub-dev-applications")
        )

    def assign_role_to_user(self, event: dict[str, Any]) -> dict[str, Any]:
        """Assign a role directly to a user for a specific environment.

        Supports multiple roles per user per environment.
        Direct role assignments take priority over group-inherited roles.
        """
        try:
            args = event.get("arguments", {}).get("input", {})
            user_id = args.get("userId")
            application_id = args.get("applicationId")
            environment = args.get("environment")
            role_id = args.get("roleId")
            role_name = args.get("roleName", "")
            permissions = args.get("permissions", [])

            # Validate required fields
            if not user_id:
                return self._error_response("AAM004", "userId is required")
            if not application_id:
                return self._error_response("AAM002", "applicationId is required")
            if not environment:
                return self._error_response("AAM006", "environment is required")
            if not role_id:
                return self._error_response("AAM005", "roleId is required")

            # Validate environment
            if environment not in VALID_ENVIRONMENTS:
                return self._error_response(
                    "AAM006",
                    f"Invalid environment. Must be one of: {', '.join(VALID_ENVIRONMENTS)}",
                )

            # Check if this exact role assignment already exists
            existing = self._get_user_role(user_id, application_id, environment, role_id)
            if existing and existing.get("status") == "ACTIVE":
                return self._error_response(
                    "AAM004",
                    "User already has this role assigned for this environment",
                )

            # Generate role assignment ID
            role_assignment_id = str(uuid.uuid4())
            now = int(datetime.now(tz=timezone.utc).timestamp())

            role_data = {
                "applicationUserRoleId": role_assignment_id,
                "userId": user_id,
                "applicationId": application_id,
                "environment": environment,
                "roleId": role_id,
                "roleName": role_name,
                "permissions": permissions,
                "status": "ACTIVE",
                "createdAt": now,
                "updatedAt": now,
            }

            # Write to DynamoDB
            self.user_roles_table.put_item(
                Item=role_data,
                ConditionExpression="attribute_not_exists(applicationUserRoleId)",
            )

            # Sync roleCount on Applications table
            self._increment_application_role_count(application_id)

            logger.info(f"Assigned role {role_id} to user {user_id} for environment {environment}")

            return {
                "code": 200,
                "success": True,
                "message": "Role assigned to user successfully",
                "item": role_data,
            }

        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                return self._error_response("AAM004", "Role assignment ID already exists")
            logger.error(f"DynamoDB error assigning role to user: {e}")
            return self._error_response("AAM004", f"Database error: {e}")
        except Exception as e:
            logger.error(f"Error assigning role to user: {e}")
            return self._error_response("AAM004", f"Internal error: {e}")

    def remove_user_role(self, event: dict[str, Any]) -> dict[str, Any]:
        """Remove a direct role assignment from a user (soft delete)."""
        try:
            args = event.get("arguments", {}).get("input", {})
            role_assignment_id = args.get("applicationUserRoleId")
            user_id = args.get("userId")
            application_id = args.get("applicationId")
            environment = args.get("environment")
            role_id = args.get("roleId")

            # Can remove by ID or by user+app+env+role combination
            if role_assignment_id:
                existing = self._get_role_assignment(role_assignment_id)
            elif user_id and application_id and environment and role_id:
                existing = self._get_user_role(user_id, application_id, environment, role_id)
            else:
                return self._error_response(
                    "AAM004",
                    "Either applicationUserRoleId or userId+applicationId+environment+roleId required",
                )

            if not existing:
                return self._error_response("AAM004", "Role assignment not found")

            if existing.get("status") == "DELETED":
                return self._error_response("AAM004", "Role assignment already deleted")

            actual_id = existing["applicationUserRoleId"]
            actual_application_id = existing.get("applicationId")
            now = int(datetime.now(tz=timezone.utc).timestamp())

            # Soft delete
            response = self.user_roles_table.update_item(
                Key={"applicationUserRoleId": actual_id},
                UpdateExpression="SET #status = :deleted, updatedAt = :updatedAt",
                ExpressionAttributeNames={"#status": "status"},
                ExpressionAttributeValues={
                    ":deleted": "DELETED",
                    ":updatedAt": now,
                },
                ReturnValues="ALL_NEW",
                ConditionExpression="attribute_exists(applicationUserRoleId) AND #status <> :deleted",
            )

            # Sync roleCount on Applications table
            if actual_application_id:
                self._decrement_application_role_count(actual_application_id)

            logger.info(f"Removed role assignment {actual_id}")

            return {
                "code": 200,
                "success": True,
                "message": "Role assignment removed successfully",
                "item": response["Attributes"],
            }

        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                return self._error_response(
                    "AAM004", "Role assignment not found or already deleted"
                )
            logger.error(f"DynamoDB error removing role assignment: {e}")
            return self._error_response("AAM004", f"Database error: {e}")
        except Exception as e:
            logger.error(f"Error removing role assignment: {e}")
            return self._error_response("AAM004", f"Internal error: {e}")

    def get_user_roles(self, event: dict[str, Any]) -> dict[str, Any]:
        """Get all direct role assignments for a user."""
        try:
            args = event.get("arguments", {})
            user_id = args.get("userId")
            environment = args.get("environment")
            application_id = args.get("applicationId")
            status_filter = args.get("status", "ACTIVE")
            limit = args.get("limit", 50)
            next_token = args.get("nextToken")

            if not user_id:
                return self._error_response("AAM004", "userId is required")

            # Build query
            query_params: dict[str, Any] = {
                "IndexName": "UserEnvRoleIndex",
                "Limit": limit,
            }

            if environment:
                # Query for specific environment
                query_params["KeyConditionExpression"] = Key("userId").eq(user_id) & Key(
                    "environment"
                ).eq(environment)
            else:
                # Query all environments for this user
                query_params["KeyConditionExpression"] = Key("userId").eq(user_id)

            # Add filters
            filter_conditions = [Attr("status").eq(status_filter)]
            if application_id:
                filter_conditions.append(Attr("applicationId").eq(application_id))

            if len(filter_conditions) == 1:
                query_params["FilterExpression"] = filter_conditions[0]
            else:
                query_params["FilterExpression"] = filter_conditions[0] & filter_conditions[1]

            if next_token:
                query_params["ExclusiveStartKey"] = json.loads(next_token)

            response = self.user_roles_table.query(**query_params)

            result: dict[str, Any] = {
                "code": 200,
                "success": True,
                "items": response.get("Items", []),
            }

            if "LastEvaluatedKey" in response:
                result["nextToken"] = json.dumps(response["LastEvaluatedKey"])

            return result

        except Exception as e:
            logger.error(f"Error getting user roles: {e}")
            return self._error_response("AAM004", f"Internal error: {e}")

    def list_roles_by_application_environment(self, event: dict[str, Any]) -> dict[str, Any]:
        """List all direct user role assignments for an application in a specific environment."""
        try:
            args = event.get("arguments", {})
            application_id = args.get("applicationId")
            environment = args.get("environment")
            status_filter = args.get("status", "ACTIVE")
            limit = args.get("limit", 50)
            next_token = args.get("nextToken")

            if not application_id:
                return self._error_response("AAM002", "applicationId is required")
            if not environment:
                return self._error_response("AAM006", "environment is required")

            # Query using AppEnvUserIndex
            query_params: dict[str, Any] = {
                "IndexName": "AppEnvUserIndex",
                "KeyConditionExpression": Key("applicationId").eq(application_id)
                & Key("environment").eq(environment),
                "FilterExpression": Attr("status").eq(status_filter),
                "Limit": limit,
            }

            if next_token:
                query_params["ExclusiveStartKey"] = json.loads(next_token)

            response = self.user_roles_table.query(**query_params)

            result: dict[str, Any] = {
                "code": 200,
                "success": True,
                "items": response.get("Items", []),
            }

            if "LastEvaluatedKey" in response:
                result["nextToken"] = json.dumps(response["LastEvaluatedKey"])

            return result

        except Exception as e:
            logger.error(f"Error listing roles by application environment: {e}")
            return self._error_response("AAM004", f"Internal error: {e}")

    def _get_role_assignment(self, role_assignment_id: str) -> dict[str, Any] | None:
        """Get a role assignment by ID."""
        try:
            response = self.user_roles_table.get_item(
                Key={"applicationUserRoleId": role_assignment_id}
            )
            return response.get("Item")
        except Exception as e:
            logger.error(f"Error getting role assignment {role_assignment_id}: {e}")
            return None

    def _get_user_role(
        self, user_id: str, application_id: str, environment: str, role_id: str
    ) -> dict[str, Any] | None:
        """Get an active role assignment for a user in a specific environment with a specific role."""
        try:
            response = self.user_roles_table.query(
                IndexName="UserEnvRoleIndex",
                KeyConditionExpression=Key("userId").eq(user_id)
                & Key("environment").eq(environment),
                FilterExpression=Attr("status").eq("ACTIVE")
                & Attr("applicationId").eq(application_id)
                & Attr("roleId").eq(role_id),
            )
            items = response.get("Items", [])
            return items[0] if items else None
        except Exception as e:
            logger.error(f"Error getting user role: {e}")
            return None

    def _error_response(self, code: str, message: str) -> dict[str, Any]:
        """Generate standardized error response."""
        return {
            "code": 400,
            "success": False,
            "message": f"[{code}] {message}",
            "item": None,
        }

    def _increment_application_role_count(self, application_id: str) -> None:
        """Increment the roleCount on the Applications table."""
        try:
            self.applications_table.update_item(
                Key={"applicationId": application_id},
                UpdateExpression="SET roleCount = if_not_exists(roleCount, :zero) + :one, updatedAt = :now",
                ExpressionAttributeValues={
                    ":zero": 0,
                    ":one": 1,
                    ":now": int(datetime.now(tz=timezone.utc).timestamp()),
                },
            )
        except Exception as e:
            logger.error(f"Error incrementing application role count: {e}")

    def _decrement_application_role_count(self, application_id: str) -> None:
        """Decrement the roleCount on the Applications table."""
        try:
            self.applications_table.update_item(
                Key={"applicationId": application_id},
                UpdateExpression="SET roleCount = roleCount - :one, updatedAt = :now",
                ConditionExpression="roleCount > :zero",
                ExpressionAttributeValues={
                    ":one": 1,
                    ":zero": 0,
                    ":now": int(datetime.now(tz=timezone.utc).timestamp()),
                },
            )
        except Exception as e:
            logger.error(f"Error decrementing application role count: {e}")


# Lambda handler
def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Main Lambda handler for ApplicationUserRoles GraphQL operations."""
    try:
        logger.info(f"ApplicationUserRoles resolver invoked with event: {json.dumps(event)}")

        service = ApplicationUserRoleService()

        # Extract operation type from event
        field_name = event.get("info", {}).get("fieldName")

        # Route to appropriate method based on GraphQL field
        handlers = {
            "ApplicationUserRolesCreate": service.assign_role_to_user,
            "ApplicationUserRolesDelete": service.remove_user_role,
            "ApplicationUserRolesListByUserId": service.get_user_roles,
            "ApplicationUserRolesListByApplicationIdAndEnvironment": service.list_roles_by_application_environment,
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
        logger.error(f"Unhandled error in ApplicationUserRoles resolver: {e}")
        return {
            "code": 500,
            "success": False,
            "message": "Internal server error",
        }
