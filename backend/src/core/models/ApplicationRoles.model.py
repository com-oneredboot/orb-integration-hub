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
    
    application_role_id: str = Field(..., description="Unique identifier for the application role assignment (primary key)")
    
    user_id: str = Field(..., description="ID of the user this role assignment belongs to (foreign key to Users)")
    
    application_id: str = Field(..., description="ID of the application this role assignment belongs to (foreign key to Applications)")
    
    role_id: str = Field(..., description="ID of the role (foreign key to Roles)")
    
    role_name: str = Field(..., description="Name of the role")
    
    role_type: RoleType = Field(..., description="Type of the role")
    
    permissions: List[str] = Field(..., description="List of permissions granted to this role")
    
    status: RoleStatus = Field(..., description="Current status of the role assignment")
    
    created_at: datetime = Field(..., description="When the role assignment was created")
    
    updated_at: datetime = Field(..., description="When the role assignment was last updated")
    

    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
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
    
    application_role_id: str = Field(..., description="Unique identifier for the application role assignment (primary key)")
    
    user_id: str = Field(..., description="ID of the user this role assignment belongs to (foreign key to Users)")
    
    application_id: str = Field(..., description="ID of the application this role assignment belongs to (foreign key to Applications)")
    
    role_id: str = Field(..., description="ID of the role (foreign key to Roles)")
    
    role_name: str = Field(..., description="Name of the role")
    
    role_type: RoleType = Field(..., description="Type of the role")
    
    permissions: List[str] = Field(..., description="List of permissions granted to this role")
    
    status: RoleStatus = Field(..., description="Current status of the role assignment")
    
    created_at: datetime = Field(..., description="When the role assignment was created")
    
    updated_at: datetime = Field(..., description="When the role assignment was last updated")
    

class ApplicationRolesUpdateInput(BaseModel):
    
    application_role_id: Optional[str] = Field(None, description="Unique identifier for the application role assignment (primary key)")
    
    user_id: Optional[str] = Field(None, description="ID of the user this role assignment belongs to (foreign key to Users)")
    
    application_id: Optional[str] = Field(None, description="ID of the application this role assignment belongs to (foreign key to Applications)")
    
    role_id: Optional[str] = Field(None, description="ID of the role (foreign key to Roles)")
    
    role_name: Optional[str] = Field(None, description="Name of the role")
    
    role_type: Optional[RoleType] = Field(None, description="Type of the role")
    
    permissions: Optional[List[str]] = Field(None, description="List of permissions granted to this role")
    
    status: Optional[RoleStatus] = Field(None, description="Current status of the role assignment")
    
    created_at: Optional[datetime] = Field(None, description="When the role assignment was created")
    
    updated_at: Optional[datetime] = Field(None, description="When the role assignment was last updated")
    

class ApplicationRolesResponse(BaseModel):
    StatusCode: int = Field(..., description="HTTP status code")
    Message: str = Field(..., description="Response message")
    Data: ApplicationRoles = Field(..., description="Response data")

class ApplicationRolesListResponse(BaseModel):
    StatusCode: int = Field(..., description="HTTP status code")
    Message: str = Field(..., description="Response message")
    Data: List[ApplicationRoles] = Field(..., description="Response data")