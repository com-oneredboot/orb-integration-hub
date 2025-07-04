"""
Generated Python models for PrivacyRequests
Generated at 2025-07-04T20:19:47.243319
"""

from typing import Optional, List
from pydantic import BaseModel, Field, validator
from datetime import datetime
from enum import Enum
from .PrivacyRequestTypeEnum import PrivacyRequestType
from .LegalBasisEnum import LegalBasis
from .PrivacyRequestStatusEnum import PrivacyRequestStatus

# CRUD Input Types
class PrivacyRequestsCreateInput(BaseModel):
    request_id: str = Field(..., description="Unique identifier for the privacy request (primary key)")
    request_type: PrivacyRequestType = Field(..., description="Type of privacy request (DATA_ACCESS, DATA_DELETION, DATA_PORTABILITY, etc.)")
    data_subject_email: str = Field(..., description="Email address of the data subject making the request")
    legal_basis: LegalBasis = Field(..., description="Legal basis for the privacy request (GDPR Article, CCPA Right, etc.)")
    organization_id: str = Field(..., description="Organization ID if request is scoped to specific organization")
    requester_id: str = Field(..., description="User ID of the person who submitted the request")
    status: PrivacyRequestStatus = Field(..., description="Current status of the privacy request")
    received_at: datetime = Field(..., description="When the privacy request was received")
    deadline: datetime = Field(..., description="Legal deadline for completing the request (30 days GDPR, 45 days CCPA)")
    completed_at: datetime = Field(..., description="When the privacy request was completed")
    estimated_completion: datetime = Field(..., description="Estimated completion time for the request")
    automated_processing: bool = Field(..., description="Whether the request is being processed automatically")
    access_report: str = Field(..., description="Data access report for GDPR Article 15 requests (JSON)")
    deletion_result: str = Field(..., description="Data deletion results with cryptographic proof (JSON)")
    portable_data: str = Field(..., description="Portable data export for GDPR Article 20 requests (JSON)")
    rejection_reason: str = Field(..., description="Reason for request rejection if applicable")
    error_details: str = Field(..., description="Error details if request processing failed")
    compliance_notes: str = Field(..., description="Additional compliance notes or special handling instructions")
    created_at: datetime = Field(..., description="When the privacy request record was created")
    updated_at: datetime = Field(..., description="When the privacy request was last updated")

class PrivacyRequestsUpdateInput(BaseModel):
    request_id: Optional[str] = Field(None, description="Unique identifier for the privacy request (primary key)")
    request_type: Optional[PrivacyRequestType] = Field(None, description="Type of privacy request (DATA_ACCESS, DATA_DELETION, DATA_PORTABILITY, etc.)")
    data_subject_email: Optional[str] = Field(None, description="Email address of the data subject making the request")
    legal_basis: Optional[LegalBasis] = Field(None, description="Legal basis for the privacy request (GDPR Article, CCPA Right, etc.)")
    organization_id: Optional[str] = Field(None, description="Organization ID if request is scoped to specific organization")
    requester_id: Optional[str] = Field(None, description="User ID of the person who submitted the request")
    status: Optional[PrivacyRequestStatus] = Field(None, description="Current status of the privacy request")
    received_at: Optional[datetime] = Field(None, description="When the privacy request was received")
    deadline: Optional[datetime] = Field(None, description="Legal deadline for completing the request (30 days GDPR, 45 days CCPA)")
    completed_at: Optional[datetime] = Field(None, description="When the privacy request was completed")
    estimated_completion: Optional[datetime] = Field(None, description="Estimated completion time for the request")
    automated_processing: Optional[bool] = Field(None, description="Whether the request is being processed automatically")
    access_report: Optional[str] = Field(None, description="Data access report for GDPR Article 15 requests (JSON)")
    deletion_result: Optional[str] = Field(None, description="Data deletion results with cryptographic proof (JSON)")
    portable_data: Optional[str] = Field(None, description="Portable data export for GDPR Article 20 requests (JSON)")
    rejection_reason: Optional[str] = Field(None, description="Reason for request rejection if applicable")
    error_details: Optional[str] = Field(None, description="Error details if request processing failed")
    compliance_notes: Optional[str] = Field(None, description="Additional compliance notes or special handling instructions")
    created_at: Optional[datetime] = Field(None, description="When the privacy request record was created")
    updated_at: Optional[datetime] = Field(None, description="When the privacy request was last updated")

class PrivacyRequestsDeleteInput(BaseModel):
    request_id: str

class PrivacyRequestsDisableInput(BaseModel):
    request_id: str
    disabled: bool

# QueryBy Inputs for PK, SK, Both, and all secondary indexes
class PrivacyRequestsQueryByRequestIdInput(BaseModel):
    request_id: str

class PrivacyRequestsQueryByRequestTypeInput(BaseModel):
    request_type: str

class PrivacyRequestsQueryByDataSubjectEmailInput(BaseModel):
    data_subject_email: str

class PrivacyRequestsQueryByOrganizationIdInput(BaseModel):
    organization_id: str

class PrivacyRequestsQueryByStatusInput(BaseModel):
    status: str

