# file: /home/corey/Infrastructure/src/orb-integration-hub/backend/src/lambdas/sms_verification/index.py
# author: Corey Dale Peters
# created: 2024-12-5
# description: This is the lambda function that will send a verification code to the user's phone number.

import json
import boto3
import os
import logging
import hmac
import hashlib
import time
from botocore.exceptions import ClientError

# AWS clients
sns_client = boto3.client('sns')
secrets_client = boto3.client('secretsmanager')
dynamodb = boto3.resource('dynamodb')

# Environment variables
LOGGING_LEVEL = os.getenv('LOGGING_LEVEL', 'INFO')  # Changed to match CloudFormation
ORIGINATION_NUMBER = os.getenv('SMS_ORIGINATION_NUMBER')
SECRET_NAME = os.getenv('SMS_VERIFICATION_SECRET_NAME')
RATE_LIMIT_TABLE_NAME = os.getenv('SMS_RATE_LIMIT_TABLE_NAME')

# Setting up logging
logger = logging.getLogger()
logger.setLevel(LOGGING_LEVEL)

# Cache for secret to avoid repeated API calls
secret_cache = {'secret': None, 'expires': 0}


def get_secret():
    """Retrieve SMS verification secret from AWS Secrets Manager with caching"""
    current_time = time.time()
    
    # Use cached secret if still valid (cache for 5 minutes)
    if secret_cache['secret'] and current_time < secret_cache['expires']:
        return secret_cache['secret']
    
    try:
        logger.debug(f"Retrieving secret: {SECRET_NAME}")
        response = secrets_client.get_secret_value(SecretId=SECRET_NAME)
        secret_data = json.loads(response['SecretString'])
        secret_key = secret_data['secret_key']
        
        # Cache the secret for 5 minutes
        secret_cache['secret'] = secret_key
        secret_cache['expires'] = current_time + 300
        
        logger.debug("Secret retrieved and cached successfully")
        return secret_key
        
    except Exception as e:
        logger.error(f"Error retrieving secret: {str(e)}")
        raise


