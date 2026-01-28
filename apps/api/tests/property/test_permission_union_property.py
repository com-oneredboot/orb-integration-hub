# file: apps/api/tests/property/test_permission_union_property.py
# author: AI Assistant
# created: 2026-01-27
# description: Property test for Permission Union
# Feature: application-access-management, Property 6: Permission Union
# **Validates: Requirements 5.3**

"""
Property 6: Permission Union

*For any* user with multiple role sources (direct + group), the effective
permissions must be the union of all permissions from all sources.

This test validates that permissions are combined additively - no permissions
are lost when combining multiple sources.
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


class TestPermissionUnion:
    """Property tests for Permission Union (Property 6)."""

    @given(
        user_id=uuid_strategy,
        application_id=uuid_strategy,
        environment=environment_strategy,
        direct_permissions=permissions_list_strategy,
        group_permissions=permissions_list_strategy,
    )
    @settings(max_examples=100)
    def test_effective_permissions_is_union(
        self,
        user_id: str,
        application_id: str,
        environment: str,
        direct_permissions: list[str],
        group_permissions: list[str],
    ) -> None:
        """
        Property 6: Permission Union

        For any user with multiple role sources, the effective permissions
        must be the union of all permissions from all sources.

        **Validates: Requirements 5.3**
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

            # Create group role
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
            expected_union = set(direct_permissions) | set(group_permissions)

            # Effective permissions should be the union
            assert (
                effective_perms == expected_union
            ), f"Expected union {expected_union}, got {effective_perms}"

    @given(
        user_id=uuid_strategy,
        application_id=uuid_strategy,
        environment=environment_strategy,
        group1_permissions=permissions_list_strategy,
        group2_permissions=permissions_list_strategy,
    )
    @settings(max_examples=100)
    def test_multiple_groups_union(
        self,
        user_id: str,
        application_id: str,
        environment: str,
        group1_permissions: list[str],
        group2_permissions: list[str],
    ) -> None:
        """
        Property 6 (corollary): Multiple group roles are also unioned.

        For any user in multiple groups, the effective permissions should
        include permissions from ALL groups.

        **Validates: Requirements 5.3**
        """
        with patch("boto3.resource") as mock_resource:
            # Create two group memberships
            group1_id = "group-1-id"
            group2_id = "group-2-id"

            group1_membership = {
                "applicationGroupUserId": "membership-1-id",
                "applicationGroupId": group1_id,
                "userId": user_id,
                "applicationId": application_id,
                "status": "ACTIVE",
            }

            group2_membership = {
                "applicationGroupUserId": "membership-2-id",
                "applicationGroupId": group2_id,
                "userId": user_id,
                "applicationId": application_id,
                "status": "ACTIVE",
            }

            # Create groups
            group1 = {
                "applicationGroupId": group1_id,
                "name": "Group 1",
                "status": "ACTIVE",
            }

            group2 = {
                "applicationGroupId": group2_id,
                "name": "Group 2",
                "status": "ACTIVE",
            }

            # Create group roles
            group1_role = {
                "applicationGroupRoleId": "group-role-1-id",
                "applicationGroupId": group1_id,
                "roleId": "role-1",
                "roleName": "Role 1",
                "permissions": group1_permissions,
                "status": "ACTIVE",
            }

            group2_role = {
                "applicationGroupRoleId": "group-role-2-id",
                "applicationGroupId": group2_id,
                "roleId": "role-2",
                "roleName": "Role 2",
                "permissions": group2_permissions,
                "status": "ACTIVE",
            }

            # Setup mock tables
            mock_user_roles_table = MockDynamoDBTable()
            mock_group_users_table = MockDynamoDBTable()
            mock_group_roles_table = MockDynamoDBTable()
            mock_groups_table = MockDynamoDBTable()

            mock_user_roles_table.query_results = []  # No direct roles
            mock_group_users_table.query_results = [group1_membership, group2_membership]
            mock_groups_table.items[group1_id] = group1
            mock_groups_table.items[group2_id] = group2

            # Mock group roles query to return appropriate role for each group
            def mock_group_roles_query(**kwargs: Any) -> dict[str, Any]:
                # Return both roles - the service will filter by group
                return {"Items": [group1_role, group2_role]}

            mock_group_roles_table.query = mock_group_roles_query  # type: ignore[method-assign]

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
            expected_union = set(group1_permissions) | set(group2_permissions)

            # Effective permissions should include permissions from both groups
            assert (
                effective_perms == expected_union
            ), f"Expected union {expected_union}, got {effective_perms}"

    @given(
        user_id=uuid_strategy,
        application_id=uuid_strategy,
        environment=environment_strategy,
        shared_permissions=permissions_list_strategy,
    )
    @settings(max_examples=100)
    def test_duplicate_permissions_deduplicated(
        self,
        user_id: str,
        application_id: str,
        environment: str,
        shared_permissions: list[str],
    ) -> None:
        """
        Property 6 (corollary): Duplicate permissions are deduplicated.

        When the same permission appears in multiple sources, it should
        only appear once in the effective permissions.

        **Validates: Requirements 5.3**
        """
        assume(len(shared_permissions) > 0)

        with patch("boto3.resource") as mock_resource:
            # Create direct role with same permissions as group
            direct_role = {
                "applicationUserRoleId": "direct-role-id",
                "roleId": "direct-role",
                "roleName": "Direct Role",
                "permissions": shared_permissions,  # Same permissions
                "status": "ACTIVE",
                "applicationId": application_id,
            }

            # Create group with same permissions
            group_id = "test-group-id"
            group_membership = {
                "applicationGroupUserId": "membership-id",
                "applicationGroupId": group_id,
                "userId": user_id,
                "applicationId": application_id,
                "status": "ACTIVE",
            }

            group = {
                "applicationGroupId": group_id,
                "name": "Test Group",
                "status": "ACTIVE",
            }

            group_role = {
                "applicationGroupRoleId": "group-role-id",
                "applicationGroupId": group_id,
                "roleId": "group-role",
                "roleName": "Group Role",
                "permissions": shared_permissions,  # Same permissions
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

            effective_perms = result.get("item", {}).get("effectivePermissions", [])

            # No duplicates - length should equal unique count
            assert len(effective_perms) == len(
                set(effective_perms)
            ), f"Duplicate permissions found: {effective_perms}"

            # Should contain all shared permissions exactly once
            assert set(effective_perms) == set(
                shared_permissions
            ), f"Expected {set(shared_permissions)}, got {set(effective_perms)}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
