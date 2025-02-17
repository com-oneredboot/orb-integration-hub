# file: backend/infrastructure/layers/database/python/database/core.py
# author: Corey Dale Peters
# created: 2025-02-17
# description: Service class for database operations

# 3rd Party Imports
import boto3
import logging
from typing import Dict, Any, Optional
from boto3.dynamodb.conditions import Key
from tenacity import retry, stop_after_attempt, wait_exponential

# Local Imports
from .models import RoleData, UserRoles
from .exceptions import DatabaseError, RecordNotFoundError

class CoreDynamoDBService:
    """Service class for authentication DynamoDB operations"""

    def __init__(self, table_name: str = 'Roles', region: str = None):
        """Initialize the authentication DynamoDB service

        Args:
            table_name (str): DynamoDB table name for roles
            region (str): AWS region, defaults to None (uses AWS_REGION env var)
        """
        self.table_name = table_name
        self.dynamodb = boto3.resource('dynamodb', region_name=region)
        self.table = self.dynamodb.Table(table_name)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        reraise=True
    )
    async def get_user_roles(self, user_id: str, application_id: str) -> Tuple[UserRoles, Dict[str, Any]]:
        """Fetch user roles and permissions from DynamoDB

        Args:
            user_id (str): User's unique identifier
            application_id (str): Application identifier

        Returns:
            Tuple[UserRoles, Dict[str, Any]]: Tuple containing:
                - UserRoles object with roles and permissions
                - Dictionary of log messages and levels

        Raises:
            AuthDynamoDBError: If there's an error accessing the authorization data
            RoleNotFoundError: If no roles are found for the user
        """
        log_messages = []

        try:
            log_messages.append({
                'level': 'DEBUG',
                'message': f"Attempting to fetch roles for user: {user_id}, application: {application_id}"
            })

            response = self.table.query(
                KeyConditionExpression=Key('roleId').eq(user_id) &
                                     Key('applicationId').eq(application_id)
            )

            if not response['Items']:
                log_messages.append({
                    'level': 'WARNING',
                    'message': f"No roles found for user: {user_id}"
                })
                return UserRoles(
                    applicationRoles=[],
                    permissions=[]
                ), log_messages

            role_data = RoleData(**response['Items'][0])

            log_messages.append({
                'level': 'INFO',
                'message': f"Successfully retrieved roles for user: {user_id}"
            })

            return UserRoles(
                applicationRoles=[role_data.roleName],
                permissions=role_data.permissions
            ), log_messages

        except self.dynamodb.meta.client.exceptions.ResourceNotFoundException as e:
            error_msg = f"Roles table {self.table_name} not found: {str(e)}"
            log_messages.append({
                'level': 'ERROR',
                'message': error_msg
            })
            raise AuthDynamoDBError(error_msg) from e

        except Exception as e:
            error_msg = f"Error fetching roles for user {user_id}: {str(e)}"
            log_messages.append({
                'level': 'ERROR',
                'message': error_msg
            })
            raise AuthDynamoDBError(error_msg) from e