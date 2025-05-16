"""
Generated Python models for Applications
Generated at 
"""

from typing import Optional, List
from pydantic import BaseModel, Field, validator
from datetime import datetime
from enum import Enum








from .application_status import ApplicationStatus









class Applications(BaseModel):
    """Applications model."""
    
    application_id: str = Field(..., description="Unique identifier for the application (primary key)")
    
    name: str = Field(..., description="Name of the application")
    
    owner_id: str = Field(..., description="ID of the user who owns the application (foreign key to Users)")
    
    status: ApplicationStatus = Field(..., description="Current status of the application")
    
    created_at: datetime = Field(..., description="When the application was created")
    
    updated_at: datetime = Field(..., description="When the application was last updated")
    

    
    
    
    
    
    
    
    
    
    
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
    

class ApplicationsResponse(BaseModel):
    StatusCode: int = Field(..., description="HTTP status code")
    Message: str = Field(..., description="Response message")
    Data: Applications = Field(..., description="Response data")

class ApplicationsListResponse(BaseModel):
    StatusCode: int = Field(..., description="HTTP status code")
    Message: str = Field(..., description="Response message")
    Data: List[Applications] = Field(..., description="Response data")