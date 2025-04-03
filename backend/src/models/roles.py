"""
Roles model.
"""
from typing import Optional
from pydantic import BaseModel

class Roles(BaseModel):
    """Roles model."""
    role_id: str    user_id: str    application_id: str    role_name: str    role_type: str    permissions: str    created_at: int    updated_at: int    active: str
    class Config:
        """Model configuration."""
        from_attributes = True