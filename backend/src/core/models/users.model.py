"""
Generated Python models for 
Generated at 
"""

from typing import Optional, List
from pydantic import BaseModel, Field, validator
from datetime import datetime
from enum import Enum
from .user_status import UserStatus


class (BaseModel):
    """ model."""
    user_id: str = Field(..., description="Unique identifier for the user")
    cognito_id: str = Field(..., description="Cognito user ID")
    email: str = Field(..., description="User's email address")
    email_verified: bool = Field(..., description="Whether the email has been verified")
    phone_number: str = Field(..., description="User's phone number")
    phone_verified: bool = Field(..., description="Whether the phone number has been verified")
    first_name: str = Field(..., description="User's first name")
    last_name: str = Field(..., description="User's last name")
    groups: List[str] = Field(..., description="User's groups")
    status: UserStatus = Field(..., description="Current status of the user")
    created_at: datetime = Field(..., description="When the user was created")
    updated_at: datetime = Field(..., description="When the user was last updated")

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

class CreateInput(BaseModel):
    user_id: str = Field(..., description="Unique identifier for the user")
    cognito_id: str = Field(..., description="Cognito user ID")
    email: str = Field(..., description="User's email address")
    email_verified: bool = Field(..., description="Whether the email has been verified")
    phone_number: str = Field(..., description="User's phone number")
    phone_verified: bool = Field(..., description="Whether the phone number has been verified")
    first_name: str = Field(..., description="User's first name")
    last_name: str = Field(..., description="User's last name")
    groups: List[str] = Field(..., description="User's groups")
    status: UserStatus = Field(..., description="Current status of the user")
    created_at: datetime = Field(..., description="When the user was created")
    updated_at: datetime = Field(..., description="When the user was last updated")

class UpdateInput(BaseModel):
    user_id: Optional[str] = Field(None, description="Unique identifier for the user")
    cognito_id: Optional[str] = Field(None, description="Cognito user ID")
    email: Optional[str] = Field(None, description="User's email address")
    email_verified: Optional[bool] = Field(None, description="Whether the email has been verified")
    phone_number: Optional[str] = Field(None, description="User's phone number")
    phone_verified: Optional[bool] = Field(None, description="Whether the phone number has been verified")
    first_name: Optional[str] = Field(None, description="User's first name")
    last_name: Optional[str] = Field(None, description="User's last name")
    groups: Optional[List[str]] = Field(None, description="User's groups")
    status: Optional[UserStatus] = Field(None, description="Current status of the user")
    created_at: Optional[datetime] = Field(None, description="When the user was created")
    updated_at: Optional[datetime] = Field(None, description="When the user was last updated")

class Response(BaseModel):
    StatusCode: int = Field(..., description="HTTP status code")
    Message: str = Field(..., description="Response message")
    Data:  = Field(..., description="Response data")

class ListResponse(BaseModel):
    StatusCode: int = Field(..., description="HTTP status code")
    Message: str = Field(..., description="Response message")
    Data: List[] = Field(..., description="Response data")