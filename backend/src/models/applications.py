"""applications model."""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime

class Applications(BaseModel):
    """applications model."""
    application_id: str = Field(..., description="application_id")
    name: str = Field(..., description="name")
    description: str = Field(..., description="description")
    status: str = Field(..., description="status")
    created_at: float = Field(..., description="created_at")
    updated_at: float = Field(..., description="updated_at")
    user_id: str = Field(..., description="user_id")

    class Config:
        """Model configuration."""
        from_attributes = True