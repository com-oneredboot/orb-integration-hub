"""
Generated Python models for 
Generated at 
"""

from typing import Optional, List
from pydantic import BaseModel, Field, validator
from datetime import datetime
from enum import Enum
from .application_user_status import ApplicationUserStatus


class (BaseModel):
    """ model."""
    application_id: str = Field(..., description="ID of the application")
    user_id: str = Field(..., description="ID of the user")
    role_id: str = Field(..., description="Unique identifier for the role assigned to the user")
    status: ApplicationUserStatus = Field(..., description="Status of the user in the application")
    created_at: datetime = Field(..., description="When the user was added to the application")
    updated_at: datetime = Field(..., description="When the user's application status was last updated")

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
    application_id: str = Field(..., description="ID of the application")
    user_id: str = Field(..., description="ID of the user")
    role_id: str = Field(..., description="Unique identifier for the role assigned to the user")
    status: ApplicationUserStatus = Field(..., description="Status of the user in the application")
    created_at: datetime = Field(..., description="When the user was added to the application")
    updated_at: datetime = Field(..., description="When the user's application status was last updated")

class UpdateInput(BaseModel):
    application_id: Optional[str] = Field(None, description="ID of the application")
    user_id: Optional[str] = Field(None, description="ID of the user")
    role_id: Optional[str] = Field(None, description="Unique identifier for the role assigned to the user")
    status: Optional[ApplicationUserStatus] = Field(None, description="Status of the user in the application")
    created_at: Optional[datetime] = Field(None, description="When the user was added to the application")
    updated_at: Optional[datetime] = Field(None, description="When the user's application status was last updated")

class Response(BaseModel):
    StatusCode: int = Field(..., description="HTTP status code")
    Message: str = Field(..., description="Response message")
    Data:  = Field(..., description="Response data")

class ListResponse(BaseModel):
    StatusCode: int = Field(..., description="HTTP status code")
    Message: str = Field(..., description="Response message")
    Data: List[] = Field(..., description="Response data")