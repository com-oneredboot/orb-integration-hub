"""
Generated Python models for 
Generated at 
"""

from typing import Optional, List
from pydantic import BaseModel, Field, validator
from datetime import datetime
from enum import Enum
from .application_status import ApplicationStatus


class (BaseModel):
    """ model."""
    application_id: str = Field(..., description="Unique identifier for the application")
    name: str = Field(..., description="Name of the application")
    description: str = Field(..., description="Description of the application")
    status: ApplicationStatus = Field(..., description="Current status of the application")
    created_at: datetime = Field(..., description="When the application was created")
    updated_at: datetime = Field(..., description="When the application was last updated")
    user_id: str = Field(..., description="Unique identifier for the user who created the application")

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
    application_id: str = Field(..., description="Unique identifier for the application")
    name: str = Field(..., description="Name of the application")
    description: str = Field(..., description="Description of the application")
    status: ApplicationStatus = Field(..., description="Current status of the application")
    created_at: datetime = Field(..., description="When the application was created")
    updated_at: datetime = Field(..., description="When the application was last updated")
    user_id: str = Field(..., description="Unique identifier for the user who created the application")

class UpdateInput(BaseModel):
    application_id: Optional[str] = Field(None, description="Unique identifier for the application")
    name: Optional[str] = Field(None, description="Name of the application")
    description: Optional[str] = Field(None, description="Description of the application")
    status: Optional[ApplicationStatus] = Field(None, description="Current status of the application")
    created_at: Optional[datetime] = Field(None, description="When the application was created")
    updated_at: Optional[datetime] = Field(None, description="When the application was last updated")
    user_id: Optional[str] = Field(None, description="Unique identifier for the user who created the application")

class Response(BaseModel):
    StatusCode: int = Field(..., description="HTTP status code")
    Message: str = Field(..., description="Response message")
    Data:  = Field(..., description="Response data")

class ListResponse(BaseModel):
    StatusCode: int = Field(..., description="HTTP status code")
    Message: str = Field(..., description="Response message")
    Data: List[] = Field(..., description="Response data")