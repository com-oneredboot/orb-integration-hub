# file: backend/src/lambdas/cognito_group_manager/index.py
# author: Claude Code
# created: 2025-06-19
# description: Lambda function for managing Cognito User Pool group assignments

import json
import boto3
import os
import logging
from typing import Dict, Any, List
from botocore.exceptions import ClientError

# Environment variables
ENV_LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
ENV_REGION = os.getenv('AWS_REGION', 'us-east-1')
ENV_USER_POOL_ID = os.getenv('COGNITO_USER_POOL_ID')

# Setting up logging
logger = logging.getLogger()
logger.setLevel(ENV_LOG_LEVEL)

# AWS clients
cognito_client = boto3.client('cognito-idp', region_name=ENV_REGION)


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for managing Cognito User Pool group assignments.
    
    Expected event format:
    {
        "action": "add_user_to_group" | "remove_user_from_group" | "sync_user_groups" | "get_user_groups",
        "username": "cognito_username",
        "group_name": "GROUP_NAME",  # For add/remove actions
        "target_groups": ["GROUP1", "GROUP2"]  # For sync action
    }
    """
    logger.info(f"Received event: {json.dumps(event)}")
    
    try:
        # Validate required parameters
        if not ENV_USER_POOL_ID:
            raise ValueError("COGNITO_USER_POOL_ID environment variable is required")
        
        action = event.get('action')
        username = event.get('username')
        
        if not action or not username:
            raise ValueError("Both 'action' and 'username' are required")
        
        # Route to appropriate handler
        if action == 'add_user_to_group':
            return handle_add_user_to_group(username, event.get('group_name'))
        elif action == 'remove_user_from_group':
            return handle_remove_user_from_group(username, event.get('group_name'))
        elif action == 'sync_user_groups':
            return handle_sync_user_groups(username, event.get('target_groups', []))
        elif action == 'get_user_groups':
            return handle_get_user_groups(username)
        elif action == 'validate_access':
            return handle_validate_access(username, event.get('required_groups', []))
        else:
            raise ValueError(f"Unknown action: {action}")
            
    except Exception as e:
        logger.error(f"Error in cognito_group_manager: {str(e)}")
        return {
            "StatusCode": 500,
            "Message": f"Error processing request: {str(e)}",
            "Data": None
        }


def handle_add_user_to_group(username: str, group_name: str) -> Dict[str, Any]:
    """Add a user to a Cognito User Pool group."""
    if not group_name:
        raise ValueError("group_name is required for add_user_to_group action")
    
    try:
        cognito_client.admin_add_user_to_group(
            UserPoolId=ENV_USER_POOL_ID,
            Username=username,
            GroupName=group_name
        )
        
        logger.info(f"Successfully added user {username} to group {group_name}")
        return {
            "StatusCode": 200,
            "Message": f"User {username} added to group {group_name}",
            "Data": {
                "username": username,
                "group_name": group_name,
                "action": "added"
            }
        }
        
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        error_message = e.response.get('Error', {}).get('Message', str(e))
        
        if error_code == 'UserNotFoundException':
            logger.error(f"User {username} not found")
            return {
                "StatusCode": 404,
                "Message": f"User {username} not found",
                "Data": None
            }
        elif error_code == 'ResourceNotFoundException':
            logger.error(f"Group {group_name} not found")
            return {
                "StatusCode": 404,
                "Message": f"Group {group_name} not found",
                "Data": None
            }
        else:
            logger.error(f"Error adding user to group: {error_message}")
            return {
                "StatusCode": 500,
                "Message": f"Error adding user to group: {error_message}",
                "Data": None
            }


def handle_remove_user_from_group(username: str, group_name: str) -> Dict[str, Any]:
    """Remove a user from a Cognito User Pool group."""
    if not group_name:
        raise ValueError("group_name is required for remove_user_from_group action")
    
    try:
        cognito_client.admin_remove_user_from_group(
            UserPoolId=ENV_USER_POOL_ID,
            Username=username,
            GroupName=group_name
        )
        
        logger.info(f"Successfully removed user {username} from group {group_name}")
        return {
            "StatusCode": 200,
            "Message": f"User {username} removed from group {group_name}",
            "Data": {
                "username": username,
                "group_name": group_name,
                "action": "removed"
            }
        }
        
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        error_message = e.response.get('Error', {}).get('Message', str(e))
        
        logger.error(f"Error removing user from group: {error_message}")
        return {
            "StatusCode": 500,
            "Message": f"Error removing user from group: {error_message}",
            "Data": None
        }


def handle_get_user_groups(username: str) -> Dict[str, Any]:
    """Get all groups that a user belongs to."""
    try:
        response = cognito_client.admin_list_groups_for_user(
            UserPoolId=ENV_USER_POOL_ID,
            Username=username
        )
        
        groups = [group['GroupName'] for group in response.get('Groups', [])]
        logger.info(f"User {username} belongs to groups: {groups}")
        
        return {
            "StatusCode": 200,
            "Message": f"Retrieved groups for user {username}",
            "Data": {
                "username": username,
                "groups": groups
            }
        }
        
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        error_message = e.response.get('Error', {}).get('Message', str(e))
        
        if error_code == 'UserNotFoundException':
            logger.error(f"User {username} not found")
            return {
                "StatusCode": 404,
                "Message": f"User {username} not found",
                "Data": None
            }
        else:
            logger.error(f"Error getting user groups: {error_message}")
            return {
                "StatusCode": 500,
                "Message": f"Error getting user groups: {error_message}",
                "Data": None
            }


def handle_sync_user_groups(username: str, target_groups: List[str]) -> Dict[str, Any]:
    """Synchronize a user's group membership to match target groups."""
    try:
        # Get current groups
        current_groups_response = handle_get_user_groups(username)
        if current_groups_response["StatusCode"] != 200:
            return current_groups_response
        
        current_groups = current_groups_response["Data"]["groups"]
        
        # Determine changes needed
        groups_to_add = [group for group in target_groups if group not in current_groups]
        groups_to_remove = [group for group in current_groups if group not in target_groups]
        
        results = {
            "username": username,
            "target_groups": target_groups,
            "current_groups": current_groups,
            "groups_added": [],
            "groups_removed": [],
            "errors": []
        }
        
        # Add to new groups
        for group in groups_to_add:
            add_result = handle_add_user_to_group(username, group)
            if add_result["StatusCode"] == 200:
                results["groups_added"].append(group)
            else:
                results["errors"].append(f"Failed to add to {group}: {add_result['Message']}")
        
        # Remove from old groups
        for group in groups_to_remove:
            remove_result = handle_remove_user_from_group(username, group)
            if remove_result["StatusCode"] == 200:
                results["groups_removed"].append(group)
            else:
                results["errors"].append(f"Failed to remove from {group}: {remove_result['Message']}")
        
        # Determine overall success
        success = len(results["errors"]) == 0
        status_code = 200 if success else 207  # 207 = Multi-Status (partial success)
        
        message = f"Group sync completed for user {username}"
        if not success:
            message += f" with {len(results['errors'])} errors"
        
        logger.info(f"Group sync result: {results}")
        
        return {
            "StatusCode": status_code,
            "Message": message,
            "Data": results
        }
        
    except Exception as e:
        logger.error(f"Error syncing user groups: {str(e)}")
        return {
            "StatusCode": 500,
            "Message": f"Error syncing user groups: {str(e)}",
            "Data": None
        }


def handle_validate_access(username: str, required_groups: List[str]) -> Dict[str, Any]:
    """Validate that a user has access based on required groups."""
    try:
        groups_response = handle_get_user_groups(username)
        if groups_response["StatusCode"] != 200:
            return groups_response
        
        user_groups = groups_response["Data"]["groups"]
        has_access = any(group in user_groups for group in required_groups)
        
        return {
            "StatusCode": 200,
            "Message": f"Access validation completed for user {username}",
            "Data": {
                "username": username,
                "user_groups": user_groups,
                "required_groups": required_groups,
                "has_access": has_access
            }
        }
        
    except Exception as e:
        logger.error(f"Error validating access: {str(e)}")
        return {
            "StatusCode": 500,
            "Message": f"Error validating access: {str(e)}",
            "Data": None
        }