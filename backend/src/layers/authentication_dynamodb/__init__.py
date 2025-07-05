# file: backend/src/layers/authentication_dynamodb/__init__.py
# author: Corey Dale Peters
# date: 2025-03-07
# description: Python file

# infrastructure/layers/database/python/database/__init__.py
from .core import CoreDynamoDBService
from .models import RoleData, UserRoles
from .exceptions import DatabaseError, RecordNotFoundError
from .cognito_groups import CognitoGroupManager, get_cognito_group_manager, add_user_to_default_group, validate_user_access

__all__ = [
    'CoreDynamoDBService', 
    'RoleData', 
    'UserRoles', 
    'DatabaseError', 
    'RecordNotFoundError',
    'CognitoGroupManager',
    'get_cognito_group_manager',
    'add_user_to_default_group',
    'validate_user_access'
]
