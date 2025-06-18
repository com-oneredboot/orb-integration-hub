"""
Generated Python models for Users
Generated at 2025-06-18T23:33:09.327583
"""

from typing import Optional, List
from pydantic import BaseModel, Field, validator
from datetime import datetime
from enum import Enum
from .UserStatusEnum import UserStatus

# CRUD Input Types
class UsersCreateInput(BaseModel):
    user_id: str = Field(..., description="Unique identifier for the user (primary key)")
    cognito_id: str = Field(..., description="Cognito user identifier")
    email: str = Field(..., description="User's email address")
    first_name: str = Field(..., description="User's first name")
    last_name: str = Field(..., description="User's last name")
    status: UserStatus = Field(..., description="Current status of the user")
    created_at: datetime = Field(..., description="When the user was created")
    updated_at: datetime = Field(..., description="When the user was last updated")
    phone_number: str = Field(..., description="User's phone number")
    groups: List[str] = Field(..., description="List of Cognito groups the user belongs to (used for AppSync @aws_auth)")
    email_verified: bool = Field(..., description="Whether the user's email is verified")
    phone_verified: bool = Field(..., description="Whether the user's phone number is verified")

class UsersUpdateInput(BaseModel):
    user_id: Optional[str] = Field(None, description="Unique identifier for the user (primary key)")
    cognito_id: Optional[str] = Field(None, description="Cognito user identifier")
    email: Optional[str] = Field(None, description="User's email address")
    first_name: Optional[str] = Field(None, description="User's first name")
    last_name: Optional[str] = Field(None, description="User's last name")
    status: Optional[UserStatus] = Field(None, description="Current status of the user")
    created_at: Optional[datetime] = Field(None, description="When the user was created")
    updated_at: Optional[datetime] = Field(None, description="When the user was last updated")
    phone_number: Optional[str] = Field(None, description="User's phone number")
    groups: Optional[List[str]] = Field(None, description="List of Cognito groups the user belongs to (used for AppSync @aws_auth)")
    email_verified: Optional[bool] = Field(None, description="Whether the user's email is verified")
    phone_verified: Optional[bool] = Field(None, description="Whether the user's phone number is verified")

class UsersDeleteInput(BaseModel):
    user_id: str

class UsersDisableInput(BaseModel):
    user_id: str
    disabled: bool

# QueryBy Inputs for PK, SK, Both, and all secondary indexes
class UsersQueryByUserIdInput(BaseModel):
    user_id: str

class UsersQueryByEmailInput(BaseModel):
    email: str

class UsersQueryByCognitoIdInput(BaseModel):
    cognito_id: str

# Main Model (DTO)
# Properties: Field(...) = required (from schema), Optional[...] = optional (from schema)
class Users(BaseModel):
    """Users model."""
    user_id: str = Field(..., description="Unique identifier for the user (primary key)")    cognito_id: str = Field(..., description="Cognito user identifier")    email: str = Field(..., description="User's email address")    first_name: str = Field(..., description="User's first name")    last_name: str = Field(..., description="User's last name")    status: str = Field(..., description="Current status of the user")    created_at: datetime = Field(..., description="When the user was created")    updated_at: datetime = Field(..., description="When the user was last updated")    phone_number: str = Field(None, description="User's phone number")    groups: List[str] = Field(None, description="List of Cognito groups the user belongs to (used for AppSync @aws_auth)")    email_verified: bool = Field(None, description="Whether the user's email is verified")    phone_verified: bool = Field(None, description="Whether the user's phone number is verified")
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
    @validator('emailVerified', pre=True, always=True)
    def parse_emailVerified_bool(cls, value):
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
    @validator('phoneVerified', pre=True, always=True)
    def parse_phoneVerified_bool(cls, value):
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

    @classmethod
    def from_dto(cls, dto: dict) -> "Users":
        return cls(
            user_id=dto.get('user_id'),
            cognito_id=dto.get('cognito_id'),
            email=dto.get('email'),
            first_name=dto.get('first_name'),
            last_name=dto.get('last_name'),
            status=UserStatus[dto.get('status', 'UserStatus.UNKNOWN')] if dto.get('status') else UserStatus.UNKNOWN,
            created_at=dto.get('created_at'),
            updated_at=dto.get('updated_at'),
            phone_number=dto.get('phone_number'),
            groups=dto.get('groups'),
            email_verified=dto.get('email_verified'),
            phone_verified=dto.get('phone_verified'),
        )

    def to_dto(self) -> dict:
        return {
            'user_id': self.user_id,
            'cognito_id': self.cognito_id,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'status': self.status.value if self.status else 'UserStatus.UNKNOWN',
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'phone_number': self.phone_number,
            'groups': self.groups,
            'email_verified': self.email_verified,
            'phone_verified': self.phone_verified,
        }

    class Config:
        """Model configuration."""
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# ProperCase Response Types
class UsersResponse(BaseModel):
    StatusCode: int
    Message: Optional[str]
    Data: Optional[Users]

class UsersListResponse(BaseModel):
    StatusCode: int
    Message: Optional[str]
    Data: List[Users]

# CRUD Response Aliases
UsersCreateResponse = UsersResponse
UsersUpdateResponse = UsersResponse
UsersDeleteResponse = UsersResponse
UsersDisableResponse = UsersResponse