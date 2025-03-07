from dataclasses import dataclass
from typing import List, Optional, Any
from datetime import datetime

# Import enum types from enum file
from .user_enum import UserStatus, UserGroups

@dataclass
class User:
    user_id: str
    cognito_id: str
    email: str
    phone_number: str
    phone_verified: bool
    first_name: str
    last_name: str
    groups: List[UserGroups]
    status: UserStatus
    created_at: int
    updated_at: int