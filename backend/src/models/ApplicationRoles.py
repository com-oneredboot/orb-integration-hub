"""
ApplicationRoles model.
"""
from typing import Optional
from pydantic import BaseModel

class ApplicationRoles(BaseModel):
    """ApplicationRoles model."""
    application_id: str    role_id: str    description: str    status: str    created_at: int    updated_at: int
    class Config:
        """Model configuration."""
        from_attributes = True