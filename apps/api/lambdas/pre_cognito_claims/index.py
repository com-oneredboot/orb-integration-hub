# file: apps/api/lambdas/pre_cognito_claims/index.py
# author: Corey Dale Peters
# created: 2025-02-16
# description: Lambda function that adds custom claims to JWT token before Cognito generation.


# 3rd Party Imports
import json
import logging
import os
from typing import Dict, Any


# Local Imports
from layers.authentication_dynamodb import CoreDynamoDBService
from layers.authentication_dynamodb.exceptions import AuthDynamoDBError
from layers.authentication_dynamodb.core import auth_service


# Environment variables
ENV_LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
ENV_REGION = os.getenv('AWS_REGION', 'us-east-1')


# Setting up logging
logger = logging.getLogger()
logger.setLevel(ENV_LOG_LEVEL)

core_dynamodb_service = CoreDynamoDBService(region=ENV_REGION)


async def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Pre Token Generation Lambda trigger for Cognito
    Adds custom claims to the JWT token
    """
    logger.debug(f"Received event: {event}")
    logger.debug(f"Received context: {context}")

    try:
        # Get the user's Cognito group
        groups = (
            event['request']
            .get('groupConfiguration', {})
            .get('groupsToOverride', [])
        )
        cognito_group = groups[0] if groups else 'CUSTOMER'

        # Get the application ID from the client metadata or default context
        application_id = (
            event['request']
            .get('clientMetadata', {})
            .get('applicationId', 'default')
        )

        # Get user ID from the event
        user_id = event['request']['userAttributes']['sub']

        logger.info(
            f"Processing token generation for user {user_id} "
            f"in group {cognito_group}"
        )

        # Fetch roles and permissions
        role_data, log_messages = await auth_service.get_user_roles(
            user_id, application_id
        )

        # Process log messages from the service
        for log_msg in log_messages:
            getattr(logger, log_msg['level'].lower())(log_msg['message'])

        # Add custom claims to the token
        event['response'] = {
            'claimsOverrideDetails': {
                'claimsToAddOrOverride': {
                    'applicationRoles': json.dumps(role_data.applicationRoles),
                    'cognitoGroup': cognito_group,
                    'permissions': json.dumps(role_data.permissions),
                    'tenantId': (
                        event['request']['userAttributes']
                        .get('custom:tenantId', '')
                    ),
                    'applicationId': application_id
                }
            }
        }

        return event

    except AuthDynamoDBError as e:
        logger.error(
            f"Authentication database error in pre-token generation: {str(e)}"
        )
        return event  # Return original event without custom claims

    except Exception as e:
        logger.error(
            f"Unexpected error in pre-token generation: {str(e)}"
        )
        return event  # Return original event without custom claims
