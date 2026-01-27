# file: apps/api/tests/property/test_application_group_role_environment_property.py
# description: Property-based tests for application group role environment isolation
# Feature: application-access-management, Property 7: Group Role Environment Isolation
# Validates: Requirements 3.4

"""
Property 7: Group Role Environment Isolation

*For any* group with role assignments in multiple environments, changing the role
in one environment must not affect the role in other environments.
"""

import sys
import uuid
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from hypothesis import given, settings, assume
import hypothesis.strategies as st

# Add lambdas directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "lambdas" / "application_group_roles"))


# Strategy for generating UUIDs
uuid_strategy = st.uuids().map(str)

# Strategy for generating valid environments
environment_strategy = st.sampled_from(["PRODUCTION", "STAGING", "DEVELOPMENT", "TEST", "PREVIEW"])

# Strategy for generating role names
role_name_strategy = st.text(
    alphabet=st.characters(whitelist_categories=("L", "N")),
    min_size=1,
    max_size=50,
).filter(lambda x: x.strip() != "")

# Strategy for generating permissions
permission_strategy = st.lists(
    st.text(
        alphabet=st.characters(whitelist_categories=("L", "N", "P")),
        min_size=1,
        max_size=30,
    ).filter(lambda x: x.strip() != ""),
    min_size=0,
    max_size=10,
)


class MockDynamoDBTable:
    """Mock DynamoDB table for testing."""

    def __init__(self) -> None:
        self.items: dict[str, dict[str, Any]] = {}

    def put_item(self, Item: dict[str, Any], **kwargs: Any) -> None:
        """Mock put_item."""
        pk_val = Item.get("applicationGroupRoleId") or Item.get("applicationGroupId")
        pk = str(pk_val) if pk_val else None
        if pk:
            self.items[pk] = Item.copy()

    def get_item(self, Key: dict[str, Any]) -> dict[str, Any]:
        """Mock get_item."""
        pk_val = Key.get("applicationGroupRoleId") or Key.get("applicationGroupId")
        pk = str(pk_val) if pk_val else None
        item = self.items.get(pk) if pk else None
        return {"Item": item} if item else {}

    def query(self, **kwargs: Any) -> dict[str, Any]:
        """Mock query for GSI."""
        # Extract filter conditions
        filter_expr = kwargs.get("FilterExpression")

        results = []
        for item in self.items.values():
            # Simple filtering based on status
            if filter_expr and item.get("status") != "ACTIVE":
                continue
            results.append(item)

        return {"Items": results}

    def update_item(self, **kwargs: Any) -> dict[str, Any]:
        """Mock update_item."""
        pk = kwargs.get("Key", {}).get("applicationGroupRoleId")
        if pk and pk in self.items:
            # Apply updates from ExpressionAttributeValues
            expr_values = kwargs.get("ExpressionAttributeValues", {})

            for key, value in expr_values.items():
                attr_name = key.lstrip(":")
                # Handle aliased names (e.g., #status -> status)
                if attr_name == "deleted":
                    # This is the value for status = :deleted
                    self.items[pk]["status"] = value
                elif attr_name in ["roleId", "roleName", "permissions", "updatedAt", "status"]:
                    self.items[pk][attr_name] = value
            return {"Attributes": self.items[pk].copy()}
        return {"Attributes": {}}


