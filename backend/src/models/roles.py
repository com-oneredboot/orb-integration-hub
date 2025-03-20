"""
Role Model
Generated code - do not modify directly
"""

from dataclasses import dataclass, field
from typing import List, Optional, Any, Dict, ClassVar
from datetime import datetime
from pydantic import BaseModel, Field, validator
import uuid






  
  

  
  

  
  

  
  

  
  

  
  

  
  

  
  

  
  




@dataclass
class RoleBase:
    """Base class for Role model"""
    
    # Class variables
    SCHEMA_VERSION: ClassVar[str] = "1.0"
    
    # Instance variables with type hints and default values
    role_id: str = field(
        default='',
        metadata={
            "description": "",
            "required": true,
            
        }
    )
    user_id: str = field(
        default='',
        metadata={
            "description": "",
            "required": true,
            
        }
    )
    application_id: str = field(
        default='',
        metadata={
            "description": "",
            "required": true,
            
        }
    )
    role_name: str = field(
        default='',
        metadata={
            "description": "",
            "required": true,
            
        }
    )
    role_type: str = field(
        default='',
        metadata={
            "description": "",
            "required": true,
            
        }
    )
    permissions: List[] = field(
        default=list,
        metadata={
            "description": "",
            "required": true,
            
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
    active: bool = field(
        default=False,
        metadata={
            "description": "",
            "required": true,
            
        }
    )

class RolePydantic(BaseModel):
    """Pydantic model for validation"""
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            uuid.UUID: lambda v: str(v)
        }
    
    # Add fields with validation
    role_id: str = Field(
        default='',
        description="",
        required=True
    )
    user_id: str = Field(
        default='',
        description="",
        required=True
    )
    application_id: str = Field(
        default='',
        description="",
        required=True
    )
    role_name: str = Field(
        default='',
        description="",
        required=True
    )
    role_type: str = Field(
        default='',
        description="",
        required=True
    )
    permissions: List[] = Field(
        default=list,
        description="",
        required=True
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
    active: bool = Field(
        default=False,
        description="",
        required=True
    )

@dataclass
class Role(RoleBase):
    """Role model with validation"""
    
    def __post_init__(self):
        """Validate the model after initialization"""
        try:
            # Convert to Pydantic model for validation
            pydantic_model = RolePydantic(**self.__dict__)
            # Update instance with validated data
            for field_name, value in pydantic_model.dict().items():
                setattr(self, field_name, value)
        except Exception as e:
            raise ValueError(f"Validation error: {str(e)}")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert model to dictionary"""
        return {
            "schema_version": self.SCHEMA_VERSION,
            
            "role_id": self.role_id,
            
            "user_id": self.user_id,
            
            "application_id": self.application_id,
            
            "role_name": self.role_name,
            
            "role_type": self.role_type,
            
            "permissions": self.permissions,
            
            "created_at": self.created_at,
            
            "updated_at": self.updated_at,
            
            "active": self.active,
            
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Role':
        """Create model instance from dictionary"""
        return cls(**data)
    
    def __str__(self) -> str:
        """String representation of the model"""
        return f"Role({', '.join(f'{k}={v}' for k, v in self.to_dict().items())})"