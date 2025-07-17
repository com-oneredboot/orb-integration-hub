"""
Generated Python models for SmsRateLimit
Generated at 2025-07-17T14:53:24.465574+00:00
"""

from typing import Optional, List
from pydantic import BaseModel, Field, validator
from datetime import datetime  # Still needed for timestamp parsing
from enum import Enum

# CRUD Input Types
class SmsRateLimitCreateInput(BaseModel):
    phone_number: str = Field(..., description="Phone number used as the rate limit key (primary key)")
    request_count: str = Field(..., description="Number of SMS requests made within the rate limit window")
    first_request_time: int = Field(..., description="Timestamp of the first request in the current rate limit window")
    ttl: str = Field(..., description="Time-to-live timestamp for automatic record cleanup")

class SmsRateLimitUpdateInput(BaseModel):
    phone_number: Optional[str] = Field(None, description="Phone number used as the rate limit key (primary key)")
    request_count: Optional[str] = Field(None, description="Number of SMS requests made within the rate limit window")
    first_request_time: Optional[int] = Field(None, description="Timestamp of the first request in the current rate limit window")
    ttl: Optional[str] = Field(None, description="Time-to-live timestamp for automatic record cleanup")

class SmsRateLimitDeleteInput(BaseModel):
    phone_number: str

class SmsRateLimitDisableInput(BaseModel):
    phone_number: str
    disabled: bool

# QueryBy Inputs for PK, SK, Both, and all secondary indexes
class SmsRateLimitQueryByPhoneNumberInput(BaseModel):
    phone_number: str

# Main Model (DTO)
# Properties: Field(...) = required (from schema), Optional[...] = optional (from schema)
class SmsRateLimit(BaseModel):
    """SmsRateLimit model."""
    phone_number: str = Field(..., description="Phone number used as the rate limit key (primary key)")    request_count: float = Field(..., description="Number of SMS requests made within the rate limit window")    first_request_time: int = Field(..., description="Timestamp of the first request in the current rate limit window")    ttl: float = Field(..., description="Time-to-live timestamp for automatic record cleanup")
    @validator('first_request_time', pre=True)
    def parse_first_request_time(cls, value):
        """Parse timestamp to epoch seconds."""
        if value is None:
            return None
        if isinstance(value, int):
            return value
        if isinstance(value, float):
            return int(value)
        if isinstance(value, datetime):
            return int(value.timestamp())
        if isinstance(value, str):
            try:
                # Try to parse ISO format string
                dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
                return int(dt.timestamp())
            except (ValueError, TypeError):
                pass
        return value

    @classmethod
    def from_dto(cls, dto: dict) -> "SmsRateLimit":
        return cls(
            phone_number=dto.get('phone_number'),
            request_count=dto.get('request_count'),
            first_request_time=dto.get('first_request_time'),
            ttl=dto.get('ttl'),
        )

    def to_dto(self) -> dict:
        return {
            'phone_number': self.phone_number,
            'request_count': self.request_count,
            'first_request_time': self.first_request_time,
            'ttl': self.ttl,
        }

    class Config:
        """Model configuration."""
        from_attributes = True

# ProperCase Response Types
class SmsRateLimitResponse(BaseModel):
    StatusCode: int
    Message: Optional[str]
    Data: Optional[SmsRateLimit]

class SmsRateLimitListResponse(BaseModel):
    StatusCode: int
    Message: Optional[str]
    Data: List[SmsRateLimit]

# CRUD Response Aliases
SmsRateLimitCreateResponse = SmsRateLimitResponse
SmsRateLimitUpdateResponse = SmsRateLimitResponse
SmsRateLimitDeleteResponse = SmsRateLimitResponse
SmsRateLimitDisableResponse = SmsRateLimitResponse