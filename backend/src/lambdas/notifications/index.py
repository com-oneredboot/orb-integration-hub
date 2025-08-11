# file: backend/src/lambdas/notifications/index.py
# author: AI Assistant
# created: 2025-08-09
# description: Lambda resolver for Notifications GraphQL operations

import json
import logging
import os
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
import boto3
from botocore.exceptions import ClientError

# Import from common layer
from orb_common.exceptions import (
    DataValidationError,
    ResourceNotFoundError,
    AuthorizationError
)

# Import models
from orb_models.models.NotificationsModel import NotificationsModel, NotificationStatus, NotificationType

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class NotificationsResolver:
    """Lambda resolver for Notifications GraphQL operations."""
    
    def __init__(self):
        self.dynamodb = boto3.resource('dynamodb')
        self.ses = boto3.client('ses')
        
        # Table names from environment
        self.notifications_table = self.dynamodb.Table(
            os.environ.get('NOTIFICATIONS_TABLE_NAME', 'Notifications')
        )
        self.users_table = self.dynamodb.Table(
            os.environ.get('USERS_TABLE_NAME', 'Users')
        )
        
        # Configuration
        self.ttl_days_after_read = 30
        self.default_expiration_days = 30
        
    def create_notification(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new notification."""
        try:
            args = event.get('arguments', {})
            input_data = args.get('input', {})
            
            # Extract required fields
            recipient_user_id = input_data.get('recipientUserId')
            notification_type = input_data.get('type')
            title = input_data.get('title')
            message = input_data.get('message')
            
            if not all([recipient_user_id, notification_type, title, message]):
                raise DataValidationError('recipientUserId, type, title, and message are required')
            
            # Validate notification type
            try:
                NotificationType(notification_type)
            except ValueError:
                raise DataValidationError(f'Invalid notification type: {notification_type}')
            
            # Create notification
            notification_id = str(uuid.uuid4())
            current_time = datetime.utcnow()
            
            # Set expiration for time-sensitive notifications
            expires_at = None
            if notification_type in ['ORGANIZATION_INVITATION_RECEIVED']:
                expires_at = (current_time + timedelta(days=7)).isoformat()
            
            notification = NotificationsModel(
                notificationId=notification_id,
                recipientUserId=recipient_user_id,
                senderUserId=input_data.get('senderUserId'),
                type=notification_type,
                status=NotificationStatus.PENDING.value,
                title=title,
                message=message,
                metadata=input_data.get('metadata', {}),
                expiresAt=expires_at,
                createdAt=current_time.isoformat(),
                updatedAt=current_time.isoformat()
            )
            
            # Save to DynamoDB
            self.notifications_table.put_item(Item=notification.dict())
            
            # Send email notification if configured
            self._send_email_notification(recipient_user_id, title, message)
            
            logger.info(f"Created notification {notification_id} for user {recipient_user_id}")
            
            return self._success_response(notification.dict())
            
        except Exception as e:
            logger.error(f"Error creating notification: {str(e)}")
            return self._error_response(str(e))
    
    def update_notification(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Update notification status (mark as read, dismissed, etc)."""
        try:
            args = event.get('arguments', {})
            input_data = args.get('input', {})
            
            notification_id = input_data.get('notificationId')
            status = input_data.get('status')
            
            if not notification_id:
                raise DataValidationError('notificationId is required')
            
            # Get current user
            user_id = event.get('identity', {}).get('sub')
            
            # Get notification
            response = self.notifications_table.get_item(
                Key={'notificationId': notification_id}
            )
            notification = response.get('Item')
            
            if not notification:
                raise ResourceNotFoundError('Notification not found')
            
            # Verify user owns this notification
            if notification['recipientUserId'] != user_id:
                raise AuthorizationError('You can only update your own notifications')
            
            update_expression = 'SET updatedAt = :now'
            expression_values = {':now': datetime.utcnow().isoformat()}
            
            # Update status if provided
            if status:
                try:
                    NotificationStatus(status)
                except ValueError:
                    raise DataValidationError(f'Invalid status: {status}')
                
                update_expression += ', #status = :status'
                expression_values[':status'] = status
                
                # If marking as read, set TTL for cleanup
                if status == NotificationStatus.READ.value:
                    update_expression += ', readAt = :readAt, #ttl = :ttl'
                    expression_values[':readAt'] = datetime.utcnow().isoformat()
                    expression_values[':ttl'] = int((datetime.utcnow() + timedelta(days=self.ttl_days_after_read)).timestamp())
            
            self.notifications_table.update_item(
                Key={'notificationId': notification_id},
                UpdateExpression=update_expression,
                ExpressionAttributeNames={'#status': 'status', '#ttl': 'ttl'},
                ExpressionAttributeValues=expression_values
            )
            
            # Get updated notification
            response = self.notifications_table.get_item(
                Key={'notificationId': notification_id}
            )
            
            return self._success_response(response['Item'])
            
        except Exception as e:
            logger.error(f"Error updating notification: {str(e)}")
            return self._error_response(str(e))
    
    def get_notification(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Get a single notification."""
        try:
            args = event.get('arguments', {})
            input_data = args.get('input', {})
            notification_id = input_data.get('notificationId')
            
            if not notification_id:
                raise DataValidationError('notificationId is required')
            
            # Get current user
            user_id = event.get('identity', {}).get('sub')
            
            response = self.notifications_table.get_item(
                Key={'notificationId': notification_id}
            )
            
            notification = response.get('Item')
            if not notification:
                raise ResourceNotFoundError('Notification not found')
            
            # Verify user owns this notification
            if notification['recipientUserId'] != user_id:
                raise AuthorizationError('You can only view your own notifications')
            
            return self._success_response(notification)
            
        except Exception as e:
            logger.error(f"Error getting notification: {str(e)}")
            return self._error_response(str(e))
    
    def query_by_user(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Query notifications for a user."""
        try:
            args = event.get('arguments', {})
            input_data = args.get('input', {})
            
            # Get current user - users can only query their own notifications
            user_id = event.get('identity', {}).get('sub')
            
            # Optional filters
            status = input_data.get('status')
            notification_type = input_data.get('type')
            
            # Query by user
            query_params = {
                'IndexName': 'UserNotificationsIndex',
                'KeyConditionExpression': 'recipientUserId = :userId',
                'ExpressionAttributeValues': {':userId': user_id},
                'ScanIndexForward': False  # Most recent first
            }
            
            # Add filters
            filters = []
            if status:
                filters.append('#status = :status')
                query_params['ExpressionAttributeValues'][':status'] = status
            
            if notification_type:
                filters.append('#type = :type')
                query_params['ExpressionAttributeValues'][':type'] = notification_type
            
            if filters:
                query_params['FilterExpression'] = ' AND '.join(filters)
                query_params['ExpressionAttributeNames'] = {
                    '#status': 'status',
                    '#type': 'type'
                }
            
            response = self.notifications_table.query(**query_params)
            
            notifications = response.get('Items', [])
            return self._success_response(notifications)
            
        except Exception as e:
            logger.error(f"Error querying notifications: {str(e)}")
            return self._error_response(str(e))
    
    def delete_notification(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Delete a notification."""
        try:
            args = event.get('arguments', {})
            notification_id = args.get('id')
            
            if not notification_id:
                raise DataValidationError('notificationId is required')
            
            # Get current user
            user_id = event.get('identity', {}).get('sub')
            
            # Get notification to verify ownership
            response = self.notifications_table.get_item(
                Key={'notificationId': notification_id}
            )
            notification = response.get('Item')
            
            if not notification:
                raise ResourceNotFoundError('Notification not found')
            
            # Verify user owns this notification
            if notification['recipientUserId'] != user_id:
                raise AuthorizationError('You can only delete your own notifications')
            
            # Delete the notification
            self.notifications_table.delete_item(
                Key={'notificationId': notification_id}
            )
            
            return self._success_response({'deleted': True})
            
        except Exception as e:
            logger.error(f"Error deleting notification: {str(e)}")
            return self._error_response(str(e))
    
    def _send_email_notification(self, user_id: str, title: str, message: str) -> None:
        """Send email notification to user (if email notifications are enabled)."""
        try:
            # Get user details
            response = self.users_table.get_item(
                Key={'userId': user_id}
            )
            user = response.get('Item')
            
            if not user or not user.get('email'):
                logger.warning(f"Cannot send email - user {user_id} not found or has no email")
                return
            
            # Check if user has email notifications enabled (future feature)
            # For now, we'll send to all users
            
            # Send generic notification email
            try:
                self.ses.send_email(
                    Source=os.environ.get('NOTIFICATION_EMAIL_FROM', 'noreply@example.com'),
                    Destination={'ToAddresses': [user['email']]},
                    Message={
                        'Subject': {'Data': f'New Notification: {title}'},
                        'Body': {
                            'Text': {'Data': f"You have a new notification:\n\n{message}\n\nPlease log in to view more details."},
                            'Html': {'Data': f"<p>You have a new notification:</p><h3>{title}</h3><p>{message}</p><p>Please log in to view more details.</p>"}
                        }
                    }
                )
                logger.info(f"Sent email notification to user {user_id}")
            except ClientError as e:
                logger.error(f"Failed to send email: {str(e)}")
                
        except Exception as e:
            logger.error(f"Error in email notification: {str(e)}")
    
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
    
    resolver = NotificationsResolver()
    field_name = event.get('info', {}).get('fieldName')
    
    try:
        # Route to appropriate resolver method
        if field_name == 'NotificationsCreate':
            return resolver.create_notification(event)
        elif field_name == 'NotificationsUpdate':
            return resolver.update_notification(event)
        elif field_name == 'NotificationsGet':
            return resolver.get_notification(event)
        elif field_name == 'NotificationsQueryByNotificationId':
            return resolver.get_notification(event)
        elif field_name == 'NotificationsQueryByRecipientUserId':
            return resolver.query_by_user(event)
        elif field_name == 'NotificationsDelete':
            return resolver.delete_notification(event)
        else:
            return resolver._error_response(f'Unknown field: {field_name}')
            
    except Exception as e:
        logger.error(f"Unhandled error in lambda_handler: {str(e)}")
        return resolver._error_response(str(e), 500)