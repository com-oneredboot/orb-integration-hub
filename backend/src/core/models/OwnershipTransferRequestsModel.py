"""
Generated Python models for OwnershipTransferRequests
Generated at 2025-07-16T22:31:57.694791+00:00
"""

from typing import Optional, List
from pydantic import BaseModel, Field, validator
from datetime import datetime  # Still needed for timestamp parsing
from enum import Enum
from .OwnershipTransferStatusEnum import OwnershipTransferStatus

# CRUD Input Types
class OwnershipTransferRequestsCreateInput(BaseModel):
    transfer_id: str = Field(..., description="Unique transfer request identifier")
    current_owner_id: str = Field(..., description="Current organization owner user ID")
    new_owner_id: str = Field(..., description="Prospective new owner user ID")
    organization_id: str = Field(..., description="Organization being transferred")
    status: OwnershipTransferStatus = Field(..., description="Current transfer status")
    required_billing_plan: str = Field(..., description="Billing plan required for organization")
    monthly_cost: str = Field(..., description="Monthly cost in cents")
    payment_validation_token: str = Field(..., description="Encrypted single-use token for payment validation")
    created_at: str = Field(..., description="Transfer request creation timestamp")
    expires_at: str = Field(..., description="Transfer request expiration timestamp (7 days)")
    updated_at: str = Field(..., description="Last update timestamp")
    completed_at: str = Field(..., description="Transfer completion timestamp")
    failure_reason: str = Field(..., description="Reason for transfer failure or cancellation")
    billing_transition_details: str = Field(..., description="Details of billing transition during transfer")
    fraud_assessment: str = Field(..., description="Fraud detection assessment results")
    notifications_sent: List[str] = Field(..., description="Track notifications sent for this transfer")

class OwnershipTransferRequestsUpdateInput(BaseModel):
    transfer_id: Optional[str] = Field(None, description="Unique transfer request identifier")
    current_owner_id: Optional[str] = Field(None, description="Current organization owner user ID")
    new_owner_id: Optional[str] = Field(None, description="Prospective new owner user ID")
    organization_id: Optional[str] = Field(None, description="Organization being transferred")
    status: Optional[OwnershipTransferStatus] = Field(None, description="Current transfer status")
    required_billing_plan: Optional[str] = Field(None, description="Billing plan required for organization")
    monthly_cost: Optional[str] = Field(None, description="Monthly cost in cents")
    payment_validation_token: Optional[str] = Field(None, description="Encrypted single-use token for payment validation")
    created_at: Optional[str] = Field(None, description="Transfer request creation timestamp")
    expires_at: Optional[str] = Field(None, description="Transfer request expiration timestamp (7 days)")
    updated_at: Optional[str] = Field(None, description="Last update timestamp")
    completed_at: Optional[str] = Field(None, description="Transfer completion timestamp")
    failure_reason: Optional[str] = Field(None, description="Reason for transfer failure or cancellation")
    billing_transition_details: Optional[str] = Field(None, description="Details of billing transition during transfer")
    fraud_assessment: Optional[str] = Field(None, description="Fraud detection assessment results")
    notifications_sent: Optional[List[str]] = Field(None, description="Track notifications sent for this transfer")

class OwnershipTransferRequestsDeleteInput(BaseModel):
    transfer_id: str

class OwnershipTransferRequestsDisableInput(BaseModel):
    transfer_id: str
    disabled: bool

# QueryBy Inputs for PK, SK, Both, and all secondary indexes
class OwnershipTransferRequestsQueryByTransferIdInput(BaseModel):
    transfer_id: str

class OwnershipTransferRequestsQueryByCurrentOwnerIdInput(BaseModel):
    current_owner_id: str

class OwnershipTransferRequestsQueryByNewOwnerIdInput(BaseModel):
    new_owner_id: str

class OwnershipTransferRequestsQueryByStatusInput(BaseModel):
    status: str

class OwnershipTransferRequestsQueryByStatusInput(BaseModel):
    status: str

