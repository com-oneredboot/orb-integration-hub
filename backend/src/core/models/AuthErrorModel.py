"""
AuthError standard model.
Generated at 2025-07-04T20:19:47.468935
"""

from typing import Optional
from pydantic import BaseModel, Field, validator
from datetime import datetime

# Main Model (Standard)
class AuthError(BaseModel):
    """AuthError model."""
    code: str = Field(..., description="Error code (e.g., AUTH-001)")    message: str = Field(..., description="User-facing error message")    description: str = Field(None, description="Optional technical description")    details: str = Field(None, description="Optional extra data or context")

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# Response Type
class AuthErrorResponse(BaseModel):
    statusCode: int
    message: Optional[str]
    data: Optional[AuthError] 