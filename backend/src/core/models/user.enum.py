# file: backend/src/models/user_enum.py
# author: Corey Dale Peters
# date: 2025-03-07
# description: Python file

# User Enums
#
# This file contains enums for the User model.
# This file is not auto-generated and should be maintained manually.

"""User enums."""
from enum import Enum


class UserStatus(Enum):
    """User status enum."""
    UNKNOWN = "UNKNOWN"
    ACTIVE = "ACTIVE"
    PENDING = "PENDING"
    SUSPENDED = "SUSPENDED"
    INACTIVE = "INACTIVE"
    DELETED = "DELETED"


class UserGroups(Enum):
    """User groups enum."""
    UNKNOWN = "UNKNOWN"
    USER = "USER"
    CUSTOMER = "CUSTOMER"
    CLIENT = "CLIENT"
    EMPLOYEE = "EMPLOYEE"
    OWNER = "OWNER"


class UserType(Enum):
    """User type enum."""
    ADMIN = "ADMIN"
    USER = "USER"
    GUEST = "GUEST"


class UserRole(Enum):
    """User role enum."""
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    USER = "USER"
    GUEST = "GUEST"
