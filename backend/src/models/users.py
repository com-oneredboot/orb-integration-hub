"""users model."""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime

class Users(BaseModel):
    """users model."""
    user_id: str = Field(..., description="user_id")
    cognito_id: str = Field(..., description="cognito_id")
    email: str = Field(..., description="email")
    phone_number: str = Field(..., description="phone_number")
    phone_verified: str = Field(..., description="phone_verified")
    first_name: str = Field(..., description="first_name")
    last_name: str = Field(..., description="last_name")
    groups: str = Field(..., description="groups")
    status: str = Field(..., description="status")
    created_at: float = Field(..., description="created_at")
    updated_at: float = Field(..., description="updated_at")

    class Config:
        """Model configuration."""
        from_attributes = True