# Main Model (DTO)
# Properties: Field(...) = required (from schema), Optional[...] = optional (from schema)
class OwnershipTransferRequests(BaseModel):
    """OwnershipTransferRequests model."""
    transfer_id: str = Field(..., description="Unique transfer request identifier")    current_owner_id: str = Field(..., description="Current organization owner user ID")    new_owner_id: str = Field(..., description="Prospective new owner user ID")    organization_id: str = Field(..., description="Organization being transferred")    status: str = Field(..., description="Current transfer status")    required_billing_plan: str = Field(..., description="Billing plan required for organization")    monthly_cost: float = Field(..., description="Monthly cost in cents")    payment_validation_token: str = Field(..., description="Encrypted single-use token for payment validation")    created_at: str = Field(..., description="Transfer request creation timestamp")    expires_at: str = Field(..., description="Transfer request expiration timestamp (7 days)")    updated_at: str = Field(..., description="Last update timestamp")    completed_at: str = Field(None, description="Transfer completion timestamp")    failure_reason: str = Field(None, description="Reason for transfer failure or cancellation")    billing_transition_details: str = Field(None, description="Details of billing transition during transfer")    fraud_assessment: str = Field(None, description="Fraud detection assessment results")    notifications_sent: List[str] = Field(None, description="Track notifications sent for this transfer")

    @classmethod
    def from_dto(cls, dto: dict) -> "OwnershipTransferRequests":
        return cls(
            transfer_id=dto.get('transfer_id'),
            current_owner_id=dto.get('current_owner_id'),
            new_owner_id=dto.get('new_owner_id'),
            organization_id=dto.get('organization_id'),
            status=OwnershipTransferStatus[dto.get('status', 'OwnershipTransferStatus.UNKNOWN')] if dto.get('status') else OwnershipTransferStatus.UNKNOWN,
            required_billing_plan=dto.get('required_billing_plan'),
            monthly_cost=dto.get('monthly_cost'),
            payment_validation_token=dto.get('payment_validation_token'),
            created_at=dto.get('created_at'),
            expires_at=dto.get('expires_at'),
            updated_at=dto.get('updated_at'),
            completed_at=dto.get('completed_at'),
            failure_reason=dto.get('failure_reason'),
            billing_transition_details=dto.get('billing_transition_details'),
            fraud_assessment=dto.get('fraud_assessment'),
            notifications_sent=dto.get('notifications_sent'),
        )

    def to_dto(self) -> dict:
        return {
            'transfer_id': self.transfer_id,
            'current_owner_id': self.current_owner_id,
            'new_owner_id': self.new_owner_id,
            'organization_id': self.organization_id,
            'status': self.status.value if self.status else 'OwnershipTransferStatus.UNKNOWN',
            'required_billing_plan': self.required_billing_plan,
            'monthly_cost': self.monthly_cost,
            'payment_validation_token': self.payment_validation_token,
            'created_at': self.created_at,
            'expires_at': self.expires_at,
            'updated_at': self.updated_at,
            'completed_at': self.completed_at,
            'failure_reason': self.failure_reason,
            'billing_transition_details': self.billing_transition_details,
            'fraud_assessment': self.fraud_assessment,
            'notifications_sent': self.notifications_sent,
        }

    class Config:
        """Model configuration."""
        from_attributes = True

# ProperCase Response Types
class OwnershipTransferRequestsResponse(BaseModel):
    StatusCode: int
    Message: Optional[str]
    Data: Optional[OwnershipTransferRequests]

class OwnershipTransferRequestsListResponse(BaseModel):
    StatusCode: int
    Message: Optional[str]
    Data: List[OwnershipTransferRequests]

# CRUD Response Aliases
OwnershipTransferRequestsCreateResponse = OwnershipTransferRequestsResponse
OwnershipTransferRequestsUpdateResponse = OwnershipTransferRequestsResponse
OwnershipTransferRequestsDeleteResponse = OwnershipTransferRequestsResponse
OwnershipTransferRequestsDisableResponse = OwnershipTransferRequestsResponse