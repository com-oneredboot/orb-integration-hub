# file: apps/api/tests/property/test_application_count_aggregation_property.py
# description: Property-based tests for application count aggregation
# Feature: application-access-management, Property 12: Application Count Aggregation
# Validates: Requirements 1.6, 2.7, 4.5

"""
Property 12: Application Count Aggregation

*For any* application, the groupCount must equal the count of ACTIVE ApplicationGroup records,
userCount must equal the count of ACTIVE ApplicationGroupUser records,
and roleCount must equal the count of ACTIVE ApplicationUserRole records.
"""

import sys
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from hypothesis import given, settings, assume
import hypothesis.strategies as st


# Strategy for generating valid names
name_strategy = st.text(
    alphabet=st.characters(whitelist_categories=("L", "N", "P", "Z")),
    min_size=1,
    max_size=50,
).filter(lambda x: x.strip() != "")

# Strategy for generating IDs
id_strategy = st.uuids().map(str)

# Strategy for environments
environment_strategy = st.sampled_from(["PRODUCTION", "STAGING", "DEVELOPMENT", "TEST", "PREVIEW"])


class MockDynamoDBTable:
    """Mock DynamoDB table for testing with count tracking."""

    def __init__(self) -> None:
        self.items: dict[str, dict[str, Any]] = {}
        self.update_calls: list[dict[str, Any]] = []

    def put_item(self, Item: dict[str, Any], **kwargs: Any) -> None:
        """Mock put_item."""
        for key in [
            "applicationGroupId",
            "applicationGroupUserId",
            "applicationUserRoleId",
            "applicationId",
        ]:
            if key in Item:
                self.items[Item[key]] = Item.copy()
                break

    def get_item(self, Key: dict[str, Any]) -> dict[str, Any]:
        """Mock get_item."""
        for key, val in Key.items():
            if val in self.items:
                return {"Item": self.items[val]}
        return {}

    def query(self, **kwargs: Any) -> dict[str, Any]:
        """Mock query."""
        return {"Items": list(self.items.values())}

    def update_item(self, Key: dict[str, Any], **kwargs: Any) -> dict[str, Any]:
        """Mock update_item and track calls."""
        self.update_calls.append({"Key": Key, **kwargs})
        for key, val in Key.items():
            if val in self.items:
                return {"Attributes": self.items[val]}
        return {"Attributes": {}}


def _import_group_service():
    """Import ApplicationGroupService with proper path management."""
    groups_path = str(Path(__file__).parent.parent.parent / "lambdas" / "application_groups")
    original_path = sys.path.copy()
    try:
        # Temporarily modify path
        sys.path = [groups_path] + [p for p in sys.path if "lambdas" not in p]
        # Force reimport
        if "index" in sys.modules:
            del sys.modules["index"]
        from index import ApplicationGroupService

        return ApplicationGroupService
    finally:
        sys.path = original_path


def _import_group_user_service():
    """Import ApplicationGroupUserService with proper path management."""
    users_path = str(Path(__file__).parent.parent.parent / "lambdas" / "application_group_users")
    original_path = sys.path.copy()
    try:
        sys.path = [users_path] + [p for p in sys.path if "lambdas" not in p]
        if "index" in sys.modules:
            del sys.modules["index"]
        from index import ApplicationGroupUserService

        return ApplicationGroupUserService
    finally:
        sys.path = original_path


def _import_user_role_service():
    """Import ApplicationUserRoleService with proper path management."""
    roles_path = str(Path(__file__).parent.parent.parent / "lambdas" / "application_user_roles")
    original_path = sys.path.copy()
    try:
        sys.path = [roles_path] + [p for p in sys.path if "lambdas" not in p]
        if "index" in sys.modules:
            del sys.modules["index"]
        from index import ApplicationUserRoleService

        return ApplicationUserRoleService
    finally:
        sys.path = original_path


