# file: apps/api/layers/authentication_dynamodb/cognito_groups.py
# author: Claude Code
# created: 2025-06-19
# description: Cognito User Pool group management utilities

import boto3
import logging
from typing import List, Optional, Dict, Any
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


class CognitoGroupManager:
    """
    Utility class for managing Cognito User Pool groups.
    Handles adding/removing users from groups and validating group membership.
    """

    def __init__(self, user_pool_id: str):
        """
        Initialize the Cognito Group Manager.

        Args:
            user_pool_id: The Cognito User Pool ID
        """
        self.user_pool_id = user_pool_id
        self.cognito_client = boto3.client("cognito-idp")

    def add_user_to_group(self, username: str, group_name: str) -> bool:
        """
        Add a user to a Cognito User Pool group.

        Args:
            username: The Cognito username
            group_name: The group name to add the user to

        Returns:
            True if successful, False otherwise
        """
        try:
            self.cognito_client.admin_add_user_to_group(
                UserPoolId=self.user_pool_id, Username=username, GroupName=group_name
            )
            logger.info(f"Successfully added user {username} to group {group_name}")
            return True
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            if error_code == "UserNotFoundException":
                logger.error(
                    f"User {username} not found in user pool {self.user_pool_id}"
                )
            elif error_code == "ResourceNotFoundException":
                logger.error(
                    f"Group {group_name} not found in user pool {self.user_pool_id}"
                )
            else:
                logger.error(
                    f"Error adding user {username} to group {group_name}: {str(e)}"
                )
            return False
        except Exception as e:
            logger.error(
                f"Unexpected error adding user {username} to group {group_name}: {str(e)}"
            )
            return False

    def remove_user_from_group(self, username: str, group_name: str) -> bool:
        """
        Remove a user from a Cognito User Pool group.

        Args:
            username: The Cognito username
            group_name: The group name to remove the user from

        Returns:
            True if successful, False otherwise
        """
        try:
            self.cognito_client.admin_remove_user_from_group(
                UserPoolId=self.user_pool_id, Username=username, GroupName=group_name
            )
            logger.info(f"Successfully removed user {username} from group {group_name}")
            return True
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            if error_code == "UserNotFoundException":
                logger.error(
                    f"User {username} not found in user pool {self.user_pool_id}"
                )
            elif error_code == "ResourceNotFoundException":
                logger.error(
                    f"Group {group_name} not found in user pool {self.user_pool_id}"
                )
            else:
                logger.error(
                    f"Error removing user {username} from group {group_name}: {str(e)}"
                )
            return False
        except Exception as e:
            logger.error(
                f"Unexpected error removing user {username} from group {group_name}: {str(e)}"
            )
            return False

    def get_user_groups(self, username: str) -> List[str]:
        """
        Get all groups that a user belongs to.

        Args:
            username: The Cognito username

        Returns:
            List of group names the user belongs to
        """
        try:
            response = self.cognito_client.admin_list_groups_for_user(
                UserPoolId=self.user_pool_id, Username=username
            )
            groups = [group["GroupName"] for group in response.get("Groups", [])]
            logger.debug(f"User {username} belongs to groups: {groups}")
            return groups
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            if error_code == "UserNotFoundException":
                logger.error(
                    f"User {username} not found in user pool {self.user_pool_id}"
                )
            else:
                logger.error(f"Error getting groups for user {username}: {str(e)}")
            return []
        except Exception as e:
            logger.error(
                f"Unexpected error getting groups for user {username}: {str(e)}"
            )
            return []

    def user_has_group(self, username: str, group_name: str) -> bool:
        """
        Check if a user belongs to a specific group.

        Args:
            username: The Cognito username
            group_name: The group name to check

        Returns:
            True if user belongs to the group, False otherwise
        """
        user_groups = self.get_user_groups(username)
        return group_name in user_groups

    def user_has_any_group(self, username: str, group_names: List[str]) -> bool:
        """
        Check if a user belongs to any of the specified groups.

        Args:
            username: The Cognito username
            group_names: List of group names to check

        Returns:
            True if user belongs to at least one group, False otherwise
        """
        user_groups = self.get_user_groups(username)
        return any(group in user_groups for group in group_names)

    def sync_user_groups(self, username: str, target_groups: List[str]) -> bool:
        """
        Synchronize a user's group membership to match the target groups.
        Adds user to missing groups and removes from extra groups.

        Args:
            username: The Cognito username
            target_groups: List of groups the user should belong to

        Returns:
            True if all operations successful, False otherwise
        """
        try:
            current_groups = self.get_user_groups(username)

            # Groups to add
            groups_to_add = [
                group for group in target_groups if group not in current_groups
            ]

            # Groups to remove
            groups_to_remove = [
                group for group in current_groups if group not in target_groups
            ]

            success = True

            # Add to new groups
            for group in groups_to_add:
                if not self.add_user_to_group(username, group):
                    success = False

            # Remove from old groups
            for group in groups_to_remove:
                if not self.remove_user_from_group(username, group):
                    success = False

            if success:
                logger.info(
                    f"Successfully synced groups for user {username}. Target: {target_groups}"
                )
            else:
                logger.warning(
                    f"Some operations failed while syncing groups for user {username}"
                )

            return success

        except Exception as e:
            logger.error(
                f"Unexpected error syncing groups for user {username}: {str(e)}"
            )
            return False

    def list_all_groups(self) -> List[Dict[str, Any]]:
        """
        List all groups in the User Pool.

        Returns:
            List of group information dictionaries
        """
        try:
            response = self.cognito_client.list_groups(UserPoolId=self.user_pool_id)
            groups = response.get("Groups", [])
            logger.debug(f"Found {len(groups)} groups in user pool {self.user_pool_id}")
            return groups
        except ClientError as e:
            logger.error(
                f"Error listing groups in user pool {self.user_pool_id}: {str(e)}"
            )
            return []
        except Exception as e:
            logger.error(f"Unexpected error listing groups: {str(e)}")
            return []


def get_cognito_group_manager(
    user_pool_id: Optional[str] = None,
) -> CognitoGroupManager:
    """
    Factory function to create a CognitoGroupManager instance.

    Args:
        user_pool_id: Optional user pool ID. If not provided, will try to get from environment

    Returns:
        CognitoGroupManager instance
    """
    import os

    if user_pool_id is None:
        user_pool_id = os.getenv("COGNITO_USER_POOL_ID")

    if not user_pool_id:
        raise ValueError(
            "user_pool_id must be provided or COGNITO_USER_POOL_ID environment variable must be set"
        )

    return CognitoGroupManager(user_pool_id)


# Convenience functions for common operations
def add_user_to_default_group(
    username: str, user_pool_id: Optional[str] = None
) -> bool:
    """
    Add a user to the default USER group.

    Args:
        username: The Cognito username
        user_pool_id: Optional user pool ID

    Returns:
        True if successful, False otherwise
    """
    manager = get_cognito_group_manager(user_pool_id)
    return manager.add_user_to_group(username, "USER")


def validate_user_access(
    username: str, required_groups: List[str], user_pool_id: Optional[str] = None
) -> bool:
    """
    Validate that a user has access based on required groups.

    Args:
        username: The Cognito username
        required_groups: List of groups required for access
        user_pool_id: Optional user pool ID

    Returns:
        True if user has access, False otherwise
    """
    manager = get_cognito_group_manager(user_pool_id)
    return manager.user_has_any_group(username, required_groups)
