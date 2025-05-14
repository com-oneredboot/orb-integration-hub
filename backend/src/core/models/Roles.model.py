"""
Generated Python models for Roles
Generated at 
"""

from typing import Optional, List
from pydantic import BaseModel, Field, validator
from datetime import datetime
from enum import Enum






from .role_type import RoleType



from .role_status import RoleStatus









class Roles(BaseModel):
    """Roles model."""
    
    id: str = Field(..., description="Unique identifier for the role")
    
    user_id: str = Field(..., description="ID of the user this role belongs to")
    
    role_type: RoleType = Field(..., description="Type of the role")
    
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

class RolesCreateInput(BaseModel):
    
    id: str = Field(..., description="Unique identifier for the role")
    
    user_id: str = Field(..., description="ID of the user this role belongs to")
    
    role_type: RoleType = Field(..., description="Type of the role")
    
    status: RoleStatus = Field(..., description="Current status of the role")
    
    created_at: datetime = Field(..., description="When the role was created")
    
    updated_at: datetime = Field(..., description="When the role was last updated")
    

class RolesUpdateInput(BaseModel):
    
    id: Optional[str] = Field(None, description="Unique identifier for the role")
    
    user_id: Optional[str] = Field(None, description="ID of the user this role belongs to")
    
    role_type: Optional[RoleType] = Field(None, description="Type of the role")
    
    status: Optional[RoleStatus] = Field(None, description="Current status of the role")
    
    created_at: Optional[datetime] = Field(None, description="When the role was created")
    
    updated_at: Optional[datetime] = Field(None, description="When the role was last updated")
    

class RolesResponse(BaseModel):
    StatusCode: int = Field(..., description="HTTP status code")
    Message: str = Field(..., description="Response message")
    Data: Roles = Field(..., description="Response data")

class RolesListResponse(BaseModel):
    StatusCode: int = Field(..., description="HTTP status code")
    Message: str = Field(..., description="Response message")
    Data: List[Roles] = Field(..., description="Response data")