"""Users model."""
from typing import Optional, List
from pydantic import BaseModel, Field, validator
from datetime import datetime
from .user_status import UserStatus


class Users(BaseModel):
    """Users model."""
    userId: str = Field(..., description="Unique identifier for the user")
    cognitoId: str = Field(..., description="Cognito user ID")
    email: str = Field(..., description="User's email address")
    emailVerified: bool = Field(..., description="Whether the email has been verified")
    phoneNumber: str | None = Field(None, description="User's phone number")
    phoneVerified: bool | None = Field(None, description="Whether the phone number has been verified")
    firstName: str = Field(..., description="User's first name")
    lastName: str = Field(..., description="User's last name")
    groups: List[str] = Field(..., description="User's groups")
    status: UserStatus = Field(..., description="Current status of the user")
    createdAt: datetime = Field(..., description="When the user was created")
    updatedAt: datetime = Field(..., description="When the user was last updated")

    @validator('createdAt', pre=True)
    def parse_createdAt(cls, value):
        """Parse timestamp to ISO format."""
        if value is None:
            return None
        if isinstance(value, datetime):
            return value
        try:
            return datetime.fromisoformat(value.replace('Z', '+00:00'))
        except (ValueError, TypeError):
            return None
    @validator('updatedAt', pre=True)
    def parse_updatedAt(cls, value):
        """Parse timestamp to ISO format."""
        if value is None:
            return None
        if isinstance(value, datetime):
            return value
        try:
            return datetime.fromisoformat(value.replace('Z', '+00:00'))
        except (ValueError, TypeError):
            return None

    class Config:
        """Model configuration."""
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }