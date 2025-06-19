#!/usr/bin/env python3
"""
Lambda function to manage Cognito User Pool groups
This can be used to add users to groups manually when needed
"""

import json
import boto3
import logging
from typing import Dict, Any, List

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Cognito client
cognito_client = boto3.client('cognito-idp')

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for Cognito group management operations
    
    Expected event structure:
    {
        "operation": "add_user_to_group" | "remove_user_from_group" | "list_user_groups" | "list_users_in_group",
        "userPoolId": "us-east-1_XXXXXXXX",
        "username": "user@example.com",
        "groupName": "USER" (optional, depends on operation)
    }
    """
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        operation = event.get('operation')
        user_pool_id = event.get('userPoolId')
        username = event.get('username')
        group_name = event.get('groupName')
        
        if not operation:
            raise ValueError("Missing required parameter: operation")
        
        if not user_pool_id:
            raise ValueError("Missing required parameter: userPoolId")
        
        # Route to appropriate handler
        if operation == 'add_user_to_group':
            return add_user_to_group(user_pool_id, username, group_name)
        elif operation == 'remove_user_from_group':
            return remove_user_from_group(user_pool_id, username, group_name)
        elif operation == 'list_user_groups':
            return list_user_groups(user_pool_id, username)
        elif operation == 'list_users_in_group':
            return list_users_in_group(user_pool_id, group_name)
        elif operation == 'add_user_to_default_group':
            return add_user_to_default_group(user_pool_id, username)
        else:
            raise ValueError(f"Unknown operation: {operation}")
            
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e),
                'operation': event.get('operation', 'unknown')
            })
        }

def add_user_to_group(user_pool_id: str, username: str, group_name: str) -> Dict[str, Any]:
    """Add a user to a specific group"""
    if not username or not group_name:
        raise ValueError("Missing required parameters: username and groupName")
    
    try:
        cognito_client.admin_add_user_to_group(
            UserPoolId=user_pool_id,
            Username=username,
            GroupName=group_name
        )
        
        logger.info(f"Successfully added user {username} to group {group_name}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': f'User {username} added to group {group_name}',
                'username': username,
                'groupName': group_name
            })
        }
        
    except cognito_client.exceptions.UserNotFoundException:
        raise ValueError(f"User {username} not found in user pool")
    except cognito_client.exceptions.ResourceNotFoundException:
        raise ValueError(f"Group {group_name} not found in user pool")
    except Exception as e:
        raise Exception(f"Failed to add user to group: {str(e)}")

def remove_user_from_group(user_pool_id: str, username: str, group_name: str) -> Dict[str, Any]:
    """Remove a user from a specific group"""
    if not username or not group_name:
        raise ValueError("Missing required parameters: username and groupName")
    
    try:
        cognito_client.admin_remove_user_from_group(
            UserPoolId=user_pool_id,
            Username=username,
            GroupName=group_name
        )
        
        logger.info(f"Successfully removed user {username} from group {group_name}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': f'User {username} removed from group {group_name}',
                'username': username,
                'groupName': group_name
            })
        }
        
    except cognito_client.exceptions.UserNotFoundException:
        raise ValueError(f"User {username} not found in user pool")
    except Exception as e:
        raise Exception(f"Failed to remove user from group: {str(e)}")

def list_user_groups(user_pool_id: str, username: str) -> Dict[str, Any]:
    """List all groups that a user belongs to"""
    if not username:
        raise ValueError("Missing required parameter: username")
    
    try:
        response = cognito_client.admin_list_groups_for_user(
            UserPoolId=user_pool_id,
            Username=username
        )
        
        groups = [group['GroupName'] for group in response.get('Groups', [])]
        
        logger.info(f"User {username} belongs to groups: {groups}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'username': username,
                'groups': groups,
                'groupCount': len(groups)
            })
        }
        
    except cognito_client.exceptions.UserNotFoundException:
        raise ValueError(f"User {username} not found in user pool")
    except Exception as e:
        raise Exception(f"Failed to list user groups: {str(e)}")

def list_users_in_group(user_pool_id: str, group_name: str) -> Dict[str, Any]:
    """List all users in a specific group"""
    if not group_name:
        raise ValueError("Missing required parameter: groupName")
    
    try:
        response = cognito_client.list_users_in_group(
            UserPoolId=user_pool_id,
            GroupName=group_name
        )
        
        users = [user['Username'] for user in response.get('Users', [])]
        
        logger.info(f"Group {group_name} contains users: {users}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'groupName': group_name,
                'users': users,
                'userCount': len(users)
            })
        }
        
    except cognito_client.exceptions.ResourceNotFoundException:
        raise ValueError(f"Group {group_name} not found in user pool")
    except Exception as e:
        raise Exception(f"Failed to list users in group: {str(e)}")

def add_user_to_default_group(user_pool_id: str, username: str) -> Dict[str, Any]:
    """Add a user to the default USER group (convenience method)"""
    return add_user_to_group(user_pool_id, username, 'USER')

# Helper function for CLI/testing
def main():
    """For local testing"""
    import os
    
    # Example usage - add user to USER group
    event = {
        'operation': 'add_user_to_default_group',
        'userPoolId': os.environ.get('USER_POOL_ID', 'us-east-1_XXXXXXXX'),
        'username': 'corey@thepetersfamily.ca'
    }
    
    result = lambda_handler(event, None)
    print(json.dumps(result, indent=2))

if __name__ == '__main__':
    main()