# file: backend/src/models/role_enum.py
# author: Corey Dale Peters
# date: 2025-03-07
# description: Python file

# Role Enums
#
# This file contains enums for the Role model.
# This file is not auto-generated and should be maintained manually.

from enum import Enum

# Add your enums here
# Example:
# class RoleStatus(Enum):
#     ACTIVE = "ACTIVE"
#     INACTIVE = "INACTIVE"

class RoleStatus(Enum):
    """Role status enum."""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    SUSPENDED = "SUSPENDED"
    DELETED = "DELETED"


class RoleType(Enum):
    """Role type enum."""
    SYSTEM = "SYSTEM"
    CUSTOM = "CUSTOM"
    TEMPORARY = "TEMPORARY"


class RolePermission(Enum):
    """Role permission enum."""
    READ = "READ"
    WRITE = "WRITE"
    DELETE = "DELETE"
    ADMIN = "ADMIN"
