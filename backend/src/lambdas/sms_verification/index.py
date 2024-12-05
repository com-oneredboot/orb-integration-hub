# file:
# author: Corey Dale Peters
# created: 2024-12-5
# description: This is the lambda function that will send a verification code to the user's phone number.

import json
import boto3
from botocore.exceptions import ClientError
from random import randint

# AWS clients
client = boto3.client('sns')

# Environment variables
ENV_LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
ENV_REGION = os.getenv('AWS_REGION', 'us-east-1')
ENV_ENVIRONMENT = os.getenv('ENVIRONMENT', 'dev')
ENV_TOPIC_ARN = os.getenv('TopicArn')

# Setting up logging
logger = logging.getLogger()
logger.setLevel(ENV_LOG_LEVEL)


def lambda_handler(event, context):
    logger.debug("Event received:", json.dumps(event))

    # Get data
    input_data = event['input']
    phone_number = input_data['phone_number']

    try:
        # create a code of 6 numbers from 0-9
        code = randint(100000, 999999)

        sns_parameter = {
          topicArn: ENV_TOPIC_ARN,
          message: f"Your verification code is {code}"
        }
        logger.info(f"sns_parameter: {sns_parameter}")

        response = client.publish(**sns_parameter)

        logger.info(f"Verification code sent to {phone_number}")

        return {
            'status_code': 200,
            'message': "Verification code sent successfully"
            'code': code
        }

    except Exception as e:
        logger.error(f"AWS service error: {str(e)}")
        return {
            'status_code': 400,
            'message': json.dumps({'error': 'Internal server error'})
        }
