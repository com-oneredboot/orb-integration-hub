"""
MfaSetupDetails standard model.
Generated at 2025-06-20T19:53:34.073006
"""

from typing import Optional
from pydantic import BaseModel, Field, validator
from datetime import datetime

# Main Model (Standard)
class MfaSetupDetails(BaseModel):
    """MfaSetupDetails model."""
    qr_code: str = Field(..., description="The QR code value or label for the authenticator app")    secret_key: str = Field(..., description="The secret key for TOTP setup")    setup_uri: str = Field(None, description="The setup URI for the authenticator app (optional, as string)")

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# Response Type
class MfaSetupDetailsResponse(BaseModel):
    statusCode: int
    message: Optional[str]
    data: Optional[MfaSetupDetails] 