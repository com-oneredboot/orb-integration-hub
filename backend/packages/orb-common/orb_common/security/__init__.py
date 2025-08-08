"""
Security module for orb-common.

This module provides shared security components including:
- Security context extraction
- Authentication and authorization decorators
- Permission checking
- Input validation
"""

# Security functions
from .auth import validate_token

__all__ = [
    # Security functions
    "validate_token",
]