class TestEnvironmentIsolation:
    """Property tests for environment isolation of group role assignments."""

    @given(
        group_id=uuid_strategy,
        application_id=uuid_strategy,
        env1=environment_strategy,
        env2=environment_strategy,
        role_id1=uuid_strategy,
        role_id2=uuid_strategy,
        role_name1=role_name_strategy,
        role_name2=role_name_strategy,
        permissions1=permission_strategy,
        permissions2=permission_strategy,
    )
    @settings(max_examples=100)
    def test_different_environments_independent(
        self,
        group_id: str,
        application_id: str,
        env1: str,
        env2: str,
        role_id1: str,
        role_id2: str,
        role_name1: str,
        role_name2: str,
        permissions1: list[str],
        permissions2: list[str],
    ) -> None:
        """
        Property: Role assignments in different environments are independent.

        For any group with role assignments in two different environments,
        the role in each environment SHALL be independent of the other.
        """
        # Skip if environments are the same
        assume(env1 != env2)

        with patch("boto3.resource") as mock_resource:
            # Setup mocks
            mock_group_roles_table = MockDynamoDBTable()
            mock_groups_table = MockDynamoDBTable()
            mock_roles_table = MockDynamoDBTable()
            mock_dynamodb = MagicMock()

            def table_selector(name: str) -> MockDynamoDBTable:
                if "group-roles" in name:
                    return mock_group_roles_table
                elif "groups" in name and "users" not in name and "roles" not in name:
                    return mock_groups_table
                else:
                    return mock_roles_table

            mock_dynamodb.Table.side_effect = table_selector
            mock_resource.return_value = mock_dynamodb

            from index import ApplicationGroupRoleService

            service = ApplicationGroupRoleService()
            service.group_roles_table = mock_group_roles_table
            service.groups_table = mock_groups_table
            service.roles_table = mock_roles_table

            # Create an active group
            mock_groups_table.items[group_id] = {
                "applicationGroupId": group_id,
                "applicationId": application_id,
                "status": "ACTIVE",
            }

            # Assign role to first environment
            event1 = {
                "arguments": {
                    "input": {
                        "applicationGroupId": group_id,
                        "applicationId": application_id,
                        "environment": env1,
                        "roleId": role_id1,
                        "roleName": role_name1,
                        "permissions": permissions1,
                    }
                }
            }

            # Mock _get_group_role to return None (no existing assignment)
            with patch.object(service, "_get_group_role", return_value=None):
                result1 = service.assign_role_to_group(event1)

            assert result1["success"], f"First assignment should succeed: {result1}"
            assignment1_id = result1["item"]["applicationGroupRoleId"]

            # Store the assignment
            mock_group_roles_table.items[assignment1_id] = result1["item"]

            # Assign different role to second environment
            event2 = {
                "arguments": {
                    "input": {
                        "applicationGroupId": group_id,
                        "applicationId": application_id,
                        "environment": env2,
                        "roleId": role_id2,
                        "roleName": role_name2,
                        "permissions": permissions2,
                    }
                }
            }

            with patch.object(service, "_get_group_role", return_value=None):
                result2 = service.assign_role_to_group(event2)

            assert result2["success"], f"Second assignment should succeed: {result2}"
            assignment2_id = result2["item"]["applicationGroupRoleId"]

            # Store the second assignment
            mock_group_roles_table.items[assignment2_id] = result2["item"]

            # Verify both assignments exist with correct values
            stored1 = mock_group_roles_table.items[assignment1_id]
            stored2 = mock_group_roles_table.items[assignment2_id]

            # Environment 1 should have role 1
            assert stored1["environment"] == env1
            assert stored1["roleId"] == role_id1
            assert stored1["roleName"] == role_name1
            assert stored1["permissions"] == permissions1

            # Environment 2 should have role 2
            assert stored2["environment"] == env2
            assert stored2["roleId"] == role_id2
            assert stored2["roleName"] == role_name2
            assert stored2["permissions"] == permissions2

    @given(
        group_id=uuid_strategy,
        application_id=uuid_strategy,
        env1=environment_strategy,
        env2=environment_strategy,
        original_role_id=uuid_strategy,
        new_role_id=uuid_strategy,
        original_role_name=role_name_strategy,
        new_role_name=role_name_strategy,
    )
    @settings(max_examples=100)
    def test_updating_one_environment_does_not_affect_other(
        self,
        group_id: str,
        application_id: str,
        env1: str,
        env2: str,
        original_role_id: str,
        new_role_id: str,
        original_role_name: str,
        new_role_name: str,
    ) -> None:
        """
        Property: Updating a role in one environment does not affect other environments.

        For any group with role assignments in multiple environments, updating
        the role in one environment SHALL NOT change the role in other environments.
        """
        assume(env1 != env2)
        assume(original_role_id != new_role_id)

        with patch("boto3.resource") as mock_resource:
            mock_group_roles_table = MockDynamoDBTable()
            mock_groups_table = MockDynamoDBTable()
            mock_roles_table = MockDynamoDBTable()
            mock_dynamodb = MagicMock()

            def table_selector(name: str) -> MockDynamoDBTable:
                if "group-roles" in name:
                    return mock_group_roles_table
                elif "groups" in name and "users" not in name and "roles" not in name:
                    return mock_groups_table
                else:
                    return mock_roles_table

            mock_dynamodb.Table.side_effect = table_selector
            mock_resource.return_value = mock_dynamodb

            from index import ApplicationGroupRoleService

            service = ApplicationGroupRoleService()
            service.group_roles_table = mock_group_roles_table
            service.groups_table = mock_groups_table
            service.roles_table = mock_roles_table

            # Create an active group
            mock_groups_table.items[group_id] = {
                "applicationGroupId": group_id,
                "applicationId": application_id,
                "status": "ACTIVE",
            }

            # Create existing role assignments for both environments
            assignment1_id = str(uuid.uuid4())
            assignment2_id = str(uuid.uuid4())

            mock_group_roles_table.items[assignment1_id] = {
                "applicationGroupRoleId": assignment1_id,
                "applicationGroupId": group_id,
                "applicationId": application_id,
                "environment": env1,
                "roleId": original_role_id,
                "roleName": original_role_name,
                "permissions": ["read"],
                "status": "ACTIVE",
            }

            mock_group_roles_table.items[assignment2_id] = {
                "applicationGroupRoleId": assignment2_id,
                "applicationGroupId": group_id,
                "applicationId": application_id,
                "environment": env2,
                "roleId": original_role_id,
                "roleName": original_role_name,
                "permissions": ["read"],
                "status": "ACTIVE",
            }

            # Capture env2 state before update
            env2_role_before = mock_group_roles_table.items[assignment2_id]["roleId"]
            env2_name_before = mock_group_roles_table.items[assignment2_id]["roleName"]

            # Update role in env1 only
            update_event = {
                "arguments": {
                    "input": {
                        "applicationGroupRoleId": assignment1_id,
                        "roleId": new_role_id,
                        "roleName": new_role_name,
                    }
                }
            }

            result = service.update_group_role(update_event)
            assert result["success"], f"Update should succeed: {result}"

            # Verify env1 was updated
            env1_after = mock_group_roles_table.items[assignment1_id]
            assert env1_after["roleId"] == new_role_id
            assert env1_after["roleName"] == new_role_name

            # Verify env2 was NOT affected
            env2_after = mock_group_roles_table.items[assignment2_id]
            assert (
                env2_after["roleId"] == env2_role_before
            ), f"Env2 role should not change: was {env2_role_before}, now {env2_after['roleId']}"
            assert (
                env2_after["roleName"] == env2_name_before
            ), f"Env2 name should not change: was {env2_name_before}, now {env2_after['roleName']}"

    @given(
        group_id=uuid_strategy,
        application_id=uuid_strategy,
        env1=environment_strategy,
        env2=environment_strategy,
        role_id=uuid_strategy,
        role_name=role_name_strategy,
    )
    @settings(max_examples=100)
    def test_deleting_one_environment_does_not_affect_other(
        self,
        group_id: str,
        application_id: str,
        env1: str,
        env2: str,
        role_id: str,
        role_name: str,
    ) -> None:
        """
        Property: Deleting a role in one environment does not affect other environments.

        For any group with role assignments in multiple environments, deleting
        the role in one environment SHALL NOT affect the role in other environments.
        """
        assume(env1 != env2)

        with patch("boto3.resource") as mock_resource:
            mock_group_roles_table = MockDynamoDBTable()
            mock_groups_table = MockDynamoDBTable()
            mock_roles_table = MockDynamoDBTable()
            mock_dynamodb = MagicMock()

            def table_selector(name: str) -> MockDynamoDBTable:
                if "group-roles" in name:
                    return mock_group_roles_table
                elif "groups" in name and "users" not in name and "roles" not in name:
                    return mock_groups_table
                else:
                    return mock_roles_table

            mock_dynamodb.Table.side_effect = table_selector
            mock_resource.return_value = mock_dynamodb

            from index import ApplicationGroupRoleService

            service = ApplicationGroupRoleService()
            service.group_roles_table = mock_group_roles_table
            service.groups_table = mock_groups_table
            service.roles_table = mock_roles_table

            # Create an active group
            mock_groups_table.items[group_id] = {
                "applicationGroupId": group_id,
                "applicationId": application_id,
                "status": "ACTIVE",
            }

            # Create existing role assignments for both environments
            assignment1_id = str(uuid.uuid4())
            assignment2_id = str(uuid.uuid4())

            mock_group_roles_table.items[assignment1_id] = {
                "applicationGroupRoleId": assignment1_id,
                "applicationGroupId": group_id,
                "applicationId": application_id,
                "environment": env1,
                "roleId": role_id,
                "roleName": role_name,
                "permissions": ["read", "write"],
                "status": "ACTIVE",
            }

            mock_group_roles_table.items[assignment2_id] = {
                "applicationGroupRoleId": assignment2_id,
                "applicationGroupId": group_id,
                "applicationId": application_id,
                "environment": env2,
                "roleId": role_id,
                "roleName": role_name,
                "permissions": ["read", "write"],
                "status": "ACTIVE",
            }

            # Delete role in env1
            delete_event = {
                "arguments": {
                    "input": {
                        "applicationGroupRoleId": assignment1_id,
                    }
                }
            }

            result = service.remove_group_role(delete_event)
            assert result["success"], f"Delete should succeed: {result}"

            # Verify env1 was deleted
            env1_after = mock_group_roles_table.items[assignment1_id]
            assert env1_after["status"] == "DELETED"

            # Verify env2 was NOT affected
            env2_after = mock_group_roles_table.items[assignment2_id]
            assert (
                env2_after["status"] == "ACTIVE"
            ), f"Env2 should still be ACTIVE, but is {env2_after['status']}"
            assert env2_after["roleId"] == role_id
            assert env2_after["roleName"] == role_name


