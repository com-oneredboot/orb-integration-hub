# file: /home/corey/Infrastructure/src/orb-integration-hub/backend/src/lambdas/user_status_calculator/index.py
# author: Corey Dale Peters
# created: 2025-06-19
# description: DynamoDB stream trigger to automatically calculate and update user status

import boto3
import os
import logging
from typing import Dict, Any, Optional

# AWS clients
dynamodb = boto3.resource('dynamodb')

# Environment variables
LOGGING_LEVEL = os.getenv('LOGGING_LEVEL', 'INFO')
USERS_TABLE_NAME = os.getenv('USERS_TABLE_NAME')

# Setting up logging
logger = logging.getLogger()
logger.setLevel(getattr(logging, LOGGING_LEVEL.upper(), logging.INFO))

def calculate_user_status(user_data: Dict[str, Any]) -> str:
    """
    Calculate the correct user status based on completion requirements.
    
    Args:
        user_data: Dictionary containing user attributes
        
    Returns:
        'ACTIVE' if all requirements are met, 'PENDING' otherwise
    """
    if not user_data:
        return 'PENDING'
    
    # Check all required fields are present and non-empty
    required_fields = ['email', 'firstName', 'lastName', 'phoneNumber']
    has_required_fields = all(
        user_data.get(field) and str(user_data.get(field)).strip()
        for field in required_fields
    )
    
    # Check all verification requirements are met
    email_verified = user_data.get('emailVerified', False)
    phone_verified = user_data.get('phoneVerified', False)
    has_required_verifications = email_verified and phone_verified
    
    # Check MFA requirements are met
    mfa_enabled = user_data.get('mfaEnabled', False)
    mfa_setup_complete = user_data.get('mfaSetupComplete', False)
    has_mfa_requirements = mfa_enabled and mfa_setup_complete
    
    # User is ACTIVE only when ALL requirements are met
    is_complete = has_required_fields and has_required_verifications and has_mfa_requirements
    
    logger.debug(f"Status calculation for user {user_data.get('userId', 'unknown')}: "
                f"Required fields: {has_required_fields}, "
                f"Verifications: {has_required_verifications}, "
                f"MFA requirements: {has_mfa_requirements} (enabled: {mfa_enabled}, setup: {mfa_setup_complete}), "
                f"Final status: {'ACTIVE' if is_complete else 'PENDING'}")
    
    return 'ACTIVE' if is_complete else 'PENDING'

def convert_dynamodb_value(value: Dict[str, Any]) -> Any:
    """Convert DynamoDB attribute value to Python value."""
    if 'S' in value:  # String
        return value['S']
    elif 'BOOL' in value:  # Boolean
        return value['BOOL']
    elif 'N' in value:  # Number
        return value['N']
    elif 'NULL' in value:  # Null
        return None
    else:
        return str(value)  # Fallback

def extract_user_data_from_dynamodb_record(record: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Extract user data from DynamoDB stream record.
    
    Args:
        record: DynamoDB stream record
        
    Returns:
        Dictionary containing user attributes or None if not applicable
    """
    try:
        # Get the new image (updated data)
        new_image = record.get('dynamodb', {}).get('NewImage', {})
        if not new_image:
            return None
        
        # Convert DynamoDB format to regular dictionary
        user_data = {}
        for key, value in new_image.items():
            user_data[key] = convert_dynamodb_value(value)
        
        return user_data
    except Exception as e:
        logger.error(f"Error extracting user data from record: {e}")
        return None

def has_status_relevant_changes(record: Dict[str, Any]) -> bool:
    """
    Check if the record contains changes to fields that affect user status calculation.
    
    Args:
        record: DynamoDB stream record
        
    Returns:
        True if status-relevant fields changed, False otherwise
    """
    # Fields that affect status calculation
    status_relevant_fields = {
        'firstName',
        'lastName', 
        'email',
        'phone',           # User's phone number
        'phoneNumber',     # Alternative phone field name
        'emailVerified',
        'phoneVerified',
        'mfaEnabled',      # Whether MFA is enabled for the user
        'mfaSetupComplete' # Whether MFA setup has been completed
    }
    
    try:
        old_image = record.get('dynamodb', {}).get('OldImage', {})
        new_image = record.get('dynamodb', {}).get('NewImage', {})
        
        # For INSERT events, always process (no old image)
        if not old_image:
            return True
        
        # Check if any status-relevant field changed
        for field in status_relevant_fields:
            old_value = convert_dynamodb_value(old_image.get(field, {})) if old_image.get(field) else None
            new_value = convert_dynamodb_value(new_image.get(field, {})) if new_image.get(field) else None
            
            if old_value != new_value:
                logger.debug(f"Status-relevant field '{field}' changed from '{old_value}' to '{new_value}'")
                return True
        
        logger.debug("No status-relevant fields changed, skipping status calculation")
        return False
        
    except Exception as e:
        logger.error(f"Error checking for relevant changes: {e}")
        # If we can't determine, err on the side of processing
        return True

def lambda_handler(event, _):
    """
    Handle DynamoDB stream events and update user status as needed.
    
    Expected event: DynamoDB stream event with Records array
    """
    logger.info(f"Processing {len(event.get('Records', []))} DynamoDB stream records")
    
    if not USERS_TABLE_NAME:
        logger.error("USERS_TABLE_NAME environment variable not set")
        return
    
    try:
        table = dynamodb.Table(USERS_TABLE_NAME)
        
        for record in event.get('Records', []):
            try:
                # Only process MODIFY and INSERT events
                event_name = record.get('eventName')
                if event_name not in ['MODIFY', 'INSERT']:
                    logger.debug(f"Skipping event type: {event_name}")
                    continue
                
                # Check if status-relevant fields changed
                if not has_status_relevant_changes(record):
                    logger.debug("No status-relevant fields changed, skipping record")
                    continue
                
                # Extract user data from the record
                user_data = extract_user_data_from_dynamodb_record(record)
                if not user_data or not user_data.get('userId'):
                    logger.debug("No valid user data found in record")
                    continue
                
                user_id = user_data['userId']
                current_status = user_data.get('status', 'UNKNOWN')
                
                # Calculate what the status should be
                calculated_status = calculate_user_status(user_data)
                
                # Only update if status needs to change
                if current_status != calculated_status:
                    logger.info(f"Updating user {user_id} status from {current_status} to {calculated_status}")
                    
                    # Update the status in the table
                    table.update_item(
                        Key={'userId': user_id},
                        UpdateExpression='SET #status = :status, updatedAt = :updatedAt',
                        ExpressionAttributeNames={'#status': 'status'},
                        ExpressionAttributeValues={
                            ':status': calculated_status,
                            ':updatedAt': user_data.get('updatedAt', '')  # Keep existing timestamp or use current
                        }
                    )
                    
                    logger.info(f"Successfully updated user {user_id} status to {calculated_status}")
                else:
                    logger.debug(f"User {user_id} status {current_status} is already correct")
                    
            except Exception as e:
                logger.error(f"Error processing record: {e}")
                # Continue processing other records even if one fails
                continue
        
        logger.info("Completed processing all DynamoDB stream records")
        
    except Exception as e:
        logger.error(f"Error in Lambda handler: {e}")
        # Don't raise exception to avoid retries that might cause infinite loops
        return

    return {"statusCode": 200, "message": "Processing completed"}