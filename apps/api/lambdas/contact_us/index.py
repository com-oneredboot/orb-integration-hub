# file: apps/api/lambdas/contact_us/index.py
# author: Corey Dale Peters
# date: 2024-11-15
# description: AWS Lambda function for handling contact form submissions


import json
import boto3
import os
from botocore.exceptions import ClientError
import logging


# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)


def send_email(ses_client, to_email, subject, message):
    """
    Helper function to send an email using Amazon SES.

    :param ses_client: The boto3 SES client
    :param to_email: The recipient's email address
    :param subject: The email subject
    :param message: The email body
    :return: The response from SES send_email call
    """
    return ses_client.send_email(
        Source=to_email,  # Using TO_EMAIL as source for simplicity
        Destination={"ToAddresses": [to_email]},
        Message={
            "Subject": {"Data": f"New Contact Form Submission: {subject}"},
            "Body": {"Text": {"Data": message}},
        },
    )


def lambda_handler(event, context):
    """
    Main handler function for processing contact form submissions.

    :param event: The event dict that contains the details of the AppSync request
    :param context: Runtime information provided by AWS Lambda
    :return: A dict containing success status and a message
    """
    logger.info("Received event: %s", json.dumps(event))

    # Initialize SES client
    ses = boto3.client("ses")

    try:
        # Extract form data from the event
        input_data = event["input"]
        first_name = input_data["firstName"]
        last_name = input_data["lastName"]
        email = input_data["email"]
        subject = input_data["subject"]
        message = input_data["message"]

        logger.info(
            "Extracted form data: firstName=%s, lastName=%s, email=%s, subject=%s",
            first_name,
            last_name,
            email,
            subject,
        )

        # Get the recipient email from environment variables
        to_email = os.environ["TO_EMAIL"]
        logger.info("Sending email to: %s", to_email)

        # Construct email body
        email_body = f"""
        From: {first_name} {last_name}
        Email: {email}
        
        Subject: {subject}

        Message:
        {message}
        """

        # Attempt to send the email
        response = send_email(ses, to_email, subject, email_body)

        logger.info("Email sent successfully. MessageId: %s", response["MessageId"])
        return {"success": True, "message": "Email sent successfully"}

    except KeyError as e:
        # Log and handle missing input data
        logger.error("Missing required input: %s", str(e))
        return {"success": False, "message": f"Missing required input: {str(e)}"}
    except ClientError as e:
        # Log and handle AWS SES errors
        logger.error("Error sending email: %s", e.response["Error"]["Message"])
        return {"success": False, "message": "Error sending email"}
    except Exception as e:
        # Log and handle any other unexpected errors
        logger.error("Unexpected error: %s", str(e))
        return {"success": False, "message": "An unexpected error occurred"}
