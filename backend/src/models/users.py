"""Users model."""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from .user_status import UserStatus


class Users(BaseModel):
    """Users model."""
    user_id: str = Field(..., description="Unique identifier for the user")
    cognito_id: str = Field(..., description="Unique identifier from Cognito")
    email: str = Field(..., description="User's email address")
    phone_number: str = Field(..., description="User's phone number")
    phone_verified: bool = Field(..., description="Whether the phone number is verified")
    first_name: str = Field(..., description="User's first name")
    last_name: str = Field(..., description="User's last name")
    groups: List[str] = Field(..., description="User's groups")
    status: UserStatus = Field(..., description="User's status")
    created_at: datetime = Field(..., description="When the user was created")
    updated_at: datetime = Field(..., description="When the user was last updated")

    class Config:
        """Model configuration."""
        from_attributes = True