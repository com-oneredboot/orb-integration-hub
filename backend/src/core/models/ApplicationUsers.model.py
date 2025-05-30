"""
Generated Python models for ApplicationUsers
Generated at 
"""

from typing import Optional, List
from pydantic import BaseModel, Field, validator
from datetime import datetime
from enum import Enumfrom .application_user_status import ApplicationUserStatus
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

class ApplicationUsersQueryByApplicationUserIdInput(BaseModel):
    application_user_id: str
class ApplicationUsersQueryByUserIdInput(BaseModel):
    user_id: str
class ApplicationUsersQueryByApplicationIdInput(BaseModel):
    application_id: str

class ApplicationUsers(BaseModel):
    """ApplicationUsers model."""
    application_user_id: str = Field(..., description="Unique identifier for the application user membership (primary key)")
    user_id: str = Field(..., description="ID of the user (foreign key to Users)")
    application_id: str = Field(..., description="ID of the application (foreign key to Applications)")
    status: ApplicationUserStatus = Field(..., description="Current status of the user in the application")
    created_at: datetime = Field(..., description="When the user was added to the application")
    updated_at: datetime = Field(..., description="When the membership was last updated")

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

    class Config:
        """Model configuration."""
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class ApplicationUsersResponse(BaseModel):
    StatusCode: int
    Message: Optional[str]
    Data: Optional[ApplicationUsers]

class ApplicationUsersListResponse(BaseModel):
    StatusCode: int
    Message: Optional[str]
    Data: List[ApplicationUsers]