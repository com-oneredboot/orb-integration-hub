"""
Generated Python models for ApplicationUsers
Generated at 2025-07-04T18:44:31.395206
"""

from typing import Optional, List
from pydantic import BaseModel, Field, validator
from datetime import datetime
from enum import Enum
from .ApplicationUserStatusEnum import ApplicationUserStatus

# CRUD Input Types
class ApplicationUsersCreateInput(BaseModel):
    application_user_id: str = Field(..., description="Unique identifier for the application user membership (primary key)")
    user_id: str = Field(..., description="ID of the user (foreign key to Users)")
    application_id: str = Field(..., description="ID of the application (foreign key to Applications)")
    status: ApplicationUserStatus = Field(..., description="Current status of the user in the application")
    created_at: datetime = Field(..., description="When the user was added to the application")
    updated_at: datetime = Field(..., description="When the membership was last updated")

class ApplicationUsersUpdateInput(BaseModel):
    application_user_id: Optional[str] = Field(None, description="Unique identifier for the application user membership (primary key)")
    user_id: Optional[str] = Field(None, description="ID of the user (foreign key to Users)")
    application_id: Optional[str] = Field(None, description="ID of the application (foreign key to Applications)")
    status: Optional[ApplicationUserStatus] = Field(None, description="Current status of the user in the application")
    created_at: Optional[datetime] = Field(None, description="When the user was added to the application")
    updated_at: Optional[datetime] = Field(None, description="When the membership was last updated")

class ApplicationUsersDeleteInput(BaseModel):
    application_user_id: str

class ApplicationUsersDisableInput(BaseModel):
    application_user_id: str
    disabled: bool

# QueryBy Inputs for PK, SK, Both, and all secondary indexes
class ApplicationUsersQueryByApplicationUserIdInput(BaseModel):
    application_user_id: str

class ApplicationUsersQueryByUserIdInput(BaseModel):
    user_id: str

class ApplicationUsersQueryByApplicationIdInput(BaseModel):
    application_id: str

# Main Model (DTO)
# Properties: Field(...) = required (from schema), Optional[...] = optional (from schema)
class ApplicationUsers(BaseModel):
    """ApplicationUsers model."""
    application_user_id: str = Field(..., description="Unique identifier for the application user membership (primary key)")    user_id: str = Field(..., description="ID of the user (foreign key to Users)")    application_id: str = Field(..., description="ID of the application (foreign key to Applications)")    status: str = Field(..., description="Current status of the user in the application")    created_at: datetime = Field(..., description="When the user was added to the application")    updated_at: datetime = Field(..., description="When the membership was last updated")
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
    def from_dto(cls, dto: dict) -> "ApplicationUsers":
        return cls(
            application_user_id=dto.get('application_user_id'),
            user_id=dto.get('user_id'),
            application_id=dto.get('application_id'),
            status=ApplicationUserStatus[dto.get('status', 'ApplicationUserStatus.UNKNOWN')] if dto.get('status') else ApplicationUserStatus.UNKNOWN,
            created_at=dto.get('created_at'),
            updated_at=dto.get('updated_at'),
        )

    def to_dto(self) -> dict:
        return {
            'application_user_id': self.application_user_id,
            'user_id': self.user_id,
            'application_id': self.application_id,
            'status': self.status.value if self.status else 'ApplicationUserStatus.UNKNOWN',
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
class ApplicationUsersResponse(BaseModel):
    StatusCode: int
    Message: Optional[str]
    Data: Optional[ApplicationUsers]

class ApplicationUsersListResponse(BaseModel):
    StatusCode: int
    Message: Optional[str]
    Data: List[ApplicationUsers]

# CRUD Response Aliases
ApplicationUsersCreateResponse = ApplicationUsersResponse
ApplicationUsersUpdateResponse = ApplicationUsersResponse
ApplicationUsersDeleteResponse = ApplicationUsersResponse
ApplicationUsersDisableResponse = ApplicationUsersResponse