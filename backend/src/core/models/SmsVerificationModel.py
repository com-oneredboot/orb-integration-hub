"""
SmsVerification Lambda-backed GraphQL resolver model.
Generated at 2025-06-18T18:10:39.021233
"""

from typing import Optional
from pydantic import BaseModel, Field, validator
from datetime import datetime

# Lambda Model
class SmsVerification(BaseModel):
    """SmsVerification lambda model."""
    phonenumber: float = Field(..., description="the phonenumber to verify")    code: float = Field(None, description="the confirmation Code")

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }