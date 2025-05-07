"""Applications model."""
from typing import Optional, List
from pydantic import BaseModel, Field, validator
from datetime import datetime
from .application_status import ApplicationStatus


class Applications(BaseModel):
    """Applications model."""
    applicationId: str = Field(..., description="Unique identifier for the application")
    name: str = Field(..., description="Name of the application")
    description: str = Field(..., description="Description of the application")
    status: ApplicationStatus = Field(..., description="Current status of the application")
    createdAt: datetime = Field(..., description="When the application was created")
    updatedAt: datetime = Field(..., description="When the application was last updated")
    userId: str = Field(..., description="Unique identifier for the user who created the application")

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