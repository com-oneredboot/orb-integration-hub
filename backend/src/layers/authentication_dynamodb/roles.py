# file: backend/infrastructure/layers/database/python/database/models.py
# author: Corey Dale Peters
# created: 2025-02-17
# description: This file contains the models used by the database layer.

# 3rd Party Imports
from typing import List
from pydantic import BaseModel, Field
from datetime import datetime

class RoleData(BaseModel):
    """Model for role data stored in DynamoDB"""
    roleId: str
    applicationId: str
    roleName: str
    roleType: str
    permissions: List[str]
    createdAt: datetime
    updatedAt: datetime
    active: bool

class UserRoles(BaseModel):
    """Model for user roles and permissions"""
    applicationRoles: List[str]
    permissions: List[str]

