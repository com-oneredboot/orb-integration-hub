"""MfaSetupDetails model."""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime


class MfaSetupDetails(BaseModel):
    """MfaSetupDetails model."""
    qrCode: str = Field(..., description="The QR code value or label for the authenticator app")
    secretKey: str = Field(..., description="The secret key for TOTP setup")
    setupUri: str | None = Field(None, description="The setup URI for the authenticator app (optional, as string)")

    class Config:
        """Model configuration."""
        from_attributes = True