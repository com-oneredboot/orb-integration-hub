"""ErrorRegistry model."""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime


class ErrorRegistry(BaseModel):
    """ErrorRegistry model."""
    code: str = Field(..., description="Error code (e.g., ORB-AUTH-001)")
    message: str = Field(..., description="User-friendly error message")
    description: str = Field(..., description="Technical error description")
    solution: str = Field(..., description="Suggested solution for the error")
    details: str | None = Field(None, description="Additional context or metadata for the error")

    class Config:
        """Model configuration."""
        from_attributes = True