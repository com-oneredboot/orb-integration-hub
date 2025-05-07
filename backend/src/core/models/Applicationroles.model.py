"""ApplicationRoles model."""
from typing import Optional, List
from pydantic import BaseModel, Field, validator
from datetime import datetime
from .role_type import RoleType
from .role_status import RoleStatus


class ApplicationRoles(BaseModel):
    """ApplicationRoles model."""
    roleId: str = Field(..., description="Unique identifier for the role")
    userId: str = Field(..., description="ID of the user this role belongs to")
    applicationId: str = Field(..., description="ID of the application this role belongs to")
    roleName: str = Field(..., description="Name of the role")
    roleType: RoleType = Field(..., description="Type of the role")
    permissions: List[str] = Field(..., description="List of permissions granted to this role")
    status: RoleStatus = Field(..., description="Current status of the role")
    createdAt: datetime = Field(..., description="When the role was created")
    updatedAt: datetime = Field(..., description="When the role was last updated")

    @validator('createdAt', pre=True)
    def parse_createdAt(cls, value):
        """Parse timestamp to ISO format."""
        if value is None:
            return None
        if isinstance(value, datetime):
            return value
        try:
            return datetime.fromisoformat(value.replace('Z', '+00:00'))
        except (ValueError, TypeError):
            return None
    @validator('updatedAt', pre=True)
    def parse_updatedAt(cls, value):
        """Parse timestamp to ISO format."""
        if value is None:
            return None
        if isinstance(value, datetime):
            return value
        try:
            return datetime.fromisoformat(value.replace('Z', '+00:00'))
        except (ValueError, TypeError):
            return None

    class Config:
        """Model configuration."""
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }