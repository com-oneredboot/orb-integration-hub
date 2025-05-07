"""
Generated Python models for Users
Generated at 
"""

from typing import Optional, List
from pydantic import BaseModel, Field, validator
from datetime import datetime
from enum import Enum
from .role_type import RoleType
from .user_status import UserStatus


class Users(BaseModel):
    """Users model."""
    id: str = Field(..., description="Unique identifier for the user")
    email: str = Field(..., description="User's email address")
    first_name: str = Field(..., description="User's first name")
    last_name: str = Field(..., description="User's last name")
    role_id: str = Field(..., description="ID of the user's role")
    role_type: RoleType = Field(..., description="Type of the user's role")
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

class UsersCreateInput(BaseModel):
    id: str = Field(..., description="Unique identifier for the user")
    email: str = Field(..., description="User's email address")
    first_name: str = Field(..., description="User's first name")
    last_name: str = Field(..., description="User's last name")
    role_id: str = Field(..., description="ID of the user's role")
    role_type: RoleType = Field(..., description="Type of the user's role")
    status: UserStatus = Field(..., description="Current status of the user")
    created_at: datetime = Field(..., description="When the user was created")
    updated_at: datetime = Field(..., description="When the user was last updated")

class UsersUpdateInput(BaseModel):
    id: Optional[str] = Field(None, description="Unique identifier for the user")
    email: Optional[str] = Field(None, description="User's email address")
    first_name: Optional[str] = Field(None, description="User's first name")
    last_name: Optional[str] = Field(None, description="User's last name")
    role_id: Optional[str] = Field(None, description="ID of the user's role")
    role_type: Optional[RoleType] = Field(None, description="Type of the user's role")
    status: Optional[UserStatus] = Field(None, description="Current status of the user")
    created_at: Optional[datetime] = Field(None, description="When the user was created")
    updated_at: Optional[datetime] = Field(None, description="When the user was last updated")

class UsersResponse(BaseModel):
    StatusCode: int = Field(..., description="HTTP status code")
    Message: str = Field(..., description="Response message")
    Data: Users = Field(..., description="Response data")

class UsersListResponse(BaseModel):
    StatusCode: int = Field(..., description="HTTP status code")
    Message: str = Field(..., description="Response message")
    Data: List[Users] = Field(..., description="Response data")