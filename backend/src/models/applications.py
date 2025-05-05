"""Applications model."""
from pydantic import BaseModel, Field
from datetime import datetime


class Applications(BaseModel):
    """Applications model."""
    application_id: str = Field(
        ..., description="Unique identifier for the application"
    )
    name: str = Field(
        ..., description="Human-readable name of the application"
    )
    description: str = Field(
        ..., description="Human-readable description of the application"
    )
    status: str = Field(
        ..., description="Current status of the application"
    )
    created_at: datetime = Field(
        ..., description="When the application was created"
    )
    updated_at: datetime = Field(
        ..., description="When the application was last updated"
    )

    class Config:
        """Model configuration."""
        from_attributes = True