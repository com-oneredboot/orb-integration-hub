# file: apps/api/lambdas/application_group_roles/index.py
# author: AI Assistant
# created: 2026-01-27
# description: Lambda resolver for ApplicationGroupRoles GraphQL operations
# Feature: application-access-management, Task 4.1

"""
ApplicationGroupRoles Lambda Resolver

Provides role assignment operations for application groups per environment:
- Assign roles to groups for specific environments
- Update group role assignments
- Remove group role assignments
- List group roles by environment
- Support different roles per environment (Property 7)
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


class ApplicationGroupRoleService:
    """Service for managing group role assignments per environment."""

    def __init__(self) -> None:
        self.dynamodb = boto3.resource("dynamodb")
        self.group_roles_table = self.dynamodb.Table(
            os.environ.get(
                "APPLICATION_GROUP_ROLES_TABLE", "orb-integration-hub-dev-application-group-roles"
            )
        )
        self.groups_table = self.dynamodb.Table(
            os.environ.get("APPLICATION_GROUPS_TABLE", "orb-integration-hub-dev-application-groups")
        )
        self.roles_table = self.dynamodb.Table(
            os.environ.get("ROLES_TABLE", "orb-integration-hub-dev-roles")
        )

    def assign_role_to_group(self, event: dict[str, Any]) -> dict[str, Any]:
        """Assign a role to a group for a specific environment.

        Enforces:
        - Group must exist and be ACTIVE
        - Environment must be valid
        - Only one role per group per environment (updates existing if present)
        """
        try:
            args = event.get("arguments", {}).get("input", {})
            group_id = args.get("applicationGroupId")
            application_id = args.get("applicationId")
            environment = args.get("environment")
            role_id = args.get("roleId")
            role_name = args.get("roleName", "")
            permissions = args.get("permissions", [])

            # Validate required fields
            if not group_id:
                return self._error_response("AAM002", "applicationGroupId is required")
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

            # Verify group exists and is active
            group = self._get_group(group_id)
            if not group:
                return self._error_response("AAM002", "Group not found")
            if group.get("status") != "ACTIVE":
                return self._error_response("AAM002", "Cannot assign role to inactive group")

            # Use application_id from group if not provided
            if not application_id:
                application_id = group.get("applicationId")

            # Check if role assignment already exists for this group+environment
            existing = self._get_group_role(group_id, environment)
            if existing and existing.get("status") == "ACTIVE":
                # Update existing assignment instead of creating new
                return self._update_existing_role(
                    existing["applicationGroupRoleId"],
                    role_id,
                    role_name,
                    permissions,
                )

            # Generate role assignment ID
            role_assignment_id = str(uuid.uuid4())
            now = int(datetime.now(tz=timezone.utc).timestamp())

            role_data = {
                "applicationGroupRoleId": role_assignment_id,
                "applicationGroupId": group_id,
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
            self.group_roles_table.put_item(
                Item=role_data,
                ConditionExpression="attribute_not_exists(applicationGroupRoleId)",
            )

            logger.info(
                f"Assigned role {role_id} to group {group_id} for environment {environment}"
            )

            return {
                "code": 200,
                "success": True,
                "message": "Role assigned to group successfully",
                "item": role_data,
            }

        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                return self._error_response("AAM005", "Role assignment ID already exists")
            logger.error(f"DynamoDB error assigning role to group: {e}")
            return self._error_response("AAM005", f"Database error: {e}")
        except Exception as e:
            logger.error(f"Error assigning role to group: {e}")
            return self._error_response("AAM005", f"Internal error: {e}")

    def _update_existing_role(
        self,
        role_assignment_id: str,
        role_id: str,
        role_name: str,
        permissions: list[str],
    ) -> dict[str, Any]:
        """Update an existing role assignment."""
        try:
            now = int(datetime.now(tz=timezone.utc).timestamp())

            response = self.group_roles_table.update_item(
                Key={"applicationGroupRoleId": role_assignment_id},
                UpdateExpression="SET roleId = :roleId, roleName = :roleName, "
                "permissions = :permissions, updatedAt = :updatedAt",
                ExpressionAttributeValues={
                    ":roleId": role_id,
                    ":roleName": role_name,
                    ":permissions": permissions,
                    ":updatedAt": now,
                },
                ReturnValues="ALL_NEW",
                ConditionExpression="attribute_exists(applicationGroupRoleId)",
            )

            logger.info(f"Updated role assignment {role_assignment_id}")

            return {
                "code": 200,
                "success": True,
                "message": "Role assignment updated successfully",
                "item": response["Attributes"],
            }

        except ClientError as e:
            logger.error(f"DynamoDB error updating role assignment: {e}")
            return self._error_response("AAM005", f"Database error: {e}")

    def update_group_role(self, event: dict[str, Any]) -> dict[str, Any]:
        """Update a group's role assignment for an environment."""
        try:
            args = event.get("arguments", {}).get("input", {})
            role_assignment_id = args.get("applicationGroupRoleId")
            group_id = args.get("applicationGroupId")
            environment = args.get("environment")

            # Can update by ID or by group+environment
            if role_assignment_id:
                existing = self._get_role_assignment(role_assignment_id)
            elif group_id and environment:
                existing = self._get_group_role(group_id, environment)
            else:
                return self._error_response(
                    "AAM005",
                    "Either applicationGroupRoleId or both applicationGroupId and environment required",
                )

            if not existing:
                return self._error_response("AAM005", "Role assignment not found")

            if existing.get("status") == "DELETED":
                return self._error_response("AAM005", "Cannot update deleted role assignment")

            actual_id = existing["applicationGroupRoleId"]
            now = int(datetime.now(tz=timezone.utc).timestamp())

            # Build update expression
            update_expr = "SET updatedAt = :updatedAt"
            expr_values: dict[str, Any] = {":updatedAt": now}

            if "roleId" in args:
                update_expr += ", roleId = :roleId"
                expr_values[":roleId"] = args["roleId"]

            if "roleName" in args:
                update_expr += ", roleName = :roleName"
                expr_values[":roleName"] = args["roleName"]

            if "permissions" in args:
                update_expr += ", permissions = :permissions"
                expr_values[":permissions"] = args["permissions"]

            response = self.group_roles_table.update_item(
                Key={"applicationGroupRoleId": actual_id},
                UpdateExpression=update_expr,
                ExpressionAttributeValues=expr_values,
                ReturnValues="ALL_NEW",
                ConditionExpression="attribute_exists(applicationGroupRoleId)",
            )

            logger.info(f"Updated role assignment {actual_id}")

            return {
                "code": 200,
                "success": True,
                "message": "Role assignment updated successfully",
                "item": response["Attributes"],
            }

        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                return self._error_response("AAM005", "Role assignment not found")
            logger.error(f"DynamoDB error updating role assignment: {e}")
            return self._error_response("AAM005", f"Database error: {e}")
        except Exception as e:
            logger.error(f"Error updating role assignment: {e}")
            return self._error_response("AAM005", f"Internal error: {e}")

    def remove_group_role(self, event: dict[str, Any]) -> dict[str, Any]:
        """Remove a group's role assignment for an environment (soft delete)."""
        try:
            args = event.get("arguments", {}).get("input", {})
            role_assignment_id = args.get("applicationGroupRoleId")
            group_id = args.get("applicationGroupId")
            environment = args.get("environment")

            # Can remove by ID or by group+environment
            if role_assignment_id:
                existing = self._get_role_assignment(role_assignment_id)
            elif group_id and environment:
                existing = self._get_group_role(group_id, environment)
            else:
                return self._error_response(
                    "AAM005",
                    "Either applicationGroupRoleId or both applicationGroupId and environment required",
                )

            if not existing:
                return self._error_response("AAM005", "Role assignment not found")

            if existing.get("status") == "DELETED":
                return self._error_response("AAM005", "Role assignment already deleted")

            actual_id = existing["applicationGroupRoleId"]
            now = int(datetime.now(tz=timezone.utc).timestamp())

            # Soft delete
            response = self.group_roles_table.update_item(
                Key={"applicationGroupRoleId": actual_id},
                UpdateExpression="SET #status = :deleted, updatedAt = :updatedAt",
                ExpressionAttributeNames={"#status": "status"},
                ExpressionAttributeValues={
                    ":deleted": "DELETED",
                    ":updatedAt": now,
                },
                ReturnValues="ALL_NEW",
                ConditionExpression="attribute_exists(applicationGroupRoleId) AND #status <> :deleted",
            )

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
                    "AAM005", "Role assignment not found or already deleted"
                )
            logger.error(f"DynamoDB error removing role assignment: {e}")
            return self._error_response("AAM005", f"Database error: {e}")
        except Exception as e:
            logger.error(f"Error removing role assignment: {e}")
            return self._error_response("AAM005", f"Internal error: {e}")

    def get_group_roles(self, event: dict[str, Any]) -> dict[str, Any]:
        """Get all role assignments for a group across environments."""
        try:
            args = event.get("arguments", {})
            group_id = args.get("applicationGroupId")
            environment = args.get("environment")
            status_filter = args.get("status", "ACTIVE")
            limit = args.get("limit", 50)
            next_token = args.get("nextToken")

            if not group_id:
                return self._error_response("AAM002", "applicationGroupId is required")

            # Build query
            query_params: dict[str, Any] = {
                "IndexName": "GroupEnvRoleIndex",
                "Limit": limit,
            }

            if environment:
                # Query for specific environment
                query_params["KeyConditionExpression"] = Key("applicationGroupId").eq(
                    group_id
                ) & Key("environment").eq(environment)
            else:
                # Query all environments for this group
                query_params["KeyConditionExpression"] = Key("applicationGroupId").eq(group_id)

            # Add status filter
            query_params["FilterExpression"] = Attr("status").eq(status_filter)

            if next_token:
                query_params["ExclusiveStartKey"] = json.loads(next_token)

            response = self.group_roles_table.query(**query_params)

            result: dict[str, Any] = {
                "code": 200,
                "success": True,
                "items": response.get("Items", []),
            }

            if "LastEvaluatedKey" in response:
                result["nextToken"] = json.dumps(response["LastEvaluatedKey"])

            return result

        except Exception as e:
            logger.error(f"Error getting group roles: {e}")
            return self._error_response("AAM005", f"Internal error: {e}")

    def list_roles_by_application_environment(self, event: dict[str, Any]) -> dict[str, Any]:
        """List all group role assignments for an application in a specific environment."""
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

            # Query using AppEnvGroupIndex
            query_params: dict[str, Any] = {
                "IndexName": "AppEnvGroupIndex",
                "KeyConditionExpression": Key("applicationId").eq(application_id)
                & Key("environment").eq(environment),
                "FilterExpression": Attr("status").eq(status_filter),
                "Limit": limit,
            }

            if next_token:
                query_params["ExclusiveStartKey"] = json.loads(next_token)

            response = self.group_roles_table.query(**query_params)

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
            return self._error_response("AAM005", f"Internal error: {e}")

    def _get_group(self, group_id: str) -> dict[str, Any] | None:
        """Get a group by ID."""
        try:
            response = self.groups_table.get_item(Key={"applicationGroupId": group_id})
            return response.get("Item")
        except Exception as e:
            logger.error(f"Error getting group {group_id}: {e}")
            return None

    def _get_role_assignment(self, role_assignment_id: str) -> dict[str, Any] | None:
        """Get a role assignment by ID."""
        try:
            response = self.group_roles_table.get_item(
                Key={"applicationGroupRoleId": role_assignment_id}
            )
            return response.get("Item")
        except Exception as e:
            logger.error(f"Error getting role assignment {role_assignment_id}: {e}")
            return None

    def _get_group_role(self, group_id: str, environment: str) -> dict[str, Any] | None:
        """Get an active role assignment for a group in a specific environment."""
        try:
            response = self.group_roles_table.query(
                IndexName="GroupEnvRoleIndex",
                KeyConditionExpression=Key("applicationGroupId").eq(group_id)
                & Key("environment").eq(environment),
                FilterExpression=Attr("status").eq("ACTIVE"),
            )
            items = response.get("Items", [])
            return items[0] if items else None
        except Exception as e:
            logger.error(f"Error getting group role: {e}")
            return None

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
    """Main Lambda handler for ApplicationGroupRoles GraphQL operations."""
    try:
        logger.info(f"ApplicationGroupRoles resolver invoked with event: {json.dumps(event)}")

        service = ApplicationGroupRoleService()

        # Extract operation type from event
        field_name = event.get("info", {}).get("fieldName")

        # Route to appropriate method based on GraphQL field
        handlers = {
            "ApplicationGroupRolesCreate": service.assign_role_to_group,
            "ApplicationGroupRolesUpdate": service.update_group_role,
            "ApplicationGroupRolesDelete": service.remove_group_role,
            "ApplicationGroupRolesListByApplicationGroupId": service.get_group_roles,
            "ApplicationGroupRolesListByApplicationIdAndEnvironment": service.list_roles_by_application_environment,
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
        logger.error(f"Unhandled error in ApplicationGroupRoles resolver: {e}")
        return {
            "code": 500,
            "success": False,
            "message": "Internal server error",
        }
