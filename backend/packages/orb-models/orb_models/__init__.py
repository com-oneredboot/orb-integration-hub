"""
orb-models: Shared data models for ORB Integration Hub.

This package provides all data models, enums, and DynamoDB utilities
used across the ORB Integration Hub platform.
"""

from ._version import __version__

__author__ = "ORB Integration Hub Team"
__email__ = "team@orb-integration-hub.com"

# Import submodules
from . import enums
from . import models
from . import repository

# Import all models
from .models import ApplicationRoles
from .models import ApplicationUsers
from .models import Applications
from .models import AuthError
from .models import Auth
from .models import ErrorRegistry
from .models import MfaSetupDetails
from .models import Notifications
from .models import OrganizationUsers
from .models import Organizations
from .models import OwnershipTransferRequests
from .models import PrivacyRequests
from .models import Roles
from .models import SmsRateLimit
from .models import SmsVerification
from .models import Users

# Import all enums
from .enums import ApplicationRoleStatusEnum
from .enums import ApplicationStatusEnum
from .enums import ApplicationUserStatusEnum
from .enums import LegalBasisEnum
from .enums import NotificationStatusEnum
from .enums import NotificationTypeEnum
from .enums import OrganizationStatusEnum
from .enums import OrganizationUserRoleEnum
from .enums import OrganizationUserStatusEnum
from .enums import OwnershipTransferStatusEnum
from .enums import PrivacyRequestStatusEnum
from .enums import PrivacyRequestTypeEnum
from .enums import RoleStatusEnum
from .enums import RoleTypeEnum
from .enums import SchemaTypeEnum
from .enums import UserGroupEnum
from .enums import UserStatusEnum

# Import repository utilities
from .repository import ENTITY_TABLE_ENV

# Package metadata
__all__ = [
    # Metadata
    "__version__",
    "__author__",
    "__email__",
    # Modules
    "enums",
    "models",
    "repository",
    # Models
    "ApplicationRoles",
    "ApplicationUsers",
    "Applications",
    "AuthError",
    "Auth",
    "ErrorRegistry",
    "MfaSetupDetails",
    "Notifications",
    "OrganizationUsers",
    "Organizations",
    "OwnershipTransferRequests",
    "PrivacyRequests",
    "Roles",
    "SmsRateLimit",
    "SmsVerification",
    "Users",
    # Enums
    "ApplicationRoleStatusEnum",
    "ApplicationStatusEnum",
    "ApplicationUserStatusEnum",
    "LegalBasisEnum",
    "NotificationStatusEnum",
    "NotificationTypeEnum",
    "OrganizationStatusEnum",
    "OrganizationUserRoleEnum",
    "OrganizationUserStatusEnum",
    "OwnershipTransferStatusEnum",
    "PrivacyRequestStatusEnum",
    "PrivacyRequestTypeEnum",
    "RoleStatusEnum",
    "RoleTypeEnum",
    "SchemaTypeEnum",
    "UserGroupEnum",
    "UserStatusEnum",
    # Repository
    "ENTITY_TABLE_ENV",
]
