"""
Application Model
Generated code - do not modify directly
"""

from dataclasses import dataclass, field
from typing import List, Optional, Any, Dict, ClassVar
from datetime import datetime
from pydantic import BaseModel, Field, validator
import uuid



# Import enum types from enum file
from .application_enum import ApplicationStatus

@dataclass
class ApplicationBase:
    """Base class for Application model"""
    
    # Class variables
    SCHEMA_VERSION: ClassVar[str] = "1.0"
    
    # Instance variables with type hints and default values    application_id: str = field(
        default='',
        metadata={
            "description": "",
            "required": true,
        }
    )    name: str = field(
        default='',
        metadata={
            "description": "",
            "required": true,
        }
    )    description: str = field(
        default='',
        metadata={
            "description": "",
            "required": false,
        }
    )    status: ApplicationStatus = field(
        default=ApplicationStatus.UNKNOWN,
        metadata={
            "description": "",
            "required": true,
        }
    )    created_at: timestamp = field(
        default=None,
        metadata={
            "description": "ISO 8601 formatted timestamp (e.g., 2025-03-07T16:23:17.488Z)",
            "required": true,
        }
    )    updated_at: timestamp = field(
        default=None,
        metadata={
            "description": "ISO 8601 formatted timestamp (e.g., 2025-03-07T16:23:17.488Z)",
            "required": false,
        }
    )    user_id: str = field(
        default='',
        metadata={
            "description": "",
            "required": true,
        }
    )
class ApplicationPydantic(BaseModel):
    """Pydantic model for validation"""
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            uuid.UUID: lambda v: str(v)
        }
    
    # Add fields with validation    application_id: str = Field(
        default='',
        description="",
required=True    )    name: str = Field(
        default='',
        description="",
required=True    )    description: str = Field(
        default='',
        description="",
required=False    )    status: ApplicationStatus = Field(
        default=ApplicationStatus.UNKNOWN,
        description="",
required=True    )    created_at: timestamp = Field(
        default=None,
        description="ISO 8601 formatted timestamp (e.g., 2025-03-07T16:23:17.488Z)",
required=True    )    updated_at: timestamp = Field(
        default=None,
        description="ISO 8601 formatted timestamp (e.g., 2025-03-07T16:23:17.488Z)",
required=False    )    user_id: str = Field(
        default='',
        description="",
required=True    )
@dataclass
class Application(ApplicationBase):
    """Application model with validation"""
    
    def __post_init__(self):
        """Validate the model after initialization"""
        try:
            # Convert to Pydantic model for validation
            pydantic_model = ApplicationPydantic(**self.__dict__)
            # Update instance with validated data
            for field_name, value in pydantic_model.dict().items():
                setattr(self, field_name, value)
        except Exception as e:
            raise ValueError(f"Validation error: {str(e)}")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert model to dictionary"""
        return {
            "schema_version": self.SCHEMA_VERSION,
            "application_id": self.application_id,
            "name": self.name,
            "description": self.description,
            "status": self.status,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "user_id": self.user_id,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Application':
        """Create model instance from dictionary"""
        return cls(**data)
    
    def __str__(self) -> str:
        """String representation of the model"""
        return f"Application({', '.join(f'{k}={v}' for k, v in self.to_dict().items())})"