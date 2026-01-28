# file: apps/api/tests/property/test_direct_role_priority_property.py
# author: AI Assistant
# created: 2026-01-27
# description: Property test for Direct Role Priority
# Feature: application-access-management, Property 5: Direct Role Priority
# **Validates: Requirements 4.4, 5.4**

"""
Property 5: Direct Role Priority

*For any* user with both a direct ApplicationUserRole and an inherited
ApplicationGroupRole in the same environment, the effective permissions
must include the direct role's permissions.

This test validates that direct role assignments always take priority -
their permissions are always included in the effective permissions set.
"""

import sys
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from hypothesis import given, settings, assume
from hypothesis import strategies as st

# Add lambdas directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "lambdas" / "permission_resolution"))

# Strategy for generating valid environment values
environment_strategy = st.sampled_from(["PRODUCTION", "STAGING", "DEVELOPMENT", "TEST", "PREVIEW"])

# Strategy for generating permission strings
permission_strategy = st.text(
    alphabet="abcdefghijklmnopqrstuvwxyz:_",
    min_size=3,
    max_size=30,
).filter(lambda x: len(x.strip()) >= 3)

# Strategy for generating lists of permissions
permissions_list_strategy = st.lists(
    permission_strategy,
    min_size=1,
    max_size=10,
    unique=True,
)

# Strategy for generating UUIDs
uuid_strategy = st.uuids().map(str)


class MockDynamoDBTable:
    """Mock DynamoDB table for testing."""

    def __init__(self) -> None:
        self.items: dict[str, dict[str, Any]] = {}
        self.query_results: list[dict[str, Any]] = []

    def get_item(self, Key: dict[str, Any]) -> dict[str, Any]:
        """Mock get_item."""
        for key_name, key_val in Key.items():
            pk = str(key_val) if key_val else None
            item = self.items.get(pk) if pk else None
            if item:
                return {"Item": item}
        return {}

    def query(self, **kwargs: Any) -> dict[str, Any]:
        """Mock query."""
        return {"Items": self.query_results}


class TestDirectRolePriority:
    """Property tests for Direct Role Priority (Property 5)."""

    @given(
        user_id=uuid_strategy,
        application_id=uuid_strategy,
        environment=environment_strategy,
        direct_permissions=permissions_list_strategy,
        group_permissions=permissions_list_strategy,
    )
    @settings(max_examples=100)
    def test_direct_role_permissions_always_included(
        self,
        user_id: str,
        application_id: str,
        environment: str,
        direct_permissions: list[str],
        group_permissions: list[str],
    ) -> None:
        """
        Property 5: Direct Role Priority

        For any user with both direct and group roles, the effective permissions
        must include ALL direct role permissions.

        **Validates: Requirements 4.4, 5.4**
        """
        # Ensure we have at least one direct permission to test
        assume(len(direct_permissions) > 0)

        with patch("boto3.resource") as mock_resource:
            # Create direct role with permissions
            direct_role = {
                "applicationUserRoleId": "direct-role-id",
                "roleId": "direct-role",
                "roleName": "Direct Role",
                "permissions": direct_permissions,
                "status": "ACTIVE",
                "applicationId": application_id,
            }

            # Create group membership
            group_id = "test-group-id"
            group_membership = {
                "applicationGroupUserId": "membership-id",
                "applicationGroupId": group_id,
                "userId": user_id,
                "applicationId": application_id,
                "status": "ACTIVE",
            }

            # Create group
            group = {
                "applicationGroupId": group_id,
                "name": "Test Group",
                "status": "ACTIVE",
            }

            # Create group role with different permissions
            group_role = {
                "applicationGroupRoleId": "group-role-id",
                "applicationGroupId": group_id,
                "roleId": "group-role",
                "roleName": "Group Role",
                "permissions": group_permissions,
                "status": "ACTIVE",
            }

            # Setup mock tables
            mock_user_roles_table = MockDynamoDBTable()
            mock_group_users_table = MockDynamoDBTable()
            mock_group_roles_table = MockDynamoDBTable()
            mock_groups_table = MockDynamoDBTable()

            mock_user_roles_table.query_results = [direct_role]
            mock_group_users_table.query_results = [group_membership]
            mock_group_roles_table.query_results = [group_role]
            mock_groups_table.items[group_id] = group

            mock_dynamodb = MagicMock()
            mock_dynamodb.Table.return_value = mock_user_roles_table
            mock_resource.return_value = mock_dynamodb

            from index import PermissionResolutionService

            service = PermissionResolutionService()
            service.user_roles_table = mock_user_roles_table
            service.group_users_table = mock_group_users_table
            service.group_roles_table = mock_group_roles_table
            service.groups_table = mock_groups_table

            event = {
                "arguments": {
                    "userId": user_id,
                    "applicationId": application_id,
                    "environment": environment,
                }
            }

            result = service.resolve_permissions(event)

            assert result.get("success") is True

            effective_perms = set(result.get("item", {}).get("effectivePermissions", []))

            # ALL direct permissions must be in effective permissions
            for perm in direct_permissions:
                assert perm in effective_perms, (
                    f"Direct permission '{perm}' not in effective permissions. "
                    f"Direct: {direct_permissions}, Effective: {effective_perms}"
                )

    @given(
        user_id=uuid_strategy,
        application_id=uuid_strategy,
        environment=environment_strategy,
        direct_permissions=permissions_list_strategy,
    )
    @settings(max_examples=100)
    def test_direct_only_permissions_work(
        self,
        user_id: str,
        application_id: str,
        environment: str,
        direct_permissions: list[str],
    ) -> None:
        """
        Property 5 (corollary): Direct roles work without any group roles.

        For any user with only direct roles (no group memberships),
        the effective permissions should equal the direct role permissions.

        **Validates: Requirements 4.4, 5.4**
        """
        with patch("boto3.resource") as mock_resource:
            # Create direct role
            direct_role = {
                "applicationUserRoleId": "direct-role-id",
                "roleId": "direct-role",
                "roleName": "Direct Role",
                "permissions": direct_permissions,
                "status": "ACTIVE",
                "applicationId": application_id,
            }

            mock_user_roles_table = MockDynamoDBTable()
            mock_group_users_table = MockDynamoDBTable()
            mock_group_roles_table = MockDynamoDBTable()
            mock_groups_table = MockDynamoDBTable()

            mock_user_roles_table.query_results = [direct_role]
            mock_group_users_table.query_results = []  # No group memberships

            mock_dynamodb = MagicMock()
            mock_dynamodb.Table.return_value = mock_user_roles_table
            mock_resource.return_value = mock_dynamodb

            from index import PermissionResolutionService

            service = PermissionResolutionService()
            service.user_roles_table = mock_user_roles_table
            service.group_users_table = mock_group_users_table
            service.group_roles_table = mock_group_roles_table
            service.groups_table = mock_groups_table

            event = {
                "arguments": {
                    "userId": user_id,
                    "applicationId": application_id,
                    "environment": environment,
                }
            }

            result = service.resolve_permissions(event)

            assert result.get("success") is True

            effective_perms = set(result.get("item", {}).get("effectivePermissions", []))
            expected_perms = set(direct_permissions)

            # Effective permissions should exactly match direct permissions
            assert (
                effective_perms == expected_perms
            ), f"Expected {expected_perms}, got {effective_perms}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
