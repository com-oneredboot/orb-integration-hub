# file: apps/api/lambdas/create_user_from_cognito/index.py
# author: Corey Dale Peters
# created: 2026-01-21
# description: Lambda function to create user records in DynamoDB from Cognito data.
#              This is a secure, purpose-built operation for self-registration that validates
#              against Cognito before creating records. Only accepts cognitoSub as input and
#              extracts all user data from Cognito to prevent client-side data injection.

import logging
import os
import re
import time
from datetime import datetime, timezone
from typing import Any

import boto3
from botocore.exceptions import ClientError
from orb_common.timestamps import ensure_timestamp

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


# UUID validation regex (standard UUID format)
UUID_REGEX = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.IGNORECASE
)

# Minimum response time in seconds to prevent timing attacks
MIN_RESPONSE_TIME = 0.1


def validate_uuid(value: str) -> bool:
    """
    Validate that a string is a valid UUID format.

    Args:
        value: String to validate

    Returns:
        True if valid UUID format, False otherwise
    """
    if not value or not isinstance(value, str):
        return False
    return bool(UUID_REGEX.match(value))


def get_cognito_user(cognito_sub: str) -> dict[str, Any] | None:
    """
    Get user from Cognito by sub (user ID).

    Args:
        cognito_sub: Cognito user ID (sub)

    Returns:
        Dict with user attributes or None if not found

    Raises:
        ClientError: If Cognito API call fails (non-UserNotFound errors)
    """
    user_pool_id = get_user_pool_id()
    if not user_pool_id:
        logger.error("USER_POOL_ID environment variable not set")
        raise ValueError("Cognito User Pool not configured")

    cognito = get_cognito_client()

    try:
        # Use admin_get_user with sub as the username
        # Note: In Cognito, the sub IS the username for users created via signup
        response = cognito.admin_get_user(UserPoolId=user_pool_id, Username=cognito_sub)

        # Extract attributes into a dict
        attributes = {}
        for attr in response.get("UserAttributes", []):
            attributes[attr["Name"]] = attr["Value"]

        return {
            "username": response.get("Username"),
            "status": response.get("UserStatus"),
            "attributes": attributes,
        }

    except cognito.exceptions.UserNotFoundException:
        logger.debug("User not found in Cognito")
        return None

    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "Unknown")
        if error_code == "UserNotFoundException":
            logger.debug("User not found in Cognito")
            return None
        logger.error(f"Cognito admin_get_user failed: {error_code}")
        raise


def get_user_groups(cognito_sub: str) -> list[str]:
    """
    Get the groups a user belongs to in Cognito.

    Args:
        cognito_sub: Cognito user ID (sub)

    Returns:
        List of group names the user belongs to
    """
    user_pool_id = get_user_pool_id()
    if not user_pool_id:
        return []

    cognito = get_cognito_client()

    try:
        response = cognito.admin_list_groups_for_user(UserPoolId=user_pool_id, Username=cognito_sub)
        return [group["GroupName"] for group in response.get("Groups", [])]
    except ClientError as e:
        logger.warning(f"Failed to get user groups: {e.response['Error']['Code']}")
        return []


def ensure_user_in_group(cognito_sub: str, group_name: str = "USER") -> bool:
    """
    Ensure user is in the specified Cognito group. Adds them if not.

    Args:
        cognito_sub: Cognito user ID (sub)
        group_name: Name of the group to ensure membership in

    Returns:
        True if user is now in the group, False if operation failed
    """
    user_pool_id = get_user_pool_id()
    if not user_pool_id:
        logger.error("USER_POOL_ID not set, cannot add user to group")
        return False

    # Check if user is already in the group
    current_groups = get_user_groups(cognito_sub)
    if group_name in current_groups:
        logger.debug(f"User already in {group_name} group")
        return True

    # Add user to group
    cognito = get_cognito_client()
    try:
        cognito.admin_add_user_to_group(
            UserPoolId=user_pool_id, Username=cognito_sub, GroupName=group_name
        )
        logger.info(f"Added user to {group_name} group")
        return True
    except ClientError as e:
        logger.error(f"Failed to add user to group: {e.response['Error']['Code']}")
        return False


def extract_cognito_attributes(cognito_user: dict[str, Any]) -> dict[str, Any]:
    """
    Extract user attributes from Cognito response.

    Args:
        cognito_user: Response from get_cognito_user

    Returns:
        Dict with extracted user attributes
    """
    attrs = cognito_user.get("attributes", {})

    return {
        "email": attrs.get("email", ""),
        "firstName": attrs.get("given_name", ""),
        "lastName": attrs.get("family_name", ""),
        "emailVerified": attrs.get("email_verified", "false").lower() == "true",
        "sub": attrs.get("sub", cognito_user.get("username", "")),
    }


