# file: backend/src/lambdas/invitations/index.py
# author: AI Assistant
# created: 2025-08-09
# description: Lambda resolver for Invitations GraphQL operations with security

import json
import logging
import uuid
from datetime import datetime, timedelta
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
    ConflictError,
    RateLimitError
)

# Import models
from orb_models.models.InvitationsModel import InvitationsModel, InvitationStatus

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class InvitationsResolver:
    """Lambda resolver for Invitations GraphQL operations."""
    
    def __init__(self):
        self.dynamodb = boto3.resource('dynamodb')
        
        # Table names from environment
        self.invitations_table = self.dynamodb.Table(
            os.environ.get('INVITATIONS_TABLE_NAME', 'Invitations')
        )
        self.organizations_table = self.dynamodb.Table(
            os.environ.get('ORGANIZATIONS_TABLE_NAME', 'Organizations')
        )
        self.organization_users_table = self.dynamodb.Table(
            os.environ.get('ORGANIZATION_USERS_TABLE_NAME', 'OrganizationUsers')
        )
        self.users_table = self.dynamodb.Table(
            os.environ.get('USERS_TABLE_NAME', 'Users')
        )
        
        # Rate limiting table (reuse ownership transfer table)
        self.rate_limit_table = self.dynamodb.Table(
            os.environ.get('RATE_LIMIT_TABLE_NAME', 'OwnershipTransferRequests')
        )
        
        # Initialize managers
        self.security_manager = OrganizationSecurityManager()
        self.rbac_manager = OrganizationRBACManager()
        
        # Configuration
        self.default_expiration_days = 7
        self.min_expiration_days = 1
        self.max_expiration_days = 14
        self.max_message_length = 1000
        self.max_invitations_per_hour = 10
        
    def _validate_user_exists(self, email: str) -> Optional[Dict[str, Any]]:
        """Validate if user exists by querying users service."""
        try:
            # Query users table by email (would be better to call users service API)
            response = self.users_table.query(
                IndexName='EmailIndex',
                KeyConditionExpression='email = :email',
                ExpressionAttributeValues={':email': email}
            )
            
            if response.get('Items'):
                return response['Items'][0]
            return None
            
        except ClientError as e:
            logger.error(f"Error checking user existence: {str(e)}")
            return None
    
    def _check_rate_limit(self, organization_id: str) -> bool:
        """Check if organization has exceeded invitation rate limit."""
        try:
            current_hour = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
            
            # Query rate limit table for recent invitations
            response = self.rate_limit_table.query(
                KeyConditionExpression='requesterId = :org_id AND createdAt >= :hour_start',
                ExpressionAttributeValues={
                    ':org_id': f"invitation#{organization_id}",
                    ':hour_start': current_hour.isoformat()
                }
            )
            
            invitation_count = response.get('Count', 0)
            return invitation_count < self.max_invitations_per_hour
            
        except ClientError as e:
            logger.error(f"Error checking rate limit: {str(e)}")
            return True  # Allow if rate limit check fails
    
    def _record_rate_limit(self, organization_id: str):
        """Record invitation for rate limiting."""
        try:
            self.rate_limit_table.put_item(
                Item={
                    'requesterId': f"invitation#{organization_id}",
                    'applicationId': str(uuid.uuid4()),  # Unique ID for rate limit entry
                    'createdAt': datetime.utcnow().isoformat(),
                    'ttl': int((datetime.utcnow() + timedelta(hours=2)).timestamp())
                }
            )
        except ClientError as e:
            logger.error(f"Error recording rate limit: {str(e)}")
    
    @requires_organization_owner
    def create_invitation(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new invitation - requires organization owner."""
        try:
            logger.info("Starting invitation creation process")
            
            # Extract user context
            user_context = event.get('context', {})
            user_id = user_context.get('sub')
            cognito_groups = user_context.get('groups', [])
            
            # Verify CUSTOMER status
            if 'CUSTOMER' not in cognito_groups:
                raise AuthorizationError('Only paying customers can send invitations')
            
            # Extract arguments
            args = event.get('arguments', {})
            input_data = args.get('input', {})
            
            organization_id = input_data.get('organizationId')
            invitee_email = input_data.get('inviteeEmail')
            role = input_data.get('role')
            message = input_data.get('message', '')
            expires_in_days = input_data.get('expiresInDays', self.default_expiration_days)
            
            # Validate required fields
            if not all([organization_id, invitee_email, role]):
                raise DataValidationError('organizationId, inviteeEmail, and role are required')
            
            # Validate role
            valid_roles = ['ADMINISTRATOR', 'VIEWER']
            if role not in valid_roles:
                raise DataValidationError(f'Invalid role. Must be one of: {", ".join(valid_roles)}')
            
            # Validate and sanitize message
            if message:
                # Basic HTML/script tag prevention
                if any(tag in message.lower() for tag in ['<script', '<iframe', '<object', '<embed', 'javascript:', 'onerror=']):
                    raise DataValidationError('Message contains invalid content')
                
                if len(message) > self.max_message_length:
                    raise DataValidationError(f'Message exceeds maximum length of {self.max_message_length} characters')
            
            # Validate expiration
            if not (self.min_expiration_days <= expires_in_days <= self.max_expiration_days):
                raise DataValidationError(f'Expiration must be between {self.min_expiration_days} and {self.max_expiration_days} days')
            
            # Verify organization exists and user is owner
            org_response = self.organizations_table.get_item(
                Key={'organizationId': organization_id}
            )
            organization = org_response.get('Item')
            
            if not organization:
                raise ResourceNotFoundError('Organization not found')
            
            if organization.get('ownerId') != user_id:
                raise AuthorizationError('Only organization owner can send invitations')
            
            if organization.get('status') != 'ACTIVE':
                raise DataValidationError('Organization must be active to send invitations')
            
            # Check rate limit
            if not self._check_rate_limit(organization_id):
                raise RateLimitError(f'Invitation rate limit exceeded. Maximum {self.max_invitations_per_hour} invitations per hour.')
            
            # Check if user exists (optional - could be new user)
            existing_user = self._validate_user_exists(invitee_email)
            
            # Check for duplicate invitation
            existing_invitation = self.invitations_table.query(
                IndexName='InviteeEmailIndex',
                KeyConditionExpression='inviteeEmail = :email',
                FilterExpression='organizationId = :org_id AND #status = :status',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={
                    ':email': invitee_email,
                    ':org_id': organization_id,
                    ':status': InvitationStatus.PENDING.value
                }
            )
            
            if existing_invitation.get('Items'):
                # Update existing invitation instead of creating duplicate
                existing = existing_invitation['Items'][0]
                return self._update_invitation_role(existing['invitationId'], role, user_context)
            
            # Create invitation
            invitation_id = str(uuid.uuid4())
            current_time = datetime.utcnow()
            expires_at = current_time + timedelta(days=expires_in_days)
            
            invitation = InvitationsModel(
                invitationId=invitation_id,
                organizationId=organization_id,
                inviterUserId=user_id,
                inviteeEmail=invitee_email,
                inviteeUserId=existing_user.get('userId') if existing_user else None,
                role=role,
                status=InvitationStatus.PENDING.value,
                message=message,
                expiresAt=expires_at.isoformat(),
                createdAt=current_time.isoformat(),
                updatedAt=current_time.isoformat()
            )
            
            # Save to DynamoDB
            self.invitations_table.put_item(Item=invitation.dict())
            
            # Record rate limit
            self._record_rate_limit(organization_id)
            
            # Log audit event
            log_organization_audit_event(
                event_type=OrganizationAuditEventType.USER_INVITED,
                acting_user_context=user_context,
                organization_id=organization_id,
                resource_id=invitation_id,
                action_details={
                    'inviteeEmail': invitee_email,
                    'role': role,
                    'expiresAt': expires_at.isoformat()
                },
                compliance_flags=[ComplianceFlag.SOC_2]
            )
            
            return self._success_response(invitation.dict())
            
        except Exception as e:
            logger.error(f"Error creating invitation: {str(e)}")
            return self._error_response(str(e))
    
    def delete_invitation(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Delete an invitation - only organization owner can do this."""
        try:
            # Extract user context
            user_context = event.get('context', {})
            user_id = user_context.get('sub')
            cognito_groups = user_context.get('groups', [])
            
            # Extract arguments
            args = event.get('arguments', {})
            invitation_id = args.get('id')
            
            if not invitation_id:
                raise DataValidationError('invitationId is required')
            
            # Get invitation
            response = self.invitations_table.get_item(
                Key={'invitationId': invitation_id}
            )
            invitation = response.get('Item')
            
            if not invitation:
                raise ResourceNotFoundError('Invitation not found')
            
            # Verify user is the organization owner
            if invitation['inviterUserId'] != user_id and 'OWNER' not in cognito_groups:
                raise AuthorizationError('Only the organization owner can delete invitations')
            
            # Check if invitation can be deleted
            if invitation['status'] == InvitationStatus.ACCEPTED.value:
                raise DataValidationError('Cannot delete accepted invitations')
            
            # Delete the invitation
            self.invitations_table.delete_item(
                Key={'invitationId': invitation_id}
            )
            
            # Log audit event
            log_organization_audit_event(
                event_type=OrganizationAuditEventType.USER_INVITATION_REVOKED,
                acting_user_context=user_context,
                organization_id=invitation['organizationId'],
                resource_id=invitation_id,
                action_details={
                    'inviteeEmail': invitation['inviteeEmail'],
                    'status': invitation['status']
                },
                compliance_flags=[ComplianceFlag.SOC_2]
            )
            
            return self._success_response({'deleted': True})
            
        except Exception as e:
            logger.error(f"Error deleting invitation: {str(e)}")
            return self._error_response(str(e))
    
    def update_invitation(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Update invitation - handle accept, decline, revoke operations."""
        try:
            # Extract user context
            user_context = event.get('context', {})
            user_id = user_context.get('sub')
            user_email = user_context.get('email')
            cognito_groups = user_context.get('groups', [])
            
            # Extract arguments
            args = event.get('arguments', {})
            input_data = args.get('input', {})
            
            invitation_id = input_data.get('invitationId')
            action = input_data.get('action')  # ACCEPT, DECLINE, REVOKE, RESEND
            
            if not invitation_id or not action:
                raise DataValidationError('invitationId and action are required')
            
            # Get invitation
            response = self.invitations_table.get_item(
                Key={'invitationId': invitation_id}
            )
            invitation = response.get('Item')
            
            if not invitation:
                raise ResourceNotFoundError('Invitation not found')
            
            # Handle different actions
            if action == 'ACCEPT':
                return self._accept_invitation(invitation, user_id, user_email, user_context)
            elif action == 'DECLINE':
                return self._decline_invitation(invitation, user_id, user_email, user_context)
            elif action == 'REVOKE':
                return self._revoke_invitation(invitation, user_id, user_context, cognito_groups)
            elif action == 'RESEND':
                return self._resend_invitation(invitation, user_id, user_context, cognito_groups)
            else:
                raise DataValidationError(f'Invalid action: {action}')
                
        except Exception as e:
            logger.error(f"Error updating invitation: {str(e)}")
            return self._error_response(str(e))
    
    def _accept_invitation(self, invitation: Dict[str, Any], user_id: str, user_email: str, user_context: Dict[str, Any]) -> Dict[str, Any]:
        """Accept an invitation."""
        # Verify user is the invitee
        if invitation['inviteeEmail'] != user_email:
            raise AuthorizationError('Only the invited user can accept this invitation')
        
        # Check if invitation is still valid
        if invitation['status'] != InvitationStatus.PENDING.value:
            raise DataValidationError(f'Invitation is no longer pending (status: {invitation["status"]})')
        
        # Check expiration
        if datetime.fromisoformat(invitation['expiresAt']) < datetime.utcnow():
            raise DataValidationError('Invitation has expired')
        
        # Update invitation status
        self.invitations_table.update_item(
            Key={'invitationId': invitation['invitationId']},
            UpdateExpression='SET #status = :status, inviteeUserId = :user_id, updatedAt = :now',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': InvitationStatus.ACCEPTED.value,
                ':user_id': user_id,
                ':now': datetime.utcnow().isoformat()
            }
        )
        
        # Add user to organization
        self.organization_users_table.put_item(
            Item={
                'userId': user_id,
                'organizationId': invitation['organizationId'],
                'role': invitation['role'],
                'status': 'ACTIVE',
                'invitedBy': invitation['inviterUserId'],
                'createdAt': datetime.utcnow().isoformat(),
                'updatedAt': datetime.utcnow().isoformat()
            }
        )
        
        # Log audit event
        log_organization_audit_event(
            event_type=OrganizationAuditEventType.USER_JOINED,
            acting_user_context=user_context,
            organization_id=invitation['organizationId'],
            resource_id=invitation['invitationId'],
            action_details={
                'role': invitation['role'],
                'invitedBy': invitation['inviterUserId']
            },
            compliance_flags=[ComplianceFlag.SOC_2]
        )
        
        invitation['status'] = InvitationStatus.ACCEPTED.value
        return self._success_response(invitation)
    
    def _decline_invitation(self, invitation: Dict[str, Any], user_id: str, user_email: str, user_context: Dict[str, Any]) -> Dict[str, Any]:
        """Decline an invitation."""
        # Verify user is the invitee
        if invitation['inviteeEmail'] != user_email:
            raise AuthorizationError('Only the invited user can decline this invitation')
        
        # Check if invitation is still valid
        if invitation['status'] != InvitationStatus.PENDING.value:
            raise DataValidationError(f'Invitation is no longer pending (status: {invitation["status"]})')
        
        # Update invitation status
        self.invitations_table.update_item(
            Key={'invitationId': invitation['invitationId']},
            UpdateExpression='SET #status = :status, inviteeUserId = :user_id, updatedAt = :now',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': InvitationStatus.DECLINED.value,
                ':user_id': user_id,
                ':now': datetime.utcnow().isoformat()
            }
        )
        
        # Log audit event
        log_organization_audit_event(
            event_type=OrganizationAuditEventType.USER_INVITATION_DECLINED,
            acting_user_context=user_context,
            organization_id=invitation['organizationId'],
            resource_id=invitation['invitationId'],
            action_details={
                'inviterUserId': invitation['inviterUserId']
            },
            compliance_flags=[ComplianceFlag.SOC_2]
        )
        
        invitation['status'] = InvitationStatus.DECLINED.value
        return self._success_response(invitation)
    
    def _revoke_invitation(self, invitation: Dict[str, Any], user_id: str, user_context: Dict[str, Any], cognito_groups: List[str]) -> Dict[str, Any]:
        """Revoke an invitation - only organization owner can do this."""
        # Verify user is the organization owner
        if invitation['inviterUserId'] != user_id and 'OWNER' not in cognito_groups:
            raise AuthorizationError('Only the organization owner can revoke invitations')
        
        # Check if invitation can be revoked
        if invitation['status'] not in [InvitationStatus.PENDING.value]:
            raise DataValidationError(f'Cannot revoke invitation with status: {invitation["status"]}')
        
        # Update invitation status
        self.invitations_table.update_item(
            Key={'invitationId': invitation['invitationId']},
            UpdateExpression='SET #status = :status, updatedAt = :now',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': InvitationStatus.REVOKED.value,
                ':now': datetime.utcnow().isoformat()
            }
        )
        
        # Log audit event
        log_organization_audit_event(
            event_type=OrganizationAuditEventType.USER_INVITATION_REVOKED,
            acting_user_context=user_context,
            organization_id=invitation['organizationId'],
            resource_id=invitation['invitationId'],
            action_details={
                'inviteeEmail': invitation['inviteeEmail']
            },
            compliance_flags=[ComplianceFlag.SOC_2]
        )
        
        invitation['status'] = InvitationStatus.REVOKED.value
        return self._success_response(invitation)
    
    def _resend_invitation(self, invitation: Dict[str, Any], user_id: str, user_context: Dict[str, Any], cognito_groups: List[str]) -> Dict[str, Any]:
        """Resend an invitation - only organization owner can do this."""
        # Verify user is the organization owner
        if invitation['inviterUserId'] != user_id and 'OWNER' not in cognito_groups:
            raise AuthorizationError('Only the organization owner can resend invitations')
        
        # Check if invitation can be resent
        if invitation['status'] != InvitationStatus.PENDING.value:
            raise DataValidationError(f'Can only resend pending invitations (status: {invitation["status"]})')
        
        # Update expiration
        new_expiration = datetime.utcnow() + timedelta(days=self.default_expiration_days)
        
        self.invitations_table.update_item(
            Key={'invitationId': invitation['invitationId']},
            UpdateExpression='SET expiresAt = :expires, updatedAt = :now',
            ExpressionAttributeValues={
                ':expires': new_expiration.isoformat(),
                ':now': datetime.utcnow().isoformat()
            }
        )
        
        # Log audit event
        log_organization_audit_event(
            event_type=OrganizationAuditEventType.USER_INVITATION_RESENT,
            acting_user_context=user_context,
            organization_id=invitation['organizationId'],
            resource_id=invitation['invitationId'],
            action_details={
                'inviteeEmail': invitation['inviteeEmail'],
                'newExpiresAt': new_expiration.isoformat()
            },
            compliance_flags=[ComplianceFlag.SOC_2]
        )
        
        # TODO: Trigger notification to invitee
        
        invitation['expiresAt'] = new_expiration.isoformat()
        return self._success_response(invitation)
    
    def _update_invitation_role(self, invitation_id: str, new_role: str, user_context: Dict[str, Any]) -> Dict[str, Any]:
        """Update role for existing invitation."""
        self.invitations_table.update_item(
            Key={'invitationId': invitation_id},
            UpdateExpression='SET #role = :role, updatedAt = :now',
            ExpressionAttributeNames={'#role': 'role'},
            ExpressionAttributeValues={
                ':role': new_role,
                ':now': datetime.utcnow().isoformat()
            }
        )
        
        response = self.invitations_table.get_item(
            Key={'invitationId': invitation_id}
        )
        
        return self._success_response(response['Item'])
    
    def query_by_organization_id(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Query invitations by organization ID."""
        try:
            args = event.get('arguments', {})
            input_data = args.get('input', {})
            organization_id = input_data.get('organizationId')
            
            if not organization_id:
                raise DataValidationError('organizationId is required')
            
            user_context = event.get('context', {})
            user_id = user_context.get('sub')
            
            # Verify user has access to organization
            org_user = self.organization_users_table.get_item(
                Key={
                    'userId': user_id,
                    'organizationId': organization_id
                }
            )
            
            # Also check if user is owner
            org = self.organizations_table.get_item(
                Key={'organizationId': organization_id}
            )
            
            if not org_user.get('Item') and org.get('Item', {}).get('ownerId') != user_id:
                raise AuthorizationError('You do not have access to this organization')
            
            response = self.invitations_table.query(
                IndexName='OrganizationInvitationsIndex',
                KeyConditionExpression='organizationId = :org_id',
                ExpressionAttributeValues={':org_id': organization_id}
            )
            
            invitations = response.get('Items', [])
            return self._success_response(invitations)
            
        except Exception as e:
            logger.error(f"Error querying invitations by organization: {str(e)}")
            return self._error_response(str(e))
    
    def query_by_invitee_email(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Query invitations by invitee email."""
        try:
            args = event.get('arguments', {})
            input_data = args.get('input', {})
            email = input_data.get('inviteeEmail') or input_data.get('email')
            
            if not email:
                raise DataValidationError('inviteeEmail is required')
            
            user_context = event.get('context', {})
            user_email = user_context.get('email')
            
            # Users can only query their own invitations
            if email != user_email and 'OWNER' not in user_context.get('groups', []):
                raise AuthorizationError('You can only query your own invitations')
            
            response = self.invitations_table.query(
                IndexName='InviteeEmailIndex',
                KeyConditionExpression='inviteeEmail = :email',
                ExpressionAttributeValues={':email': email}
            )
            
            invitations = response.get('Items', [])
            return self._success_response(invitations)
            
        except Exception as e:
            logger.error(f"Error querying invitations by email: {str(e)}")
            return self._error_response(str(e))
    
    def query_by_invitee_user_id(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Query invitations by invitee user ID."""
        try:
            args = event.get('arguments', {})
            input_data = args.get('input', {})
            invitee_user_id = input_data.get('inviteeUserId')
            
            if not invitee_user_id:
                raise DataValidationError('inviteeUserId is required')
            
            user_context = event.get('context', {})
            user_id = user_context.get('sub')
            
            # Users can only query their own invitations
            if invitee_user_id != user_id and 'OWNER' not in user_context.get('groups', []):
                raise AuthorizationError('You can only query your own invitations')
            
            response = self.invitations_table.query(
                IndexName='InviteeUserIdIndex',
                KeyConditionExpression='inviteeUserId = :user_id',
                ExpressionAttributeValues={':user_id': invitee_user_id}
            )
            
            invitations = response.get('Items', [])
            return self._success_response(invitations)
            
        except Exception as e:
            logger.error(f"Error querying invitations by user ID: {str(e)}")
            return self._error_response(str(e))
    
    def get_invitation(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Get a single invitation."""
        try:
            args = event.get('arguments', {})
            input_data = args.get('input', {})
            invitation_id = input_data.get('invitationId')
            
            if not invitation_id:
                raise DataValidationError('invitationId is required')
            
            response = self.invitations_table.get_item(
                Key={'invitationId': invitation_id}
            )
            
            invitation = response.get('Item')
            if not invitation:
                raise ResourceNotFoundError('Invitation not found')
            
            # Users can only see invitations sent to them or from their organizations
            user_email = event.get('context', {}).get('email')
            user_id = event.get('context', {}).get('sub')
            
            # Check access rights
            if invitation['inviteeEmail'] != user_email and invitation['inviterUserId'] != user_id:
                # Check if user is part of the organization
                org_user = self.organization_users_table.get_item(
                    Key={
                        'userId': user_id,
                        'organizationId': invitation['organizationId']
                    }
                )
                if not org_user.get('Item'):
                    raise AuthorizationError('You do not have access to this invitation')
            
            return self._success_response(invitation)
            
        except Exception as e:
            logger.error(f"Error getting invitation: {str(e)}")
            return self._error_response(str(e))
    
    def _success_response(self, data: Any) -> Dict[str, Any]:
        """Create a successful response."""
        return {
            'StatusCode': 200,
            'Data': data
        }
    
    def _error_response(self, message: str, status_code: int = 400) -> Dict[str, Any]:
        """Create an error response."""
        return {
            'StatusCode': status_code,
            'Message': message,
            'Data': None
        }


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Lambda handler for GraphQL resolver."""
    logger.info(f"Received event: {json.dumps(event)}")
    
    resolver = InvitationsResolver()
    field_name = event.get('info', {}).get('fieldName')
    
    try:
        # Add context to event for middleware
        event['context'] = event.get('identity', {})
        
        # Route to appropriate resolver method
        if field_name == 'InvitationsCreate':
            return resolver.create_invitation(event)
        elif field_name == 'InvitationsUpdate':
            return resolver.update_invitation(event)
        elif field_name == 'InvitationsDelete':
            return resolver.delete_invitation(event)
        elif field_name == 'InvitationsQueryByInvitationId':
            return resolver.get_invitation(event)
        elif field_name == 'InvitationsQueryByOrganizationId':
            return resolver.query_by_organization_id(event)
        elif field_name == 'InvitationsQueryByInviteeEmail':
            return resolver.query_by_invitee_email(event)
        elif field_name == 'InvitationsQueryByInviteeUserId':
            return resolver.query_by_invitee_user_id(event)
        elif field_name == 'GetInvitationsByEmail':
            return resolver.query_by_invitee_email(event)  # Custom query
        elif field_name == 'GetInvitationsByOrganizationId':
            return resolver.query_by_organization_id(event)  # Custom query
        else:
            return resolver._error_response(f'Unknown field: {field_name}')
            
    except Exception as e:
        logger.error(f"Unhandled error in lambda_handler: {str(e)}")
        return resolver._error_response(str(e), 500)