class TestSameGroupDifferentRolesPerEnvironment:
    """Property tests for allowing different roles per environment."""

    @given(
        group_id=uuid_strategy,
        application_id=uuid_strategy,
        role_id1=uuid_strategy,
        role_id2=uuid_strategy,
        role_name1=role_name_strategy,
        role_name2=role_name_strategy,
    )
    @settings(max_examples=50)
    def test_same_group_can_have_different_roles_in_different_environments(
        self,
        group_id: str,
        application_id: str,
        role_id1: str,
        role_id2: str,
        role_name1: str,
        role_name2: str,
    ) -> None:
        """
        Property: A group can have different roles in different environments.

        For any group, assigning different roles to different environments
        SHALL succeed and maintain the correct role per environment.
        """
        assume(role_id1 != role_id2)

        with patch("boto3.resource") as mock_resource:
            mock_group_roles_table = MockDynamoDBTable()
            mock_groups_table = MockDynamoDBTable()
            mock_roles_table = MockDynamoDBTable()
            mock_dynamodb = MagicMock()

            def table_selector(name: str) -> MockDynamoDBTable:
                if "group-roles" in name:
                    return mock_group_roles_table
                elif "groups" in name and "users" not in name and "roles" not in name:
                    return mock_groups_table
                else:
                    return mock_roles_table

            mock_dynamodb.Table.side_effect = table_selector
            mock_resource.return_value = mock_dynamodb

            from index import ApplicationGroupRoleService

            service = ApplicationGroupRoleService()
            service.group_roles_table = mock_group_roles_table
            service.groups_table = mock_groups_table
            service.roles_table = mock_roles_table

            # Create an active group
            mock_groups_table.items[group_id] = {
                "applicationGroupId": group_id,
                "applicationId": application_id,
                "status": "ACTIVE",
            }

            # Assign "Writer" role in DEVELOPMENT
            dev_event = {
                "arguments": {
                    "input": {
                        "applicationGroupId": group_id,
                        "applicationId": application_id,
                        "environment": "DEVELOPMENT",
                        "roleId": role_id1,
                        "roleName": role_name1,
                        "permissions": ["read", "write"],
                    }
                }
            }

            with patch.object(service, "_get_group_role", return_value=None):
                dev_result = service.assign_role_to_group(dev_event)

            assert dev_result["success"], f"DEV assignment should succeed: {dev_result}"
            dev_assignment_id = dev_result["item"]["applicationGroupRoleId"]
            mock_group_roles_table.items[dev_assignment_id] = dev_result["item"]

            # Assign "Reader" role in PRODUCTION
            prod_event = {
                "arguments": {
                    "input": {
                        "applicationGroupId": group_id,
                        "applicationId": application_id,
                        "environment": "PRODUCTION",
                        "roleId": role_id2,
                        "roleName": role_name2,
                        "permissions": ["read"],
                    }
                }
            }

            with patch.object(service, "_get_group_role", return_value=None):
                prod_result = service.assign_role_to_group(prod_event)

            assert prod_result["success"], f"PROD assignment should succeed: {prod_result}"
            prod_assignment_id = prod_result["item"]["applicationGroupRoleId"]
            mock_group_roles_table.items[prod_assignment_id] = prod_result["item"]

            # Verify both assignments exist with correct roles
            dev_stored = mock_group_roles_table.items[dev_assignment_id]
            prod_stored = mock_group_roles_table.items[prod_assignment_id]

            # DEV should have role 1 (Writer)
            assert dev_stored["environment"] == "DEVELOPMENT"
            assert dev_stored["roleId"] == role_id1
            assert dev_stored["roleName"] == role_name1
            assert "write" in dev_stored["permissions"]

            # PROD should have role 2 (Reader)
            assert prod_stored["environment"] == "PRODUCTION"
            assert prod_stored["roleId"] == role_id2
            assert prod_stored["roleName"] == role_name2
            assert "write" not in prod_stored["permissions"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
