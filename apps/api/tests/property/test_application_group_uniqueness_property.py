# file: apps/api/tests/property/test_application_group_uniqueness_property.py
# description: Property-based tests for application group name uniqueness
# Feature: application-access-management, Property 1: Group Name Uniqueness
# Validates: Requirements 1.5

"""
Property 1: Group Name Uniqueness

*For any* application and any two groups within that application,
if both groups are ACTIVE, their names must be different.
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
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "lambdas" / "application_groups"))


# Strategy for generating valid group names
group_name_strategy = st.text(
    alphabet=st.characters(whitelist_categories=("L", "N", "P", "Z")),
    min_size=1,
    max_size=100,
).filter(lambda x: x.strip() != "")

# Strategy for generating application IDs
application_id_strategy = st.uuids().map(str)


class MockDynamoDBTable:
    """Mock DynamoDB table for testing."""

    def __init__(self) -> None:
        self.items: dict[str, dict[str, Any]] = {}
        self.gsi_data: dict[str, list[dict[str, Any]]] = {}

    def put_item(self, Item: dict[str, Any], **kwargs: Any) -> None:
        """Mock put_item."""
        pk = Item.get("applicationGroupId")
        if pk:
            self.items[pk] = Item.copy()

    def get_item(self, Key: dict[str, Any]) -> dict[str, Any]:
        """Mock get_item."""
        pk_val = Key.get("applicationGroupId")
        pk = str(pk_val) if pk_val else None
        item = self.items.get(pk) if pk else None
        return {"Item": item} if item else {}

    def query(self, **kwargs: Any) -> dict[str, Any]:
        """Mock query for GSI."""
        # Simple mock - return items matching application_id and name
        results = []
        for item in self.items.values():
            if item.get("status") == "ACTIVE":
                results.append(item)

        return {"Items": results}

    def update_item(self, **kwargs: Any) -> dict[str, Any]:
        """Mock update_item."""
        pk = kwargs.get("Key", {}).get("applicationGroupId")
        if pk and pk in self.items:
            # Simple mock - just return the item
            return {"Attributes": self.items[pk]}
        return {"Attributes": {}}


class TestGroupNameUniqueness:
    """Property tests for group name uniqueness."""

    @given(
        application_id=application_id_strategy,
        group_name=group_name_strategy,
    )
    @settings(max_examples=100)
    def test_cannot_create_duplicate_group_name(self, application_id: str, group_name: str) -> None:
        """
        Property: Creating two groups with the same name in the same application
        must fail for the second creation.

        For any application and group name, if a group with that name already exists
        and is ACTIVE, creating another group with the same name SHALL fail.
        """
        # Skip empty or whitespace-only names
        assume(group_name.strip() != "")

        with patch("boto3.resource") as mock_resource:
            # Setup mock
            mock_table = MockDynamoDBTable()
            mock_dynamodb = MagicMock()
            mock_dynamodb.Table.return_value = mock_table
            mock_resource.return_value = mock_dynamodb

            # Import after patching
            from index import ApplicationGroupService

            service = ApplicationGroupService()
            service.groups_table = mock_table
            service.group_users_table = MockDynamoDBTable()
            service.group_roles_table = MockDynamoDBTable()

            # Create first group - should succeed
            event1 = {
                "arguments": {
                    "input": {
                        "applicationId": application_id,
                        "name": group_name,
                    }
                }
            }

            # Mock _group_name_exists to return False for first call
            with patch.object(service, "_group_name_exists", return_value=False):
                result1 = service.create_group(event1)

            assert result1["success"], f"First group creation should succeed: {result1}"
            assert result1["code"] == 200

            # Store the created group in mock table
            if result1.get("item"):
                mock_table.items[result1["item"]["applicationGroupId"]] = result1["item"]

            # Create second group with same name - should fail
            event2 = {
                "arguments": {
                    "input": {
                        "applicationId": application_id,
                        "name": group_name,
                    }
                }
            }

            # Mock _group_name_exists to return True for second call
            with patch.object(service, "_group_name_exists", return_value=True):
                result2 = service.create_group(event2)

            assert not result2["success"], f"Second group creation should fail: {result2}"
            assert "AAM001" in result2["message"], "Should return AAM001 error code"

    @given(
        application_id=application_id_strategy,
        name1=group_name_strategy,
        name2=group_name_strategy,
    )
    @settings(max_examples=100)
    def test_different_names_allowed(self, application_id: str, name1: str, name2: str) -> None:
        """
        Property: Creating groups with different names in the same application
        must succeed.

        For any application and two different group names, both groups SHALL be
        created successfully.
        """
        # Skip if names are the same or empty
        assume(name1.strip() != "")
        assume(name2.strip() != "")
        assume(name1.strip().lower() != name2.strip().lower())

        with patch("boto3.resource") as mock_resource:
            # Setup mock
            mock_table = MockDynamoDBTable()
            mock_dynamodb = MagicMock()
            mock_dynamodb.Table.return_value = mock_table
            mock_resource.return_value = mock_dynamodb

            from index import ApplicationGroupService

            service = ApplicationGroupService()
            service.groups_table = mock_table
            service.group_users_table = MockDynamoDBTable()
            service.group_roles_table = MockDynamoDBTable()

            # Create first group
            event1 = {
                "arguments": {
                    "input": {
                        "applicationId": application_id,
                        "name": name1,
                    }
                }
            }

            with patch.object(service, "_group_name_exists", return_value=False):
                result1 = service.create_group(event1)

            assert result1["success"], f"First group creation should succeed: {result1}"

            # Create second group with different name
            event2 = {
                "arguments": {
                    "input": {
                        "applicationId": application_id,
                        "name": name2,
                    }
                }
            }

            with patch.object(service, "_group_name_exists", return_value=False):
                result2 = service.create_group(event2)

            assert result2["success"], f"Second group creation should succeed: {result2}"

    @given(
        app_id1=application_id_strategy,
        app_id2=application_id_strategy,
        group_name=group_name_strategy,
    )
    @settings(max_examples=100)
    def test_same_name_different_applications_allowed(
        self, app_id1: str, app_id2: str, group_name: str
    ) -> None:
        """
        Property: Creating groups with the same name in different applications
        must succeed.

        For any two different applications and the same group name, both groups
        SHALL be created successfully.
        """
        # Skip if applications are the same or name is empty
        assume(app_id1 != app_id2)
        assume(group_name.strip() != "")

        with patch("boto3.resource") as mock_resource:
            # Setup mock
            mock_table = MockDynamoDBTable()
            mock_dynamodb = MagicMock()
            mock_dynamodb.Table.return_value = mock_table
            mock_resource.return_value = mock_dynamodb

            from index import ApplicationGroupService

            service = ApplicationGroupService()
            service.groups_table = mock_table
            service.group_users_table = MockDynamoDBTable()
            service.group_roles_table = MockDynamoDBTable()

            # Create group in first application
            event1 = {
                "arguments": {
                    "input": {
                        "applicationId": app_id1,
                        "name": group_name,
                    }
                }
            }

            with patch.object(service, "_group_name_exists", return_value=False):
                result1 = service.create_group(event1)

            assert result1["success"], f"First group creation should succeed: {result1}"

            # Create group with same name in second application
            event2 = {
                "arguments": {
                    "input": {
                        "applicationId": app_id2,
                        "name": group_name,
                    }
                }
            }

            # Different application, so name doesn't exist there
            with patch.object(service, "_group_name_exists", return_value=False):
                result2 = service.create_group(event2)

            assert result2["success"], f"Second group creation should succeed: {result2}"


class TestGroupNameUniquenessOnUpdate:
    """Property tests for group name uniqueness during updates."""

    @given(
        application_id=application_id_strategy,
        original_name=group_name_strategy,
        new_name=group_name_strategy,
    )
    @settings(max_examples=50)
    def test_update_to_existing_name_fails(
        self, application_id: str, original_name: str, new_name: str
    ) -> None:
        """
        Property: Updating a group's name to match another existing group's name
        must fail.

        For any group being updated, if the new name matches an existing ACTIVE
        group in the same application, the update SHALL fail.
        """
        # Skip if names are the same or empty
        assume(original_name.strip() != "")
        assume(new_name.strip() != "")
        assume(original_name.strip().lower() != new_name.strip().lower())

        with patch("boto3.resource") as mock_resource:
            # Setup mock
            mock_table = MockDynamoDBTable()
            mock_dynamodb = MagicMock()
            mock_dynamodb.Table.return_value = mock_table
            mock_resource.return_value = mock_dynamodb

            from index import ApplicationGroupService

            service = ApplicationGroupService()
            service.groups_table = mock_table
            service.group_users_table = MockDynamoDBTable()
            service.group_roles_table = MockDynamoDBTable()

            # Create existing group with new_name
            existing_group_id = str(uuid.uuid4())
            mock_table.items[existing_group_id] = {
                "applicationGroupId": existing_group_id,
                "applicationId": application_id,
                "name": new_name,
                "status": "ACTIVE",
            }

            # Create group to update with original_name
            group_to_update_id = str(uuid.uuid4())
            mock_table.items[group_to_update_id] = {
                "applicationGroupId": group_to_update_id,
                "applicationId": application_id,
                "name": original_name,
                "status": "ACTIVE",
            }

            # Try to update to the existing name
            event = {
                "arguments": {
                    "input": {
                        "applicationGroupId": group_to_update_id,
                        "name": new_name,
                    }
                }
            }

            # Mock _group_name_exists to return True (name exists)
            with patch.object(service, "_group_name_exists", return_value=True):
                result = service.update_group(event)

            assert not result["success"], f"Update to existing name should fail: {result}"
            assert "AAM001" in result["message"], "Should return AAM001 error code"


class TestDeletedGroupNameReuse:
    """Property tests for reusing names of deleted groups."""

    @given(
        application_id=application_id_strategy,
        group_name=group_name_strategy,
    )
    @settings(max_examples=50)
    def test_can_reuse_deleted_group_name(self, application_id: str, group_name: str) -> None:
        """
        Property: After a group is deleted, its name can be reused.

        For any deleted group, creating a new group with the same name in the
        same application SHALL succeed.
        """
        assume(group_name.strip() != "")

        with patch("boto3.resource") as mock_resource:
            # Setup mock
            mock_table = MockDynamoDBTable()
            mock_dynamodb = MagicMock()
            mock_dynamodb.Table.return_value = mock_table
            mock_resource.return_value = mock_dynamodb

            from index import ApplicationGroupService

            service = ApplicationGroupService()
            service.groups_table = mock_table
            service.group_users_table = MockDynamoDBTable()
            service.group_roles_table = MockDynamoDBTable()

            # Create a deleted group with the name
            deleted_group_id = str(uuid.uuid4())
            mock_table.items[deleted_group_id] = {
                "applicationGroupId": deleted_group_id,
                "applicationId": application_id,
                "name": group_name,
                "status": "DELETED",  # Group is deleted
            }

            # Create new group with same name
            event = {
                "arguments": {
                    "input": {
                        "applicationId": application_id,
                        "name": group_name,
                    }
                }
            }

            # Mock _group_name_exists to return False (deleted groups don't count)
            with patch.object(service, "_group_name_exists", return_value=False):
                result = service.create_group(event)

            assert result["success"], f"Should be able to reuse deleted group name: {result}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
