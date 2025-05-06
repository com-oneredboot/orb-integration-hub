"""Applications model."""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from .application_status import ApplicationStatus


class Applications(BaseModel):
    """Applications model."""
    application_id: str = Field(..., description="Unique identifier for the application")
    name: str = Field(..., description="Name of the application")
    description: str = Field(..., description="Description of the application")
    status: ApplicationStatus = Field(..., description="Current status of the application")
    created_at: datetime = Field(..., description="When the application was created")
    updated_at: datetime = Field(..., description="When the application was last updated")
    user_id: str = Field(..., description="Unique identifier for the user who created the application")

    class Config:
        """Model configuration."""
        from_attributes = True