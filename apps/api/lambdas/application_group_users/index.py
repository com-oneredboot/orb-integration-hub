# file: apps/api/lambdas/application_group_users/index.py
# author: AI Assistant
# created: 2026-01-27
# description: Lambda resolver for ApplicationGroupUsers GraphQL operations
# Feature: application-access-management, Task 3.3

"""
ApplicationGroupUsers Lambda Resolver

Provides membership operations for application groups:
- Add/remove users from groups
- List group members
- Get user's groups
- Prevent duplicate memberships (Property 3)
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


class ApplicationGroupUserService:
    """Service for managing group memberships."""

    def __init__(self) -> None:
        self.dynamodb = boto3.resource("dynamodb")
        self.group_users_table = self.dynamodb.Table(
            os.environ.get(
                "APPLICATION_GROUP_USERS_TABLE", "orb-integration-hub-dev-application-group-users"
            )
        )
        self.groups_table = self.dynamodb.Table(
            os.environ.get("APPLICATION_GROUPS_TABLE", "orb-integration-hub-dev-application-groups")
        )
        self.applications_table = self.dynamodb.Table(
            os.environ.get("APPLICATIONS_TABLE", "orb-integration-hub-dev-applications")
        )

    def add_user_to_group(self, event: dict[str, Any]) -> dict[str, Any]:
        """Add a user to a group.

        Enforces:
        - Membership uniqueness (Property 3)
        - Group must exist and be ACTIVE
        """
        try:
            args = event.get("arguments", {}).get("input", {})
            group_id = args.get("applicationGroupId")
            user_id = args.get("userId")
            application_id = args.get("applicationId")

            if not group_id:
                return self._error_response("AAM003", "applicationGroupId is required")
            if not user_id:
                return self._error_response("AAM003", "userId is required")

            # Verify group exists and is active
            group = self._get_group(group_id)
            if not group:
                return self._error_response("AAM002", "Group not found")
            if group.get("status") != "ACTIVE":
                return self._error_response("AAM002", "Cannot add user to inactive group")

            # Use application_id from group if not provided
            if not application_id:
                application_id = group.get("applicationId")

            # Check for existing membership
            if self._membership_exists(group_id, user_id):
                return self._error_response(
                    "AAM003",
                    "User is already a member of this group",
                )

            # Generate membership ID
            membership_id = str(uuid.uuid4())
            now = int(datetime.now(tz=timezone.utc).timestamp())

            membership_data = {
                "applicationGroupUserId": membership_id,
                "applicationGroupId": group_id,
                "userId": user_id,
                "applicationId": application_id,
                "status": "ACTIVE",
                "createdAt": now,
                "updatedAt": now,
            }

            # Write to DynamoDB
            self.group_users_table.put_item(
                Item=membership_data,
                ConditionExpression="attribute_not_exists(applicationGroupUserId)",
            )

            # Update member count on group
            self._increment_member_count(group_id)

            # Sync userCount on Applications table
            self._increment_application_user_count(application_id)

            logger.info(f"Added user {user_id} to group {group_id}")

            return {
                "code": 200,
                "success": True,
                "message": "User added to group successfully",
                "item": membership_data,
            }

        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                return self._error_response("AAM003", "Membership ID already exists")
            logger.error(f"DynamoDB error adding user to group: {e}")
            return self._error_response("AAM003", f"Database error: {e}")
        except Exception as e:
            logger.error(f"Error adding user to group: {e}")
            return self._error_response("AAM003", f"Internal error: {e}")

    def remove_user_from_group(self, event: dict[str, Any]) -> dict[str, Any]:
        """Remove a user from a group (soft delete)."""
        try:
            args = event.get("arguments", {}).get("input", {})
            membership_id = args.get("applicationGroupUserId")
            group_id = args.get("applicationGroupId")
            user_id = args.get("userId")

            # Can remove by membership ID or by group+user combination
            if membership_id:
                membership = self._get_membership(membership_id)
            elif group_id and user_id:
                membership = self._find_membership(group_id, user_id)
            else:
                return self._error_response(
                    "AAM004",
                    "Either applicationGroupUserId or both applicationGroupId and userId required",
                )

            if not membership:
                return self._error_response("AAM004", "Membership not found")

            if membership.get("status") == "REMOVED":
                return self._error_response("AAM004", "User already removed from group")

            now = int(datetime.now(tz=timezone.utc).timestamp())
            actual_membership_id = membership["applicationGroupUserId"]
            actual_group_id = membership["applicationGroupId"]

            # Soft delete the membership
            response = self.group_users_table.update_item(
                Key={"applicationGroupUserId": actual_membership_id},
                UpdateExpression="SET #status = :removed, updatedAt = :updatedAt",
                ExpressionAttributeNames={"#status": "status"},
                ExpressionAttributeValues={
                    ":removed": "REMOVED",
                    ":updatedAt": now,
                },
                ReturnValues="ALL_NEW",
                ConditionExpression="attribute_exists(applicationGroupUserId)",
            )

            # Decrement member count on group
            self._decrement_member_count(actual_group_id)

            # Sync userCount on Applications table
            application_id = membership.get("applicationId")
            if application_id:
                self._decrement_application_user_count(application_id)

            logger.info(f"Removed membership {actual_membership_id}")

            return {
                "code": 200,
                "success": True,
                "message": "User removed from group successfully",
                "item": response["Attributes"],
            }

        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                return self._error_response("AAM004", "Membership not found")
            logger.error(f"DynamoDB error removing user from group: {e}")
            return self._error_response("AAM004", f"Database error: {e}")
        except Exception as e:
            logger.error(f"Error removing user from group: {e}")
            return self._error_response("AAM004", f"Internal error: {e}")

    def list_group_members(self, event: dict[str, Any]) -> dict[str, Any]:
        """List all members of a group."""
        try:
            args = event.get("arguments", {})
            group_id = args.get("applicationGroupId")
            status_filter = args.get("status", "ACTIVE")
            limit = args.get("limit", 50)
            next_token = args.get("nextToken")

            if not group_id:
                return self._error_response("AAM002", "applicationGroupId is required")

            # Query using GSI
            query_params: dict[str, Any] = {
                "IndexName": "GroupStatusIndex",
                "KeyConditionExpression": Key("applicationGroupId").eq(group_id)
                & Key("status").eq(status_filter),
                "Limit": limit,
            }

            if next_token:
                query_params["ExclusiveStartKey"] = json.loads(next_token)

            response = self.group_users_table.query(**query_params)

            result: dict[str, Any] = {
                "code": 200,
                "success": True,
                "items": response.get("Items", []),
            }

            if "LastEvaluatedKey" in response:
                result["nextToken"] = json.dumps(response["LastEvaluatedKey"])

            return result

        except Exception as e:
            logger.error(f"Error listing group members: {e}")
            return self._error_response("AAM002", f"Internal error: {e}")

    def get_user_groups(self, event: dict[str, Any]) -> dict[str, Any]:
        """Get all groups a user belongs to."""
        try:
            args = event.get("arguments", {})
            user_id = args.get("userId")
            status_filter = args.get("status", "ACTIVE")
            limit = args.get("limit", 50)
            next_token = args.get("nextToken")

            if not user_id:
                return self._error_response("AAM002", "userId is required")

            # Query using GSI
            query_params: dict[str, Any] = {
                "IndexName": "UserGroupsIndex",
                "KeyConditionExpression": Key("userId").eq(user_id),
                "FilterExpression": Attr("status").eq(status_filter),
                "Limit": limit,
            }

            if next_token:
                query_params["ExclusiveStartKey"] = json.loads(next_token)

            response = self.group_users_table.query(**query_params)

            result: dict[str, Any] = {
                "code": 200,
                "success": True,
                "items": response.get("Items", []),
            }

            if "LastEvaluatedKey" in response:
                result["nextToken"] = json.dumps(response["LastEvaluatedKey"])

            return result

        except Exception as e:
            logger.error(f"Error getting user groups: {e}")
            return self._error_response("AAM002", f"Internal error: {e}")

    def _get_group(self, group_id: str) -> dict[str, Any] | None:
        """Get a group by ID."""
        try:
            response = self.groups_table.get_item(Key={"applicationGroupId": group_id})
            return response.get("Item")
        except Exception as e:
            logger.error(f"Error getting group {group_id}: {e}")
            return None

    def _get_membership(self, membership_id: str) -> dict[str, Any] | None:
        """Get a membership by ID."""
        try:
            response = self.group_users_table.get_item(
                Key={"applicationGroupUserId": membership_id}
            )
            return response.get("Item")
        except Exception as e:
            logger.error(f"Error getting membership {membership_id}: {e}")
            return None

    def _find_membership(self, group_id: str, user_id: str) -> dict[str, Any] | None:
        """Find an active membership by group and user."""
        try:
            response = self.group_users_table.query(
                IndexName="GroupUsersIndex",
                KeyConditionExpression=Key("applicationGroupId").eq(group_id)
                & Key("userId").eq(user_id),
                FilterExpression=Attr("status").eq("ACTIVE"),
            )
            items = response.get("Items", [])
            return items[0] if items else None
        except Exception as e:
            logger.error(f"Error finding membership: {e}")
            return None

    def _membership_exists(self, group_id: str, user_id: str) -> bool:
        """Check if an active membership exists.

        Implements Property 3: Membership Uniqueness
        """
        try:
            response = self.group_users_table.query(
                IndexName="GroupUsersIndex",
                KeyConditionExpression=Key("applicationGroupId").eq(group_id)
                & Key("userId").eq(user_id),
                FilterExpression=Attr("status").eq("ACTIVE"),
            )
            return len(response.get("Items", [])) > 0
        except Exception as e:
            logger.error(f"Error checking membership existence: {e}")
            # Fail safe - assume membership exists to prevent duplicates
            return True

    def _increment_member_count(self, group_id: str) -> None:
        """Increment the member count on a group."""
        try:
            self.groups_table.update_item(
                Key={"applicationGroupId": group_id},
                UpdateExpression="SET memberCount = if_not_exists(memberCount, :zero) + :one, updatedAt = :now",
                ExpressionAttributeValues={
                    ":zero": 0,
                    ":one": 1,
                    ":now": int(datetime.now(tz=timezone.utc).timestamp()),
                },
            )
        except Exception as e:
            logger.error(f"Error incrementing member count: {e}")

    def _decrement_member_count(self, group_id: str) -> None:
        """Decrement the member count on a group."""
        try:
            self.groups_table.update_item(
                Key={"applicationGroupId": group_id},
                UpdateExpression="SET memberCount = memberCount - :one, updatedAt = :now",
                ConditionExpression="memberCount > :zero",
                ExpressionAttributeValues={
                    ":one": 1,
                    ":zero": 0,
                    ":now": int(datetime.now(tz=timezone.utc).timestamp()),
                },
            )
        except Exception as e:
            logger.error(f"Error decrementing member count: {e}")

    def _increment_application_user_count(self, application_id: str) -> None:
        """Increment the userCount on the Applications table."""
        try:
            self.applications_table.update_item(
                Key={"applicationId": application_id},
                UpdateExpression="SET userCount = if_not_exists(userCount, :zero) + :one, updatedAt = :now",
                ExpressionAttributeValues={
                    ":zero": 0,
                    ":one": 1,
                    ":now": int(datetime.now(tz=timezone.utc).timestamp()),
                },
            )
        except Exception as e:
            logger.error(f"Error incrementing application user count: {e}")

    def _decrement_application_user_count(self, application_id: str) -> None:
        """Decrement the userCount on the Applications table."""
        try:
            self.applications_table.update_item(
                Key={"applicationId": application_id},
                UpdateExpression="SET userCount = userCount - :one, updatedAt = :now",
                ConditionExpression="userCount > :zero",
                ExpressionAttributeValues={
                    ":one": 1,
                    ":zero": 0,
                    ":now": int(datetime.now(tz=timezone.utc).timestamp()),
                },
            )
        except Exception as e:
            logger.error(f"Error decrementing application user count: {e}")

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
    """Main Lambda handler for ApplicationGroupUsers GraphQL operations."""
    try:
        logger.info(f"ApplicationGroupUsers resolver invoked with event: {json.dumps(event)}")

        service = ApplicationGroupUserService()

        # Extract operation type from event
        field_name = event.get("info", {}).get("fieldName")

        # Route to appropriate method based on GraphQL field
        handlers = {
            "ApplicationGroupUsersCreate": service.add_user_to_group,
            "ApplicationGroupUsersDelete": service.remove_user_from_group,
            "ApplicationGroupUsersListByApplicationGroupId": service.list_group_members,
            "ApplicationGroupUsersListByUserId": service.get_user_groups,
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
        logger.error(f"Unhandled error in ApplicationGroupUsers resolver: {e}")
        return {
            "code": 500,
            "success": False,
            "message": "Internal server error",
        }
