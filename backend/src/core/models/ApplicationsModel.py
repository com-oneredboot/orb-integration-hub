"""
Generated Python models for Applications
Generated at 2025-06-20T21:14:43.976946
"""

from typing import Optional, List
from pydantic import BaseModel, Field, validator
from datetime import datetime
from enum import Enum
from .ApplicationStatusEnum import ApplicationStatus

# CRUD Input Types
class ApplicationsCreateInput(BaseModel):
    application_id: str = Field(..., description="Unique identifier for the application (primary key)")
    name: str = Field(..., description="Name of the application")
    owner_id: str = Field(..., description="ID of the user who owns the application (foreign key to Users)")
    status: ApplicationStatus = Field(..., description="Current status of the application")
    created_at: datetime = Field(..., description="When the application was created")
    updated_at: datetime = Field(..., description="When the application was last updated")

class ApplicationsUpdateInput(BaseModel):
    application_id: Optional[str] = Field(None, description="Unique identifier for the application (primary key)")
    name: Optional[str] = Field(None, description="Name of the application")
    owner_id: Optional[str] = Field(None, description="ID of the user who owns the application (foreign key to Users)")
    status: Optional[ApplicationStatus] = Field(None, description="Current status of the application")
    created_at: Optional[datetime] = Field(None, description="When the application was created")
    updated_at: Optional[datetime] = Field(None, description="When the application was last updated")

class ApplicationsDeleteInput(BaseModel):
    application_id: str

class ApplicationsDisableInput(BaseModel):
    application_id: str
    disabled: bool

# QueryBy Inputs for PK, SK, Both, and all secondary indexes
class ApplicationsQueryByApplicationIdInput(BaseModel):
    application_id: str

# Main Model (DTO)
# Properties: Field(...) = required (from schema), Optional[...] = optional (from schema)
class Applications(BaseModel):
    """Applications model."""
    application_id: str = Field(..., description="Unique identifier for the application (primary key)")    name: str = Field(..., description="Name of the application")    owner_id: str = Field(..., description="ID of the user who owns the application (foreign key to Users)")    status: str = Field(..., description="Current status of the application")    created_at: datetime = Field(..., description="When the application was created")    updated_at: datetime = Field(..., description="When the application was last updated")
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
    def from_dto(cls, dto: dict) -> "Applications":
        return cls(
            application_id=dto.get('application_id'),
            name=dto.get('name'),
            owner_id=dto.get('owner_id'),
            status=ApplicationStatus[dto.get('status', 'ApplicationStatus.UNKNOWN')] if dto.get('status') else ApplicationStatus.UNKNOWN,
            created_at=dto.get('created_at'),
            updated_at=dto.get('updated_at'),
        )

    def to_dto(self) -> dict:
        return {
            'application_id': self.application_id,
            'name': self.name,
            'owner_id': self.owner_id,
            'status': self.status.value if self.status else 'ApplicationStatus.UNKNOWN',
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
class ApplicationsResponse(BaseModel):
    StatusCode: int
    Message: Optional[str]
    Data: Optional[Applications]

class ApplicationsListResponse(BaseModel):
    StatusCode: int
    Message: Optional[str]
    Data: List[Applications]

# CRUD Response Aliases
ApplicationsCreateResponse = ApplicationsResponse
ApplicationsUpdateResponse = ApplicationsResponse
ApplicationsDeleteResponse = ApplicationsResponse
ApplicationsDisableResponse = ApplicationsResponse