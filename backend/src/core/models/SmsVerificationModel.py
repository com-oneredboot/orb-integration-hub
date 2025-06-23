"""
SmsVerification Lambda-backed GraphQL resolver model.
Generated at 2025-06-23T13:00:09.737791
"""

from typing import Optional
from pydantic import BaseModel, Field, validator
from datetime import datetime

# Lambda Model
class SmsVerification(BaseModel):
    """SmsVerification lambda model."""
    phone_number: str = Field(..., description="the phone number to verify")    code: float = Field(None, description="the confirmation Code")    valid: bool = Field(None, description="whether the provided code is valid (returned during verification)")
    @validator('valid', pre=True, always=True)
    def parse_valid_bool(cls, value):
        if value is None:
            return None
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            if value.lower() == 'true':
                return True
            if value.lower() == 'false':
                return False
        return bool(value)

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }