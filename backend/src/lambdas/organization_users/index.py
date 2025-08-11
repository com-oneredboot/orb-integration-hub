# file: backend/src/lambdas/organization_users/index.py
# author: AI Assistant
# date: 2025-08-09
# description: Lambda resolver for OrganizationUsers GraphQL operations with security

import json
import logging
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List
import boto3
from botocore.exceptions import ClientError

# Import from organization security layer
import sys
import os
from security_manager import OrganizationSecurityManager
from rbac_manager import OrganizationRBACManager, OrganizationPermissions
from context_middleware import (
    organization_context_required, 
    requires_permission, 
    requires_organization_owner,
    allows_platform_override
)
from organizations_audit_logger import (
    OrganizationAuditEventType,
    log_organization_audit_event,
    ComplianceFlag
)
from orb_common.audit import StateTracker

# Import specific exceptions from common layer
from orb_common.exceptions import (
    AuthenticationError,
    AuthorizationError,
    DataValidationError,
    ResourceNotFoundError,
    ConflictError
)

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class OrganizationUsersResolver:
    """Lambda resolver for OrganizationUsers GraphQL operations."""
    
    def __init__(self):
        self.dynamodb = boto3.resource('dynamodb')
        
        # Table names from environment
        self.organization_users_table = self.dynamodb.Table(
            os.environ.get('ORGANIZATION_USERS_TABLE_NAME', 'OrganizationUsers')
        )
        self.organizations_table = self.dynamodb.Table(
            os.environ.get('ORGANIZATIONS_TABLE_NAME', 'Organizations')
        )
        self.users_table = self.dynamodb.Table(
            os.environ.get('USERS_TABLE_NAME', 'Users')
        )
        
        # Initialize managers
        self.security_manager = OrganizationSecurityManager()
        self.rbac_manager = OrganizationRBACManager()
        
        logger.info(f"Initialized OrganizationUsersResolver with tables: {os.environ.get('ORGANIZATION_USERS_TABLE_NAME')}")

    @requires_organization_owner
    def create_member(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new organization member - requires organization owner."""
        try:
            logger.info("Starting organization member creation")
            
            # Extract user context
            user_context = event.get('context', {})
            user_id = user_context.get('sub')
            cognito_groups = user_context.get('groups', [])
            
            # Extract arguments
            args = event.get('arguments', {})
            input_data = args.get('input', {})
            
            organization_id = input_data.get('organizationId')
            member_user_id = input_data.get('userId')
            role = input_data.get('role')
            
            # Validate required fields
            if not all([organization_id, member_user_id, role]):
                raise DataValidationError("organizationId, userId, and role are required")
            
            # Validate role
            if role not in ['ADMINISTRATOR', 'VIEWER']:
                raise DataValidationError("Invalid role. Must be ADMINISTRATOR or VIEWER")
            
            # Check organization exists and user is owner
            org_response = self.organizations_table.get_item(
                Key={'organizationId': organization_id}
            )
            
            if 'Item' not in org_response:
                raise ResourceNotFoundError(f"Organization {organization_id} not found")
            
            organization = org_response['Item']
            
            if organization.get('ownerId') != user_id:
                raise AuthorizationError("Only organization owners can add members")
            
            # Check if user exists
            user_response = self.users_table.get_item(
                Key={'userId': member_user_id}
            )
            
            if 'Item' not in user_response:
                raise DataValidationError(f"User {member_user_id} does not exist")
            
            # Check if member already exists
            existing_response = self.organization_users_table.get_item(
                Key={'organizationId': organization_id, 'userId': member_user_id}
            )
            
            if 'Item' in existing_response:
                raise ConflictError("User is already a member of this organization")
            
            # Create the member record
            timestamp = int(datetime.utcnow().timestamp())
            organization_user = {
                'organizationId': organization_id,
                'userId': member_user_id,
                'role': role,
                'status': 'ACTIVE',
                'invitedBy': user_id,
                'createdAt': timestamp,
                'updatedAt': timestamp
            }
            
            # Save to DynamoDB
            self.organization_users_table.put_item(Item=organization_user)
            
            # Log audit event
            log_organization_audit_event(
                event_type=OrganizationAuditEventType.USER_JOINED,
                user_context=self._build_audit_context(user_context),
                organization_id=organization_id,
                action_details={
                    'new_member_id': member_user_id,
                    'assigned_role': role,
                    'invited_by': user_id
                }
            )
            
            logger.info(f"Successfully added member {member_user_id} to organization {organization_id}")
            
            return {
                'StatusCode': 200,
                'Message': 'Member added successfully',
                'Data': organization_user
            }
            
        except (AuthenticationError, AuthorizationError, DataValidationError, 
                ResourceNotFoundError, ConflictError) as e:
            logger.error(f"Business error: {str(e)}")
            return {
                'StatusCode': e.status_code,
                'Message': str(e),
                'Data': None
            }
        except Exception as e:
            logger.error(f"Unexpected error in create_member: {str(e)}", exc_info=True)
            return {
                'StatusCode': 500,
                'Message': 'Internal server error',
                'Data': None
            }

    @requires_organization_owner
    def update_member(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Update organization member role - requires organization owner."""
        try:
            logger.info("Starting organization member update")
            
            # Extract user context
            user_context = event.get('context', {})
            user_id = user_context.get('sub')
            
            # Extract arguments
            args = event.get('arguments', {})
            input_data = args.get('input', {})
            
            organization_id = input_data.get('organizationId')
            member_user_id = input_data.get('userId')
            new_role = input_data.get('role')
            
            # Validate required fields
            if not all([organization_id, member_user_id]):
                raise DataValidationError("organizationId and userId are required")
            
            # Check organization exists and user is owner
            org_response = self.organizations_table.get_item(
                Key={'organizationId': organization_id}
            )
            
            if 'Item' not in org_response:
                raise ResourceNotFoundError(f"Organization {organization_id} not found")
            
            organization = org_response['Item']
            
            if organization.get('ownerId') != user_id:
                raise AuthorizationError("Only organization owners can update member roles")
            
            # Get current member record
            member_response = self.organization_users_table.get_item(
                Key={'organizationId': organization_id, 'userId': member_user_id}
            )
            
            if 'Item' not in member_response:
                raise ResourceNotFoundError("Member not found in organization")
            
            current_member = member_response['Item']
            old_role = current_member.get('role')
            
            # Build update expression
            update_expression = "SET updatedAt = :timestamp"
            expression_values = {':timestamp': int(datetime.utcnow().timestamp())}
            expression_names = {}
            
            if new_role and new_role != old_role:
                if new_role not in ['ADMINISTRATOR', 'VIEWER']:
                    raise DataValidationError("Invalid role. Must be ADMINISTRATOR or VIEWER")
                update_expression += ", #role = :role"
                expression_values[':role'] = new_role
                expression_names['#role'] = 'role'
            
            if 'status' in input_data:
                update_expression += ", #status = :status"
                expression_values[':status'] = input_data['status']
                expression_names['#status'] = 'status'
            
            # Update the record
            response = self.organization_users_table.update_item(
                Key={'organizationId': organization_id, 'userId': member_user_id},
                UpdateExpression=update_expression,
                ExpressionAttributeNames=expression_names if expression_names else None,
                ExpressionAttributeValues=expression_values,
                ReturnValues='ALL_NEW'
            )
            
            updated_member = response.get('Attributes', {})
            
            # Log audit event for role change
            if new_role and new_role != old_role:
                log_organization_audit_event(
                    event_type=OrganizationAuditEventType.USER_ROLE_CHANGED,
                    user_context=self._build_audit_context(user_context),
                    organization_id=organization_id,
                    action_details={
                        'target_user_id': member_user_id,
                        'old_role': old_role,
                        'new_role': new_role
                    }
                )
            
            logger.info(f"Successfully updated member {member_user_id} in organization {organization_id}")
            
            return {
                'StatusCode': 200,
                'Message': 'Member updated successfully',
                'Data': updated_member
            }
            
        except (AuthenticationError, AuthorizationError, DataValidationError, 
                ResourceNotFoundError) as e:
            logger.error(f"Business error: {str(e)}")
            return {
                'StatusCode': e.status_code,
                'Message': str(e),
                'Data': None
            }
        except Exception as e:
            logger.error(f"Unexpected error in update_member: {str(e)}", exc_info=True)
            return {
                'StatusCode': 500,
                'Message': 'Internal server error',
                'Data': None
            }

    @requires_organization_owner
    def delete_member(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Remove member from organization - requires organization owner."""
        try:
            logger.info("Starting organization member removal")
            
            # Extract user context
            user_context = event.get('context', {})
            user_id = user_context.get('sub')
            
            # Extract arguments
            args = event.get('arguments', {})
            composite_id = args.get('id', '')
            
            # Parse composite key
            if '#' not in composite_id:
                raise DataValidationError("Invalid ID format. Expected organizationId#userId")
            
            organization_id, member_user_id = composite_id.split('#', 1)
            
            # Check organization exists and user is owner
            org_response = self.organizations_table.get_item(
                Key={'organizationId': organization_id}
            )
            
            if 'Item' not in org_response:
                raise ResourceNotFoundError(f"Organization {organization_id} not found")
            
            organization = org_response['Item']
            
            if organization.get('ownerId') != user_id:
                raise AuthorizationError("Only organization owners can remove members")
            
            # Prevent removing the organization owner
            if organization.get('ownerId') == member_user_id:
                raise DataValidationError("Cannot remove the organization owner")
            
            # Get current member record
            member_response = self.organization_users_table.get_item(
                Key={'userId': member_user_id, 'organizationId': organization_id}
            )
            
            if 'Item' not in member_response:
                raise ResourceNotFoundError("Member not found in organization")
            
            deleted_member = member_response['Item']
            
            # Delete the record
            self.organization_users_table.delete_item(
                Key={'organizationId': organization_id, 'userId': member_user_id}
            )
            
            # Log audit event
            log_organization_audit_event(
                event_type=OrganizationAuditEventType.USER_REMOVED,
                user_context=self._build_audit_context(user_context),
                organization_id=organization_id,
                action_details={
                    'removed_user_id': member_user_id,
                    'removed_role': deleted_member.get('role'),
                    'removed_by': user_id
                }
            )
            
            logger.info(f"Successfully removed member {member_user_id} from organization {organization_id}")
            
            return {
                'StatusCode': 200,
                'Message': 'Member removed successfully',
                'Data': deleted_member
            }
            
        except (AuthenticationError, AuthorizationError, DataValidationError, 
                ResourceNotFoundError) as e:
            logger.error(f"Business error: {str(e)}")
            return {
                'StatusCode': e.status_code,
                'Message': str(e),
                'Data': None
            }
        except Exception as e:
            logger.error(f"Unexpected error in delete_member: {str(e)}", exc_info=True)
            return {
                'StatusCode': 500,
                'Message': 'Internal server error',
                'Data': None
            }

    def query_by_organization(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Query members by organization ID."""
        try:
            logger.info("Querying members by organization")
            
            # Extract user context
            user_context = event.get('context', {})
            user_id = user_context.get('sub')
            
            # Extract arguments
            args = event.get('arguments', {})
            input_data = args.get('input', {})
            organization_id = input_data.get('organizationId')
            
            if not organization_id:
                raise DataValidationError("organizationId is required")
            
            # Check if user has access to view members
            # Either they're a member or the owner
            is_member = self._is_organization_member(user_id, organization_id)
            is_owner = self._is_organization_owner(user_id, organization_id)
            
            if not (is_member or is_owner):
                raise AuthorizationError("You don't have permission to view this organization's members")
            
            # Query using primary key (no index needed)
            response = self.organization_users_table.query(
                KeyConditionExpression='organizationId = :org_id',
                ExpressionAttributeValues={':org_id': organization_id}
            )
            
            members = response.get('Items', [])
            
            # Non-owners only see active members
            if not is_owner:
                members = [m for m in members if m.get('status') == 'ACTIVE']
            
            logger.info(f"Found {len(members)} members for organization {organization_id}")
            
            return {
                'StatusCode': 200,
                'Message': f'Found {len(members)} members',
                'Data': members
            }
            
        except (AuthenticationError, AuthorizationError, DataValidationError) as e:
            logger.error(f"Business error: {str(e)}")
            return {
                'StatusCode': e.status_code,
                'Message': str(e),
                'Data': []
            }
        except Exception as e:
            logger.error(f"Unexpected error in query_by_organization: {str(e)}", exc_info=True)
            return {
                'StatusCode': 500,
                'Message': 'Internal server error',
                'Data': []
            }

    def query_by_user(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Query organizations by user ID."""
        try:
            logger.info("Querying organizations by user")
            
            # Extract user context
            user_context = event.get('context', {})
            requesting_user_id = user_context.get('sub')
            cognito_groups = user_context.get('groups', [])
            
            # Extract arguments
            args = event.get('arguments', {})
            input_data = args.get('input', {})
            target_user_id = input_data.get('userId')
            
            if not target_user_id:
                raise DataValidationError("userId is required")
            
            # Users can only query their own organizations unless they're an admin
            if target_user_id != requesting_user_id and 'OWNER' not in cognito_groups:
                raise AuthorizationError("You can only view your own organizations")
            
            # Query using UserOrganizationsIndex GSI
            response = self.organization_users_table.query(
                IndexName='UserOrganizationsIndex',
                KeyConditionExpression='userId = :user_id',
                ExpressionAttributeValues={':user_id': target_user_id}
            )
            
            organizations = response.get('Items', [])
            
            # Only return active memberships
            active_orgs = [org for org in organizations if org.get('status') == 'ACTIVE']
            
            logger.info(f"Found {len(active_orgs)} organizations for user {target_user_id}")
            
            return {
                'StatusCode': 200,
                'Message': f'Found {len(active_orgs)} organizations',
                'Data': active_orgs
            }
            
        except (AuthenticationError, AuthorizationError, DataValidationError) as e:
            logger.error(f"Business error: {str(e)}")
            return {
                'StatusCode': e.status_code,
                'Message': str(e),
                'Data': []
            }
        except Exception as e:
            logger.error(f"Unexpected error in query_by_user: {str(e)}", exc_info=True)
            return {
                'StatusCode': 500,
                'Message': 'Internal server error',
                'Data': []
            }

    def get_organization_members(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Get organization members with user details (custom query)."""
        try:
            logger.info("Getting organization members with details")
            
            # Extract user context
            user_context = event.get('context', {})
            user_id = user_context.get('sub')
            
            # Extract arguments
            args = event.get('arguments', {})
            input_data = args.get('input', {})
            organization_id = input_data.get('organizationId')
            
            if not organization_id:
                raise DataValidationError("organizationId is required")
            
            # Check permissions
            is_member = self._is_organization_member(user_id, organization_id)
            is_owner = self._is_organization_owner(user_id, organization_id)
            
            if not (is_member or is_owner):
                raise AuthorizationError("You don't have permission to view this organization's members")
            
            # Query organization members using primary key
            members_response = self.organization_users_table.query(
                KeyConditionExpression='organizationId = :org_id',
                ExpressionAttributeValues={':org_id': organization_id}
            )
            
            members = members_response.get('Items', [])
            
            # Filter based on permissions
            if not is_owner:
                members = [m for m in members if m.get('status') == 'ACTIVE']
            
            # Batch get user details
            if members:
                enriched_members = []
                user_ids = [m['userId'] for m in members]
                
                # DynamoDB batch get (max 100 items)
                for i in range(0, len(user_ids), 100):
                    batch_ids = user_ids[i:i+100]
                    
                    batch_response = self.dynamodb.batch_get_item(
                        RequestItems={
                            self.users_table.table_name: {
                                'Keys': [{'userId': uid} for uid in batch_ids]
                            }
                        }
                    )
                    
                    users_map = {
                        user['userId']: user 
                        for user in batch_response.get('Responses', {}).get(self.users_table.table_name, [])
                    }
                    
                    # Merge user details with member data
                    for member in members[i:i+100]:
                        user = users_map.get(member['userId'], {})
                        enriched_member = {
                            **member,
                            'email': user.get('email'),
                            'firstName': user.get('firstName'),
                            'lastName': user.get('lastName'),
                            'name': f"{user.get('firstName', '')} {user.get('lastName', '')}".strip() or 'Unknown'
                        }
                        enriched_members.append(enriched_member)
                
                return {
                    'StatusCode': 200,
                    'Message': f'Found {len(enriched_members)} members',
                    'Data': enriched_members
                }
            
            return {
                'StatusCode': 200,
                'Message': 'No members found',
                'Data': []
            }
            
        except (AuthenticationError, AuthorizationError, DataValidationError) as e:
            logger.error(f"Business error: {str(e)}")
            return {
                'StatusCode': e.status_code,
                'Message': str(e),
                'Data': []
            }
        except Exception as e:
            logger.error(f"Unexpected error in get_organization_members: {str(e)}", exc_info=True)
            return {
                'StatusCode': 500,
                'Message': 'Internal server error',
                'Data': []
            }

    def _is_organization_member(self, user_id: str, organization_id: str) -> bool:
        """Check if user is a member of the organization."""
        try:
            response = self.organization_users_table.get_item(
                Key={'organizationId': organization_id, 'userId': user_id}
            )
            
            if 'Item' in response:
                return response['Item'].get('status') == 'ACTIVE'
            return False
            
        except Exception as e:
            logger.error(f"Error checking membership: {str(e)}")
            return False

    def _is_organization_owner(self, user_id: str, organization_id: str) -> bool:
        """Check if user is the owner of the organization."""
        try:
            response = self.organizations_table.get_item(
                Key={'organizationId': organization_id}
            )
            
            if 'Item' in response:
                return response['Item'].get('ownerId') == user_id
            return False
            
        except Exception as e:
            logger.error(f"Error checking ownership: {str(e)}")
            return False

    def _build_audit_context(self, user_context: Dict[str, Any]) -> Dict[str, Any]:
        """Build audit context from user context."""
        return {
            'user_id': user_context.get('sub'),
            'email': user_context.get('email'),
            'groups': user_context.get('groups', []),
            'source_ip': user_context.get('sourceIp'),
            'user_agent': user_context.get('userAgent')
        }

    def _error_response(self, message: str, status_code: int = 400) -> Dict[str, Any]:
        """Generate error response."""
        return {
            'StatusCode': status_code,
            'Message': message,
            'Data': None
        }


# Initialize resolver
resolver = OrganizationUsersResolver()


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Lambda handler function."""
    try:
        operation = event.get('operation', '')
        logger.info(f"Processing operation: {operation}")
        
        # Add context to event for middleware
        if 'context' not in event:
            event['context'] = event.get('identity', {})
        
        # Route operations
        if operation == 'OrganizationUsersCreate':
            return resolver.create_member(event)
        elif operation == 'OrganizationUsersUpdate':
            return resolver.update_member(event)
        elif operation == 'OrganizationUsersDelete':
            return resolver.delete_member(event)
        elif operation == 'OrganizationUsersQueryByOrganizationId':
            return resolver.query_by_organization(event)
        elif operation == 'OrganizationUsersQueryByUserId':
            return resolver.query_by_user(event)
        elif operation == 'GetOrganizationMembers':
            return resolver.get_organization_members(event)
        else:
            return {
                'StatusCode': 400,
                'Message': f'Unknown operation: {operation}',
                'Data': None
            }
            
    except Exception as e:
        logger.error(f"Unexpected error in handler: {str(e)}", exc_info=True)
        return {
            'StatusCode': 500,
            'Message': 'Internal server error',
            'Data': None
        }