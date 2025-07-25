"""General validation utility functions."""

import re
import uuid
from typing import Optional


def is_valid_uuid(value: str) -> bool:
    """Check if string is valid UUID."""
    try:
        uuid.UUID(value)
        return True
    except (ValueError, TypeError):
        return False


def is_valid_email(email: str) -> bool:
    """Check if string is valid email."""
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return bool(re.match(pattern, email))


def is_valid_url(url: str) -> bool:
    """Check if string is valid URL."""
    pattern = r"^https?://(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&/=]*)$"
    return bool(re.match(pattern, url))


def normalize_phone(phone: str) -> Optional[str]:
    """Normalize phone number to E.164 format."""
    # Remove all non-digit characters
    digits = re.sub(r"\D", "", phone)

    # Check if it's a valid length
    if len(digits) < 10 or len(digits) > 15:
        return None

    # Add + prefix if not present
    if not digits.startswith("1") and len(digits) == 10:
        # Assume US number
        digits = "1" + digits

    return "+" + digits


def clean_string(value: str, max_length: Optional[int] = None) -> str:
    """Clean and normalize string."""
    # Remove leading/trailing whitespace
    cleaned = value.strip()

    # Replace multiple spaces with single space
    cleaned = re.sub(r"\s+", " ", cleaned)

    # Truncate if max length specified
    if max_length and len(cleaned) > max_length:
        cleaned = cleaned[:max_length]

    return cleaned
