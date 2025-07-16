# file: backend/src/lambdas/organizations_resolver/index.py
# author: AI Assistant
# created: 2025-06-22
# description: Lambda resolver for Organizations GraphQL operations with security

import json
import logging
import uuid
from datetime import datetime
from typing import Dict, Any, Optional
import boto3
from botocore.exceptions import ClientError

# Import from organization security layer
import sys
import os
from security_manager import OrganizationSecurityManager
from kms_manager import OrganizationKMSManager
from rbac_manager import OrganizationRBACManager, OrganizationPermissions
from context_middleware import (
    organization_context_required, 
    requires_permission, 
    requires_organization_owner,
    allows_platform_override
)
from aws_audit_logger import (
    AuditEventType, 
    ComplianceFlag, 
    log_organization_audit_event,
    state_tracker
)

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class OrganizationsResolver:
    """Lambda resolver for Organizations GraphQL operations."""
    
    def __init__(self):
        self.dynamodb = boto3.resource('dynamodb')
        table_name = os.environ.get('ORGANIZATIONS_TABLE_NAME', 'Organizations')
        self.organizations_table = self.dynamodb.Table(table_name)
        self.security_manager = OrganizationSecurityManager()
        self.kms_manager = OrganizationKMSManager()
        self.rbac_manager = OrganizationRBACManager()
    
    def create_organization(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new organization with security validation."""
        try:
            logger.info("Starting organization creation process")
            
            # Extract user context
            user_id = event.get('identity', {}).get('sub')
            cognito_groups = event.get('identity', {}).get('groups', [])
            
            logger.info(f"User authenticated, Groups count: {len(cognito_groups)}")
            
            if not user_id:
                return self._error_response('User ID not found in request context')
            
            # Extract arguments
            args = event.get('arguments', {})
            input_data = args.get('input', {})
            name = input_data.get('name')
            description = input_data.get('description', '')
            
            logger.info(f"Organization creation requested with name length: {len(name) if name else 0}")
            
            if not name:
                return self._error_response('Organization name is required')
            
            # Validate platform access
            if not any(group in cognito_groups for group in ['OWNER', 'EMPLOYEE', 'CUSTOMER']):
                return self._error_response('Insufficient permissions to create organization')
            
            # Check starter plan limits for CUSTOMER users
            if 'CUSTOMER' in cognito_groups and 'OWNER' not in cognito_groups and 'EMPLOYEE' not in cognito_groups:
                existing_orgs = self._get_user_organizations(user_id)
                if len(existing_orgs) >= 1:  # Starter plan limit
                    return self._error_response('Starter plan allows only 1 organization. Upgrade to create more.')
            
            # Generate organization ID
            organization_id = str(uuid.uuid4())
            
            # Create organization-specific KMS key first
            try:
                kms_key_info = self.kms_manager.create_organization_kms_key(
                    organization_id=organization_id,
                    organization_name=name,
                    owner_user_id=user_id
                )
                logger.info(f"Created KMS key {kms_key_info['keyId']} for organization {organization_id}")
            except Exception as e:
                logger.error(f"Failed to create KMS key for organization {organization_id}: {str(e)}")
                return self._error_response(f"Failed to create encryption key: {str(e)}")
            
            # Encrypt sensitive organization data using organization-specific KMS key
            encrypted_description = ""
            if description:
                try:
                    encrypted_description = self.kms_manager.encrypt_organization_data(
                        organization_id=organization_id,
                        plaintext_data=description,
                        encryption_context={'field': 'description', 'action': 'create'}
                    )
                except Exception as e:
                    logger.warning(f"Failed to encrypt description: {str(e)}")
                    encrypted_description = description  # Fallback to plain text
            
            # Prepare organization data
            now = int(datetime.utcnow().timestamp())  # Numeric timestamp for DynamoDB
            organization_data = {
                'organizationId': organization_id,
                'name': name,  # Name stays unencrypted for searching
                'description': encrypted_description,  # Description encrypted for privacy
                'ownerId': user_id,
                'status': 'ACTIVE',
                'kmsKeyId': kms_key_info['keyId'],
                'kmsKeyArn': kms_key_info['keyArn'],
                'kmsAlias': kms_key_info['aliasName'],
                'createdAt': now,
                'updatedAt': now
            }
            
            logger.info(f"About to write organization {organization_id} to DynamoDB")
            
            # Write to DynamoDB with condition to prevent overwrites
            self.organizations_table.put_item(
                Item=organization_data,
                ConditionExpression='attribute_not_exists(organizationId)'
            )
            
            logger.info(f"Successfully wrote organization {organization_id} to DynamoDB")
            
            # Log audit event for organization creation
            try:
                user_context = {
                    'user_id': user_id,
                    'session_id': event.get('requestContext', {}).get('requestId'),
                    'ip_address': event.get('requestContext', {}).get('identity', {}).get('sourceIp'),
                    'user_agent': event.get('requestContext', {}).get('identity', {}).get('userAgent'),
                    'cognito_groups': cognito_groups
                }
                
                action_details = {
                    'operation': 'CREATE',
                    'method': 'POST',
                    'endpoint': 'createOrganization',
                    'success': True,
                    'permission_used': 'organization.create',
                    'request_id': event.get('requestContext', {}).get('requestId'),
                    'changes': {
                        'resource_created': organization_data,
                        'kms_key_created': kms_key_info
                    }
                }
                
                log_organization_audit_event(
                    event_type=AuditEventType.ORGANIZATION_CREATED,
                    user_context=user_context,
                    organization_id=organization_id,
                    action_details=action_details,
                    compliance_flags=[ComplianceFlag.SOX, ComplianceFlag.GDPR, ComplianceFlag.SOC_2]
                )
                
            except Exception as audit_error:
                # Critical: Audit logging failure should be logged but not fail the operation
                logger.critical(f"AUDIT_LOGGING_FAILURE for organization creation {organization_id}: {str(audit_error)}")
            
            logger.info(f"Created organization {organization_id} for user {user_id}")
            
            return {
                'statusCode': 200,
                'body': organization_data
            }
            
        except ClientError as e:
            if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
                # Clean up KMS key if organization creation fails
                try:
                    self.kms_manager.delete_organization_key(organization_id, pending_window_days=7)
                    logger.info(f"Cleaned up KMS key for failed organization {organization_id}")
                except Exception as cleanup_error:
                    logger.error(f"Failed to cleanup KMS key: {cleanup_error}")
                return self._error_response('Organization ID already exists')
            else:
                logger.error(f"DynamoDB error creating organization: {str(e)}")
                # Clean up KMS key on database error
                try:
                    self.kms_manager.delete_organization_key(organization_id, pending_window_days=7)
                    logger.info(f"Cleaned up KMS key for failed organization {organization_id}")
                except Exception as cleanup_error:
                    logger.error(f"Failed to cleanup KMS key: {cleanup_error}")
                return self._error_response(f"Database error: {str(e)}")
        except Exception as e:
            logger.error(f"Error creating organization: {str(e)}")
            return self._error_response(f"Internal error: {str(e)}")
    
    @requires_permission(OrganizationPermissions.ORGANIZATION_READ.key)
    def get_organization(self, event: Dict[str, Any], org_context) -> Dict[str, Any]:
        """Get an organization with automatic security validation."""
        try:
            organization = org_context.organization_data
            
            # Decrypt sensitive fields if they exist and are encrypted
            if organization.get('description'):
                try:
                    # Try to decrypt description (will fail gracefully if not encrypted)
                    decrypted_description = self.kms_manager.decrypt_organization_data(
                        organization_id=org_context.organization_id,
                        encrypted_data=organization['description'],
                        encryption_context={'field': 'description', 'action': 'create'}
                    )
                    organization['description'] = decrypted_description
                except Exception as e:
                    # If decryption fails, assume it's plain text (backward compatibility)
                    logger.debug(f"Description decryption failed (likely plain text): {str(e)}")
            
            return {
                'statusCode': 200,
                'body': organization
            }
            
        except Exception as e:
            logger.error(f"Error getting organization: {str(e)}")
            return self._error_response(f"Internal error: {str(e)}")
    
    def list_organizations(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """List organizations accessible to the user."""
        try:
            # Extract user context
            user_id = event.get('identity', {}).get('sub')
            cognito_groups = event.get('identity', {}).get('groups', [])
            
            # Get condition expression for user's accessible organizations
            condition_params = self.security_manager.get_condition_expression_for_user(
                user_id, cognito_groups
            )
            
            # Query organizations
            if condition_params:
                # Restricted access - scan with condition
                response = self.organizations_table.scan(
                    FilterExpression=condition_params['condition_expression']
                )
            else:
                # Platform admin - get all organizations
                response = self.organizations_table.scan()
            
            organizations = response.get('Items', [])
            
            return {
                'statusCode': 200,
                'body': organizations
            }
            
        except Exception as e:
            logger.error(f"Error listing organizations: {str(e)}")
            return self._error_response(f"Internal error: {str(e)}")
    
    @requires_permission(OrganizationPermissions.ORGANIZATION_UPDATE.key)
    def update_organization(self, event: Dict[str, Any], org_context) -> Dict[str, Any]:
        """Update an organization with automatic security validation."""
        try:
            # Extract arguments
            args = event.get('arguments', {})
            organization_id = org_context.organization_id
            
            # Capture current state for audit logging
            old_state = dict(org_context.organization_data)
            
            # Build update expression
            update_expression = "SET updatedAt = :updatedAt"
            expression_values = {':updatedAt': int(datetime.utcnow().timestamp())}
            expression_names = {}
            
            if 'name' in args:
                update_expression += ", #name = :name"
                expression_values[':name'] = args['name']
                expression_names['#name'] = 'name'
            
            if 'description' in args:
                # Encrypt description with organization-specific KMS key
                encrypted_description = args['description']
                if args['description']:
                    try:
                        encrypted_description = self.kms_manager.encrypt_organization_data(
                            organization_id=organization_id,
                            plaintext_data=args['description'],
                            encryption_context={'field': 'description', 'action': 'update'}
                        )
                    except Exception as e:
                        logger.warning(f"Failed to encrypt description: {str(e)}")
                        # Fallback to plain text
                
                update_expression += ", description = :description"
                expression_values[':description'] = encrypted_description
            
            # Update organization with condition to ensure it exists
            update_params = {
                'Key': {'organizationId': organization_id},
                'UpdateExpression': update_expression,
                'ExpressionAttributeValues': expression_values,
                'ReturnValues': 'ALL_NEW',
                'ConditionExpression': 'attribute_exists(organizationId)'
            }
            
            if expression_names:
                update_params['ExpressionAttributeNames'] = expression_names
            
            response = self.organizations_table.update_item(**update_params)
            
            # Log audit event for organization update with state changes
            try:
                new_state = dict(response['Attributes'])
                
                # Calculate state changes using the state tracker
                state_changes = state_tracker.capture_state_change(
                    resource_type='ORGANIZATION',
                    resource_id=organization_id,
                    old_state=old_state,
                    new_state=new_state
                )
                
                user_context = {
                    'user_id': org_context.user_id,
                    'session_id': event.get('requestContext', {}).get('requestId'),
                    'ip_address': event.get('requestContext', {}).get('identity', {}).get('sourceIp'),
                    'user_agent': event.get('requestContext', {}).get('identity', {}).get('userAgent'),
                    'cognito_groups': getattr(org_context, 'cognito_groups', [])
                }
                
                action_details = {
                    'operation': 'UPDATE',
                    'method': 'PUT',
                    'endpoint': 'updateOrganization',
                    'success': True,
                    'permission_used': OrganizationPermissions.ORGANIZATION_UPDATE.key,
                    'request_id': event.get('requestContext', {}).get('requestId'),
                    'changes': state_changes,
                    'fields_modified': list(args.keys())
                }
                
                log_organization_audit_event(
                    event_type=AuditEventType.ORGANIZATION_UPDATED,
                    user_context=user_context,
                    organization_id=organization_id,
                    action_details=action_details,
                    compliance_flags=[ComplianceFlag.SOX, ComplianceFlag.GDPR, ComplianceFlag.SOC_2]
                )
                
            except Exception as audit_error:
                # Critical: Audit logging failure should be logged but not fail the operation
                logger.critical(f"AUDIT_LOGGING_FAILURE for organization update {organization_id}: {str(audit_error)}")
            
            return {
                'statusCode': 200,
                'body': response['Attributes']
            }
            
        except ClientError as e:
            if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
                return self._error_response('Organization not found')
            else:
                logger.error(f"DynamoDB error updating organization: {str(e)}")
                return self._error_response(f"Database error: {str(e)}")
        except Exception as e:
            logger.error(f"Error updating organization: {str(e)}")
            return self._error_response(f"Internal error: {str(e)}")
    
    @requires_organization_owner()
    def delete_organization(self, event: Dict[str, Any], org_context) -> Dict[str, Any]:
        """Delete an organization with automatic security validation."""
        try:
            organization_id = org_context.organization_id
            
            # Capture current state for audit logging before deletion
            old_state = dict(org_context.organization_data)
            
            # Soft delete - update status to DELETED
            response = self.organizations_table.update_item(
                Key={'organizationId': organization_id},
                UpdateExpression="SET #status = :deleted_status, updatedAt = :updatedAt",
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={
                    ':deleted_status': 'DELETED',
                    ':updatedAt': int(datetime.utcnow().timestamp())
                },
                ReturnValues='ALL_NEW',
                ConditionExpression='attribute_exists(organizationId) AND #status <> :deleted_status'
            )
            
            # Schedule KMS key deletion (30-day pending window for compliance)
            try:
                kms_deletion_success = self.kms_manager.delete_organization_key(
                    organization_id, 
                    pending_window_days=30
                )
                if kms_deletion_success:
                    logger.info(f"Scheduled KMS key deletion for organization {organization_id}")
                else:
                    logger.warning(f"Failed to schedule KMS key deletion for organization {organization_id}")
            except Exception as kms_error:
                # Log KMS cleanup error but don't fail organization deletion
                logger.error(f"KMS key cleanup error for organization {organization_id}: {str(kms_error)}")
            
            # Log audit event for organization deletion
            try:
                new_state = dict(response['Attributes'])
                
                # Calculate state changes using the state tracker
                state_changes = state_tracker.capture_state_change(
                    resource_type='ORGANIZATION',
                    resource_id=organization_id,
                    old_state=old_state,
                    new_state=new_state
                )
                
                user_context = {
                    'user_id': org_context.user_id,
                    'session_id': event.get('requestContext', {}).get('requestId'),
                    'ip_address': event.get('requestContext', {}).get('identity', {}).get('sourceIp'),
                    'user_agent': event.get('requestContext', {}).get('identity', {}).get('userAgent'),
                    'cognito_groups': getattr(org_context, 'cognito_groups', [])
                }
                
                action_details = {
                    'operation': 'DELETE',
                    'method': 'DELETE',
                    'endpoint': 'deleteOrganization',
                    'success': True,
                    'permission_used': 'organization.delete',
                    'request_id': event.get('requestContext', {}).get('requestId'),
                    'changes': state_changes,
                    'kms_key_scheduled_deletion': True,
                    'deletion_type': 'SOFT_DELETE'
                }
                
                log_organization_audit_event(
                    event_type=AuditEventType.ORGANIZATION_DELETED,
                    user_context=user_context,
                    organization_id=organization_id,
                    action_details=action_details,
                    compliance_flags=[ComplianceFlag.SOX, ComplianceFlag.GDPR, ComplianceFlag.SOC_2]
                )
                
            except Exception as audit_error:
                # Critical: Audit logging failure should be logged but not fail the operation
                logger.critical(f"AUDIT_LOGGING_FAILURE for organization deletion {organization_id}: {str(audit_error)}")
            
            return {
                'statusCode': 200,
                'body': {
                    'message': 'Organization deleted successfully', 
                    'organizationId': organization_id,
                    'kmsKeyScheduledForDeletion': True
                }
            }
            
        except ClientError as e:
            if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
                return self._error_response('Organization not found or already deleted')
            else:
                logger.error(f"DynamoDB error deleting organization: {str(e)}")
                return self._error_response(f"Database error: {str(e)}")
        except Exception as e:
            logger.error(f"Error deleting organization: {str(e)}")
            return self._error_response(f"Internal error: {str(e)}")
    
    @organization_context_required()
    def get_user_permissions(self, event: Dict[str, Any], org_context) -> Dict[str, Any]:
        """Get user's permissions for an organization."""
        try:
            # Return permissions from organization context
            permissions_data = {
                'userId': org_context.user_id,
                'organizationId': org_context.organization_id,
                'role': org_context.user_role,
                'permissions': org_context.user_permissions,
                'membershipStatus': org_context.membership_status,
                'isPlatformAdmin': org_context.is_platform_admin
            }
            
            return {
                'statusCode': 200,
                'body': permissions_data
            }
            
        except Exception as e:
            logger.error(f"Error getting user permissions: {str(e)}")
            return self._error_response(f"Internal error: {str(e)}")
    
    @organization_context_required()
    def check_permission(self, event: Dict[str, Any], org_context) -> Dict[str, Any]:
        """Check if user has a specific permission."""
        try:
            # Extract arguments
            args = event.get('arguments', {})
            permission_key = args.get('permission')
            
            if not permission_key:
                return self._error_response('Permission key is required')
            
            # Check if user has the specified permission
            has_permission = permission_key in org_context.user_permissions
            
            return {
                'statusCode': 200,
                'body': {
                    'hasPermission': has_permission,
                    'organizationId': org_context.organization_id,
                    'permission': permission_key,
                    'userRole': org_context.user_role,
                    'userPermissions': org_context.user_permissions
                }
            }
            
        except Exception as e:
            logger.error(f"Error checking permission: {str(e)}")
            return self._error_response(f"Internal error: {str(e)}")
    
    def get_organization_roles(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Get all available roles and their permissions."""
        try:
            # This is a public operation that doesn't require organization membership
            from rbac_manager import RolePermissionMatrix, OrganizationRole
            
            roles_data = {}
            for role in OrganizationRole:
                permissions = list(RolePermissionMatrix.get_role_permissions(role))
                roles_data[role.value] = {
                    'role': role.value,
                    'permissions': permissions,
                    'description': self._get_role_description(role)
                }
            
            return {
                'statusCode': 200,
                'body': {
                    'roles': roles_data,
                    'permissions': [p.key for p in OrganizationPermissions.get_all_permissions()]
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting organization roles: {str(e)}")
            return self._error_response(f"Internal error: {str(e)}")
    
    def _get_role_description(self, role: 'OrganizationRole') -> str:
        """Get human-readable role description."""
        descriptions = {
            'OWNER': 'Full control over organization including billing, user management, and deletion',
            'ADMINISTRATOR': 'Can manage applications and users but cannot modify billing or delete organization',
            'VIEWER': 'Read-only access to organization data and applications'
        }
        return descriptions.get(role.value, 'Unknown role')
    
    def query_organizations_by_owner(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Query organizations by owner ID."""
        try:
            # Extract arguments
            args = event.get('arguments', {})
            input_data = args.get('input', {})
            owner_id = input_data.get('ownerId')
            
            if not owner_id:
                return {
                    'StatusCode': 400,
                    'Message': 'Owner ID is required',
                    'Data': []
                }
            
            # Use the GSI to query by owner
            response = self.organizations_table.query(
                IndexName='OwnerIndex',
                KeyConditionExpression='ownerId = :ownerId',
                ExpressionAttributeValues={
                    ':ownerId': owner_id
                }
            )
            
            organizations = response.get('Items', [])
            
            # Decrypt descriptions for each organization
            for org in organizations:
                if org.get('description'):
                    try:
                        decrypted_description = self.kms_manager.decrypt_organization_data(
                            organization_id=org['organizationId'],
                            encrypted_data=org['description'],
                            encryption_context={'field': 'description', 'action': 'create'}
                        )
                        org['description'] = decrypted_description
                    except Exception as e:
                        logger.debug(f"Description decryption failed for org {org['organizationId']}: {str(e)}")
            
            return {
                'StatusCode': 200,
                'Message': 'Success',
                'Data': organizations
            }
            
        except Exception as e:
            logger.error(f"Error querying organizations by owner: {str(e)}")
            return {
                'StatusCode': 500,
                'Message': f'Internal error: {str(e)}',
                'Data': []
            }
    
    def query_organizations_by_status(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Query organizations by status."""
        try:
            # Extract arguments
            args = event.get('arguments', {})
            input_data = args.get('input', {})
            status = input_data.get('status')
            
            if not status:
                return {
                    'StatusCode': 400,
                    'Message': 'Status is required',
                    'Data': []
                }
            
            # Use the GSI to query by status
            response = self.organizations_table.query(
                IndexName='StatusCreatedIndex',
                KeyConditionExpression='#status = :status',
                ExpressionAttributeNames={
                    '#status': 'status'
                },
                ExpressionAttributeValues={
                    ':status': status
                }
            )
            
            organizations = response.get('Items', [])
            
            # Decrypt descriptions for each organization
            for org in organizations:
                if org.get('description'):
                    try:
                        decrypted_description = self.kms_manager.decrypt_organization_data(
                            organization_id=org['organizationId'],
                            encrypted_data=org['description'],
                            encryption_context={'field': 'description', 'action': 'create'}
                        )
                        org['description'] = decrypted_description
                    except Exception as e:
                        logger.debug(f"Description decryption failed for org {org['organizationId']}: {str(e)}")
            
            return {
                'StatusCode': 200,
                'Message': 'Success',
                'Data': organizations
            }
            
        except Exception as e:
            logger.error(f"Error querying organizations by status: {str(e)}")
            return {
                'StatusCode': 500,
                'Message': f'Internal error: {str(e)}',
                'Data': []
            }
    
    def query_organization_by_id(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Query organization by ID."""
        try:
            # Extract arguments
            args = event.get('arguments', {})
            input_data = args.get('input', {})
            organization_id = input_data.get('organizationId')
            
            if not organization_id:
                return {
                    'StatusCode': 400,
                    'Message': 'Organization ID is required',
                    'Data': None
                }
            
            # Get the organization
            response = self.organizations_table.get_item(
                Key={'organizationId': organization_id}
            )
            
            organization = response.get('Item')
            
            if not organization:
                return {
                    'StatusCode': 404,
                    'Message': 'Organization not found',
                    'Data': None
                }
            
            # Decrypt description if present
            if organization.get('description'):
                try:
                    decrypted_description = self.kms_manager.decrypt_organization_data(
                        organization_id=organization_id,
                        encrypted_data=organization['description'],
                        encryption_context={'field': 'description', 'action': 'create'}
                    )
                    organization['description'] = decrypted_description
                except Exception as e:
                    logger.debug(f"Description decryption failed: {str(e)}")
            
            return {
                'StatusCode': 200,
                'Message': 'Success',
                'Data': organization
            }
            
        except Exception as e:
            logger.error(f"Error querying organization by ID: {str(e)}")
            return {
                'StatusCode': 500,
                'Message': f'Internal error: {str(e)}',
                'Data': None
            }
    
    def _get_user_organizations(self, user_id: str) -> list:
        """Get organizations owned by user (for starter plan limit checking)."""
        try:
            # Use scan with ProjectionExpression to minimize data transfer
            response = self.organizations_table.scan(
                FilterExpression=boto3.dynamodb.conditions.Attr('ownerId').eq(user_id) & 
                               boto3.dynamodb.conditions.Attr('status').eq('ACTIVE'),
                ProjectionExpression='organizationId, ownerId, #status',
                ExpressionAttributeNames={'#status': 'status'}
            )
            return response.get('Items', [])
        except Exception as e:
            logger.error(f"Error getting user organizations: {str(e)}")
            return []
    
    def _error_response(self, message: str, context: Optional[Dict] = None) -> Dict[str, Any]:
        """Generate standardized error response."""
        error_data = {'error': message}
        if context:
            error_data['context'] = context
        
        return {
            'statusCode': 400,
            'body': error_data
        }


# Lambda handler
def lambda_handler(event, context):
    """Main Lambda handler for Organizations GraphQL operations."""
    try:
        logger.info(f"Organizations resolver invoked with event: {json.dumps(event)}")
        
        resolver = OrganizationsResolver()
        
        # Extract operation type from event
        field_name = event.get('info', {}).get('fieldName')
        
        # Route to appropriate method based on GraphQL field
        if field_name == 'OrganizationsCreate':
            return resolver.create_organization(event)
        elif field_name == 'OrganizationsGet':
            return resolver.get_organization(event)
        elif field_name == 'OrganizationsList':
            return resolver.list_organizations(event)
        elif field_name == 'OrganizationsUpdate':
            return resolver.update_organization(event)
        elif field_name == 'OrganizationsDelete':
            return resolver.delete_organization(event)
        elif field_name == 'OrganizationsGetUserPermissions':
            return resolver.get_user_permissions(event)
        elif field_name == 'OrganizationsCheckPermission':
            return resolver.check_permission(event)
        elif field_name == 'OrganizationsGetRoles':
            return resolver.get_organization_roles(event)
        elif field_name == 'OrganizationsQueryByOwnerId':
            return resolver.query_organizations_by_owner(event)
        elif field_name == 'OrganizationsQueryByStatus':
            return resolver.query_organizations_by_status(event)
        elif field_name == 'OrganizationsQueryByOrganizationId':
            return resolver.query_organization_by_id(event)
        else:
            logger.error(f'Unknown GraphQL operation: {field_name}')
            return {
                'StatusCode': 400,
                'Message': f'Unknown operation: {field_name}',
                'Data': None
            }
            
    except Exception as e:
        logger.error(f"Unhandled error in Organizations resolver: {str(e)}")
        return {
            'statusCode': 500,
            'body': {'error': 'Internal server error'}
        }