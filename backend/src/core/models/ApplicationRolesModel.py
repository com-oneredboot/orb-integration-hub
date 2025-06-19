"""
Generated Python models for ApplicationRoles
Generated at 2025-06-19T20:00:04.271314
"""

from typing import Optional, List
from pydantic import BaseModel, Field, validator
from datetime import datetime
from enum import Enum
from .RoleTypeEnum import RoleType
from .RoleStatusEnum import RoleStatus

# CRUD Input Types
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

class ApplicationRolesDeleteInput(BaseModel):
    application_role_id: str

class ApplicationRolesDisableInput(BaseModel):
    application_role_id: str
    disabled: bool

# QueryBy Inputs for PK, SK, Both, and all secondary indexes
class ApplicationRolesQueryByApplicationRoleIdInput(BaseModel):
    application_role_id: str

class ApplicationRolesQueryByUserIdInput(BaseModel):
    user_id: str

class ApplicationRolesQueryByApplicationIdInput(BaseModel):
    application_id: str

class ApplicationRolesQueryByRoleIdInput(BaseModel):
    role_id: str

# Main Model (DTO)
# Properties: Field(...) = required (from schema), Optional[...] = optional (from schema)
class ApplicationRoles(BaseModel):
    """ApplicationRoles model."""
    application_role_id: str = Field(..., description="Unique identifier for the application role assignment (primary key)")    user_id: str = Field(..., description="ID of the user this role assignment belongs to (foreign key to Users)")    application_id: str = Field(..., description="ID of the application this role assignment belongs to (foreign key to Applications)")    role_id: str = Field(..., description="ID of the role (foreign key to Roles)")    role_name: str = Field(..., description="Name of the role")    role_type: str = Field(..., description="Type of the role")    permissions: List[str] = Field(..., description="List of permissions granted to this role")    status: str = Field(..., description="Current status of the role assignment")    created_at: datetime = Field(..., description="When the role assignment was created")    updated_at: datetime = Field(..., description="When the role assignment was last updated")
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

    @classmethod
    def from_dto(cls, dto: dict) -> "ApplicationRoles":
        return cls(
            application_role_id=dto.get('application_role_id'),
            user_id=dto.get('user_id'),
            application_id=dto.get('application_id'),
            role_id=dto.get('role_id'),
            role_name=dto.get('role_name'),
            role_type=RoleType[dto.get('role_type', 'RoleType.UNKNOWN')] if dto.get('role_type') else RoleType.UNKNOWN,
            permissions=dto.get('permissions'),
            status=RoleStatus[dto.get('status', 'RoleStatus.UNKNOWN')] if dto.get('status') else RoleStatus.UNKNOWN,
            created_at=dto.get('created_at'),
            updated_at=dto.get('updated_at'),
        )

    def to_dto(self) -> dict:
        return {
            'application_role_id': self.application_role_id,
            'user_id': self.user_id,
            'application_id': self.application_id,
            'role_id': self.role_id,
            'role_name': self.role_name,
            'role_type': self.role_type.value if self.role_type else 'RoleType.UNKNOWN',
            'permissions': self.permissions,
            'status': self.status.value if self.status else 'RoleStatus.UNKNOWN',
            'created_at': self.created_at,
            'updated_at': self.updated_at,
        }

    class Config:
        """Model configuration."""
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# ProperCase Response Types
class ApplicationRolesResponse(BaseModel):
    StatusCode: int
    Message: Optional[str]
    Data: Optional[ApplicationRoles]

class ApplicationRolesListResponse(BaseModel):
    StatusCode: int
    Message: Optional[str]
    Data: List[ApplicationRoles]

# CRUD Response Aliases
ApplicationRolesCreateResponse = ApplicationRolesResponse
ApplicationRolesUpdateResponse = ApplicationRolesResponse
ApplicationRolesDeleteResponse = ApplicationRolesResponse
ApplicationRolesDisableResponse = ApplicationRolesResponse