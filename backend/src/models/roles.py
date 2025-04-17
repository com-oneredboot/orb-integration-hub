"""Roles model."""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from .role_type import RoleType
from .role_status import RoleStatus


class Roles(BaseModel):
    """Roles model."""
    role_id: str = Field(..., description="Unique identifier for the role")
    user_id: str = Field(..., description="ID of the user this role belongs to")
    application_id: str = Field(..., description="ID of the application this role belongs to")
    role_name: str = Field(..., description="Name of the role")
    role_type: RoleType = Field(..., description="Type of the role")
    permissions: List[str] = Field(..., description="List of permissions granted to this role")
    status: RoleStatus = Field(..., description="Current status of the role")
    created_at: datetime = Field(..., description="When the role was created")
    updated_at: datetime = Field(..., description="When the role was last updated")

    class Config:
        """Model configuration."""
        from_attributes = True