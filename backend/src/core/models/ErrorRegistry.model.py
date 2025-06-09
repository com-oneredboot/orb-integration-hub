"""
Generated Python registry model for ErrorRegistry
Generated at 2025-06-06T11:47:29.741120
"""

from typing import Dict, Any, Optional

class ErrorRegistry:
    """Static error registry for ErrorRegistry."""
    ERRORS: Dict[str, Dict[str, Any]] = {
        "ORB-AUTH-001": {
            "message": "Invalid email format",
            "description": "The provided email address format is invalid",
            "solution": "Please enter a valid email address"        },
        "ORB-AUTH-002": {
            "message": "Invalid credentials",
            "description": "The provided email and password combination is invalid",
            "solution": "Please check your email and password and try again"        },
        "ORB-AUTH-003": {
            "message": "Email verification failed",
            "description": "Failed to verify email with provided code",
            "solution": "Please check the verification code and try again"        },
        "ORB-AUTH-004": {
            "message": "User already exists",
            "description": "A user with this email already exists",
            "solution": "Please use a different email or try to sign in"        },
        "ORB-AUTH-005": {
            "message": "User email check failed",
            "description": "Failed to check if user exists by email",
            "solution": "Please try again later"        },
        "ORB-API-001": {
            "message": "GraphQL query error",
            "description": "An error occurred while executing a GraphQL query",
            "solution": "Please try again later"        },
        "ORB-API-002": {
            "message": "GraphQL mutation error",
            "description": "An error occurred while executing a GraphQL mutation",
            "solution": "Please try again later"        },
        "ORB-API-003": {
            "message": "Invalid input for GraphQL operation",
            "description": "The input provided for a GraphQL operation was invalid",
            "solution": "Please check the input parameters and try again"        },
        "ORB-API-004": {
            "message": "Network error",
            "description": "A network error occurred while communicating with the API",
            "solution": "Please check your internet connection and try again"        },
        "ORB-DATA-001": {
            "message": "Invalid data format",
            "description": "The data format provided is invalid",
            "solution": "Please check the data format and try again"        },
        "ORB-DATA-002": {
            "message": "Data not found",
            "description": "The requested data was not found",
            "solution": "Please check if the data exists and try again"        },
        "ORB-SYS-001": {
            "message": "Unexpected error",
            "description": "An unexpected error occurred",
            "solution": "Please try again later"        },
    }

    @classmethod
    def get(cls, code: str) -> Optional[Dict[str, Any]]:
        """Get error details by code."""
        return cls.ERRORS.get(code) 