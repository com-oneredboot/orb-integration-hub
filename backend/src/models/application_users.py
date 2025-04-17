"""ApplicationUsers model."""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class ApplicationUsers(BaseModel):
    """ApplicationUsers model."""
    application_id: str = Field(..., description="ID of the application")
    user_id: str = Field(..., description="ID of the user")
    role_id: Optional[str] = Field(None, description="Unique identifier for the role assigned to the user")
    status: ApplicationUserStatus = Field(..., description="Status of the user in the application")
    created_at: datetime = Field(..., description="When the user was added to the application")
    updated_at: datetime = Field(..., description="When the user's application status was last updated")

    class Config:
        """Model configuration."""
        from_attributes = True