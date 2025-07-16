"""
Generated Python models for Organizations
Generated at 2025-07-16T17:14:15.492905
"""

from typing import Optional, List
from pydantic import BaseModel, Field, validator
from datetime import datetime
from enum import Enum
from .OrganizationStatusEnum import OrganizationStatus

# CRUD Input Types
class OrganizationsCreateInput(BaseModel):
    organization_id: str = Field(..., description="Unique identifier for the organization (primary key)")
    name: str = Field(..., description="Name of the organization (required field)")
    description: str = Field(..., description="Optional description of the organization")
    owner_id: str = Field(..., description="ID of the CUSTOMER user who owns the organization (foreign key to Users)")
    status: OrganizationStatus = Field(..., description="Current status of the organization")
    created_at: datetime = Field(..., description="When the organization was created (on payment completion)")
    updated_at: datetime = Field(..., description="When the organization was last updated")
    kms_key_id: str = Field(..., description="Organization-specific KMS key ID for encryption")
    kms_key_arn: str = Field(..., description="Organization-specific KMS key ARN")
    kms_alias: str = Field(..., description="Organization-specific KMS key alias name")

class OrganizationsUpdateInput(BaseModel):
    organization_id: Optional[str] = Field(None, description="Unique identifier for the organization (primary key)")
    name: Optional[str] = Field(None, description="Name of the organization (required field)")
    description: Optional[str] = Field(None, description="Optional description of the organization")
    owner_id: Optional[str] = Field(None, description="ID of the CUSTOMER user who owns the organization (foreign key to Users)")
    status: Optional[OrganizationStatus] = Field(None, description="Current status of the organization")
    created_at: Optional[datetime] = Field(None, description="When the organization was created (on payment completion)")
    updated_at: Optional[datetime] = Field(None, description="When the organization was last updated")
    kms_key_id: Optional[str] = Field(None, description="Organization-specific KMS key ID for encryption")
    kms_key_arn: Optional[str] = Field(None, description="Organization-specific KMS key ARN")
    kms_alias: Optional[str] = Field(None, description="Organization-specific KMS key alias name")

class OrganizationsDeleteInput(BaseModel):
    organization_id: str

class OrganizationsDisableInput(BaseModel):
    organization_id: str
    disabled: bool

# QueryBy Inputs for PK, SK, Both, and all secondary indexes
class OrganizationsQueryByOrganizationIdInput(BaseModel):
    organization_id: str

class OrganizationsQueryByOwnerIdInput(BaseModel):
    owner_id: str

class OrganizationsQueryByStatusInput(BaseModel):
    status: str

# Main Model (DTO)
# Properties: Field(...) = required (from schema), Optional[...] = optional (from schema)
class Organizations(BaseModel):
    """Organizations model."""
    organization_id: str = Field(..., description="Unique identifier for the organization (primary key)")    name: str = Field(..., description="Name of the organization (required field)")    description: str = Field(None, description="Optional description of the organization")    owner_id: str = Field(..., description="ID of the CUSTOMER user who owns the organization (foreign key to Users)")    status: str = Field(..., description="Current status of the organization")    created_at: datetime = Field(..., description="When the organization was created (on payment completion)")    updated_at: datetime = Field(..., description="When the organization was last updated")    kms_key_id: str = Field(None, description="Organization-specific KMS key ID for encryption")    kms_key_arn: str = Field(None, description="Organization-specific KMS key ARN")    kms_alias: str = Field(None, description="Organization-specific KMS key alias name")
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
    def from_dto(cls, dto: dict) -> "Organizations":
        return cls(
            organization_id=dto.get('organization_id'),
            name=dto.get('name'),
            description=dto.get('description'),
            owner_id=dto.get('owner_id'),
            status=OrganizationStatus[dto.get('status', 'OrganizationStatus.UNKNOWN')] if dto.get('status') else OrganizationStatus.UNKNOWN,
            created_at=dto.get('created_at'),
            updated_at=dto.get('updated_at'),
            kms_key_id=dto.get('kms_key_id'),
            kms_key_arn=dto.get('kms_key_arn'),
            kms_alias=dto.get('kms_alias'),
        )

    def to_dto(self) -> dict:
        return {
            'organization_id': self.organization_id,
            'name': self.name,
            'description': self.description,
            'owner_id': self.owner_id,
            'status': self.status.value if self.status else 'OrganizationStatus.UNKNOWN',
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'kms_key_id': self.kms_key_id,
            'kms_key_arn': self.kms_key_arn,
            'kms_alias': self.kms_alias,
        }

    class Config:
        """Model configuration."""
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# ProperCase Response Types
class OrganizationsResponse(BaseModel):
    StatusCode: int
    Message: Optional[str]
    Data: Optional[Organizations]

class OrganizationsListResponse(BaseModel):
    StatusCode: int
    Message: Optional[str]
    Data: List[Organizations]

# CRUD Response Aliases
OrganizationsCreateResponse = OrganizationsResponse
OrganizationsUpdateResponse = OrganizationsResponse
OrganizationsDeleteResponse = OrganizationsResponse
OrganizationsDisableResponse = OrganizationsResponse