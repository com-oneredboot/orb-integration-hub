"""Applicationroles model."""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class Applicationroles(BaseModel):
    """Applicationroles model."""
    application_id: str = Field(..., description="ID of the application")
    role_id: str = Field(..., description="ID of the role")
    description: Optional[str] = Field(None, description="Human-readable description of the role")
    status: ApplicationRoleStatus = Field(..., description="Status of the role in the application")
    created_at: datetime = Field(..., description="When the role was added to the application")
    updated_at: datetime = Field(..., description="When the role's application status was last updated")

    class Config:
        """Model configuration."""
        from_attributes = True