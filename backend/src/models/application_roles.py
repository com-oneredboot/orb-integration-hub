"""application_roles model."""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime

class ApplicationRoles(BaseModel):
    """application_roles model."""
    application_id: str = Field(..., description="application_id")
    role_id: str = Field(..., description="role_id")
    description: str = Field(..., description="description")
    status: str = Field(..., description="status")
    created_at: float = Field(..., description="created_at")
    updated_at: float = Field(..., description="updated_at")

    class Config:
        """Model configuration."""
        from_attributes = True