def query_user_by_cognito_sub(cognito_sub: str) -> dict[str, Any] | None:
    """
    Query DynamoDB for existing user by cognitoSub.

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
        # Query by userId (which equals cognitoSub)
        response = table.get_item(
            Key={"userId": cognito_sub},
            ProjectionExpression="userId, email, firstName, lastName, #s, emailVerified, "
            "phoneVerified, mfaEnabled, mfaSetupComplete, #g, createdAt, updatedAt",
            ExpressionAttributeNames={"#s": "status", "#g": "groups"},
        )

        return response.get("Item")

    except ClientError as e:
        logger.error(f"DynamoDB get_item failed: {e.response['Error']['Code']}")
        raise


def create_user_record(cognito_sub: str, cognito_attrs: dict[str, Any]) -> dict[str, Any]:
    """
    Create user record in DynamoDB with Cognito-verified data.

    Args:
        cognito_sub: Cognito user ID (sub)
        cognito_attrs: Attributes extracted from Cognito

    Returns:
        Created user record

    Raises:
        ClientError: If DynamoDB put fails
    """
    users_table_name = get_users_table_name()
    if not users_table_name:
        logger.error("USERS_TABLE_NAME environment variable not set")
        raise ValueError("Users table not configured")

    table = get_dynamodb_resource().Table(users_table_name)
    now = int(datetime.now(timezone.utc).timestamp())

    user_record = {
        "userId": cognito_sub,
        "cognitoId": cognito_sub,
        "cognitoSub": cognito_sub,
        "email": cognito_attrs["email"],
        "firstName": cognito_attrs["firstName"],
        "lastName": cognito_attrs["lastName"],
        "status": "PENDING",
        "emailVerified": cognito_attrs["emailVerified"],
        "phoneVerified": False,
        "mfaEnabled": True,  # User completed MFA to reach this point
        "mfaSetupComplete": True,
        "groups": ["USER"],
        "createdAt": now,
        "updatedAt": now,
    }

    try:
        # Use condition to prevent overwriting existing records
        table.put_item(Item=user_record, ConditionExpression="attribute_not_exists(userId)")

        logger.info("User record created successfully")
        return user_record

    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            # Record already exists - this is fine, return existing
            logger.info("User record already exists, returning existing")
            return query_user_by_cognito_sub(cognito_sub)
        logger.error(f"DynamoDB put_item failed: {e.response['Error']['Code']}")
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
        "cognitoSub": user_record.get("cognitoSub") or user_record.get("userId"),
        "userId": user_record.get("userId"),
        "email": user_record.get("email"),
        "firstName": user_record.get("firstName"),
        "lastName": user_record.get("lastName"),
        "status": user_record.get("status"),
        "emailVerified": user_record.get("emailVerified"),
        "phoneVerified": user_record.get("phoneVerified"),
        "mfaEnabled": user_record.get("mfaEnabled"),
        "mfaSetupComplete": user_record.get("mfaSetupComplete"),
        "groups": user_record.get("groups"),
        "createdAt": ensure_timestamp(user_record.get("createdAt")),
        "updatedAt": ensure_timestamp(user_record.get("updatedAt")),
    }


def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """
    Create user record in DynamoDB from Cognito data.

    This endpoint validates the user exists in Cognito and extracts all user
    data from Cognito to prevent client-side data injection. Only cognitoSub
    is accepted as input.

    Args:
        event: AppSync event containing input with cognitoSub
        context: Lambda context (unused)

    Returns:
        Response with created/existing user data

    Raises:
        ValueError: If input validation fails (ORB-AUTH-011)
        Exception: If user not found in Cognito (ORB-AUTH-012)
        Exception: If Cognito service unavailable (ORB-AUTH-010)
        Exception: If DynamoDB service unavailable (ORB-API-010)
    """
    start_time = time.time()

    # Log request (without PII)
    logger.info("CreateUserFromCognito request received")

    try:
        # Extract cognitoSub from input
        input_data = event.get("arguments", {}).get("input", {})
        cognito_sub = input_data.get("cognitoSub", "")

        logger.debug("Processing user creation request")

        # Validate cognitoSub format (UUID)
        if not validate_uuid(cognito_sub):
            logger.warning("Invalid cognitoSub format provided")
            _ensure_min_response_time(start_time)
            # ORB-AUTH-011: Invalid request format
            raise ValueError("Invalid request format")

        # Ensure user is in the USER group in Cognito
        # This handles cases where the PostUserConfirmation trigger didn't fire
        # or failed (e.g., user created before trigger was deployed)
        ensure_user_in_group(cognito_sub, "USER")

        # Check if user already exists in DynamoDB (idempotency)
        existing_user = query_user_by_cognito_sub(cognito_sub)
        if existing_user:
            logger.info("Returning existing user record")
            _ensure_min_response_time(start_time)
            return format_response(existing_user)

        # Validate user exists in Cognito
        cognito_user = get_cognito_user(cognito_sub)
        if not cognito_user:
            logger.warning("User not found in Cognito")
            _ensure_min_response_time(start_time)
            # ORB-AUTH-012: User not found
            raise Exception("User not found")

        # Extract verified attributes from Cognito
        cognito_attrs = extract_cognito_attributes(cognito_user)

        # Create user record with Cognito-verified data
        created_user = create_user_record(cognito_sub, cognito_attrs)

        logger.info("User creation completed successfully")
        _ensure_min_response_time(start_time)
        return format_response(created_user)

    except ValueError:
        # Re-raise validation errors (ORB-AUTH-011)
        _ensure_min_response_time(start_time)
        raise

    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "Unknown")
        logger.error(f"AWS service error: {error_code}")
        _ensure_min_response_time(start_time)

        # Determine if Cognito or DynamoDB error
        if "Cognito" in str(type(e)) or error_code.startswith("Cognito"):
            # ORB-AUTH-010: Cognito service unavailable
            raise Exception("Authentication service unavailable")
        else:
            # ORB-API-010: DynamoDB service unavailable
            raise Exception("Database service unavailable")

    except Exception as e:
        error_msg = str(e)
        if error_msg == "User not found":
            # ORB-AUTH-012: Already formatted
            _ensure_min_response_time(start_time)
            raise

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
