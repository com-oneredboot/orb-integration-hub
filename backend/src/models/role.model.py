# file: backend/src/models/role.model.py
# author: Corey Dale Peters
# date: 2025-03-07
# description: Python file

from dataclasses import dataclass
from typing import List, Optional, Any
from datetime import datetime

@dataclass
class Role:
    role_id: str
    user_id: str
    application_id: str
    role_name: str
    role_type: str
    permissions: List[Any]
    created_at: int
    updated_at: int
    active: bool