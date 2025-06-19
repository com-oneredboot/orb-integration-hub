"""
SmsVerification Lambda-backed GraphQL resolver model.
Generated at 2025-06-19T14:22:33.119393
"""

from typing import Optional
from pydantic import BaseModel, Field, validator
from datetime import datetime

# Lambda Model
class SmsVerification(BaseModel):
    """SmsVerification lambda model."""
    phone_number: str = Field(..., description="the phone number to verify")    code: float = Field(None, description="the confirmation Code")

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }