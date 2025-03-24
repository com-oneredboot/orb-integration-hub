"""
Application_user Model
Generated code - do not modify directly
"""

from dataclasses import dataclass, field
from typing import List, Optional, Any, Dict, ClassVar
from datetime import datetime
from pydantic import BaseModel, Field, validator
import uuid



# Import enum types from enum file
from .application_user_enum import ApplicationUserStatus

@dataclass
class Application_userBase:
    """Base class for Application_user model"""
    
    # Class variables
    SCHEMA_VERSION: ClassVar[str] = "1.0"
    
    # Instance variables with type hints and default values    application_id: str = field(
        default='',
        metadata={
            "description": "",
            "required": true,
        }
    )    user_id: str = field(
        default='',
        metadata={
            "description": "",
            "required": true,
        }
    )    application_role_id: str = field(
        default='',
        metadata={
            "description": "",
            "required": true,
        }
    )    status: ApplicationUserStatus = field(
        default=ApplicationUserStatus.UNKNOWN,
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
    )
class Application_userPydantic(BaseModel):
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
required=True    )    user_id: str = Field(
        default='',
        description="",
required=True    )    application_role_id: str = Field(
        default='',
        description="",
required=True    )    status: ApplicationUserStatus = Field(
        default=ApplicationUserStatus.UNKNOWN,
        description="",
required=True    )    created_at: timestamp = Field(
        default=None,
        description="ISO 8601 formatted timestamp (e.g., 2025-03-07T16:23:17.488Z)",
required=True    )    updated_at: timestamp = Field(
        default=None,
        description="ISO 8601 formatted timestamp (e.g., 2025-03-07T16:23:17.488Z)",
required=False    )
@dataclass
class Application_user(Application_userBase):
    """Application_user model with validation"""
    
    def __post_init__(self):
        """Validate the model after initialization"""
        try:
            # Convert to Pydantic model for validation
            pydantic_model = Application_userPydantic(**self.__dict__)
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
            "user_id": self.user_id,
            "application_role_id": self.application_role_id,
            "status": self.status,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Application_user':
        """Create model instance from dictionary"""
        return cls(**data)
    
    def __str__(self) -> str:
        """String representation of the model"""
        return f"Application_user({', '.join(f'{k}={v}' for k, v in self.to_dict().items())})"