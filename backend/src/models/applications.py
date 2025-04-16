"""
applications model.
"""
from typing import Optional
from pydantic import BaseModel

class applications(BaseModel):
    """applications model."""
    application_id: str    name: str    description: str    status: str    created_at: int    updated_at: int    user_id: str
    class Config:
        """Model configuration."""
        from_attributes = True