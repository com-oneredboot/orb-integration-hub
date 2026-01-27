# file: apps/api/tests/property/test_application_group_membership_property.py
# description: Property-based tests for application group membership uniqueness
# Feature: application-access-management, Property 3: Membership Uniqueness
# Validates: Requirements 2.5

"""
Property 3: Membership Uniqueness

*For any* group and user combination, there can be at most one ACTIVE
ApplicationGroupUser record.
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
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "lambdas" / "application_group_users"))


# Strategy for generating UUIDs
uuid_strategy = st.uuids().map(str)


class MockDynamoDBTable:
    """Mock DynamoDB table for testing."""

    def __init__(self) -> None:
        self.items: dict[str, dict[str, Any]] = {}

    def put_item(self, Item: dict[str, Any], **kwargs: Any) -> None:
        """Mock put_item."""
        pk_val = Item.get("applicationGroupUserId") or Item.get("applicationGroupId")
        pk = str(pk_val) if pk_val else None
        if pk:
            self.items[pk] = Item.copy()

    def get_item(self, Key: dict[str, Any]) -> dict[str, Any]:
        """Mock get_item."""
        pk_val = Key.get("applicationGroupUserId") or Key.get("applicationGroupId")
        pk = str(pk_val) if pk_val else None
        item = self.items.get(pk) if pk else None
        return {"Item": item} if item else {}

    def query(self, **kwargs: Any) -> dict[str, Any]:
        """Mock query."""
        return {"Items": list(self.items.values())}

    def update_item(self, **kwargs: Any) -> dict[str, Any]:
        """Mock update_item."""
        pk = kwargs.get("Key", {}).get("applicationGroupUserId") or kwargs.get("Key", {}).get(
            "applicationGroupId"
        )
        if pk and pk in self.items:
            return {"Attributes": self.items[pk]}
        return {"Attributes": {}}


class TestMembershipUniqueness:
    """Property tests for membership uniqueness."""

    @given(
        group_id=uuid_strategy,
        user_id=uuid_strategy,
        application_id=uuid_strategy,
    )
    @settings(max_examples=100)
    def test_cannot_add_duplicate_membership(
        self, group_id: str, user_id: str, application_id: str
    ) -> None:
        """
        Property: Adding the same user to the same group twice must fail.

        For any group and user, if an ACTIVE membership already exists,
        adding the user again SHALL fail.
        """
        with patch("boto3.resource") as mock_resource:
            # Setup mock
            mock_group_users_table = MockDynamoDBTable()
            mock_groups_table = MockDynamoDBTable()
            mock_dynamodb = MagicMock()
            mock_dynamodb.Table.side_effect = lambda name: (
                mock_groups_table
                if "groups" in name and "users" not in name
                else mock_group_users_table
            )
            mock_resource.return_value = mock_dynamodb

            from index import ApplicationGroupUserService

            service = ApplicationGroupUserService()
            service.group_users_table = mock_group_users_table
            service.groups_table = mock_groups_table

            # Create an active group
            mock_groups_table.items[group_id] = {
                "applicationGroupId": group_id,
                "applicationId": application_id,
                "status": "ACTIVE",
                "memberCount": 0,
            }

            # First add - should succeed
            event1 = {
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
                    result1 = service.add_user_to_group(event1)

            assert result1["success"], f"First add should succeed: {result1}"

            # Second add - should fail
            event2 = {
                "arguments": {
                    "input": {
                        "applicationGroupId": group_id,
                        "userId": user_id,
                        "applicationId": application_id,
                    }
                }
            }

            with patch.object(service, "_membership_exists", return_value=True):
                result2 = service.add_user_to_group(event2)

            assert not result2["success"], f"Second add should fail: {result2}"
            assert "AAM003" in result2["message"], "Should return AAM003 error code"

    @given(
        group_id=uuid_strategy,
        user_id1=uuid_strategy,
        user_id2=uuid_strategy,
        application_id=uuid_strategy,
    )
    @settings(max_examples=100)
    def test_different_users_can_join_same_group(
        self, group_id: str, user_id1: str, user_id2: str, application_id: str
    ) -> None:
        """
        Property: Different users can be added to the same group.

        For any group and two different users, both SHALL be able to join.
        """
        assume(user_id1 != user_id2)

        with patch("boto3.resource") as mock_resource:
            mock_group_users_table = MockDynamoDBTable()
            mock_groups_table = MockDynamoDBTable()
            mock_dynamodb = MagicMock()
            mock_dynamodb.Table.side_effect = lambda name: (
                mock_groups_table
                if "groups" in name and "users" not in name
                else mock_group_users_table
            )
            mock_resource.return_value = mock_dynamodb

            from index import ApplicationGroupUserService

            service = ApplicationGroupUserService()
            service.group_users_table = mock_group_users_table
            service.groups_table = mock_groups_table

            # Create an active group
            mock_groups_table.items[group_id] = {
                "applicationGroupId": group_id,
                "applicationId": application_id,
                "status": "ACTIVE",
                "memberCount": 0,
            }

            # Add first user
            event1 = {
                "arguments": {
                    "input": {
                        "applicationGroupId": group_id,
                        "userId": user_id1,
                        "applicationId": application_id,
                    }
                }
            }

            with patch.object(service, "_membership_exists", return_value=False):
                with patch.object(service, "_increment_member_count"):
                    result1 = service.add_user_to_group(event1)

            assert result1["success"], f"First user add should succeed: {result1}"

            # Add second user
            event2 = {
                "arguments": {
                    "input": {
                        "applicationGroupId": group_id,
                        "userId": user_id2,
                        "applicationId": application_id,
                    }
                }
            }

            with patch.object(service, "_membership_exists", return_value=False):
                with patch.object(service, "_increment_member_count"):
                    result2 = service.add_user_to_group(event2)

            assert result2["success"], f"Second user add should succeed: {result2}"

    @given(
        group_id1=uuid_strategy,
        group_id2=uuid_strategy,
        user_id=uuid_strategy,
        application_id=uuid_strategy,
    )
    @settings(max_examples=100)
    def test_same_user_can_join_different_groups(
        self, group_id1: str, group_id2: str, user_id: str, application_id: str
    ) -> None:
        """
        Property: The same user can be added to different groups.

        For any user and two different groups, the user SHALL be able to join both.
        """
        assume(group_id1 != group_id2)

        with patch("boto3.resource") as mock_resource:
            mock_group_users_table = MockDynamoDBTable()
            mock_groups_table = MockDynamoDBTable()
            mock_dynamodb = MagicMock()
            mock_dynamodb.Table.side_effect = lambda name: (
                mock_groups_table
                if "groups" in name and "users" not in name
                else mock_group_users_table
            )
            mock_resource.return_value = mock_dynamodb

            from index import ApplicationGroupUserService

            service = ApplicationGroupUserService()
            service.group_users_table = mock_group_users_table
            service.groups_table = mock_groups_table

            # Create two active groups
            mock_groups_table.items[group_id1] = {
                "applicationGroupId": group_id1,
                "applicationId": application_id,
                "status": "ACTIVE",
                "memberCount": 0,
            }
            mock_groups_table.items[group_id2] = {
                "applicationGroupId": group_id2,
                "applicationId": application_id,
                "status": "ACTIVE",
                "memberCount": 0,
            }

            # Add user to first group
            event1 = {
                "arguments": {
                    "input": {
                        "applicationGroupId": group_id1,
                        "userId": user_id,
                        "applicationId": application_id,
                    }
                }
            }

            with patch.object(service, "_membership_exists", return_value=False):
                with patch.object(service, "_increment_member_count"):
                    result1 = service.add_user_to_group(event1)

            assert result1["success"], f"First group add should succeed: {result1}"

            # Add user to second group
            event2 = {
                "arguments": {
                    "input": {
                        "applicationGroupId": group_id2,
                        "userId": user_id,
                        "applicationId": application_id,
                    }
                }
            }

            with patch.object(service, "_membership_exists", return_value=False):
                with patch.object(service, "_increment_member_count"):
                    result2 = service.add_user_to_group(event2)

            assert result2["success"], f"Second group add should succeed: {result2}"


class TestRemovedMembershipReuse:
    """Property tests for reusing removed memberships."""

    @given(
        group_id=uuid_strategy,
        user_id=uuid_strategy,
        application_id=uuid_strategy,
    )
    @settings(max_examples=50)
    def test_can_rejoin_after_removal(
        self, group_id: str, user_id: str, application_id: str
    ) -> None:
        """
        Property: After a user is removed from a group, they can rejoin.

        For any removed membership, creating a new ACTIVE membership for the
        same user and group SHALL succeed.
        """
        with patch("boto3.resource") as mock_resource:
            mock_group_users_table = MockDynamoDBTable()
            mock_groups_table = MockDynamoDBTable()
            mock_dynamodb = MagicMock()
            mock_dynamodb.Table.side_effect = lambda name: (
                mock_groups_table
                if "groups" in name and "users" not in name
                else mock_group_users_table
            )
            mock_resource.return_value = mock_dynamodb

            from index import ApplicationGroupUserService

            service = ApplicationGroupUserService()
            service.group_users_table = mock_group_users_table
            service.groups_table = mock_groups_table

            # Create an active group
            mock_groups_table.items[group_id] = {
                "applicationGroupId": group_id,
                "applicationId": application_id,
                "status": "ACTIVE",
                "memberCount": 0,
            }

            # Create a removed membership
            old_membership_id = str(uuid.uuid4())
            mock_group_users_table.items[old_membership_id] = {
                "applicationGroupUserId": old_membership_id,
                "applicationGroupId": group_id,
                "userId": user_id,
                "applicationId": application_id,
                "status": "REMOVED",  # Already removed
            }

            # Try to rejoin
            event = {
                "arguments": {
                    "input": {
                        "applicationGroupId": group_id,
                        "userId": user_id,
                        "applicationId": application_id,
                    }
                }
            }

            # Membership check should return False (no ACTIVE membership)
            with patch.object(service, "_membership_exists", return_value=False):
                with patch.object(service, "_increment_member_count"):
                    result = service.add_user_to_group(event)

            assert result["success"], f"Rejoin should succeed: {result}"


class TestInactiveGroupMembership:
    """Property tests for membership operations on inactive groups."""

    @given(
        group_id=uuid_strategy,
        user_id=uuid_strategy,
        application_id=uuid_strategy,
    )
    @settings(max_examples=50)
    def test_cannot_add_to_deleted_group(
        self, group_id: str, user_id: str, application_id: str
    ) -> None:
        """
        Property: Cannot add users to deleted groups.

        For any deleted group, adding a user SHALL fail.
        """
        with patch("boto3.resource") as mock_resource:
            mock_group_users_table = MockDynamoDBTable()
            mock_groups_table = MockDynamoDBTable()
            mock_dynamodb = MagicMock()
            mock_dynamodb.Table.side_effect = lambda name: (
                mock_groups_table
                if "groups" in name and "users" not in name
                else mock_group_users_table
            )
            mock_resource.return_value = mock_dynamodb

            from index import ApplicationGroupUserService

            service = ApplicationGroupUserService()
            service.group_users_table = mock_group_users_table
            service.groups_table = mock_groups_table

            # Create a deleted group
            mock_groups_table.items[group_id] = {
                "applicationGroupId": group_id,
                "applicationId": application_id,
                "status": "DELETED",  # Group is deleted
                "memberCount": 0,
            }

            # Try to add user
            event = {
                "arguments": {
                    "input": {
                        "applicationGroupId": group_id,
                        "userId": user_id,
                        "applicationId": application_id,
                    }
                }
            }

            result = service.add_user_to_group(event)

            assert not result["success"], f"Add to deleted group should fail: {result}"
            assert "AAM002" in result["message"], "Should return AAM002 error code"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
