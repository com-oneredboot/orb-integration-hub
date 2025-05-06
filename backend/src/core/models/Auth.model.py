"""Auth model."""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime


class Auth(BaseModel):
    """Auth model."""
    status_code: float = Field(..., description="HTTP or operation status code")
    isSignedIn: bool | None = Field(None, description="Whether the user is signed in")
    message: str | None = Field(None, description="User-facing or system message")
    user: str | None = Field(None, description="The user object (IUsers)")
    needsMFA: bool | None = Field(None, description="Whether MFA is required")
    needsMFASetup: bool | None = Field(None, description="Whether MFA setup is required")
    mfaType: str | None = Field(None, description="Type of MFA (e.g., 'sms', 'totp')")
    mfaSetupDetails: str | None = Field(None, description="Details for MFA setup (MfaSetupDetails)")

    class Config:
        """Model configuration."""
        from_attributes = True