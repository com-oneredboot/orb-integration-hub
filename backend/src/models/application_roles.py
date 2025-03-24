"""
Application_role Model
Generated code - do not modify directly
"""

from dataclasses import dataclass, field
from typing import List, Optional, Any, Dict, ClassVar
from datetime import datetime
from pydantic import BaseModel, Field, validator
import uuid






  
  

  
  

  
  

  
    
  
  

  
  

  
  



# Import enum types from enum file
from .application_role_enum import ApplicationRoleStatus


@dataclass
class Application_roleBase:
    """Base class for Application_role model"""
    
    # Class variables
    SCHEMA_VERSION: ClassVar[str] = "1.0"
    
    # Instance variables with type hints and default values
    application_id: str = field(
        default='',
        metadata={
            "description": "",
            "required": true,
            
        }
    )
    role_id: str = field(
        default='',
        metadata={
            "description": "",
            "required": true,
            
        }
    )
    description: str = field(
        default='',
        metadata={
            "description": "",
            "required": false,
            
        }
    )
    status: ApplicationRoleStatus = field(
        default=ApplicationRoleStatus.UNKNOWN,
        metadata={
            "description": "",
            "required": ,
            
        }
    )
    created_at: timestamp = field(
        default=None,
        metadata={
            "description": "ISO 8601 formatted timestamp (e.g., 2025-03-07T16:23:17.488Z)",
            "required": true,
            
        }
    )
    updated_at: timestamp = field(
        default=None,
        metadata={
            "description": "ISO 8601 formatted timestamp (e.g., 2025-03-07T16:23:17.488Z)",
            "required": true,
            
        }
    )

class Application_rolePydantic(BaseModel):
    """Pydantic model for validation"""
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            uuid.UUID: lambda v: str(v)
        }
    
    # Add fields with validation
    application_id: str = Field(
        default='',
        description="",
        required=True
    )
    role_id: str = Field(
        default='',
        description="",
        required=True
    )
    description: str = Field(
        default='',
        description="",
        required=False
    )
    status: ApplicationRoleStatus = Field(
        default=ApplicationRoleStatus.UNKNOWN,
        description="",
        required=False
    )
    created_at: timestamp = Field(
        default=None,
        description="ISO 8601 formatted timestamp (e.g., 2025-03-07T16:23:17.488Z)",
        required=True
    )
    updated_at: timestamp = Field(
        default=None,
        description="ISO 8601 formatted timestamp (e.g., 2025-03-07T16:23:17.488Z)",
        required=True
    )

@dataclass
class Application_role(Application_roleBase):
    """Application_role model with validation"""
    
    def __post_init__(self):
        """Validate the model after initialization"""
        try:
            # Convert to Pydantic model for validation
            pydantic_model = Application_rolePydantic(**self.__dict__)
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
            
            "role_id": self.role_id,
            
            "description": self.description,
            
            "status": self.status,
            
            "created_at": self.created_at,
            
            "updated_at": self.updated_at,
            
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Application_role':
        """Create model instance from dictionary"""
        return cls(**data)
    
    def __str__(self) -> str:
        """String representation of the model"""
        return f"Application_role({', '.join(f'{k}={v}' for k, v in self.to_dict().items())})"