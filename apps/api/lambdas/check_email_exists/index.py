# file: apps/api/lambdas/check_email_exists/index.py
# author: Corey Dale Peters
# created: 2026-01-16
# description: Lambda function to check if an email exists in the system.
#              This is a public endpoint accessible via API key authentication.

import re
import os
import logging
import time
from typing import Any

import boto3
from botocore.exceptions import ClientError

# AWS clients - created lazily to support mocking in tests
_dynamodb = None
_cognito = None


def get_dynamodb_resource():
    """Get DynamoDB resource, creating it lazily."""
    global _dynamodb
    if _dynamodb is None:
        _dynamodb = boto3.resource("dynamodb")
    return _dynamodb


def get_cognito_client():
    """Get Cognito client, creating it lazily."""
    global _cognito
    if _cognito is None:
        _cognito = boto3.client("cognito-idp")
    return _cognito


# Environment variables
LOGGING_LEVEL = os.getenv("LOGGING_LEVEL", "INFO")

# Setting up logging
logger = logging.getLogger()
logger.setLevel(LOGGING_LEVEL)


def get_users_table_name() -> str | None:
    """Get the Users table name from environment variable at runtime."""
    return os.getenv("USERS_TABLE_NAME")


def get_user_pool_id() -> str | None:
    """Get the Cognito User Pool ID from environment variable at runtime."""
    return os.getenv("USER_POOL_ID")


# Email validation regex - RFC 5322 simplified
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")

# Minimum response time in seconds to prevent timing attacks
MIN_RESPONSE_TIME = 0.1


def validate_email(email: str) -> bool:
    """
    Validate email format using regex.

    Args:
        email: Email address to validate

    Returns:
        True if email format is valid, False otherwise
    """
    if not email or not isinstance(email, str):
        return False
    return bool(EMAIL_REGEX.match(email))


def check_email_in_database(email: str) -> bool:
    """
    Check if email exists in the Users table using the EmailIndex GSI.

    Args:
        email: Email address to check

    Returns:
        True if email exists, False otherwise

    Raises:
        ClientError: If DynamoDB query fails
    """
    users_table_name = get_users_table_name()
    if not users_table_name:
        logger.error("USERS_TABLE_NAME environment variable not set")
        raise ValueError("Users table not configured")

    table = get_dynamodb_resource().Table(users_table_name)

    try:
        response = table.query(
            IndexName="EmailIndex",
            KeyConditionExpression="email = :email",
            ExpressionAttributeValues={":email": email},
            Limit=1,  # We only need to know if at least one exists
            ProjectionExpression="userId",  # Minimize data returned
        )

        return len(response.get("Items", [])) > 0

    except ClientError as e:
        logger.error(f"DynamoDB query failed: {e.response['Error']['Code']}")
        raise


def check_cognito_user_status(email: str) -> tuple[str | None, str | None]:
    """
    Check Cognito user status by email.

    Args:
        email: Email address to check

    Returns:
        Tuple of (cognito_status, cognito_sub) or (None, None) if user doesn't exist

    Note:
        Uses adminGetUser which requires the username. Since we use email as username,
        we can query directly by email.
    """
    user_pool_id = get_user_pool_id()
    if not user_pool_id:
        logger.warning("USER_POOL_ID environment variable not set, skipping Cognito check")
        return None, None

    cognito = get_cognito_client()

    try:
        # Use adminGetUser with email as username (since we use email as username during signup)
        response = cognito.admin_get_user(UserPoolId=user_pool_id, Username=email)

        cognito_status = response.get("UserStatus")
        cognito_sub = None

        # Extract sub from user attributes
        for attr in response.get("UserAttributes", []):
            if attr.get("Name") == "sub":
                cognito_sub = attr.get("Value")
                break

        logger.info(f"Cognito user found with status: {cognito_status}")
        return cognito_status, cognito_sub

    except cognito.exceptions.UserNotFoundException:
        logger.debug("User not found in Cognito")
        return None, None

    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "Unknown")
        if error_code == "UserNotFoundException":
            logger.debug("User not found in Cognito")
            return None, None
        logger.error(f"Cognito adminGetUser failed: {error_code}")
        # Return None on error to allow flow to continue with DynamoDB check
        return None, None


def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """
    Check if an email exists in the system and return Cognito user status.

    This endpoint is designed for the authentication flow to determine
    whether a user should be directed to sign-in, sign-up, or recovery.

    Args:
        event: AppSync event containing input with email
        context: Lambda context (unused)

    Returns:
        Response with email, exists boolean, cognitoStatus, and cognitoSub
    """
    start_time = time.time()

    # Log request (without PII)
    logger.info("CheckEmailExists request received")

    try:
        # Extract email from input
        input_data = event.get("arguments", {}).get("input", {})
        email = input_data.get("email", "")

        logger.debug("Processing email check request")

        # Validate email format
        if not validate_email(email):
            logger.warning("Invalid email format provided")
            # Ensure consistent response time
            _ensure_min_response_time(start_time)
            raise ValueError("Invalid email format")

        # Check Cognito user status first
        cognito_status, cognito_sub = check_cognito_user_status(email)

        # Check if email exists in database
        exists = check_email_in_database(email)

        logger.info(f"Email check completed - exists: {exists}, cognitoStatus: {cognito_status}")

        # Ensure consistent response time to prevent timing attacks
        _ensure_min_response_time(start_time)

        return {
            "email": email,
            "exists": exists,
            "cognitoStatus": cognito_status,
            "cognitoSub": cognito_sub,
        }

    except ValueError:
        # Re-raise validation errors
        _ensure_min_response_time(start_time)
        raise

    except ClientError:
        logger.error("Database error during email check")
        _ensure_min_response_time(start_time)
        raise Exception("Service temporarily unavailable")

    except Exception as e:
        logger.error(f"Unexpected error: {type(e).__name__}")
        _ensure_min_response_time(start_time)
        raise Exception("Service temporarily unavailable")


def _ensure_min_response_time(start_time: float) -> None:
    """
    Ensure minimum response time to prevent timing-based enumeration attacks.

    Args:
        start_time: Time when request processing started
    """
    elapsed = time.time() - start_time
    if elapsed < MIN_RESPONSE_TIME:
        time.sleep(MIN_RESPONSE_TIME - elapsed)
