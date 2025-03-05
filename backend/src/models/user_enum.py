# User Enums
#
# This file contains enums for the User model.
# This file is not auto-generated and should be maintained manually.

from enum import Enum

class UserStatus(Enum):
    UNKNOWN = "UNKNOWN"
    ACTIVE = "ACTIVE"
    PENDING = "PENDING"
    SUSPENDED = "SUSPENDED"
    INACTIVE = "INACTIVE"

class UserGroups(Enum):
    UNKNOWN = "UNKNOWN"
    USER = "USER"
    CUSTOMER = "CUSTOMER"
    CLIENT = "CLIENT"
    EMPLOYEE = "EMPLOYEE"
    OWNER = "OWNER"
