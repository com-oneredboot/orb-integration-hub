from enum import Enum

class ApplicationRoleStatus(Enum):
    UNKNOWN = "UNKNOWN"
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    PENDING = "PENDING"
    REJECTED = "REJECTED"
    DELETED = "DELETED"
 