class TestGroupCountAggregation:
    """Property tests for groupCount aggregation on Applications table."""

    @given(
        application_id=id_strategy,
        group_name=name_strategy,
    )
    @settings(max_examples=100)
    def test_group_count_increments_on_create(self, application_id: str, group_name: str) -> None:
        """
        Property: Creating a group must increment groupCount on the application.
        """
        assume(group_name.strip() != "")

        with patch("boto3.resource") as mock_resource:
            mock_groups_table = MockDynamoDBTable()
            mock_applications_table = MockDynamoDBTable()
            mock_dynamodb = MagicMock()
            mock_dynamodb.Table.return_value = mock_groups_table
            mock_resource.return_value = mock_dynamodb

            ApplicationGroupService = _import_group_service()
            service = ApplicationGroupService()
            service.groups_table = mock_groups_table
            service.applications_table = mock_applications_table
            service.group_users_table = MockDynamoDBTable()
            service.group_roles_table = MockDynamoDBTable()

            event = {
                "arguments": {
                    "input": {
                        "applicationId": application_id,
                        "name": group_name,
                    }
                }
            }

            with patch.object(service, "_group_name_exists", return_value=False):
                result = service.create_group(event)

            assert result["success"], f"Group creation should succeed: {result}"

            increment_calls = [
                c
                for c in mock_applications_table.update_calls
                if "groupCount" in c.get("UpdateExpression", "")
                and "+ :one" in c.get("UpdateExpression", "")
            ]
            assert len(increment_calls) == 1, "groupCount should be incremented exactly once"
            assert increment_calls[0]["Key"]["applicationId"] == application_id

    @given(
        application_id=id_strategy,
        group_name=name_strategy,
    )
    @settings(max_examples=100)
    def test_group_count_decrements_on_delete(self, application_id: str, group_name: str) -> None:
        """
        Property: Deleting a group must decrement groupCount on the application.
        """
        assume(group_name.strip() != "")

        with patch("boto3.resource") as mock_resource:
            mock_groups_table = MockDynamoDBTable()
            mock_applications_table = MockDynamoDBTable()
            mock_dynamodb = MagicMock()
            mock_dynamodb.Table.return_value = mock_groups_table
            mock_resource.return_value = mock_dynamodb

            ApplicationGroupService = _import_group_service()
            service = ApplicationGroupService()
            service.groups_table = mock_groups_table
            service.applications_table = mock_applications_table
            service.group_users_table = MockDynamoDBTable()
            service.group_roles_table = MockDynamoDBTable()

            group_id = "test-group-id"
            mock_groups_table.items[group_id] = {
                "applicationGroupId": group_id,
                "applicationId": application_id,
                "name": group_name,
                "status": "ACTIVE",
            }

            event = {
                "arguments": {
                    "input": {
                        "applicationGroupId": group_id,
                    }
                }
            }

            result = service.delete_group(event)

            assert result["success"], f"Group deletion should succeed: {result}"

            decrement_calls = [
                c
                for c in mock_applications_table.update_calls
                if "groupCount" in c.get("UpdateExpression", "")
                and "- :one" in c.get("UpdateExpression", "")
            ]
            assert len(decrement_calls) == 1, "groupCount should be decremented exactly once"
            assert decrement_calls[0]["Key"]["applicationId"] == application_id


class TestUserCountAggregation:
    """Property tests for userCount aggregation on Applications table."""

    @given(
        application_id=id_strategy,
        group_id=id_strategy,
        user_id=id_strategy,
    )
    @settings(max_examples=100)
    def test_user_count_increments_on_add(
        self, application_id: str, group_id: str, user_id: str
    ) -> None:
        """
        Property: Adding a user to a group must increment userCount on the application.
        """
        with patch("boto3.resource") as mock_resource:
            mock_group_users_table = MockDynamoDBTable()
            mock_groups_table = MockDynamoDBTable()
            mock_applications_table = MockDynamoDBTable()
            mock_dynamodb = MagicMock()
            mock_dynamodb.Table.return_value = mock_group_users_table
            mock_resource.return_value = mock_dynamodb

            ApplicationGroupUserService = _import_group_user_service()
            service = ApplicationGroupUserService()
            service.group_users_table = mock_group_users_table
            service.groups_table = mock_groups_table
            service.applications_table = mock_applications_table

            mock_groups_table.items[group_id] = {
                "applicationGroupId": group_id,
                "applicationId": application_id,
                "status": "ACTIVE",
            }

            event = {
                "arguments": {
                    "input": {
                        "applicationGroupId": group_id,
                        "userId": user_id,
                        "applicationId": application_id,
                    }
                }
            }

            with patch.object(service, "_membership_exists", return_value=False):
                with patch.object(service, "_increment_member_count"):
                    result = service.add_user_to_group(event)

            assert result["success"], f"Adding user should succeed: {result}"

            increment_calls = [
                c
                for c in mock_applications_table.update_calls
                if "userCount" in c.get("UpdateExpression", "")
                and "+ :one" in c.get("UpdateExpression", "")
            ]
            assert len(increment_calls) == 1, "userCount should be incremented exactly once"
            assert increment_calls[0]["Key"]["applicationId"] == application_id

    @given(
        application_id=id_strategy,
        group_id=id_strategy,
        user_id=id_strategy,
    )
    @settings(max_examples=100)
    def test_user_count_decrements_on_remove(
        self, application_id: str, group_id: str, user_id: str
    ) -> None:
        """
        Property: Removing a user from a group must decrement userCount on the application.
        """
        with patch("boto3.resource") as mock_resource:
            mock_group_users_table = MockDynamoDBTable()
            mock_groups_table = MockDynamoDBTable()
            mock_applications_table = MockDynamoDBTable()
            mock_dynamodb = MagicMock()
            mock_dynamodb.Table.return_value = mock_group_users_table
            mock_resource.return_value = mock_dynamodb

            ApplicationGroupUserService = _import_group_user_service()
            service = ApplicationGroupUserService()
            service.group_users_table = mock_group_users_table
            service.groups_table = mock_groups_table
            service.applications_table = mock_applications_table

            membership_id = "test-membership-id"
            mock_group_users_table.items[membership_id] = {
                "applicationGroupUserId": membership_id,
                "applicationGroupId": group_id,
                "userId": user_id,
                "applicationId": application_id,
                "status": "ACTIVE",
            }

            event = {
                "arguments": {
                    "input": {
                        "applicationGroupUserId": membership_id,
                    }
                }
            }

            with patch.object(service, "_decrement_member_count"):
                result = service.remove_user_from_group(event)

            assert result["success"], f"Removing user should succeed: {result}"

            decrement_calls = [
                c
                for c in mock_applications_table.update_calls
                if "userCount" in c.get("UpdateExpression", "")
                and "- :one" in c.get("UpdateExpression", "")
            ]
            assert len(decrement_calls) == 1, "userCount should be decremented exactly once"
            assert decrement_calls[0]["Key"]["applicationId"] == application_id


