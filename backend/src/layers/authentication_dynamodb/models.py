from typing import List, Dict, Any
from pydantic import BaseModel


class RoleData(BaseModel):
    roleId: str
    applicationId: str
    roleName: str
    permissions: List[str]


class UserRoles(BaseModel):
    applicationRoles: List[str]
    permissions: List[str] 