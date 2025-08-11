"""
Generated Python models for Invitations
Generated at 2025-08-10T00:38:11.860853+00:00
"""

from typing import Optional, List
from pydantic import BaseModel, Field, validator
from datetime import datetime  # Still needed for timestamp parsing
from enum import Enum

















from .OrganizationUserRoleEnum import OrganizationUserRole




from .InvitationStatusEnum import InvitationStatus
















# CRUD Input Types
class InvitationsCreateInput(BaseModel):

    invitation_id: str = Field(..., description="Unique identifier for the invitation (UUID)")

    organization_id: str = Field(..., description="ID of the organization extending the invitation")

    inviter_user_id: str = Field(..., description="ID of the user who created the invitation (must be organization owner)")

    invitee_email: str = Field(..., description="Email address of the invited user")

    invitee_user_id: str = Field(..., description="User ID of the invitee (populated once invitation is accepted)")

    role: OrganizationUserRole = Field(..., description="Intended role for the invited user within the organization")

    status: InvitationStatus = Field(..., description="Current status of the invitation")

    message: str = Field(..., description="Optional personalized message from the inviter")

    expires_at: int = Field(..., description="When the invitation expires (TTL attribute)")

    created_at: int = Field(..., description="When the invitation was created")

    updated_at: int = Field(..., description="When the invitation was last updated")


class InvitationsUpdateInput(BaseModel):

    invitation_id: Optional[str] = Field(None, description="Unique identifier for the invitation (UUID)")

    organization_id: Optional[str] = Field(None, description="ID of the organization extending the invitation")

    inviter_user_id: Optional[str] = Field(None, description="ID of the user who created the invitation (must be organization owner)")

    invitee_email: Optional[str] = Field(None, description="Email address of the invited user")

    invitee_user_id: Optional[str] = Field(None, description="User ID of the invitee (populated once invitation is accepted)")

    role: Optional[OrganizationUserRole] = Field(None, description="Intended role for the invited user within the organization")

    status: Optional[InvitationStatus] = Field(None, description="Current status of the invitation")

    message: Optional[str] = Field(None, description="Optional personalized message from the inviter")

    expires_at: Optional[int] = Field(None, description="When the invitation expires (TTL attribute)")

    created_at: Optional[int] = Field(None, description="When the invitation was created")

    updated_at: Optional[int] = Field(None, description="When the invitation was last updated")


class InvitationsDeleteInput(BaseModel):
    invitation_id: str


class InvitationsDisableInput(BaseModel):
    invitation_id: str
    disabled: bool

# QueryBy Inputs for PK, SK, Both, and all secondary indexes
class InvitationsQueryByInvitationIdInput(BaseModel):
    invitation_id: str



class InvitationsQueryByOrganizationIdInput(BaseModel):
    organization_id: str


class InvitationsQueryByInviteeEmailInput(BaseModel):
    invitee_email: str


class InvitationsQueryByInviteeUserIdInput(BaseModel):
    invitee_user_id: str


# Main Model (DTO)
# Properties: Field(...) = required (from schema), Optional[...] = optional (from schema)
class Invitations(BaseModel):
    """Invitations model."""

    invitation_id: str = Field(..., description="Unique identifier for the invitation (UUID)")

    organization_id: str = Field(..., description="ID of the organization extending the invitation")

    inviter_user_id: str = Field(..., description="ID of the user who created the invitation (must be organization owner)")

    invitee_email: str = Field(..., description="Email address of the invited user")

    invitee_user_id: str = Field(None, description="User ID of the invitee (populated once invitation is accepted)")

    role: str = Field(..., description="Intended role for the invited user within the organization")

    status: str = Field(..., description="Current status of the invitation")

    message: str = Field(None, description="Optional personalized message from the inviter")

    expires_at: int = Field(..., description="When the invitation expires (TTL attribute)")

    created_at: int = Field(..., description="When the invitation was created")

    updated_at: int = Field(..., description="When the invitation was last updated")




























    @validator('expires_at', pre=True)
    def parse_expires_at(cls, value):
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
    def from_dto(cls, dto: dict) -> "Invitations":
        return cls(

            invitation_id=dto.get('invitation_id'),

            organization_id=dto.get('organization_id'),

            inviter_user_id=dto.get('inviter_user_id'),

            invitee_email=dto.get('invitee_email'),

            invitee_user_id=dto.get('invitee_user_id'),

            role=OrganizationUserRole[dto.get('role', 'OrganizationUserRole.UNKNOWN')] if dto.get('role') else OrganizationUserRole.UNKNOWN,

            status=InvitationStatus[dto.get('status', 'InvitationStatus.UNKNOWN')] if dto.get('status') else InvitationStatus.UNKNOWN,

            message=dto.get('message'),

            expires_at=dto.get('expires_at'),

            created_at=dto.get('created_at'),

            updated_at=dto.get('updated_at'),

        )

    def to_dto(self) -> dict:
        return {

            'invitation_id': self.invitation_id,

            'organization_id': self.organization_id,

            'inviter_user_id': self.inviter_user_id,

            'invitee_email': self.invitee_email,

            'invitee_user_id': self.invitee_user_id,

            'role': self.role.value if self.role else 'OrganizationUserRole.UNKNOWN',

            'status': self.status.value if self.status else 'InvitationStatus.UNKNOWN',

            'message': self.message,

            'expires_at': self.expires_at,

            'created_at': self.created_at,

            'updated_at': self.updated_at,

        }

    class Config:
        """Model configuration."""
        from_attributes = True

# ProperCase Response Types
class InvitationsResponse(BaseModel):
    StatusCode: int
    Message: Optional[str]
    Data: Optional[Invitations]

class InvitationsListResponse(BaseModel):
    StatusCode: int
    Message: Optional[str]
    Data: List[Invitations]

# CRUD Response Aliases
InvitationsCreateResponse = InvitationsResponse
InvitationsUpdateResponse = InvitationsResponse
InvitationsDeleteResponse = InvitationsResponse
InvitationsDisableResponse = InvitationsResponse