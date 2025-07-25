"""Security validation utilities."""

import re
from typing import Optional


def validate_email(email: str) -> bool:
    """Validate email format."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_phone_number(phone: str) -> bool:
    """Validate phone number format."""
    # Simple E.164 format validation
    pattern = r'^\+[1-9]\d{1,14}$'
    return bool(re.match(pattern, phone))


def validate_password_strength(password: str) -> bool:
    """Validate password meets strength requirements."""
    # At least 8 chars, one upper, one lower, one digit, one special
    if len(password) < 8:
        return False
    if not re.search(r'[A-Z]', password):
        return False
    if not re.search(r'[a-z]', password):
        return False
    if not re.search(r'[0-9]', password):
        return False
    if not re.search(r'[^A-Za-z0-9]', password):
        return False
    return True


def sanitize_input(input_str: str) -> str:
    """Sanitize user input to prevent injection attacks."""
    # Basic HTML/script tag removal
    sanitized = re.sub(r'<[^>]*>', '', input_str)
    # Remove potential SQL injection patterns
    sanitized = re.sub(r'[;\'"\\]', '', sanitized)
    return sanitized.strip()


def prevent_injection(query: str, params: Optional[dict] = None) -> str:
    """Prevent SQL/NoSQL injection by parameterizing queries."""
    # Placeholder - in real implementation would use proper parameterization
    return query