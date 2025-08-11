"""
Auth standard model.
Generated at 2025-08-10T00:38:11.842592+00:00
"""

from typing import Optional
from pydantic import BaseModel, Field, validator
from datetime import datetime












from .UsersModel import UsersModel













from .MfaSetupDetailsModel import MfaSetupDetailsModel



# Main Model (Standard)
class Auth(BaseModel):
    """Auth model."""

    status_code: float = Field(..., description="HTTP or operation status code")

    is_signed_in: bool = Field(None, description="Whether the user is signed in")

    message: str = Field(None, description="User-facing or system message")

    user: Users = Field(None, description="The user object (Users)")

    needs_mfa: bool = Field(None, description="Whether MFA is required")

    needs_mfa_setup: bool = Field(None, description="Whether MFA setup is required")

    mfa_type: str = Field(None, description="Type of MFA (e.g., 'sms', 'totp')")

    mfa_setup_details: MfaSetupDetails = Field(None, description="Details for MFA setup (MfaSetupDetails)")








    @validator('isSignedIn', pre=True, always=True)
    def parse_isSignedIn_bool(cls, value):
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










    @validator('needsMFA', pre=True, always=True)
    def parse_needsMFA_bool(cls, value):
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




    @validator('needsMFASetup', pre=True, always=True)
    def parse_needsMFASetup_bool(cls, value):
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

# Response Type
class AuthResponse(BaseModel):
    statusCode: int
    message: Optional[str]
    data: Optional[Auth] 