# Main Model (DTO)
# Properties: Field(...) = required (from schema), Optional[...] = optional (from schema)
class PrivacyRequests(BaseModel):
    """PrivacyRequests model."""
    request_id: str = Field(..., description="Unique identifier for the privacy request (primary key)")    request_type: str = Field(..., description="Type of privacy request (DATA_ACCESS, DATA_DELETION, DATA_PORTABILITY, etc.)")    data_subject_email: str = Field(..., description="Email address of the data subject making the request")    legal_basis: str = Field(..., description="Legal basis for the privacy request (GDPR Article, CCPA Right, etc.)")    organization_id: str = Field(None, description="Organization ID if request is scoped to specific organization")    requester_id: str = Field(..., description="User ID of the person who submitted the request")    status: str = Field(..., description="Current status of the privacy request")    received_at: datetime = Field(..., description="When the privacy request was received")    deadline: datetime = Field(..., description="Legal deadline for completing the request (30 days GDPR, 45 days CCPA)")    completed_at: datetime = Field(None, description="When the privacy request was completed")    estimated_completion: datetime = Field(None, description="Estimated completion time for the request")    automated_processing: bool = Field(..., description="Whether the request is being processed automatically")    access_report: str = Field(None, description="Data access report for GDPR Article 15 requests (JSON)")    deletion_result: str = Field(None, description="Data deletion results with cryptographic proof (JSON)")    portable_data: str = Field(None, description="Portable data export for GDPR Article 20 requests (JSON)")    rejection_reason: str = Field(None, description="Reason for request rejection if applicable")    error_details: str = Field(None, description="Error details if request processing failed")    compliance_notes: str = Field(None, description="Additional compliance notes or special handling instructions")    created_at: datetime = Field(..., description="When the privacy request record was created")    updated_at: datetime = Field(..., description="When the privacy request was last updated")
    @validator('receivedAt', pre=True)
    def parse_receivedAt(cls, value):
        """Parse timestamp to ISO format."""
        if value is None:
            return None
        if isinstance(value, datetime):
            return value
        try:
            return datetime.fromisoformat(value.replace('Z', '+00:00'))
        except (ValueError, TypeError):
            return None
    @validator('deadline', pre=True)
    def parse_deadline(cls, value):
        """Parse timestamp to ISO format."""
        if value is None:
            return None
        if isinstance(value, datetime):
            return value
        try:
            return datetime.fromisoformat(value.replace('Z', '+00:00'))
        except (ValueError, TypeError):
            return None
    @validator('completedAt', pre=True)
    def parse_completedAt(cls, value):
        """Parse timestamp to ISO format."""
        if value is None:
            return None
        if isinstance(value, datetime):
            return value
        try:
            return datetime.fromisoformat(value.replace('Z', '+00:00'))
        except (ValueError, TypeError):
            return None
    @validator('estimatedCompletion', pre=True)
    def parse_estimatedCompletion(cls, value):
        """Parse timestamp to ISO format."""
        if value is None:
            return None
        if isinstance(value, datetime):
            return value
        try:
            return datetime.fromisoformat(value.replace('Z', '+00:00'))
        except (ValueError, TypeError):
            return None
    @validator('automatedProcessing', pre=True, always=True)
    def parse_automatedProcessing_bool(cls, value):
        if value is None:
            return None
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            if value.lower() == 'true':
                return True
            if value.lower() == 'false':
                return False
        return bool(value)
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
    def from_dto(cls, dto: dict) -> "PrivacyRequests":
        return cls(
            request_id=dto.get('request_id'),
            request_type=PrivacyRequestType[dto.get('request_type', 'PrivacyRequestType.UNKNOWN')] if dto.get('request_type') else PrivacyRequestType.UNKNOWN,
            data_subject_email=dto.get('data_subject_email'),
            legal_basis=LegalBasis[dto.get('legal_basis', 'LegalBasis.UNKNOWN')] if dto.get('legal_basis') else LegalBasis.UNKNOWN,
            organization_id=dto.get('organization_id'),
            requester_id=dto.get('requester_id'),
            status=PrivacyRequestStatus[dto.get('status', 'PrivacyRequestStatus.UNKNOWN')] if dto.get('status') else PrivacyRequestStatus.UNKNOWN,
            received_at=dto.get('received_at'),
            deadline=dto.get('deadline'),
            completed_at=dto.get('completed_at'),
            estimated_completion=dto.get('estimated_completion'),
            automated_processing=dto.get('automated_processing'),
            access_report=dto.get('access_report'),
            deletion_result=dto.get('deletion_result'),
            portable_data=dto.get('portable_data'),
            rejection_reason=dto.get('rejection_reason'),
            error_details=dto.get('error_details'),
            compliance_notes=dto.get('compliance_notes'),
            created_at=dto.get('created_at'),
            updated_at=dto.get('updated_at'),
        )

    def to_dto(self) -> dict:
        return {
            'request_id': self.request_id,
            'request_type': self.request_type.value if self.request_type else 'PrivacyRequestType.UNKNOWN',
            'data_subject_email': self.data_subject_email,
            'legal_basis': self.legal_basis.value if self.legal_basis else 'LegalBasis.UNKNOWN',
            'organization_id': self.organization_id,
            'requester_id': self.requester_id,
            'status': self.status.value if self.status else 'PrivacyRequestStatus.UNKNOWN',
            'received_at': self.received_at,
            'deadline': self.deadline,
            'completed_at': self.completed_at,
            'estimated_completion': self.estimated_completion,
            'automated_processing': self.automated_processing,
            'access_report': self.access_report,
            'deletion_result': self.deletion_result,
            'portable_data': self.portable_data,
            'rejection_reason': self.rejection_reason,
            'error_details': self.error_details,
            'compliance_notes': self.compliance_notes,
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
class PrivacyRequestsResponse(BaseModel):
    StatusCode: int
    Message: Optional[str]
    Data: Optional[PrivacyRequests]

class PrivacyRequestsListResponse(BaseModel):
    StatusCode: int
    Message: Optional[str]
    Data: List[PrivacyRequests]

# CRUD Response Aliases
PrivacyRequestsCreateResponse = PrivacyRequestsResponse
PrivacyRequestsUpdateResponse = PrivacyRequestsResponse
PrivacyRequestsDeleteResponse = PrivacyRequestsResponse
PrivacyRequestsDisableResponse = PrivacyRequestsResponse