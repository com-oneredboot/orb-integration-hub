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

# AWS clients
dynamodb = boto3.resource("dynamodb")

# Environment variables
LOGGING_LEVEL = os.getenv("LOGGING_LEVEL", "INFO")
USERS_TABLE_NAME = os.getenv("USERS_TABLE_NAME")

# Setting up logging
logger = logging.getLogger()
logger.setLevel(LOGGING_LEVEL)

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
    if not USERS_TABLE_NAME:
        logger.error("USERS_TABLE_NAME environment variable not set")
        raise ValueError("Users table not configured")

    table = dynamodb.Table(USERS_TABLE_NAME)

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


def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """
    Check if an email exists in the system.

    This endpoint is designed for the authentication flow to determine
    whether a user should be directed to sign-in or sign-up.

    Args:
        event: AppSync event containing input with email
        context: Lambda context (unused)

    Returns:
        Response with email and exists boolean
    """
    start_time = time.time()

    # Log request (without PII)
    logger.info("CheckEmailExists request received")

    try:
        # Extract email from input
        input_data = event.get("arguments", {}).get("input", {})
        email = input_data.get("email", "")

        logger.debug(f"Processing email check request")

        # Validate email format
        if not validate_email(email):
            logger.warning("Invalid email format provided")
            # Ensure consistent response time
            _ensure_min_response_time(start_time)
            raise ValueError("Invalid email format")

        # Check if email exists in database
        exists = check_email_in_database(email)

        logger.info(f"Email check completed - exists: {exists}")

        # Ensure consistent response time to prevent timing attacks
        _ensure_min_response_time(start_time)

        return {"email": email, "exists": exists}

    except ValueError as e:
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
