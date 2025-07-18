"""
Generated Python models for OrganizationUsers
Generated at 2025-07-18T15:59:26.568595+00:00
"""

from typing import Optional, List
from pydantic import BaseModel, Field, validator
from datetime import datetime  # Still needed for timestamp parsing
from enum import Enum
from .OrganizationUserRoleEnum import OrganizationUserRole
from .OrganizationUserStatusEnum import OrganizationUserStatus

# CRUD Input Types
class OrganizationUsersCreateInput(BaseModel):
    user_id: str = Field(..., description="ID of the user (foreign key to Users, partition key)")
    organization_id: str = Field(..., description="ID of the organization (foreign key to Organizations, sort key)")
    role: OrganizationUserRole = Field(..., description="Role of the user within the organization (OWNER is determined by Organizations.ownerId field)")
    status: OrganizationUserStatus = Field(..., description="Current status of the user's membership in the organization")
    invited_by: str = Field(..., description="ID of the user who sent the invitation (for audit trail)")
    created_at: int = Field(..., description="When the membership was created")
    updated_at: int = Field(..., description="When the membership was last updated")

class OrganizationUsersUpdateInput(BaseModel):
    user_id: Optional[str] = Field(None, description="ID of the user (foreign key to Users, partition key)")
    organization_id: Optional[str] = Field(None, description="ID of the organization (foreign key to Organizations, sort key)")
    role: Optional[OrganizationUserRole] = Field(None, description="Role of the user within the organization (OWNER is determined by Organizations.ownerId field)")
    status: Optional[OrganizationUserStatus] = Field(None, description="Current status of the user's membership in the organization")
    invited_by: Optional[str] = Field(None, description="ID of the user who sent the invitation (for audit trail)")
    created_at: Optional[int] = Field(None, description="When the membership was created")
    updated_at: Optional[int] = Field(None, description="When the membership was last updated")

class OrganizationUsersDeleteInput(BaseModel):
    user_id: str
    organization_id: str

class OrganizationUsersDisableInput(BaseModel):
    user_id: str
    organization_id: str
    disabled: bool

# QueryBy Inputs for PK, SK, Both, and all secondary indexes
class OrganizationUsersQueryByUserIdInput(BaseModel):
    user_id: str

class OrganizationUsersQueryByOrganizationIdInput(BaseModel):
    organization_id: str

class OrganizationUsersQueryByBothInput(BaseModel):
    user_id: str
    organization_id: str

class OrganizationUsersQueryByOrganizationIdInput(BaseModel):
    organization_id: str

class OrganizationUsersQueryByUserIdInput(BaseModel):
    user_id: str

# Main Model (DTO)
# Properties: Field(...) = required (from schema), Optional[...] = optional (from schema)
class OrganizationUsers(BaseModel):
    """OrganizationUsers model."""
    user_id: str = Field(..., description="ID of the user (foreign key to Users, partition key)")    organization_id: str = Field(..., description="ID of the organization (foreign key to Organizations, sort key)")    role: str = Field(..., description="Role of the user within the organization (OWNER is determined by Organizations.ownerId field)")    status: str = Field(..., description="Current status of the user's membership in the organization")    invited_by: str = Field(None, description="ID of the user who sent the invitation (for audit trail)")    created_at: int = Field(..., description="When the membership was created")    updated_at: int = Field(..., description="When the membership was last updated")
    @validator('created_at', pre=True)
    def parse_created_at(cls, value):
        """Parse timestamp to epoch seconds."""
        if value is None:
            return None
        if isinstance(value, int):
            return value
        if isinstance(value, float):
            return int(value)
        if isinstance(value, datetime):
            return int(value.timestamp())
        if isinstance(value, str):
            try:
                # Try to parse ISO format string
                dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
                return int(dt.timestamp())
            except (ValueError, TypeError):
                pass
        return value
    @validator('updated_at', pre=True)
    def parse_updated_at(cls, value):
        """Parse timestamp to epoch seconds."""
        if value is None:
            return None
        if isinstance(value, int):
            return value
        if isinstance(value, float):
            return int(value)
        if isinstance(value, datetime):
            return int(value.timestamp())
        if isinstance(value, str):
            try:
                # Try to parse ISO format string
                dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
                return int(dt.timestamp())
            except (ValueError, TypeError):
                pass
        return value

    @classmethod
    def from_dto(cls, dto: dict) -> "OrganizationUsers":
        return cls(
            user_id=dto.get('user_id'),
            organization_id=dto.get('organization_id'),
            role=OrganizationUserRole[dto.get('role', 'OrganizationUserRole.UNKNOWN')] if dto.get('role') else OrganizationUserRole.UNKNOWN,
            status=OrganizationUserStatus[dto.get('status', 'OrganizationUserStatus.UNKNOWN')] if dto.get('status') else OrganizationUserStatus.UNKNOWN,
            invited_by=dto.get('invited_by'),
            created_at=dto.get('created_at'),
            updated_at=dto.get('updated_at'),
        )

    def to_dto(self) -> dict:
        return {
            'user_id': self.user_id,
            'organization_id': self.organization_id,
            'role': self.role.value if self.role else 'OrganizationUserRole.UNKNOWN',
            'status': self.status.value if self.status else 'OrganizationUserStatus.UNKNOWN',
            'invited_by': self.invited_by,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
        }

    class Config:
        """Model configuration."""
        from_attributes = True

# ProperCase Response Types
class OrganizationUsersResponse(BaseModel):
    StatusCode: int
    Message: Optional[str]
    Data: Optional[OrganizationUsers]

class OrganizationUsersListResponse(BaseModel):
    StatusCode: int
    Message: Optional[str]
    Data: List[OrganizationUsers]

# CRUD Response Aliases
OrganizationUsersCreateResponse = OrganizationUsersResponse
OrganizationUsersUpdateResponse = OrganizationUsersResponse
OrganizationUsersDeleteResponse = OrganizationUsersResponse
OrganizationUsersDisableResponse = OrganizationUsersResponse