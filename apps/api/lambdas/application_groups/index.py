# file: apps/api/lambdas/application_groups/index.py
# author: AI Assistant
# created: 2026-01-27
# description: Lambda resolver for ApplicationGroups GraphQL operations
# Feature: application-access-management, Task 3.1

"""
ApplicationGroups Lambda Resolver

Provides CRUD operations for application groups with business logic:
- Group name uniqueness within application
- Soft delete with cascade to memberships and role assignments
- Member count synchronization
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


class ApplicationGroupService:
    """Service for managing application groups."""

    def __init__(self) -> None:
        self.dynamodb = boto3.resource("dynamodb")
        self.groups_table = self.dynamodb.Table(
            os.environ.get("APPLICATION_GROUPS_TABLE", "orb-integration-hub-dev-application-groups")
        )
        self.group_users_table = self.dynamodb.Table(
            os.environ.get(
                "APPLICATION_GROUP_USERS_TABLE", "orb-integration-hub-dev-application-group-users"
            )
        )
        self.group_roles_table = self.dynamodb.Table(
            os.environ.get(
                "APPLICATION_GROUP_ROLES_TABLE", "orb-integration-hub-dev-application-group-roles"
            )
        )

    def create_group(self, event: dict[str, Any]) -> dict[str, Any]:
        """Create a new application group.

        Enforces:
        - Group name uniqueness within application (Property 1)
        """
        try:
            args = event.get("arguments", {}).get("input", {})
            application_id = args.get("applicationId")
            name = args.get("name")
            description = args.get("description", "")

            if not application_id:
                return self._error_response("AAM002", "applicationId is required")
            if not name:
                return self._error_response("AAM001", "Group name is required")

            # Check for existing group with same name in application
            if self._group_name_exists(application_id, name):
                return self._error_response(
                    "AAM001",
                    f"Group name '{name}' already exists in this application",
                )

            # Generate group ID
            group_id = str(uuid.uuid4())
            now = int(datetime.now(tz=timezone.utc).timestamp())

            group_data = {
                "applicationGroupId": group_id,
                "applicationId": application_id,
                "name": name,
                "description": description,
                "status": "ACTIVE",
                "memberCount": 0,
                "createdAt": now,
                "updatedAt": now,
            }

            # Write to DynamoDB with condition to prevent overwrites
            self.groups_table.put_item(
                Item=group_data,
                ConditionExpression="attribute_not_exists(applicationGroupId)",
            )

            logger.info(f"Created group {group_id} for application {application_id}")

            return {
                "code": 200,
                "success": True,
                "message": "Group created successfully",
                "item": group_data,
            }

        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                return self._error_response("AAM001", "Group ID already exists")
            logger.error(f"DynamoDB error creating group: {e}")
            return self._error_response("AAM002", f"Database error: {e}")
        except Exception as e:
            logger.error(f"Error creating group: {e}")
            return self._error_response("AAM002", f"Internal error: {e}")

    def update_group(self, event: dict[str, Any]) -> dict[str, Any]:
        """Update an existing application group."""
        try:
            args = event.get("arguments", {}).get("input", {})
            group_id = args.get("applicationGroupId")

            if not group_id:
                return self._error_response("AAM002", "applicationGroupId is required")

            # Get existing group
            existing = self._get_group(group_id)
            if not existing:
                return self._error_response("AAM002", "Group not found")

            if existing.get("status") == "DELETED":
                return self._error_response("AAM002", "Cannot update deleted group")

            # Check name uniqueness if name is being changed
            new_name = args.get("name")
            if new_name and new_name != existing.get("name"):
                if self._group_name_exists(
                    existing["applicationId"], new_name, exclude_group_id=group_id
                ):
                    return self._error_response(
                        "AAM001",
                        f"Group name '{new_name}' already exists in this application",
                    )

            # Build update expression
            update_expr = "SET updatedAt = :updatedAt"
            expr_values: dict[str, Any] = {
                ":updatedAt": int(datetime.now(tz=timezone.utc).timestamp())
            }
            expr_names: dict[str, str] = {}

            if new_name:
                update_expr += ", #name = :name"
                expr_values[":name"] = new_name
                expr_names["#name"] = "name"

            if "description" in args:
                update_expr += ", description = :description"
                expr_values[":description"] = args["description"]

            update_params: dict[str, Any] = {
                "Key": {"applicationGroupId": group_id},
                "UpdateExpression": update_expr,
                "ExpressionAttributeValues": expr_values,
                "ReturnValues": "ALL_NEW",
                "ConditionExpression": "attribute_exists(applicationGroupId)",
            }

            if expr_names:
                update_params["ExpressionAttributeNames"] = expr_names

            response = self.groups_table.update_item(**update_params)

            logger.info(f"Updated group {group_id}")

            return {
                "code": 200,
                "success": True,
                "message": "Group updated successfully",
                "item": response["Attributes"],
            }

        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                return self._error_response("AAM002", "Group not found")
            logger.error(f"DynamoDB error updating group: {e}")
            return self._error_response("AAM002", f"Database error: {e}")
        except Exception as e:
            logger.error(f"Error updating group: {e}")
            return self._error_response("AAM002", f"Internal error: {e}")

    def delete_group(self, event: dict[str, Any]) -> dict[str, Any]:
        """Soft delete a group and cascade to memberships and role assignments.

        Implements Property 2: Group Deletion Cascades
        """
        try:
            args = event.get("arguments", {}).get("input", {})
            group_id = args.get("applicationGroupId")

            if not group_id:
                return self._error_response("AAM002", "applicationGroupId is required")

            # Get existing group
            existing = self._get_group(group_id)
            if not existing:
                return self._error_response("AAM002", "Group not found")

            if existing.get("status") == "DELETED":
                return self._error_response("AAM002", "Group already deleted")

            now = int(datetime.now(tz=timezone.utc).timestamp())

            # Soft delete the group
            response = self.groups_table.update_item(
                Key={"applicationGroupId": group_id},
                UpdateExpression="SET #status = :deleted, updatedAt = :updatedAt",
                ExpressionAttributeNames={"#status": "status"},
                ExpressionAttributeValues={
                    ":deleted": "DELETED",
                    ":updatedAt": now,
                },
                ReturnValues="ALL_NEW",
                ConditionExpression="attribute_exists(applicationGroupId) AND #status <> :deleted",
            )

            # Cascade: Mark all group memberships as REMOVED
            self._cascade_delete_memberships(group_id, now)

            # Cascade: Mark all group role assignments as DELETED
            self._cascade_delete_role_assignments(group_id, now)

            logger.info(f"Deleted group {group_id} with cascade")

            return {
                "code": 200,
                "success": True,
                "message": "Group deleted successfully",
                "item": response["Attributes"],
            }

        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                return self._error_response("AAM002", "Group not found or already deleted")
            logger.error(f"DynamoDB error deleting group: {e}")
            return self._error_response("AAM002", f"Database error: {e}")
        except Exception as e:
            logger.error(f"Error deleting group: {e}")
            return self._error_response("AAM002", f"Internal error: {e}")

    def get_group(self, event: dict[str, Any]) -> dict[str, Any]:
        """Get a single group by ID."""
        try:
            args = event.get("arguments", {})
            group_id = args.get("applicationGroupId")

            if not group_id:
                return self._error_response("AAM002", "applicationGroupId is required")

            group = self._get_group(group_id)
            if not group:
                return self._error_response("AAM002", "Group not found")

            return {
                "code": 200,
                "success": True,
                "item": group,
            }

        except Exception as e:
            logger.error(f"Error getting group: {e}")
            return self._error_response("AAM002", f"Internal error: {e}")

    def list_groups(self, event: dict[str, Any]) -> dict[str, Any]:
        """List groups for an application."""
        try:
            args = event.get("arguments", {})
            application_id = args.get("applicationId")
            status_filter = args.get("status", "ACTIVE")
            limit = args.get("limit", 50)
            next_token = args.get("nextToken")

            if not application_id:
                return self._error_response("AAM002", "applicationId is required")

            # Query using GSI
            query_params: dict[str, Any] = {
                "IndexName": "ApplicationStatusIndex",
                "KeyConditionExpression": Key("applicationId").eq(application_id)
                & Key("status").eq(status_filter),
                "Limit": limit,
            }

            if next_token:
                query_params["ExclusiveStartKey"] = json.loads(next_token)

            response = self.groups_table.query(**query_params)

            result: dict[str, Any] = {
                "code": 200,
                "success": True,
                "items": response.get("Items", []),
            }

            if "LastEvaluatedKey" in response:
                result["nextToken"] = json.dumps(response["LastEvaluatedKey"])

            return result

        except Exception as e:
            logger.error(f"Error listing groups: {e}")
            return self._error_response("AAM002", f"Internal error: {e}")

    def _get_group(self, group_id: str) -> dict[str, Any] | None:
        """Get a group by ID."""
        try:
            response = self.groups_table.get_item(Key={"applicationGroupId": group_id})
            return response.get("Item")
        except Exception as e:
            logger.error(f"Error getting group {group_id}: {e}")
            return None

    def _group_name_exists(
        self, application_id: str, name: str, exclude_group_id: str | None = None
    ) -> bool:
        """Check if a group name already exists in the application.

        Implements Property 1: Group Name Uniqueness
        """
        try:
            # Query using ApplicationGroupsIndex GSI
            response = self.groups_table.query(
                IndexName="ApplicationGroupsIndex",
                KeyConditionExpression=Key("applicationId").eq(application_id)
                & Key("name").eq(name),
                FilterExpression=Attr("status").eq("ACTIVE"),
            )

            items = response.get("Items", [])

            # If excluding a group (for updates), filter it out
            if exclude_group_id:
                items = [i for i in items if i.get("applicationGroupId") != exclude_group_id]

            return len(items) > 0

        except Exception as e:
            logger.error(f"Error checking group name existence: {e}")
            # Fail safe - assume name exists to prevent duplicates
            return True

    def _cascade_delete_memberships(self, group_id: str, timestamp: int) -> None:
        """Mark all memberships for a group as REMOVED."""
        try:
            # Query all memberships for this group
            response = self.group_users_table.query(
                IndexName="GroupUsersIndex",
                KeyConditionExpression=Key("applicationGroupId").eq(group_id),
                FilterExpression=Attr("status").eq("ACTIVE"),
            )

            for item in response.get("Items", []):
                self.group_users_table.update_item(
                    Key={"applicationGroupUserId": item["applicationGroupUserId"]},
                    UpdateExpression="SET #status = :removed, updatedAt = :updatedAt",
                    ExpressionAttributeNames={"#status": "status"},
                    ExpressionAttributeValues={
                        ":removed": "REMOVED",
                        ":updatedAt": timestamp,
                    },
                )

            logger.info(
                f"Cascade deleted {len(response.get('Items', []))} memberships for group {group_id}"
            )

        except Exception as e:
            logger.error(f"Error cascading membership deletions: {e}")

    def _cascade_delete_role_assignments(self, group_id: str, timestamp: int) -> None:
        """Mark all role assignments for a group as DELETED."""
        try:
            # Query all role assignments for this group
            response = self.group_roles_table.query(
                IndexName="GroupEnvRoleIndex",
                KeyConditionExpression=Key("applicationGroupId").eq(group_id),
                FilterExpression=Attr("status").eq("ACTIVE"),
            )

            for item in response.get("Items", []):
                self.group_roles_table.update_item(
                    Key={"applicationGroupRoleId": item["applicationGroupRoleId"]},
                    UpdateExpression="SET #status = :deleted, updatedAt = :updatedAt",
                    ExpressionAttributeNames={"#status": "status"},
                    ExpressionAttributeValues={
                        ":deleted": "DELETED",
                        ":updatedAt": timestamp,
                    },
                )

            logger.info(
                f"Cascade deleted {len(response.get('Items', []))} role assignments for group {group_id}"
            )

        except Exception as e:
            logger.error(f"Error cascading role assignment deletions: {e}")

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
    """Main Lambda handler for ApplicationGroups GraphQL operations."""
    try:
        logger.info(f"ApplicationGroups resolver invoked with event: {json.dumps(event)}")

        service = ApplicationGroupService()

        # Extract operation type from event
        field_name = event.get("info", {}).get("fieldName")

        # Route to appropriate method based on GraphQL field
        handlers = {
            "ApplicationGroupsCreate": service.create_group,
            "ApplicationGroupsUpdate": service.update_group,
            "ApplicationGroupsDelete": service.delete_group,
            "ApplicationGroupsGet": service.get_group,
            "ApplicationGroupsListByApplicationId": service.list_groups,
            "ApplicationGroupsListByApplicationIdAndStatus": service.list_groups,
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
        logger.error(f"Unhandled error in ApplicationGroups resolver: {e}")
        return {
            "code": 500,
            "success": False,
            "message": "Internal server error",
        }
