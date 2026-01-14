# file: apps/api/lambdas/stripe/index.py
# author: Corey Dale Peters
# created: 2024-05-24
# description: This is the lambda function that will process a payment using Stripe API.

import boto3
import json
import logging
import os
import stripe
from botocore.exceptions import ClientError

# AWS clients
dynamodb = boto3.resource("dynamodb")
secrets_manager = boto3.client("secretsmanager")

# Environment variables
ENV_LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
ENV_REGION = os.getenv("AWS_REGION", "us-east-1")
ENV_ENVIRONMENT = os.getenv("ENVIRONMENT", "dev")
PAYMENTS_TABLE_NAME = os.getenv("PAYMENTS_TABLE_NAME")
STRIPE_SECRET_KEY_PATH = os.getenv("STRIPE_SECRET_KEY_PATH")

# Setting up logging
logger = logging.getLogger()
logger.setLevel(ENV_LOG_LEVEL)


def get_stripe_api_key():
    """Retrieve the Stripe API key from AWS Secrets Manager."""
    try:
        response = secrets_manager.get_secret_value(SecretId=STRIPE_SECRET_KEY_PATH)
        return response["SecretString"]
    except ClientError as e:
        logger.error(f"Error retrieving Stripe API key: {e}")
        raise


def validate_input(payload):
    """Validate the input parameters."""
    required_fields = [
        "amount",
        "paymentId",
        "customerId",
        "currency",
        "paymentMethodId",
        "createdOn",
    ]
    for field in required_fields:
        if field not in payload:
            raise ValueError(f"Missing required field: {field}")

    try:
        amount = int(float(payload["amount"]) * 100)
        if amount <= 0:
            raise ValueError("Amount must be positive")
    except ValueError:
        raise ValueError("Invalid amount")

    return (
        payload["paymentMethodId"],
        payload["customerId"],
        amount,
        payload["currency"],
    )


def store_transaction(payment_id, customer_id, amount, status, currency, created_on):
    """Store the transaction details in DynamoDB."""
    payments_table = dynamodb.Table(PAYMENTS_TABLE_NAME)
    try:
        payments_table.put_item(
            Item={
                "customerId": customer_id,
                "paymentId": payment_id,
                "amount": amount,
                "status": status,
                "createdOn": created_on,
                "paymentMethod": "stripe",
                "currency": currency,
            }
        )
    except ClientError as e:
        logger.error(f"Failed to store transaction in DynamoDB: {e}")
        raise


def lambda_handler(event, context):
    try:
        logger.debug(f"Received event: {event}")
        logger.debug(f"Context: {context}")

        # Ensure environment variables are set
        if not PAYMENTS_TABLE_NAME:
            raise ValueError("Environment variable PAYMENTS_TABLE_NAME is not set")
        if not STRIPE_SECRET_KEY_PATH:
            raise ValueError("Environment  variable STRIPE_SECRET_KEY_PATH is not set")
        if not ENV_REGION:
            raise ValueError("Environment variable AWS_REGION is not set")
        if not ENV_ENVIRONMENT:
            raise ValueError("Environment variable ENVIRONMENT is not set")

        # Validate input
        payload = event.get("input")
        payment_method_id, customer_id, amount, currency = validate_input(payload)
        logger.debug("Input validated successfully")

        # Get stripe API key
        stripe.api_key = get_stripe_api_key()
        logger.info("Stripe API key retrieved successfully")

        # process payment
        logger.info(
            f"Processing payment for customer {customer_id}, amount: {amount} {currency}"
        )

        # Create the Payment Intent, since confirm=True it will process immediately
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency=currency,
            customer=customer_id,
            payment_method=payment_method_id,
            confirm=True,
            return_url="https://wtv.oneredboot.com/registrationConfirmation",
        )
        logger.debug(f"Payment intent created: {intent}")

        # Store transaction details
        store_transaction(
            intent.id,
            customer_id,
            amount,
            intent.status,
            currency,
            payload.get("createdOn"),
        )
        logger.info(f"Payment processed successfully. Payment ID: {intent.id}")

        return {"status": 200, "message": intent.id}

    except ValueError as e:
        logger.error(f"Input validation error: {str(e)}")
        return {"status": 400, "message": json.dumps({"error": str(e)})}
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {str(e)}")
        return {"status": 400, "message": json.dumps({"error": str(e)})}
    except ClientError as e:
        logger.error(f"AWS service error: {str(e)}")
        return {
            "status": 500,
            "message": json.dumps({"error": "Internal server error"}),
        }
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return {
            "status": 500,
            "message": json.dumps({"error": "Internal server error"}),
        }
