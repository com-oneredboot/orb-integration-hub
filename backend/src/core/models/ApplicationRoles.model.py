"""
Generated Python models for ApplicationRoles
Generated at 
"""

from typing import Optional, List
from pydantic import BaseModel, Field, validator
from datetime import datetime
from enum import Enum










from .role_type import RoleType





from .role_status import RoleStatus









class ApplicationRoles(BaseModel):
    """ApplicationRoles model."""
    
    role_id: str = Field(..., description="Unique identifier for the role")
    
    user_id: str = Field(..., description="ID of the user this role belongs to")
    
    application_id: str = Field(..., description="ID of the application this role belongs to")
    
    role_name: str = Field(..., description="Name of the role")
    
    role_type: RoleType = Field(..., description="Type of the role")
    
    permissions: List[str] = Field(..., description="List of permissions granted to this role")
    
    status: RoleStatus = Field(..., description="Current status of the role")
    
    created_at: datetime = Field(..., description="When the role was created")
    
    updated_at: datetime = Field(..., description="When the role was last updated")
    

    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
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

class ApplicationRolesCreateInput(BaseModel):
    
    role_id: str = Field(..., description="Unique identifier for the role")
    
    user_id: str = Field(..., description="ID of the user this role belongs to")
    
    application_id: str = Field(..., description="ID of the application this role belongs to")
    
    role_name: str = Field(..., description="Name of the role")
    
    role_type: RoleType = Field(..., description="Type of the role")
    
    permissions: List[str] = Field(..., description="List of permissions granted to this role")
    
    status: RoleStatus = Field(..., description="Current status of the role")
    
    created_at: datetime = Field(..., description="When the role was created")
    
    updated_at: datetime = Field(..., description="When the role was last updated")
    

class ApplicationRolesUpdateInput(BaseModel):
    
    role_id: Optional[str] = Field(None, description="Unique identifier for the role")
    
    user_id: Optional[str] = Field(None, description="ID of the user this role belongs to")
    
    application_id: Optional[str] = Field(None, description="ID of the application this role belongs to")
    
    role_name: Optional[str] = Field(None, description="Name of the role")
    
    role_type: Optional[RoleType] = Field(None, description="Type of the role")
    
    permissions: Optional[List[str]] = Field(None, description="List of permissions granted to this role")
    
    status: Optional[RoleStatus] = Field(None, description="Current status of the role")
    
    created_at: Optional[datetime] = Field(None, description="When the role was created")
    
    updated_at: Optional[datetime] = Field(None, description="When the role was last updated")
    

class ApplicationRolesResponse(BaseModel):
    StatusCode: int = Field(..., description="HTTP status code")
    Message: str = Field(..., description="Response message")
    Data: ApplicationRoles = Field(..., description="Response data")

class ApplicationRolesListResponse(BaseModel):
    StatusCode: int = Field(..., description="HTTP status code")
    Message: str = Field(..., description="Response message")
    Data: List[ApplicationRoles] = Field(..., description="Response data")