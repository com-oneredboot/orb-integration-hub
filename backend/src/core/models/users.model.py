"""Users model."""
from typing import Optional, List
from pydantic import BaseModel, Field
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

    class Config:
        """Model configuration."""
        from_attributes = True