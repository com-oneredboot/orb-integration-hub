# file: apps/api/lambdas/paypal/index.py
# author: Corey Dale Peters
# created: 2024-05-23
# description: This is the lambda function that will process a payment using PayPal API.

# 3rd Party Imports
import boto3
import json
import logging
import requests
import os
from botocore.exceptions import ClientError

# clients
parameter_store_client = boto3.client("ssm")

# environment variables
ENV_LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
ENV_REGION = os.getenv("AWS_REGION", "us-east-1")

# Parameter Store Values
APPLICATION_PARAMETERS = parameter_store_client.get_parameters_by_path(
    Path="orb/integration-hub/paypal"
)
PAYPAL_API_URL = APPLICATION_PARAMETERS.get(
    "PAYPAL_API_URL", "https://api.sandbox.paypal.com/v1/payments/payment"
)

# Setting up logging
logger = logging.getLogger()
# get level from environment variable
logger.setLevel(ENV_LOG_LEVEL)


# DynamoDB table model


def process_paypal_payment(paypal_account, amount):
    logger.debug("Processing payment with PayPal.")
    try:
        # Dummy PayPal API URL for demonstration
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {paypal_account}",  # Assuming this is an access token
        }
        payload = {
            "intent": "sale",
            "payer": {"paymentMethod": "paypal"},
            "transactions": [
                {
                    "amount": {"total": str(amount), "currency": "USD"},
                    "description": "Payment description",
                }
            ],
            "redirectUrls": {
                "returnUrl": "https://example.com/return",
                "cancelUrl": "https://example.com/cancel",
            },
        }

        response = requests.post(PAYPAL_API_URL, headers=headers, json=payload)
        response.raise_for_status()

        return response.json()

    except requests.exceptions.RequestException as e:
        logger.error(f"PayPal API request failed: {e}")
        return None


def lambda_handler(event, context):
    logger.debug(f"Received event: {event}")
    logger.debug(f"Received context: {context}")

    try:
        body = json.loads(event.get("body"))
        amount = body.get("amount")
        paypal_account = body.get("paypalAccount")

        # Validate input data
        if not paypal_account or not amount:
            message = "Missing required paymentId or amount"
            logger.error(message)
            raise ValueError(message)

        logger.info(f"Received payment request for ID {paypal_account} with amount {amount}.")

        if not paypal_account:
            return {
                "statusCode": 400,
                "body": json.dumps({"message": "Invalid payment account"}),
            }

        # Process payment with PayPal
        paypal_response = process_paypal_payment(paypal_account, amount)
        if not paypal_response:
            return {
                "statusCode": 500,
                "body": json.dumps({"message": "Payment processing failed"}),
            }

        return {
            "statusCode": 200,
            "body": json.dumps(
                {
                    "message": "Payment processed successfully",
                    "paypalResponse": paypal_response,
                }
            ),
        }

    except ValueError as ve:
        logger.error(f"Validation error: {ve}")
        return {"statusCode": 400, "body": json.dumps({"message": str(ve)})}
    except ClientError as e:
        logger.error(f"DynamoDB error: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"message": "Internal server error"}),
        }
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"message": "Internal server error"}),
        }
