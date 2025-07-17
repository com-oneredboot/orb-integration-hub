"""
Generated Python models for Notifications
Generated at 2025-07-17T16:55:28.541645+00:00
"""

from typing import Optional, List
from pydantic import BaseModel, Field, validator
from datetime import datetime  # Still needed for timestamp parsing
from enum import Enum
from .NotificationTypeEnum import NotificationType
from .NotificationStatusEnum import NotificationStatus

# CRUD Input Types
class NotificationsCreateInput(BaseModel):
    notification_id: str = Field(..., description="Unique identifier for the notification (primary key)")
    recipient_user_id: str = Field(..., description="ID of the user who should receive this notification (foreign key to Users)")
    sender_user_id: str = Field(..., description="ID of the user who triggered this notification (foreign key to Users)")
    type: NotificationType = Field(..., description="Type of notification")
    status: NotificationStatus = Field(..., description="Current status of the notification")
    title: str = Field(..., description="Title/subject of the notification")
    message: str = Field(..., description="Content/body of the notification")
    metadata: str = Field(..., description="Additional context data (applicationId, organizationId, etc.)")
    expires_at: int = Field(..., description="When the notification expires (for time-sensitive actions)")
    created_at: int = Field(..., description="When the notification was created")
    updated_at: int = Field(..., description="When the notification was last updated")

class NotificationsUpdateInput(BaseModel):
    notification_id: Optional[str] = Field(None, description="Unique identifier for the notification (primary key)")
    recipient_user_id: Optional[str] = Field(None, description="ID of the user who should receive this notification (foreign key to Users)")
    sender_user_id: Optional[str] = Field(None, description="ID of the user who triggered this notification (foreign key to Users)")
    type: Optional[NotificationType] = Field(None, description="Type of notification")
    status: Optional[NotificationStatus] = Field(None, description="Current status of the notification")
    title: Optional[str] = Field(None, description="Title/subject of the notification")
    message: Optional[str] = Field(None, description="Content/body of the notification")
    metadata: Optional[str] = Field(None, description="Additional context data (applicationId, organizationId, etc.)")
    expires_at: Optional[int] = Field(None, description="When the notification expires (for time-sensitive actions)")
    created_at: Optional[int] = Field(None, description="When the notification was created")
    updated_at: Optional[int] = Field(None, description="When the notification was last updated")

class NotificationsDeleteInput(BaseModel):
    notification_id: str

class NotificationsDisableInput(BaseModel):
    notification_id: str
    disabled: bool

# QueryBy Inputs for PK, SK, Both, and all secondary indexes
class NotificationsQueryByNotificationIdInput(BaseModel):
    notification_id: str

class NotificationsQueryByRecipientUserIdInput(BaseModel):
    recipient_user_id: str

class NotificationsQueryByTypeInput(BaseModel):
    type: str

# Main Model (DTO)
# Properties: Field(...) = required (from schema), Optional[...] = optional (from schema)
class Notifications(BaseModel):
    """Notifications model."""
    notification_id: str = Field(..., description="Unique identifier for the notification (primary key)")    recipient_user_id: str = Field(..., description="ID of the user who should receive this notification (foreign key to Users)")    sender_user_id: str = Field(None, description="ID of the user who triggered this notification (foreign key to Users)")    type: str = Field(..., description="Type of notification")    status: str = Field(..., description="Current status of the notification")    title: str = Field(..., description="Title/subject of the notification")    message: str = Field(..., description="Content/body of the notification")    metadata: str = Field(None, description="Additional context data (applicationId, organizationId, etc.)")    expires_at: int = Field(None, description="When the notification expires (for time-sensitive actions)")    created_at: int = Field(..., description="When the notification was created")    updated_at: int = Field(..., description="When the notification was last updated")
    @validator('expires_at', pre=True)
    def parse_expires_at(cls, value):
        """Parse timestamp to epoch seconds."""
        if value is None:
            return None
        if isinstance(value, int):
            return value
        if isinstance(value, float):
            return int(value)
        if isinstance(value, datetime):
            return int(value.timestamp())
        if isinstance(value, str):
            try:
                # Try to parse ISO format string
                dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
                return int(dt.timestamp())
            except (ValueError, TypeError):
                pass
        return value
    @validator('created_at', pre=True)
    def parse_created_at(cls, value):
        """Parse timestamp to epoch seconds."""
        if value is None:
            return None
        if isinstance(value, int):
            return value
        if isinstance(value, float):
            return int(value)
        if isinstance(value, datetime):
            return int(value.timestamp())
        if isinstance(value, str):
            try:
                # Try to parse ISO format string
                dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
                return int(dt.timestamp())
            except (ValueError, TypeError):
                pass
        return value
    @validator('updated_at', pre=True)
    def parse_updated_at(cls, value):
        """Parse timestamp to epoch seconds."""
        if value is None:
            return None
        if isinstance(value, int):
            return value
        if isinstance(value, float):
            return int(value)
        if isinstance(value, datetime):
            return int(value.timestamp())
        if isinstance(value, str):
            try:
                # Try to parse ISO format string
                dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
                return int(dt.timestamp())
            except (ValueError, TypeError):
                pass
        return value

    @classmethod
    def from_dto(cls, dto: dict) -> "Notifications":
        return cls(
            notification_id=dto.get('notification_id'),
            recipient_user_id=dto.get('recipient_user_id'),
            sender_user_id=dto.get('sender_user_id'),
            type=NotificationType[dto.get('type', 'NotificationType.UNKNOWN')] if dto.get('type') else NotificationType.UNKNOWN,
            status=NotificationStatus[dto.get('status', 'NotificationStatus.UNKNOWN')] if dto.get('status') else NotificationStatus.UNKNOWN,
            title=dto.get('title'),
            message=dto.get('message'),
            metadata=dto.get('metadata'),
            expires_at=dto.get('expires_at'),
            created_at=dto.get('created_at'),
            updated_at=dto.get('updated_at'),
        )

    def to_dto(self) -> dict:
        return {
            'notification_id': self.notification_id,
            'recipient_user_id': self.recipient_user_id,
            'sender_user_id': self.sender_user_id,
            'type': self.type.value if self.type else 'NotificationType.UNKNOWN',
            'status': self.status.value if self.status else 'NotificationStatus.UNKNOWN',
            'title': self.title,
            'message': self.message,
            'metadata': self.metadata,
            'expires_at': self.expires_at,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
        }

    class Config:
        """Model configuration."""
        from_attributes = True

# ProperCase Response Types
class NotificationsResponse(BaseModel):
    StatusCode: int
    Message: Optional[str]
    Data: Optional[Notifications]

class NotificationsListResponse(BaseModel):
    StatusCode: int
    Message: Optional[str]
    Data: List[Notifications]

# CRUD Response Aliases
NotificationsCreateResponse = NotificationsResponse
NotificationsUpdateResponse = NotificationsResponse
NotificationsDeleteResponse = NotificationsResponse
NotificationsDisableResponse = NotificationsResponse