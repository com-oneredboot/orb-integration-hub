"""
MfaSetupDetails standard model.
Generated at 2025-07-14T18:03:31.423626
"""

from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime


# Main Model (Standard)
class MfaSetupDetails(BaseModel):
    """MfaSetupDetails model."""

    qr_code: str = Field(
        ..., description="The QR code value or label for the authenticator app"
    )
    secret_key: str = Field(..., description="The secret key for TOTP setup")
    setup_uri: str = Field(
        None,
        description="The setup URI for the authenticator app (optional, as string)",
    )

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat()}


# Response Type
class MfaSetupDetailsResponse(BaseModel):
    statusCode: int
    message: Optional[str]
    data: Optional[MfaSetupDetails]
