"""
ApplicationRoles model.
"""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime

class ApplicationRoles(BaseModel):
    """ApplicationRoles model."""
    application_id: str = Field(..., description="application_id")
    role_id: str = Field(..., description="role_id")
    description: str = Field(..., description="description")
    status: str = Field(..., description="status")
    created_at: int = Field(..., description="created_at")
    updated_at: int = Field(..., description="updated_at")

    class Config:
        """Model configuration."""
        from_attributes = True