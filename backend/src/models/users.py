"""
users model.
"""
from typing import Optional
from pydantic import BaseModel

class users(BaseModel):
    """users model."""
    user_id: str    cognito_id: str    email: str    phone_number: str    phone_verified: str    first_name: str    last_name: str    groups: str    status: str    created_at: int    updated_at: int
    class Config:
        """Model configuration."""
        from_attributes = True