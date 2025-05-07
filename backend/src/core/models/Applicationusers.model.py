"""ApplicationUsers model."""
from typing import Optional, List
from pydantic import BaseModel, Field
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

    class Config:
        """Model configuration."""
        from_attributes = True