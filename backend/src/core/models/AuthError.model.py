"""AuthError model."""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime


class AuthError(BaseModel):
    """AuthError model."""
    code: str = Field(..., description="Error code (e.g., AUTH-001)")
    message: str = Field(..., description="User-facing error message")
    description: str | None = Field(None, description="Optional technical description")
    details: str | None = Field(None, description="Optional extra data or context")

    class Config:
        """Model configuration."""
        from_attributes = True