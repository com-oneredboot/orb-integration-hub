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
sys.path.append('/opt/python')
from security_manager import OrganizationSecurityManager
from kms_manager import OrganizationKMSManager
from rbac_manager import OrganizationRBACManager, OrganizationPermissions

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class OrganizationsResolver:
    """Lambda resolver for Organizations GraphQL operations."""
    
    def __init__(self):
        self.dynamodb = boto3.resource('dynamodb')
        self.organizations_table = self.dynamodb.Table('Organizations')
        self.security_manager = OrganizationSecurityManager()
        self.kms_manager = OrganizationKMSManager()
        self.rbac_manager = OrganizationRBACManager()
    
    def create_organization(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new organization with security validation."""
        try:
            # Extract user context
            user_id = event.get('identity', {}).get('sub')
            cognito_groups = event.get('identity', {}).get('groups', [])
            
            if not user_id:
                return self._error_response('User ID not found in request context')
            
            # Extract arguments
            args = event.get('arguments', {})
            name = args.get('name')
            description = args.get('description', '')
            
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
            now = datetime.utcnow().isoformat()
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
            
            # Write to DynamoDB with condition to prevent overwrites
            self.organizations_table.put_item(
                Item=organization_data,
                ConditionExpression='attribute_not_exists(organizationId)'
            )
            
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
    
    def get_organization(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Get an organization with security validation."""
        try:
            # Extract user context
            user_id = event.get('identity', {}).get('sub')
            cognito_groups = event.get('identity', {}).get('groups', [])
            
            # Extract arguments
            organization_id = event.get('arguments', {}).get('organizationId')
            
            if not organization_id:
                return self._error_response('Organization ID is required')
            
            # RBAC permission check
            has_permission, rbac_context = self.rbac_manager.check_permission(
                user_id, organization_id, OrganizationPermissions.ORGANIZATION_READ.key, cognito_groups
            )
            
            if not has_permission:
                return self._error_response('Access denied - insufficient permissions', rbac_context)
            
            # Get organization data
            response = self.organizations_table.get_item(
                Key={'organizationId': organization_id}
            )
            
            if not response.get('Item'):
                return self._error_response('Organization not found')
            
            organization = response['Item']
            
            # Decrypt sensitive fields if they exist and are encrypted
            if organization.get('description'):
                try:
                    # Try to decrypt description (will fail gracefully if not encrypted)
                    decrypted_description = self.kms_manager.decrypt_organization_data(
                        organization_id=organization_id,
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
    
    def update_organization(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Update an organization with security validation."""
        try:
            # Extract user context
            user_id = event.get('identity', {}).get('sub')
            cognito_groups = event.get('identity', {}).get('groups', [])
            
            # Extract arguments
            args = event.get('arguments', {})
            organization_id = args.get('organizationId')
            
            if not organization_id:
                return self._error_response('Organization ID is required')
            
            # RBAC permission check
            has_permission, rbac_context = self.rbac_manager.check_permission(
                user_id, organization_id, OrganizationPermissions.ORGANIZATION_UPDATE.key, cognito_groups
            )
            
            if not has_permission:
                return self._error_response('Access denied - insufficient permissions', rbac_context)
            
            # Build update expression
            update_expression = "SET updatedAt = :updatedAt"
            expression_values = {':updatedAt': datetime.utcnow().isoformat()}
            
            if 'name' in args:
                update_expression += ", #name = :name"
                expression_values[':name'] = args['name']
            
            if 'description' in args:
                update_expression += ", description = :description"
                expression_values[':description'] = args['description']
            
            # Update organization
            response = self.organizations_table.update_item(
                Key={'organizationId': organization_id},
                UpdateExpression=update_expression,
                ExpressionAttributeValues=expression_values,
                ExpressionAttributeNames={'#name': 'name'} if 'name' in args else None,
                ReturnValues='ALL_NEW',
                ConditionExpression='attribute_exists(organizationId)'
            )
            
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
    
    def delete_organization(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Delete an organization with security validation."""
        try:
            # Extract user context
            user_id = event.get('identity', {}).get('sub')
            cognito_groups = event.get('identity', {}).get('groups', [])
            
            # Extract arguments
            organization_id = event.get('arguments', {}).get('organizationId')
            
            if not organization_id:
                return self._error_response('Organization ID is required')
            
            # RBAC permission check (only OWNER can delete)
            has_permission, rbac_context = self.rbac_manager.check_permission(
                user_id, organization_id, OrganizationPermissions.ORGANIZATION_DELETE.key, cognito_groups
            )
            
            if not has_permission:
                return self._error_response('Access denied - only organization owner can delete', rbac_context)
            
            # Soft delete - update status to DELETED
            response = self.organizations_table.update_item(
                Key={'organizationId': organization_id},
                UpdateExpression="SET #status = :deleted_status, updatedAt = :updatedAt",
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={
                    ':deleted_status': 'DELETED',
                    ':updatedAt': datetime.utcnow().isoformat()
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
    
    def get_user_permissions(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Get user's permissions for an organization."""
        try:
            # Extract user context
            user_id = event.get('identity', {}).get('sub')
            cognito_groups = event.get('identity', {}).get('groups', [])
            
            # Extract arguments
            organization_id = event.get('arguments', {}).get('organizationId')
            
            if not organization_id:
                return self._error_response('Organization ID is required')
            
            # Get user permissions
            permissions_data = self.rbac_manager.get_user_permissions(
                user_id, organization_id, cognito_groups
            )
            
            return {
                'statusCode': 200,
                'body': permissions_data
            }
            
        except Exception as e:
            logger.error(f"Error getting user permissions: {str(e)}")
            return self._error_response(f"Internal error: {str(e)}")
    
    def check_permission(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Check if user has a specific permission."""
        try:
            # Extract user context
            user_id = event.get('identity', {}).get('sub')
            cognito_groups = event.get('identity', {}).get('groups', [])
            
            # Extract arguments
            args = event.get('arguments', {})
            organization_id = args.get('organizationId')
            permission_key = args.get('permission')
            
            if not organization_id or not permission_key:
                return self._error_response('Organization ID and permission are required')
            
            # Check permission
            has_permission, context = self.rbac_manager.check_permission(
                user_id, organization_id, permission_key, cognito_groups
            )
            
            return {
                'statusCode': 200,
                'body': {
                    'hasPermission': has_permission,
                    'organizationId': organization_id,
                    'permission': permission_key,
                    'context': context
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
    
    def _get_user_organizations(self, user_id: str) -> list:
        """Get organizations owned by user (for starter plan limit checking)."""
        try:
            response = self.organizations_table.scan(
                FilterExpression=boto3.dynamodb.conditions.Attr('ownerId').eq(user_id) & 
                               boto3.dynamodb.conditions.Attr('status').eq('ACTIVE')
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
        if field_name == 'createOrganization':
            return resolver.create_organization(event)
        elif field_name == 'getOrganization':
            return resolver.get_organization(event)
        elif field_name == 'listOrganizations':
            return resolver.list_organizations(event)
        elif field_name == 'updateOrganization':
            return resolver.update_organization(event)
        elif field_name == 'deleteOrganization':
            return resolver.delete_organization(event)
        elif field_name == 'getUserPermissions':
            return resolver.get_user_permissions(event)
        elif field_name == 'checkPermission':
            return resolver.check_permission(event)
        elif field_name == 'getOrganizationRoles':
            return resolver.get_organization_roles(event)
        else:
            return {
                'statusCode': 400,
                'body': {'error': f'Unknown operation: {field_name}'}
            }
            
    except Exception as e:
        logger.error(f"Unhandled error in Organizations resolver: {str(e)}")
        return {
            'statusCode': 500,
            'body': {'error': 'Internal server error'}
        }