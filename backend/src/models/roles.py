"""roles model."""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime

class Roles(BaseModel):
    """roles model."""
    role_id: str = Field(..., description="role_id")
    user_id: str = Field(..., description="user_id")
    application_id: str = Field(..., description="application_id")
    role_name: str = Field(..., description="role_name")
    role_type: str = Field(..., description="role_type")
    permissions: str = Field(..., description="permissions")
    created_at: float = Field(..., description="created_at")
    updated_at: float = Field(..., description="updated_at")
    active: str = Field(..., description="active")

    class Config:
        """Model configuration."""
        from_attributes = True