def generate_verification_code(phone_number: str, timestamp: int, secret: str) -> str:
    """Generate 6-digit code using HMAC with 5-minute time windows"""
    # Create 5-minute time windows
    time_window = timestamp // 300  # 300 seconds = 5 minutes
    message = f"{phone_number}:{time_window}"
    
    # Generate HMAC
    signature = hmac.new(
        secret.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    # Convert to 6-digit code
    code_int = int(signature[:8], 16) % 1000000
    return str(code_int).zfill(6)


def verify_code(phone_number: str, code: str, secret: str) -> bool:
    """Verify code against current and previous time window (10 min total)"""
    current_time = int(time.time())
    
    # Check current and previous time window
    for i in range(2):  # 0 = current window, 1 = previous window
        window_time = current_time - (i * 300)
        expected_code = generate_verification_code(phone_number, window_time, secret)
        logger.debug(f"Checking window {i}: Verification process initiated.")
        if expected_code == code:
            return True
    return False


def check_rate_limit(phone_number: str) -> tuple:
    """
    Check if phone number has exceeded rate limit (3 SMS per hour)
    Returns: (is_allowed, message)
    """
    if not RATE_LIMIT_TABLE_NAME:
        logger.warning("Rate limit table not configured, allowing request")
        return True, "Rate limiting not configured"
    
    table = dynamodb.Table(RATE_LIMIT_TABLE_NAME)
    current_time = int(time.time())
    
    try:
        # Get current rate limit record
        response = table.get_item(Key={'phoneNumber': phone_number})
        
        if 'Item' not in response:
            # First request - create new record
            table.put_item(Item={
                'phoneNumber': phone_number,
                'requestCount': 1,
                'firstRequestTime': current_time,
                'ttl': current_time + 3600  # 1 hour TTL
            })
            logger.info("Rate limit: First request for a phone number.")
            return True, "First request allowed"
        
        item = response['Item']
        request_count = item['requestCount']
        
        if request_count >= 3:
            # Rate limit exceeded
            logger.warning(f"Rate limit exceeded: {request_count}/3 requests")
            return False, "Rate limit exceeded: Maximum 3 SMS per hour"
        
        # Increment counter
        table.update_item(
            Key={'phoneNumber': phone_number},
            UpdateExpression='SET requestCount = requestCount + :inc',
            ExpressionAttributeValues={':inc': 1}
        )
        
        masked_phone_number = phone_number[-4:]  # Retain only the last 4 digits
        logger.info(f"Rate limit: Request allowed for phone ending in {masked_phone_number} ({request_count + 1}/3)")
        return True, f"Request allowed ({request_count + 1}/3)"
        
    except Exception as e:
        logger.error(f"Rate limit check failed for {phone_number}: {str(e)}")
        # Fail open - allow request if rate limiting fails
        return True, "Rate limiting unavailable"


def lambda_handler(event, context):
    logger.debug(f"Event received: {json.dumps(event)}")

    # Get data
    input_data = event['input']
    phone_number = input_data['phoneNumber']
    provided_code = input_data.get('code')  # Optional for verification
    
    logger.info(f"Processing request - Phone: {phone_number}, Code provided: {provided_code is not None}, Code value: {provided_code}")

    try:
        # Get the secret key
        secret = get_secret()
        current_time = int(time.time())
        
        # If code is provided, verify it
        if provided_code is not None:
            masked_phone_number = f"******{phone_number[-4:]}" if len(phone_number) > 4 else phone_number
            logger.info(f"Verifying code for phone number: {masked_phone_number}")
            is_valid = verify_code(phone_number, str(provided_code), secret)
            
            response = {
                "StatusCode": 200,
                "Message": "Code verified successfully" if is_valid else "Invalid or expired code",
                "Data": {
                    "phoneNumber": phone_number,
                    "valid": is_valid
                }
            }
            logger.info(f"Verification response: {json.dumps(response)}")
            return response
        
        # Check rate limiting before generating/sending SMS
        logger.info("Checking rate limit for a phone number.")
        is_allowed, rate_limit_message = check_rate_limit(phone_number)
        
        if not is_allowed:
            logger.warning(f"Rate limit exceeded for a phone number: {rate_limit_message}")
            return {
                "StatusCode": 429,
                "Message": rate_limit_message,
                "Data": {
                    "phoneNumber": phone_number,
                    "rateLimited": True
                }
            }
        
        # Generate and send new verification code
        masked_phone_number = f"******{phone_number[-4:]}" if len(phone_number) > 4 else phone_number
        logger.info(f"Generating verification code for phone number: {masked_phone_number}")
        logger.debug(f"Rate limit status: {rate_limit_message}")
        code = generate_verification_code(phone_number, current_time, secret)
        
        # SMS parameters
        sns_parameters = {
            'PhoneNumber': phone_number,
            'Message': f"Your verification code is {code}",
            'MessageAttributes': {
                'AWS.SNS.SMS.SenderID': {
                    'DataType': 'String',
                    'StringValue': 'ORBPAYMENT'
                },
                'AWS.SNS.SMS.SMSType': {
                    'DataType': 'String',
                    'StringValue': 'Transactional'
                }
            }
        }
        
        # Add origination number if provided
        if ORIGINATION_NUMBER:
            sns_parameters['MessageAttributes']['AWS.MM.SMS.OriginationNumber'] = {
                'DataType': 'String',
                'StringValue': ORIGINATION_NUMBER
            }
        
        masked_phone_number = f"******{phone_number[-4:]}" if len(phone_number) > 4 else phone_number
        logger.info(f"Sending SMS to {masked_phone_number}")
        sanitized_sns_parameters = sns_parameters.copy()
        sanitized_sns_parameters['PhoneNumber'] = f"******{sns_parameters['PhoneNumber'][-4:]}" if len(sns_parameters['PhoneNumber']) > 4 else sns_parameters['PhoneNumber']
        sanitized_sns_parameters.pop('Message', None)  # Remove sensitive message content
        logger.debug(f"SMS parameters: {sanitized_sns_parameters}")

        response = sns_client.publish(**sns_parameters)
        logger.info(f"SNS response: {response}")
        masked_phone_number = f"******{phone_number[-4:]}" if len(phone_number) > 4 else phone_number
        logger.info(f"Verification code sent to {masked_phone_number}")

        return {
            "StatusCode": 200,
            "Message": "Verification code sent successfully",
            "Data": {
                "phoneNumber": phone_number
            }
        }

    except Exception as e:
        logger.error(f"Error in SMS verification: {str(e)}")
        return {
            "StatusCode": 500,
            "Message": f"Error processing SMS verification: {str(e)}",
            "Data": None
        }
