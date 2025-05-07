"""ApplicationUsers model."""
from typing import Optional, List
from pydantic import BaseModel, Field, validator
from datetime import datetime
from .application_user_status import ApplicationUserStatus


class ApplicationUsers(BaseModel):
    """ApplicationUsers model."""
    applicationId: str = Field(..., description="ID of the application")
    userId: str = Field(..., description="ID of the user")
    roleId: str | None = Field(None, description="Unique identifier for the role assigned to the user")
    status: ApplicationUserStatus = Field(..., description="Status of the user in the application")
    createdAt: datetime = Field(..., description="When the user was added to the application")
    updatedAt: datetime = Field(..., description="When the user's application status was last updated")

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