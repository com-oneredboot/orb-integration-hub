"""
Applications model.
"""
from typing import Optional
from pydantic import BaseModel

class Applications(BaseModel):
    """Applications model."""
    application_id: str    name: str    description: str    status: str    created_at: int    updated_at: int    user_id: str
    class Config:
        """Model configuration."""
        from_attributes = True