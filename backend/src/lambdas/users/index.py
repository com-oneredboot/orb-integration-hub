# file: backend/src/lambdas/users/index.py
# author: AI Assistant
# created: 2025-07-17
# description: Lambda resolver for Users GraphQL operations with security and audit logging

import json
import os
import logging
import time
import uuid
from typing import Dict, Any, Optional, List
from datetime import datetime
import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

# Import security layer components
from user_context_middleware import (
    user_context_required,
    requires_self_or_admin,
    admin_required,
    UserContext
)
from users_audit_logger import (
    UserAuditEventType,
    log_user_audit_event,
    ComplianceFlag
)
from orb_common.audit import StateTracker, FieldClassification
from orb_common.exceptions import (
    SecurityViolationError,
    DataValidationError,
    AuthenticationError
)

# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class UsersResolver:
    """Lambda resolver for Users GraphQL operations with security layer integration."""
    
    def __init__(self):
        self.dynamodb = boto3.resource('dynamodb')
        
        # Get table names from environment
        self.users_table_name = os.environ.get('USERS_TABLE_NAME', 'Users')
        self.organizations_table_name = os.environ.get('ORGANIZATIONS_TABLE_NAME', 'Organizations')
        self.organization_users_table_name = os.environ.get('ORGANIZATION_USERS_TABLE_NAME', 'OrganizationUsers')
        
        logger.info(f"Initializing UsersResolver with table: {self.users_table_name}")
        
        self.users_table = self.dynamodb.Table(self.users_table_name)
        self.organizations_table = self.dynamodb.Table(self.organizations_table_name)
        self.organization_users_table = self.dynamodb.Table(self.organization_users_table_name)
    
    @user_context_required(log_access=True)
    @requires_self_or_admin()
    def get_user(self, event: Dict[str, Any], user_context: UserContext) -> Dict[str, Any]:
        """Get a single user by ID."""
        try:
            args = event.get('arguments', {})
            user_id = args.get('userId')
            
            if not user_id:
                return {
                    'StatusCode': 400,
                    'Message': 'userId is required',
                    'Data': None
                }
            
            # Get the user
            response = self.users_table.get_item(
                Key={'userId': user_id}
            )
            
            user = response.get('Item')
            if not user:
                return {
                    'StatusCode': 404,
                    'Message': f'User {user_id} not found',
                    'Data': None
                }
            
            # Log successful access
            log_user_audit_event(
                event_type=UserAuditEventType.USER_PROFILE_VIEWED,
                acting_user_context=user_context.to_audit_context(),
                target_user_id=user_id,
                action_details={
                    'operation': 'GetUser',
                    'self_access': user_context.is_self_access,
                    'admin_override': user_context.is_admin and not user_context.is_self_access
                }
            )
            
            logger.info(f"Successfully retrieved user {user_id}")
            return {
                'StatusCode': 200,
                'Message': 'User retrieved successfully',
                'Data': user
            }
            
        except Exception as e:
            logger.error(f"Error getting user: {str(e)}")
            return {
                'StatusCode': 500,
                'Message': f'Error retrieving user: {str(e)}',
                'Data': None
            }
    
    @user_context_required(log_access=True)
    @requires_self_or_admin()
    def update_user(self, event: Dict[str, Any], user_context: UserContext) -> Dict[str, Any]:
        """Update a user's information."""
        try:
            args = event.get('arguments', {})
            user_id = args.get('userId')
            updates = args.get('input', {})
            
            if not user_id:
                return {
                    'StatusCode': 400,
                    'Message': 'userId is required',
                    'Data': None
                }
            
            if not updates:
                return {
                    'StatusCode': 400,
                    'Message': 'No updates provided',
                    'Data': None
                }
            
            # Get current state for audit tracking
            current_response = self.users_table.get_item(
                Key={'userId': user_id}
            )
            current_user = current_response.get('Item')
            
            if not current_user:
                return {
                    'StatusCode': 404,
                    'Message': f'User {user_id} not found',
                    'Data': None
                }
            
            # Track state changes
            from orb_common.audit import track_state_change
            state_tracker = track_state_change(
                old_state=current_user,
                new_state={**current_user, **updates},
                field_classifications={
                    'email': FieldClassification.PII,
                    'phone': FieldClassification.PII,
                    'address': FieldClassification.PII,
                    'dateOfBirth': FieldClassification.PII,
                    'ssn': FieldClassification.SENSITIVE,
                    'displayName': FieldClassification.INTERNAL,
                    'bio': FieldClassification.INTERNAL,
                    'website': FieldClassification.INTERNAL,
                    'location': FieldClassification.INTERNAL
                }
            )
            
            # Build update expression
            update_expr = "SET "
            expr_values = {}
            expr_names = {}
            
            for key, value in updates.items():
                if key not in ['userId', 'createdAt', 'cognitoSub']:  # Prevent updating immutable fields
                    update_expr += f"#{key} = :{key}, "
                    expr_names[f"#{key}"] = key
                    expr_values[f":{key}"] = value
            
            # Add updatedAt timestamp
            update_expr += "#updatedAt = :updatedAt"
            expr_names["#updatedAt"] = "updatedAt"
            expr_values[":updatedAt"] = datetime.utcnow().isoformat()
            
            # Execute update
            response = self.users_table.update_item(
                Key={'userId': user_id},
                UpdateExpression=update_expr,
                ExpressionAttributeNames=expr_names,
                ExpressionAttributeValues=expr_values,
                ReturnValues="ALL_NEW"
            )
            
            # Log the update with state changes
            log_user_audit_event(
                event_type=UserAuditEventType.USER_UPDATED,
                acting_user_context=user_context.to_audit_context(),
                target_user_id=user_id,
                action_details={
                    'operation': 'UpdateUser',
                    'self_update': user_context.is_self_access,
                    'admin_update': user_context.is_admin and not user_context.is_self_access,
                    'fields_updated': list(updates.keys())
                },
                state_changes=state_tracker.get_changes()
            )
            
            logger.info(f"Successfully updated user {user_id}")
            return {
                'StatusCode': 200,
                'Message': 'User updated successfully',
                'Data': response['Attributes']
            }
            
        except Exception as e:
            logger.error(f"Error updating user: {str(e)}")
            return {
                'StatusCode': 500,
                'Message': f'Error updating user: {str(e)}',
                'Data': None
            }
    
    @user_context_required(log_access=True)
    @admin_required()
    def list_users(self, event: Dict[str, Any], user_context: UserContext) -> Dict[str, Any]:
        """List users with optional filtering (admin only)."""
        try:
            args = event.get('arguments', {})
            limit = args.get('limit', 20)
            next_token = args.get('nextToken')
            filter_status = args.get('status')
            
            scan_params = {
                'Limit': limit
            }
            
            if next_token:
                scan_params['ExclusiveStartKey'] = json.loads(next_token)
            
            # Add status filter if provided
            if filter_status:
                scan_params['FilterExpression'] = '#status = :status'
                scan_params['ExpressionAttributeNames'] = {'#status': 'status'}
                scan_params['ExpressionAttributeValues'] = {':status': filter_status}
            
            response = self.users_table.scan(**scan_params)
            
            result = {
                'items': response.get('Items', []),
                'count': response.get('Count', 0),
                'scannedCount': response.get('ScannedCount', 0)
            }
            
            if 'LastEvaluatedKey' in response:
                result['nextToken'] = json.dumps(response['LastEvaluatedKey'])
            
            # Log the data export event
            log_user_audit_event(
                event_type=UserAuditEventType.USER_DATA_EXPORTED,
                acting_user_context=user_context.to_audit_context(),
                target_user_id='ALL_USERS',
                action_details={
                    'operation': 'ListUsers',
                    'count': result['count'],
                    'filter_status': filter_status,
                    'limit': limit,
                    'has_more': 'nextToken' in result
                },
                compliance_flags=[ComplianceFlag.GDPR, ComplianceFlag.SOC_2]
            )
            
            logger.info(f"Successfully listed {result['count']} users")
            return {
                'StatusCode': 200,
                'Message': 'Users retrieved successfully',
                'Data': result
            }
            
        except Exception as e:
            logger.error(f"Error listing users: {str(e)}")
            return {
                'StatusCode': 500,
                'Message': f'Error listing users: {str(e)}',
                'Data': None
            }
    
    @user_context_required(log_access=True)
    @admin_required()
    def create_user(self, event: Dict[str, Any], user_context: UserContext) -> Dict[str, Any]:
        """Create a new user (admin only)."""
        try:
            args = event.get('arguments', {})
            user_data = args.get('input', {})
            
            # Validate required fields
            required_fields = ['email', 'firstName', 'lastName']
            missing_fields = [field for field in required_fields if field not in user_data]
            
            if missing_fields:
                raise DataValidationError(
                    message="Missing required fields",
                    validation_errors={field: "This field is required" for field in missing_fields}
                )
            
            # Generate user ID
            user_id = str(uuid.uuid4())
            
            # Check if email already exists
            email_check = self.users_table.query(
                IndexName='EmailIndex',
                KeyConditionExpression='email = :email',
                ExpressionAttributeValues={':email': user_data['email']}
            )
            
            if email_check.get('Items'):
                return {
                    'StatusCode': 409,
                    'Message': 'User with this email already exists',
                    'Data': None
                }
            
            # Prepare user item
            timestamp = datetime.utcnow().isoformat()
            user_item = {
                'userId': user_id,
                'email': user_data['email'],
                'firstName': user_data['firstName'],
                'lastName': user_data['lastName'],
                'status': user_data.get('status', 'PENDING'),
                'createdAt': timestamp,
                'updatedAt': timestamp,
                'createdBy': user_context.user_id
            }
            
            # Add optional fields
            optional_fields = ['phone', 'address', 'dateOfBirth', 'preferences', 'displayName', 'bio', 'website', 'location']
            for field in optional_fields:
                if field in user_data:
                    user_item[field] = user_data[field]
            
            # Create the user
            self.users_table.put_item(Item=user_item)
            
            # Log user creation
            log_user_audit_event(
                event_type=UserAuditEventType.USER_CREATED,
                acting_user_context=user_context.to_audit_context(),
                target_user_id=user_id,
                action_details={
                    'operation': 'CreateUser',
                    'email': user_data['email'],
                    'status': user_item['status'],
                    'created_by': user_context.user_id
                },
                compliance_flags=[ComplianceFlag.GDPR, ComplianceFlag.SOC_2]
            )
            
            logger.info(f"Successfully created user {user_id}")
            return {
                'StatusCode': 200,
                'Message': 'User created successfully',
                'Data': user_item
            }
            
        except DataValidationError as e:
            return {
                'StatusCode': e.status_code,
                'Message': str(e),
                'Data': None
            }
        except Exception as e:
            logger.error(f"Error creating user: {str(e)}")
            return {
                'StatusCode': 500,
                'Message': f'Error creating user: {str(e)}',
                'Data': None
            }
    
    @user_context_required(log_access=True)
    @admin_required()
    def delete_user(self, event: Dict[str, Any], user_context: UserContext) -> Dict[str, Any]:
        """Soft delete a user (admin only)."""
        try:
            args = event.get('arguments', {})
            user_id = args.get('userId')
            hard_delete = args.get('hardDelete', False)
            
            if not user_id:
                return {
                    'StatusCode': 400,
                    'Message': 'userId is required',
                    'Data': None
                }
            
            # Prevent self-deletion
            if user_id == user_context.user_id:
                return {
                    'StatusCode': 400,
                    'Message': 'Cannot delete your own account',
                    'Data': None
                }
            
            # Get current user
            response = self.users_table.get_item(
                Key={'userId': user_id}
            )
            current_user = response.get('Item')
            
            if not current_user:
                return {
                    'StatusCode': 404,
                    'Message': f'User {user_id} not found',
                    'Data': None
                }
            
            timestamp = datetime.utcnow().isoformat()
            
            if hard_delete:
                # Hard delete - actually remove from database
                self.users_table.delete_item(
                    Key={'userId': user_id}
                )
                
                # Log hard deletion
                log_user_audit_event(
                    event_type=UserAuditEventType.USER_DELETED,
                    acting_user_context=user_context.to_audit_context(),
                    target_user_id=user_id,
                    action_details={
                        'operation': 'DeleteUser',
                        'deletion_type': 'HARD',
                        'user_email': current_user.get('email'),
                        'deleted_by': user_context.user_id
                    },
                    compliance_flags=[ComplianceFlag.GDPR, ComplianceFlag.SOX]
                )
                
                message = 'User permanently deleted'
            else:
                # Soft delete - mark as deleted
                update_response = self.users_table.update_item(
                    Key={'userId': user_id},
                    UpdateExpression='SET #status = :status, #deletedAt = :deletedAt, #deletedBy = :deletedBy, #updatedAt = :updatedAt',
                    ExpressionAttributeNames={
                        '#status': 'status',
                        '#deletedAt': 'deletedAt',
                        '#deletedBy': 'deletedBy',
                        '#updatedAt': 'updatedAt'
                    },
                    ExpressionAttributeValues={
                        ':status': 'DELETED',
                        ':deletedAt': timestamp,
                        ':deletedBy': user_context.user_id,
                        ':updatedAt': timestamp
                    },
                    ReturnValues='ALL_NEW'
                )
                
                # Log soft deletion
                log_user_audit_event(
                    event_type=UserAuditEventType.USER_DEACTIVATED,
                    acting_user_context=user_context.to_audit_context(),
                    target_user_id=user_id,
                    action_details={
                        'operation': 'DeleteUser',
                        'deletion_type': 'SOFT',
                        'user_email': current_user.get('email'),
                        'deleted_by': user_context.user_id
                    },
                    state_changes={
                        'status': {'before': current_user.get('status'), 'after': 'DELETED'}
                    }
                )
                
                message = 'User marked as deleted'
            
            logger.info(f"Successfully deleted user {user_id} (hard_delete={hard_delete})")
            return {
                'StatusCode': 200,
                'Message': message,
                'Data': {'userId': user_id, 'deleted': True}
            }
            
        except Exception as e:
            logger.error(f"Error deleting user: {str(e)}")
            return {
                'StatusCode': 500,
                'Message': f'Error deleting user: {str(e)}',
                'Data': None
            }
    
    def query_by_cognito_sub(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Query user by Cognito sub - commonly used by frontend after authentication."""
        try:
            args = event.get('arguments', {}).get('input', {})
            cognito_sub = args.get('cognitoSub')
            
            if not cognito_sub:
                return {
                    'StatusCode': 400,
                    'Message': 'cognitoSub is required',
                    'Data': None
                }
            
            # Query by GSI
            response = self.users_table.query(
                IndexName='CognitoSubIndex',
                KeyConditionExpression=Key('cognitoSub').eq(cognito_sub)
            )
            
            items = response.get('Items', [])
            
            logger.info(f"Found {len(items)} users for cognitoSub: {cognito_sub}")
            
            # Log login event if user found
            if items:
                user = items[0]
                user_context = {
                    'user_id': user.get('userId'),
                    'cognito_sub': cognito_sub,
                    'email': user.get('email'),
                    'ip_address': event.get('requestContext', {}).get('identity', {}).get('sourceIp'),
                    'user_agent': event.get('requestContext', {}).get('identity', {}).get('userAgent'),
                    'session_id': event.get('requestContext', {}).get('requestId')
                }
                
                # Log successful login
                log_user_audit_event(
                    event_type=UserAuditEventType.USER_LOGIN_SUCCESS,
                    acting_user_context=user_context,
                    target_user_id=user.get('userId'),
                    action_details={
                        'operation': 'UsersQueryByCognitoSub',
                        'auth_method': 'cognito',
                        'login_source': 'web_app',
                        'success': True
                    },
                    compliance_flags=[ComplianceFlag.SOX, ComplianceFlag.SOC_2]
                )
            else:
                # Log failed login attempt
                log_user_audit_event(
                    event_type=UserAuditEventType.USER_LOGIN_FAILED,
                    acting_user_context={
                        'cognito_sub': cognito_sub,
                        'ip_address': event.get('requestContext', {}).get('identity', {}).get('sourceIp'),
                        'user_agent': event.get('requestContext', {}).get('identity', {}).get('userAgent')
                    },
                    target_user_id='UNKNOWN',
                    action_details={
                        'operation': 'UsersQueryByCognitoSub',
                        'auth_method': 'cognito',
                        'failure_reason': 'user_not_found',
                        'cognito_sub': cognito_sub
                    },
                    compliance_flags=[ComplianceFlag.SOX, ComplianceFlag.SOC_2]
                )
            
            return {
                'StatusCode': 200,
                'Message': None,
                'Data': items
            }
            
        except Exception as e:
            logger.error(f"Error querying user by cognitoSub: {str(e)}")
            return {
                'StatusCode': 500,
                'Message': f'Failed to query user: {str(e)}',
                'Data': None
            }
    
    def query_by_user_id(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Query user by userId."""
        try:
            args = event.get('arguments', {}).get('input', {})
            user_id = args.get('userId')
            
            if not user_id:
                return {
                    'StatusCode': 400,
                    'Message': 'userId is required',
                    'Data': None
                }
            
            # Direct query on primary key
            response = self.users_table.query(
                KeyConditionExpression=Key('userId').eq(user_id)
            )
            
            items = response.get('Items', [])
            
            return {
                'StatusCode': 200,
                'Message': None,
                'Data': items
            }
            
        except Exception as e:
            logger.error(f"Error querying user by userId: {str(e)}")
            return {
                'StatusCode': 500,
                'Message': f'Failed to query user: {str(e)}',
                'Data': None
            }
    
    def query_by_email(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Query user by email."""
        try:
            args = event.get('arguments', {}).get('input', {})
            email = args.get('email')
            
            if not email:
                return {
                    'StatusCode': 400,
                    'Message': 'email is required',
                    'Data': None
                }
            
            # Query by GSI
            response = self.users_table.query(
                IndexName='EmailIndex',
                KeyConditionExpression=Key('email').eq(email)
            )
            
            items = response.get('Items', [])
            
            return {
                'StatusCode': 200,
                'Message': None,
                'Data': items
            }
            
        except Exception as e:
            logger.error(f"Error querying user by email: {str(e)}")
            return {
                'StatusCode': 500,
                'Message': f'Failed to query user: {str(e)}',
                'Data': None
            }
    
    def query_by_cognito_id(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Query user by Cognito ID."""
        try:
            args = event.get('arguments', {}).get('input', {})
            cognito_id = args.get('cognitoId')
            
            if not cognito_id:
                return {
                    'StatusCode': 400,
                    'Message': 'cognitoId is required',
                    'Data': None
                }
            
            # Query by GSI
            response = self.users_table.query(
                IndexName='CognitoIdIndex',
                KeyConditionExpression=Key('cognitoId').eq(cognito_id)
            )
            
            items = response.get('Items', [])
            
            return {
                'StatusCode': 200,
                'Message': None,
                'Data': items
            }
            
        except Exception as e:
            logger.error(f"Error querying user by cognitoId: {str(e)}")
            return {
                'StatusCode': 500,
                'Message': f'Failed to query user: {str(e)}',
                'Data': None
            }
    
    def get_user_organizations(self, event: Dict[str, Any], user_context: UserContext) -> Dict[str, Any]:
        """Get organizations a user belongs to."""
        try:
            args = event.get('arguments', {})
            user_id = args.get('userId', user_context.user_id)
            
            # Query OrganizationUsers table
            response = self.organization_users_table.query(
                IndexName='UserIndex',
                KeyConditionExpression='userId = :userId',
                ExpressionAttributeValues={':userId': user_id}
            )
            
            org_memberships = response.get('Items', [])
            
            # Get organization details for each membership
            organizations = []
            for membership in org_memberships:
                if membership.get('status') == 'ACTIVE':
                    org_response = self.organizations_table.get_item(
                        Key={'organizationId': membership['organizationId']}
                    )
                    if org_response.get('Item'):
                        org = org_response['Item']
                        org['userRole'] = membership.get('role')
                        organizations.append(org)
            
            return {
                'StatusCode': 200,
                'Message': 'User organizations retrieved successfully',
                'Data': organizations
            }
            
        except Exception as e:
            logger.error(f"Error getting user organizations: {str(e)}")
            return {
                'StatusCode': 500,
                'Message': f'Error retrieving user organizations: {str(e)}',
                'Data': None
            }


# Lambda handler
def lambda_handler(event, context):
    """Main Lambda handler for Users GraphQL operations."""
    logger.info(f"Users resolver invoked with event: {json.dumps(event)}")
    
    try:
        # Initialize resolver
        resolver = UsersResolver()
        
        # Get the GraphQL field name to determine operation
        field_name = event.get('info', {}).get('fieldName')
        
        # Route to appropriate handler
        if field_name == 'UsersGet':
            return resolver.get_user(event)
        elif field_name == 'UsersUpdate':
            return resolver.update_user(event)
        elif field_name == 'UsersList':
            return resolver.list_users(event)
        elif field_name == 'UsersCreate':
            return resolver.create_user(event)
        elif field_name == 'UsersDelete':
            return resolver.delete_user(event)
        elif field_name == 'UsersDisable':
            return resolver.delete_user(event)  # Uses same method with soft delete
        elif field_name == 'UsersQueryByUserId':
            return resolver.query_by_user_id(event)
        elif field_name == 'UsersQueryByEmail':
            return resolver.query_by_email(event)
        elif field_name == 'UsersQueryByCognitoId':
            return resolver.query_by_cognito_id(event)
        elif field_name == 'UsersQueryByCognitoSub':
            return resolver.query_by_cognito_sub(event)
        elif field_name == 'UserOrganizations':
            # This will need security context, so extract it first
            from user_context_middleware import UserContextExtractor
            extractor = UserContextExtractor()
            user_context = extractor.extract_context(event)
            return resolver.get_user_organizations(event, user_context)
        else:
            logger.error(f'Unknown GraphQL operation: {field_name}')
            return {
                'StatusCode': 400,
                'Message': f'Unknown operation: {field_name}',
                'Data': None
            }
            
    except Exception as e:
        logger.error(f"Unhandled error in Users resolver: {str(e)}")
        return {
            'StatusCode': 500,
            'Message': 'Internal server error',
            'Data': None
        }