"""
applicationusers model.
"""
from typing import Optional
from pydantic import BaseModel

class applicationusers(BaseModel):
    """applicationusers model."""
    application_id: str    user_id: str    role_id: str    status: str    created_at: int    updated_at: int
    class Config:
        """Model configuration."""
        from_attributes = True