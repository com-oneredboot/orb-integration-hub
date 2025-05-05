"""Roles model."""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import List


class Roles(BaseModel):
    """Roles model."""
    role_id: str = Field(
        ..., description="Unique identifier for the role"
    )
    name: str = Field(
        ..., description="Human-readable name of the role"
    )
    description: str = Field(
        ..., description="Human-readable description of the role"
    )
    permissions: List[str] = Field(
        ..., description="List of permissions granted to this role"
    )
    created_at: datetime = Field(
        ..., description="When the role was created"
    )
    updated_at: datetime = Field(
        ..., description="When the role was last updated"
    )

    class Config:
        """Model configuration."""
        from_attributes = True