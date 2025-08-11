"""
Generated Python models for Roles
Generated at 2025-08-10T00:38:11.917982+00:00
"""

from typing import Optional, List
from pydantic import BaseModel, Field, validator
from datetime import datetime  # Still needed for timestamp parsing
from enum import Enum








from .RoleTypeEnum import RoleType




from .RoleStatusEnum import RoleStatus










# CRUD Input Types
class RolesCreateInput(BaseModel):

    role_id: str = Field(..., description="Unique identifier for the role (primary key)")

    user_id: str = Field(..., description="(Deprecated) ID of the user this role belongs to. Use ApplicationRoles for user-role mapping.")

    role_type: RoleType = Field(..., description="Type of the role")

    status: RoleStatus = Field(..., description="Current status of the role")

    created_at: int = Field(..., description="When the role was created")

    updated_at: int = Field(..., description="When the role was last updated")


class RolesUpdateInput(BaseModel):

    role_id: Optional[str] = Field(None, description="Unique identifier for the role (primary key)")

    user_id: Optional[str] = Field(None, description="(Deprecated) ID of the user this role belongs to. Use ApplicationRoles for user-role mapping.")

    role_type: Optional[RoleType] = Field(None, description="Type of the role")

    status: Optional[RoleStatus] = Field(None, description="Current status of the role")

    created_at: Optional[int] = Field(None, description="When the role was created")

    updated_at: Optional[int] = Field(None, description="When the role was last updated")


class RolesDeleteInput(BaseModel):
    role_id: str


class RolesDisableInput(BaseModel):
    role_id: str
    disabled: bool

# QueryBy Inputs for PK, SK, Both, and all secondary indexes
class RolesQueryByRoleIdInput(BaseModel):
    role_id: str



class RolesQueryByUserIdInput(BaseModel):
    user_id: str


# Main Model (DTO)
# Properties: Field(...) = required (from schema), Optional[...] = optional (from schema)
class Roles(BaseModel):
    """Roles model."""

    role_id: str = Field(..., description="Unique identifier for the role (primary key)")

    user_id: str = Field(None, description="(Deprecated) ID of the user this role belongs to. Use ApplicationRoles for user-role mapping.")

    role_type: str = Field(..., description="Type of the role")

    status: str = Field(..., description="Current status of the role")

    created_at: int = Field(..., description="When the role was created")

    updated_at: int = Field(..., description="When the role was last updated")
















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
    def from_dto(cls, dto: dict) -> "Roles":
        return cls(

            role_id=dto.get('role_id'),

            user_id=dto.get('user_id'),

            role_type=RoleType[dto.get('role_type', 'RoleType.UNKNOWN')] if dto.get('role_type') else RoleType.UNKNOWN,

            status=RoleStatus[dto.get('status', 'RoleStatus.UNKNOWN')] if dto.get('status') else RoleStatus.UNKNOWN,

            created_at=dto.get('created_at'),

            updated_at=dto.get('updated_at'),

        )

    def to_dto(self) -> dict:
        return {

            'role_id': self.role_id,

            'user_id': self.user_id,

            'role_type': self.role_type.value if self.role_type else 'RoleType.UNKNOWN',

            'status': self.status.value if self.status else 'RoleStatus.UNKNOWN',

            'created_at': self.created_at,

            'updated_at': self.updated_at,

        }

    class Config:
        """Model configuration."""
        from_attributes = True

# ProperCase Response Types
class RolesResponse(BaseModel):
    StatusCode: int
    Message: Optional[str]
    Data: Optional[Roles]

class RolesListResponse(BaseModel):
    StatusCode: int
    Message: Optional[str]
    Data: List[Roles]

# CRUD Response Aliases
RolesCreateResponse = RolesResponse
RolesUpdateResponse = RolesResponse
RolesDeleteResponse = RolesResponse
RolesDisableResponse = RolesResponse