"""application_users model."""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime

class ApplicationUsers(BaseModel):
    """application_users model."""
    application_id: str = Field(..., description="application_id")
    user_id: str = Field(..., description="user_id")
    role_id: str = Field(..., description="role_id")
    status: str = Field(..., description="status")
    created_at: str = Field(..., description="created_at")
    updated_at: str = Field(..., description="updated_at")

    class Config:
        """Model configuration."""
        from_attributes = True