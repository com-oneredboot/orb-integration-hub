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
cognito_client = boto3.client('cognito-idp')

# Environment variables
LOGGING_LEVEL = os.getenv('LOGGING_LEVEL', 'INFO')
USERS_TABLE_NAME = os.getenv('USERS_TABLE_NAME')
USER_POOL_ID = os.getenv('USER_POOL_ID')

# Setting up logging
logger = logging.getLogger()
logger.setLevel(getattr(logging, LOGGING_LEVEL.upper(), logging.INFO))

def check_cognito_mfa_status(email: str) -> Dict[str, bool]:
    """
    Check user's MFA status in Cognito using multiple methods.
    
    Args:
        email: User's email address (username in Cognito)
        
    Returns:
        Dictionary with mfaEnabled and mfaSetupComplete status
    """
    try:
        if not USER_POOL_ID:
            logger.error("USER_POOL_ID environment variable not set")
            return {'mfaEnabled': False, 'mfaSetupComplete': False}
        
        # Call adminGetUser to get user's MFA status
        response = cognito_client.admin_get_user(
            UserPoolId=USER_POOL_ID,
            Username=email
        )
        
        # Check MFA options (legacy MFA configuration, mainly SMS)
        mfa_options = response.get('MFAOptions', [])
        has_mfa_options = len(mfa_options) > 0
        
        # Check UserMFASettingList for detailed MFA settings (newer MFA configuration)
        # Note: This can be empty even when MFA is configured unless AdminSetUserMFAPreference was called
        user_mfa_settings = response.get('UserMFASettingList', [])
        has_mfa_settings = len(user_mfa_settings) > 0
        
        # Check PreferredMfaSetting - indicates user has set MFA preferences
        preferred_mfa = response.get('PreferredMfaSetting')
        has_preferred_mfa = preferred_mfa is not None
        
        logger.debug(f"Raw Cognito response for {email}:")
        logger.debug(f"  MFAOptions: {mfa_options}")
        logger.debug(f"  UserMFASettingList: {user_mfa_settings}")
        logger.debug(f"  PreferredMfaSetting: {preferred_mfa}")
        
        # Try to get user's registered devices using admin_list_devices
        try:
            devices_response = cognito_client.admin_list_devices(
                UserPoolId=USER_POOL_ID,
                Username=email
            )
            devices = devices_response.get('Devices', [])
            has_devices = len(devices) > 0
            logger.debug(f"  Registered Devices: {len(devices)} total")
            if has_devices:
                for device in devices:
                    logger.debug(f"    Device: {device.get('DeviceKey', 'Unknown')} - Created: {device.get('DeviceCreateDate', 'Unknown')}")
        except Exception as device_error:
            logger.debug(f"Could not check registered devices: {device_error}")
            has_devices = False
        
        # Check user pool MFA configuration
        try:
            user_pool_response = cognito_client.describe_user_pool(
                UserPoolId=USER_POOL_ID
            )
            user_pool = user_pool_response.get('UserPool', {})
            mfa_configuration = user_pool.get('MfaConfiguration', 'OFF')
            logger.debug(f"  User Pool MFA Configuration: {mfa_configuration}")
            
            # If MFA is OPTIONAL or ON at user pool level, and user has it enabled
            # Check if user-level MFA might be active
            pool_has_mfa = mfa_configuration in ['OPTIONAL', 'ON']
        except Exception as pool_error:
            logger.debug(f"Could not check user pool MFA config: {pool_error}")
            pool_has_mfa = False
            
        # Try to get user's MFA preferences directly
        try:
            mfa_prefs_response = cognito_client.admin_get_user_mfa_preference(
                UserPoolId=USER_POOL_ID,
                Username=email
            )
            sms_mfa_enabled = mfa_prefs_response.get('SMSMfaSettings', {}).get('Enabled', False)
            software_token_enabled = mfa_prefs_response.get('SoftwareTokenMfaSettings', {}).get('Enabled', False)
            logger.debug(f"  User MFA Preferences: SMS={sms_mfa_enabled}, SoftwareToken={software_token_enabled}")
            has_user_mfa_prefs = sms_mfa_enabled or software_token_enabled
        except Exception as mfa_prefs_error:
            logger.debug(f"Could not check user MFA preferences: {mfa_prefs_error}")
            has_user_mfa_prefs = False
        
        # Determine MFA status using multiple indicators
        # MFA is considered enabled if ANY of these are true:
        # 1. Legacy MFAOptions exist (SMS MFA)
        # 2. UserMFASettingList contains settings (SMS_MFA or SOFTWARE_TOKEN_MFA)
        # 3. PreferredMfaSetting is set
        # 4. User has registered devices (remembered devices)
        # 5. User pool has MFA enabled and user has MFA preferences set
        mfa_enabled = (
            has_mfa_options or 
            has_mfa_settings or 
            has_preferred_mfa or 
            has_devices or
            (pool_has_mfa and has_user_mfa_prefs)
        )
        
        # MFA setup is considered complete if MFA is enabled
        # Additional checks could be added here for more granular status
        mfa_setup_complete = mfa_enabled
        
        logger.info(f"Cognito MFA status for {email}: enabled={mfa_enabled}, complete={mfa_setup_complete}")
        logger.debug(f"  Indicators: mfa_options={has_mfa_options}, mfa_settings={has_mfa_settings}, preferred={has_preferred_mfa}, devices={has_devices}, pool_mfa={pool_has_mfa}, user_prefs={has_user_mfa_prefs}")
        
        result = {
            'mfaEnabled': mfa_enabled,
            'mfaSetupComplete': mfa_setup_complete
        }
        logger.debug(f"Returning MFA status result: {result}")
        return result
        
    except cognito_client.exceptions.UserNotFoundException:
        logger.warning(f"User {email} not found in Cognito")
        return {'mfaEnabled': False, 'mfaSetupComplete': False}
    except Exception as e:
        logger.error(f"Error checking Cognito MFA status for {email}: {e}")
        return {'mfaEnabled': False, 'mfaSetupComplete': False}

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
    
    # Always check Cognito for MFA status as it's the single source of truth
    email = user_data.get('email')
    if email:
        logger.info(f"Checking Cognito MFA status for user {user_data.get('userId')} (Cognito is single source of truth)")
        cognito_mfa_status = check_cognito_mfa_status(email)
        logger.debug(f"Cognito MFA status result: {cognito_mfa_status}")
        
        # Get current DynamoDB MFA values for comparison
        current_mfa_enabled = user_data.get('mfaEnabled')
        current_mfa_complete = user_data.get('mfaSetupComplete')
        
        # Update user_data with Cognito values for this calculation
        user_data['mfaEnabled'] = cognito_mfa_status['mfaEnabled']
        user_data['mfaSetupComplete'] = cognito_mfa_status['mfaSetupComplete']
        
        # Check if MFA status changed from what's in DynamoDB
        mfa_status_changed = (
            current_mfa_enabled != cognito_mfa_status['mfaEnabled'] or
            current_mfa_complete != cognito_mfa_status['mfaSetupComplete']
        )
        
        if mfa_status_changed:
            user_data['_mfa_status_updated'] = True  # Flag to indicate we updated MFA status
            logger.info(f"MFA status changed for user {user_data.get('userId')}: "
                       f"enabled {current_mfa_enabled} -> {cognito_mfa_status['mfaEnabled']}, "
                       f"complete {current_mfa_complete} -> {cognito_mfa_status['mfaSetupComplete']}")
        
        mfa_enabled = cognito_mfa_status['mfaEnabled']
        mfa_setup_complete = cognito_mfa_status['mfaSetupComplete']
    else:
        logger.warning(f"No email found for user {user_data.get('userId')}, cannot check Cognito MFA")
        mfa_enabled = False
        mfa_setup_complete = False
    
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
        'mfaSetupComplete', # Whether MFA setup has been completed
        'updatedAt'        # Process updatedAt changes (for MFA check triggers)
    }
    
    try:
        old_image = record.get('dynamodb', {}).get('OldImage', {})
        new_image = record.get('dynamodb', {}).get('NewImage', {})
        
        # For INSERT events, always process (no old image)
        if not old_image:
            return True
        
        # Track which fields changed
        changed_fields = []
        
        # Check if any status-relevant field changed
        logger.debug(f"Checking fields: {status_relevant_fields}")
        for field in status_relevant_fields:
            old_value = convert_dynamodb_value(old_image.get(field, {})) if old_image.get(field) else None
            new_value = convert_dynamodb_value(new_image.get(field, {})) if new_image.get(field) else None
            
            logger.debug(f"Field '{field}': old='{old_value}' new='{new_value}' changed={old_value != new_value}")
            
            if old_value != new_value:
                changed_fields.append(field)
                logger.info(f"Status-relevant field '{field}' changed from '{old_value}' to '{new_value}'")
        
        # Store metadata about what changed for later use
        if len(changed_fields) == 1 and changed_fields[0] == 'updatedAt':
            # Only updatedAt changed - this is likely a "Check MFA Setup" trigger
            record['_is_mfa_check_trigger'] = True
            logger.info("Detected MFA check trigger (only updatedAt changed)")
        
        has_changes = len(changed_fields) > 0
        if not has_changes:
            logger.debug("No status-relevant fields changed, skipping status calculation")
        
        return has_changes
        
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
    logger.debug(f"Environment variables: USER_POOL_ID={USER_POOL_ID}, USERS_TABLE_NAME={USERS_TABLE_NAME}")
    
    if not USERS_TABLE_NAME:
        logger.error("USERS_TABLE_NAME environment variable not set")
        return
    
    try:
        table = dynamodb.Table(USERS_TABLE_NAME)
        
        for record in event.get('Records', []):
            try:
                # Only process MODIFY and INSERT events
                event_name = record.get('eventName')
                logger.debug(f"Processing record with event type: {event_name}")
                if event_name not in ['MODIFY', 'INSERT']:
                    logger.debug(f"Skipping event type: {event_name}")
                    continue
                
                # Check if status-relevant fields changed
                if not has_status_relevant_changes(record):
                    logger.debug("No status-relevant fields changed, skipping record")
                    continue
                
                # Extract user data from the record
                user_data = extract_user_data_from_dynamodb_record(record)
                logger.debug(f"Extracted user data: userId={user_data.get('userId') if user_data else 'None'}")
                if not user_data or not user_data.get('userId'):
                    logger.debug("No valid user data found in record")
                    continue
                
                user_id = user_data['userId']
                current_status = user_data.get('status', 'UNKNOWN')
                
                # Calculate what the status should be (this may also update MFA fields)
                calculated_status = calculate_user_status(user_data)
                
                # Check if MFA status was updated during calculation
                mfa_status_updated = user_data.get('_mfa_status_updated', False)
                status_needs_update = current_status != calculated_status
                
                logger.debug(f"Update check for user {user_id}: status_needs_update={status_needs_update}, mfa_status_updated={mfa_status_updated}")
                
                # Update if status changed OR if MFA status was updated from Cognito
                if status_needs_update or mfa_status_updated:
                    update_fields = []
                    expression_names = {}
                    expression_values = {}
                    
                    # Always update the timestamp
                    update_fields.append('updatedAt = :updatedAt')
                    expression_values[':updatedAt'] = user_data.get('updatedAt', '')
                    
                    # Update status if it changed
                    if status_needs_update:
                        update_fields.append('#status = :status')
                        expression_names['#status'] = 'status'
                        expression_values[':status'] = calculated_status
                        logger.info(f"Updating user {user_id} status from {current_status} to {calculated_status}")
                    
                    # Update MFA fields if they were updated from Cognito
                    if mfa_status_updated:
                        update_fields.append('mfaEnabled = :mfaEnabled, mfaSetupComplete = :mfaSetupComplete')
                        expression_values[':mfaEnabled'] = user_data['mfaEnabled']
                        expression_values[':mfaSetupComplete'] = user_data['mfaSetupComplete']
                        logger.info(f"Updating user {user_id} MFA status from Cognito: enabled={user_data['mfaEnabled']}, complete={user_data['mfaSetupComplete']}")
                    
                    # Perform the update
                    update_expression = 'SET ' + ', '.join(update_fields)
                    
                    logger.debug(f"Performing DynamoDB update for user {user_id}")
                    logger.debug(f"UpdateExpression: {update_expression}")
                    logger.debug(f"ExpressionAttributeValues: {expression_values}")
                    
                    # Build update_item parameters
                    update_params = {
                        'Key': {'userId': user_id},
                        'UpdateExpression': update_expression,
                        'ExpressionAttributeValues': expression_values
                    }
                    
                    # Only add ExpressionAttributeNames if we have any
                    if expression_names:
                        update_params['ExpressionAttributeNames'] = expression_names
                    
                    table.update_item(**update_params)
                    
                    logger.info(f"Successfully updated user {user_id}")
                else:
                    logger.debug(f"User {user_id} status and MFA fields are already correct")
                    
            except Exception as e:
                logger.error(f"Error processing record: {e}")
                logger.error(f"Exception type: {type(e)}")
                logger.error(f"Exception details: {str(e)}")
                # Continue processing other records even if one fails
                continue
        
        logger.info("Completed processing all DynamoDB stream records")
        
    except Exception as e:
        logger.error(f"Error in Lambda handler: {e}")
        # Don't raise exception to avoid retries that might cause infinite loops
        return

    return {"statusCode": 200, "message": "Processing completed"}