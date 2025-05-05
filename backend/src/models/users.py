"""Users model."""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import List


class Users(BaseModel):
    """Users model."""
    user_id: str = Field(
        ..., description="Unique identifier for the user"
    )
    email: str = Field(
        ..., description="User's email address"
    )
    first_name: str = Field(
        ..., description="User's first name"
    )
    last_name: str = Field(
        ..., description="User's last name"
    )
    created_at: datetime = Field(
        ..., description="When the user was created"
    )
    updated_at: datetime = Field(
        ..., description="When the user was last updated"
    )

    class Config:
        """Model configuration."""
        from_attributes = True