class TestRoleCountAggregation:
    """Property tests for roleCount aggregation on Applications table."""

    @given(
        application_id=id_strategy,
        user_id=id_strategy,
        role_id=id_strategy,
        environment=environment_strategy,
    )
    @settings(max_examples=100)
    def test_role_count_increments_on_assign(
        self, application_id: str, user_id: str, role_id: str, environment: str
    ) -> None:
        """
        Property: Assigning a role to a user must increment roleCount on the application.
        """
        with patch("boto3.resource") as mock_resource:
            mock_user_roles_table = MockDynamoDBTable()
            mock_applications_table = MockDynamoDBTable()
            mock_dynamodb = MagicMock()
            mock_dynamodb.Table.return_value = mock_user_roles_table
            mock_resource.return_value = mock_dynamodb

            ApplicationUserRoleService = _import_user_role_service()
            service = ApplicationUserRoleService()
            service.user_roles_table = mock_user_roles_table
            service.applications_table = mock_applications_table
            service.users_table = MockDynamoDBTable()
            service.roles_table = MockDynamoDBTable()

            event = {
                "arguments": {
                    "input": {
                        "userId": user_id,
                        "applicationId": application_id,
                        "environment": environment,
                        "roleId": role_id,
                        "roleName": "TestRole",
                        "permissions": ["read", "write"],
                    }
                }
            }

            with patch.object(service, "_get_user_role", return_value=None):
                result = service.assign_role_to_user(event)

            assert result["success"], f"Role assignment should succeed: {result}"

            increment_calls = [
                c
                for c in mock_applications_table.update_calls
                if "roleCount" in c.get("UpdateExpression", "")
                and "+ :one" in c.get("UpdateExpression", "")
            ]
            assert len(increment_calls) == 1, "roleCount should be incremented exactly once"
            assert increment_calls[0]["Key"]["applicationId"] == application_id

    @given(
        application_id=id_strategy,
        user_id=id_strategy,
        role_id=id_strategy,
        environment=environment_strategy,
    )
    @settings(max_examples=100)
    def test_role_count_decrements_on_remove(
        self, application_id: str, user_id: str, role_id: str, environment: str
    ) -> None:
        """
        Property: Removing a role from a user must decrement roleCount on the application.
        """
        with patch("boto3.resource") as mock_resource:
            mock_user_roles_table = MockDynamoDBTable()
            mock_applications_table = MockDynamoDBTable()
            mock_dynamodb = MagicMock()
            mock_dynamodb.Table.return_value = mock_user_roles_table
            mock_resource.return_value = mock_dynamodb

            ApplicationUserRoleService = _import_user_role_service()
            service = ApplicationUserRoleService()
            service.user_roles_table = mock_user_roles_table
            service.applications_table = mock_applications_table
            service.users_table = MockDynamoDBTable()
            service.roles_table = MockDynamoDBTable()

            role_assignment_id = "test-role-assignment-id"
            mock_user_roles_table.items[role_assignment_id] = {
                "applicationUserRoleId": role_assignment_id,
                "userId": user_id,
                "applicationId": application_id,
                "environment": environment,
                "roleId": role_id,
                "status": "ACTIVE",
            }

            event = {
                "arguments": {
                    "input": {
                        "applicationUserRoleId": role_assignment_id,
                    }
                }
            }

            result = service.remove_user_role(event)

            assert result["success"], f"Role removal should succeed: {result}"

            decrement_calls = [
                c
                for c in mock_applications_table.update_calls
                if "roleCount" in c.get("UpdateExpression", "")
                and "- :one" in c.get("UpdateExpression", "")
            ]
            assert len(decrement_calls) == 1, "roleCount should be decremented exactly once"
            assert decrement_calls[0]["Key"]["applicationId"] == application_id


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
