# file: apps/api/lambdas/get_current_user/index.py
# author: Corey Dale Peters
# created: 2026-01-23
# description: Lambda function to get the current authenticated user's record.
#              Extracts cognitoSub from AppSync identity context - users can only
#              retrieve their own record, preventing unauthorized access to other users.

import logging
import os
from typing import Any

import boto3
from botocore.exceptions import ClientError
from orb_common.timestamps import ensure_timestamp

# AWS clients - created lazily to support mocking in tests
_dynamodb = None


def get_dynamodb_resource():
    """Get DynamoDB resource, creating it lazily."""
    global _dynamodb
    if _dynamodb is None:
        _dynamodb = boto3.resource("dynamodb")
    return _dynamodb


# Environment variables
LOGGING_LEVEL = os.getenv("LOGGING_LEVEL", "INFO")

# Setting up logging
logger = logging.getLogger()
logger.setLevel(LOGGING_LEVEL)


def get_users_table_name() -> str | None:
    """Get the Users table name from environment variable at runtime."""
    return os.getenv("USERS_TABLE_NAME")


def extract_cognito_sub_from_identity(event: dict[str, Any]) -> str | None:
    """
    Extract cognitoSub from AppSync identity context.

    For Cognito User Pool auth, the identity contains:
    - sub: The Cognito user's unique identifier
    - username: The Cognito username
    - claims: JWT claims including sub, email, cognito:groups, etc.

    Args:
        event: AppSync event with identity context

    Returns:
        cognitoSub string or None if not found
    """
    identity = event.get("identity", {})

    # For Cognito User Pool auth, sub is directly available
    cognito_sub = identity.get("sub")
    if cognito_sub:
        return cognito_sub

    # Fallback: check claims
    claims = identity.get("claims", {})
    cognito_sub = claims.get("sub")
    if cognito_sub:
        return cognito_sub

    # Fallback: username might be the sub for some configurations
    username = identity.get("username")
    if username:
        return username

    return None


def get_user_by_cognito_sub(cognito_sub: str) -> dict[str, Any] | None:
    """
    Get user record from DynamoDB by cognitoSub.

    Uses the CognitoSubIndex GSI for efficient lookup.

    Args:
        cognito_sub: Cognito user ID (sub)

    Returns:
        User record dict or None if not found

    Raises:
        ClientError: If DynamoDB query fails
    """
    users_table_name = get_users_table_name()
    if not users_table_name:
        logger.error("USERS_TABLE_NAME environment variable not set")
        raise ValueError("Users table not configured")

    table = get_dynamodb_resource().Table(users_table_name)

    try:
        # Query using CognitoSubIndex GSI
        response = table.query(
            IndexName="CognitoSubIndex",
            KeyConditionExpression="cognitoSub = :sub",
            ExpressionAttributeValues={":sub": cognito_sub},
            Limit=1,
        )

        items = response.get("Items", [])
        if items:
            return items[0]
        return None

    except ClientError as e:
        logger.error(f"DynamoDB query failed: {e.response['Error']['Code']}")
        raise


def format_response(user_record: dict[str, Any]) -> dict[str, Any]:
    """
    Format user record for GraphQL response.
    Ensures timestamps are Unix epoch integers for AWSTimestamp compatibility.

    Args:
        user_record: DynamoDB user record

    Returns:
        Formatted response dict
    """
    return {
        "userId": user_record.get("userId"),
        "cognitoId": user_record.get("cognitoId"),
        "cognitoSub": user_record.get("cognitoSub"),
        "email": user_record.get("email"),
        "firstName": user_record.get("firstName"),
        "lastName": user_record.get("lastName"),
        "status": user_record.get("status"),
        "phoneNumber": user_record.get("phoneNumber"),
        "groups": user_record.get("groups"),
        "emailVerified": user_record.get("emailVerified"),
        "phoneVerified": user_record.get("phoneVerified"),
        "mfaEnabled": user_record.get("mfaEnabled"),
        "mfaSetupComplete": user_record.get("mfaSetupComplete"),
        "createdAt": ensure_timestamp(user_record.get("createdAt")),
        "updatedAt": ensure_timestamp(user_record.get("updatedAt")),
    }


def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any] | None:
    """
    Get the current authenticated user's record.

    Extracts cognitoSub from the AppSync identity context (from the caller's
    Cognito token) and returns only that user's record. Users cannot query
    other users' records through this endpoint.

    Args:
        event: AppSync event with identity context
        context: Lambda context (unused)

    Returns:
        User record or None if not found

    Raises:
        ValueError: If identity context is missing or invalid
        Exception: If database service unavailable
    """
    logger.info("GetCurrentUser request received")

    try:
        # Extract cognitoSub from identity context
        cognito_sub = extract_cognito_sub_from_identity(event)

        if not cognito_sub:
            logger.warning("No cognitoSub found in identity context")
            raise ValueError("Authentication required")

        logger.debug("Looking up user for authenticated caller")

        # Get user record
        user_record = get_user_by_cognito_sub(cognito_sub)

        if not user_record:
            logger.info("User record not found in database")
            return None

        logger.info("User record retrieved successfully")
        return format_response(user_record)

    except ValueError:
        # Re-raise validation errors
        raise

    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "Unknown")
        logger.error(f"AWS service error: {error_code}")
        raise Exception("Database service unavailable")

    except Exception as e:
        logger.error(f"Unexpected error: {type(e).__name__}: {str(e)}")
        raise Exception("Service temporarily unavailable")
