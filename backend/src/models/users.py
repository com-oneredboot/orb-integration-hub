"""
User Model
Generated code - do not modify directly
"""

from dataclasses import dataclass, field
from typing import List, Optional, Any, Dict, ClassVar
from datetime import datetime
from pydantic import BaseModel, Field, validator
import uuid



# Import enum types from enum file
from .user_enum import UserStatus

@dataclass
class UserBase:
    """Base class for User model"""
    
    # Class variables
    SCHEMA_VERSION: ClassVar[str] = "1.0"
    
    # Instance variables with type hints and default values    user_id: str = field(
        default='',
        metadata={
            "description": "",
            "required": true,
        }
    )    cognito_id: str = field(
        default='',
        metadata={
            "description": "",
            "required": true,
        }
    )    email: str = field(
        default='',
        metadata={
            "description": "",
            "required": true,
        }
    )    phone_number: str = field(
        default='',
        metadata={
            "description": "",
            "required": false,
        }
    )    phone_verified: bool = field(
        default=False,
        metadata={
            "description": "",
            "required": false,
        }
    )    first_name: str = field(
        default='',
        metadata={
            "description": "",
            "required": false,
        }
    )    last_name: str = field(
        default='',
        metadata={
            "description": "",
            "required": false,
        }
    )    groups: List[] = field(
        default=list,
        metadata={
            "description": "",
            "required": true,
        }
    )    status: UserStatus = field(
        default=UserStatus.UNKNOWN,
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
class UserPydantic(BaseModel):
    """Pydantic model for validation"""
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            uuid.UUID: lambda v: str(v)
        }
    
    # Add fields with validation    user_id: str = Field(
        default='',
        description="",
required=True    )    cognito_id: str = Field(
        default='',
        description="",
required=True    )    email: str = Field(
        default='',
        description="",
required=True    )    phone_number: str = Field(
        default='',
        description="",
required=False    )    phone_verified: bool = Field(
        default=False,
        description="",
required=False    )    first_name: str = Field(
        default='',
        description="",
required=False    )    last_name: str = Field(
        default='',
        description="",
required=False    )    groups: List[] = Field(
        default=list,
        description="",
required=True    )    status: UserStatus = Field(
        default=UserStatus.UNKNOWN,
        description="",
required=True    )    created_at: timestamp = Field(
        default=None,
        description="ISO 8601 formatted timestamp (e.g., 2025-03-07T16:23:17.488Z)",
required=True    )    updated_at: timestamp = Field(
        default=None,
        description="ISO 8601 formatted timestamp (e.g., 2025-03-07T16:23:17.488Z)",
required=False    )
@dataclass
class User(UserBase):
    """User model with validation"""
    
    def __post_init__(self):
        """Validate the model after initialization"""
        try:
            # Convert to Pydantic model for validation
            pydantic_model = UserPydantic(**self.__dict__)
            # Update instance with validated data
            for field_name, value in pydantic_model.dict().items():
                setattr(self, field_name, value)
        except Exception as e:
            raise ValueError(f"Validation error: {str(e)}")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert model to dictionary"""
        return {
            "schema_version": self.SCHEMA_VERSION,
            "user_id": self.user_id,
            "cognito_id": self.cognito_id,
            "email": self.email,
            "phone_number": self.phone_number,
            "phone_verified": self.phone_verified,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "groups": self.groups,
            "status": self.status,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'User':
        """Create model instance from dictionary"""
        return cls(**data)
    
    def __str__(self) -> str:
        """String representation of the model"""
        return f"User({', '.join(f'{k}={v}' for k, v in self.to_dict().items())})"