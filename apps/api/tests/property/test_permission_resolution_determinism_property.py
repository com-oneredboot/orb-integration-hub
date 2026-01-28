# file: apps/api/tests/property/test_permission_resolution_determinism_property.py
# author: AI Assistant
# created: 2026-01-27
# description: Property test for Permission Resolution Determinism
# Feature: application-access-management, Property 4: Permission Resolution Determinism
# **Validates: Requirements 5.6**

"""
Property 4: Permission Resolution Determinism

*For any* user, application, and environment combination, calling resolvePermissions
multiple times with identical inputs must return identical results.

This test validates that the permission resolution algorithm is deterministic -
the same inputs always produce the same outputs, regardless of:
- Order of database queries
- Timing of calls
- Internal state
"""

import sys
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from hypothesis import given, settings
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
    min_size=0,
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


# Strategy for generating direct role data
@st.composite
def direct_role_strategy(draw: st.DrawFn) -> dict[str, Any]:
    """Generate a direct role assignment."""
    return {
        "applicationUserRoleId": draw(uuid_strategy),
        "roleId": draw(uuid_strategy),
        "roleName": draw(st.text(min_size=1, max_size=20)),
        "permissions": draw(permissions_list_strategy),
        "status": "ACTIVE",
    }


class TestPermissionResolutionDeterminism:
    """Property tests for Permission Resolution Determinism (Property 4)."""

    @given(
        user_id=uuid_strategy,
        application_id=uuid_strategy,
        environment=environment_strategy,
        direct_roles=st.lists(direct_role_strategy(), min_size=0, max_size=5),
    )
    @settings(max_examples=100)
    def test_resolve_permissions_is_deterministic(
        self,
        user_id: str,
        application_id: str,
        environment: str,
        direct_roles: list[dict[str, Any]],
    ) -> None:
        """
        Property 4: Permission Resolution Determinism

        For any user, application, and environment combination, calling
        resolvePermissions multiple times with identical inputs must return
        identical results.

        **Validates: Requirements 5.6**
        """
        with patch("boto3.resource") as mock_resource:
            # Setup mock tables
            mock_user_roles_table = MockDynamoDBTable()
            mock_group_users_table = MockDynamoDBTable()
            mock_group_roles_table = MockDynamoDBTable()
            mock_groups_table = MockDynamoDBTable()

            # Configure mock responses
            mock_user_roles_table.query_results = direct_roles
            mock_group_users_table.query_results = []  # No group memberships

            mock_dynamodb = MagicMock()

            def mock_table(name: str) -> MockDynamoDBTable:
                if "user-roles" in name:
                    return mock_user_roles_table
                elif "group-users" in name:
                    return mock_group_users_table
                elif "group-roles" in name:
                    return mock_group_roles_table
                elif "groups" in name:
                    return mock_groups_table
                return MockDynamoDBTable()

            mock_dynamodb.Table.side_effect = mock_table
            mock_resource.return_value = mock_dynamodb

            # Import after patching
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

            # Call resolve_permissions multiple times
            result1 = service.resolve_permissions(event)
            result2 = service.resolve_permissions(event)
            result3 = service.resolve_permissions(event)

            # All calls should succeed
            assert result1.get("success") is True
            assert result2.get("success") is True
            assert result3.get("success") is True

            # Extract effective permissions (ignore resolvedAt timestamp)
            perms1 = result1.get("item", {}).get("effectivePermissions", [])
            perms2 = result2.get("item", {}).get("effectivePermissions", [])
            perms3 = result3.get("item", {}).get("effectivePermissions", [])

            # All results must be identical
            assert perms1 == perms2, "First and second calls returned different permissions"
            assert perms2 == perms3, "Second and third calls returned different permissions"

            # Direct roles should be identical
            direct1 = result1.get("item", {}).get("directRoles", [])
            direct2 = result2.get("item", {}).get("directRoles", [])
            direct3 = result3.get("item", {}).get("directRoles", [])

            assert direct1 == direct2 == direct3, "Direct roles differ between calls"

    @given(
        user_id=uuid_strategy,
        application_id=uuid_strategy,
        environment=environment_strategy,
        permissions=permissions_list_strategy,
    )
    @settings(max_examples=100)
    def test_effective_permissions_are_sorted(
        self,
        user_id: str,
        application_id: str,
        environment: str,
        permissions: list[str],
    ) -> None:
        """
        Property 4 (corollary): Effective permissions are always sorted.

        This ensures deterministic ordering regardless of input order.

        **Validates: Requirements 5.6**
        """
        with patch("boto3.resource") as mock_resource:
            # Create a direct role with the permissions
            direct_role = {
                "applicationUserRoleId": "test-role-id",
                "roleId": "role-1",
                "roleName": "Test Role",
                "permissions": permissions,
                "status": "ACTIVE",
            }

            mock_user_roles_table = MockDynamoDBTable()
            mock_group_users_table = MockDynamoDBTable()
            mock_group_roles_table = MockDynamoDBTable()
            mock_groups_table = MockDynamoDBTable()

            mock_user_roles_table.query_results = [direct_role]
            mock_group_users_table.query_results = []

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

            # Permissions should be sorted
            assert effective_perms == sorted(
                effective_perms
            ), "Effective permissions are not sorted"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
