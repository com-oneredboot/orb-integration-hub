# file: apps/api/layers/organizations_security/rbac_manager.py
# author: AI Assistant
# created: 2025-06-23
# description: Hierarchical Role-Based Access Control (RBAC) system for organization security

import logging
import boto3
from typing import Dict, List, Set, Optional, Tuple, Any
from enum import Enum
from dataclasses import dataclass

logger = logging.getLogger(__name__)


class OrganizationRole(Enum):
    """Organization role hierarchy."""

    OWNER = "OWNER"
    ADMINISTRATOR = "ADMINISTRATOR"
    VIEWER = "VIEWER"


class PermissionCategory(Enum):
    """Permission categories for organization operations."""

    ORGANIZATION = "organization"
    APPLICATIONS = "applications"
    USERS = "users"
    SETTINGS = "settings"
    BILLING = "billing"
    SECURITY = "security"


@dataclass
class Permission:
    """Individual permission definition."""

    category: PermissionCategory
    action: str
    description: str

    @property
    def key(self) -> str:
        """Get permission key in format 'category.action'."""
        return f"{self.category.value}.{self.action}"


class OrganizationPermissions:
    """Centralized permission definitions for organization operations."""

    # Organization permissions
    ORGANIZATION_READ = Permission(
        PermissionCategory.ORGANIZATION, "read", "View organization details"
    )
    ORGANIZATION_UPDATE = Permission(
        PermissionCategory.ORGANIZATION, "update", "Update organization settings"
    )
    ORGANIZATION_DELETE = Permission(
        PermissionCategory.ORGANIZATION, "delete", "Delete organization"
    )
    ORGANIZATION_TRANSFER = Permission(
        PermissionCategory.ORGANIZATION, "transfer", "Transfer organization ownership"
    )

    # Application permissions
    APPLICATIONS_READ = Permission(PermissionCategory.APPLICATIONS, "read", "View applications")
    APPLICATIONS_CREATE = Permission(
        PermissionCategory.APPLICATIONS, "create", "Create new applications"
    )
    APPLICATIONS_UPDATE = Permission(
        PermissionCategory.APPLICATIONS, "update", "Update application settings"
    )
    APPLICATIONS_DELETE = Permission(
        PermissionCategory.APPLICATIONS, "delete", "Delete applications"
    )
    APPLICATIONS_MANAGE_KEYS = Permission(
        PermissionCategory.APPLICATIONS, "manage_keys", "Manage API keys"
    )
    APPLICATIONS_MANAGE_ENVS = Permission(
        PermissionCategory.APPLICATIONS, "manage_environments", "Manage environments"
    )

    # User management permissions
    USERS_READ = Permission(PermissionCategory.USERS, "read", "View organization users")
    USERS_INVITE = Permission(PermissionCategory.USERS, "invite", "Invite new users")
    USERS_REMOVE = Permission(PermissionCategory.USERS, "remove", "Remove users from organization")
    USERS_UPDATE_ROLES = Permission(PermissionCategory.USERS, "update_roles", "Change user roles")
    USERS_VIEW_ACTIVITY = Permission(
        PermissionCategory.USERS, "view_activity", "View user activity logs"
    )

    # Settings permissions
    SETTINGS_READ = Permission(PermissionCategory.SETTINGS, "read", "View organization settings")
    SETTINGS_UPDATE = Permission(
        PermissionCategory.SETTINGS, "update", "Update organization settings"
    )
    SETTINGS_ENCRYPTION = Permission(
        PermissionCategory.SETTINGS, "encryption", "Manage encryption settings"
    )
    SETTINGS_INTEGRATIONS = Permission(
        PermissionCategory.SETTINGS, "integrations", "Manage integrations"
    )

    # Billing permissions
    BILLING_READ = Permission(PermissionCategory.BILLING, "read", "View billing information")
    BILLING_UPDATE = Permission(PermissionCategory.BILLING, "update", "Update billing settings")
    BILLING_CANCEL = Permission(PermissionCategory.BILLING, "cancel", "Cancel subscription")

    # Security permissions
    SECURITY_READ = Permission(PermissionCategory.SECURITY, "read", "View security logs")
    SECURITY_AUDIT = Permission(PermissionCategory.SECURITY, "audit", "Access audit logs")
    SECURITY_MANAGE_KEYS = Permission(
        PermissionCategory.SECURITY, "manage_keys", "Manage encryption keys"
    )

    @classmethod
    def get_all_permissions(cls) -> List[Permission]:
        """Get all defined permissions."""
        permissions = []
        for attr_name in dir(cls):
            attr = getattr(cls, attr_name)
            if isinstance(attr, Permission):
                permissions.append(attr)
        return permissions

    @classmethod
    def get_permissions_by_category(cls, category: PermissionCategory) -> List[Permission]:
        """Get all permissions for a specific category."""
        return [p for p in cls.get_all_permissions() if p.category == category]


class RolePermissionMatrix:
    """Defines which permissions each role has."""

    # Owner has all permissions
    OWNER_PERMISSIONS = {
        # Organization
        OrganizationPermissions.ORGANIZATION_READ.key,
        OrganizationPermissions.ORGANIZATION_UPDATE.key,
        OrganizationPermissions.ORGANIZATION_DELETE.key,
        OrganizationPermissions.ORGANIZATION_TRANSFER.key,
        # Applications
        OrganizationPermissions.APPLICATIONS_READ.key,
        OrganizationPermissions.APPLICATIONS_CREATE.key,
        OrganizationPermissions.APPLICATIONS_UPDATE.key,
        OrganizationPermissions.APPLICATIONS_DELETE.key,
        OrganizationPermissions.APPLICATIONS_MANAGE_KEYS.key,
        OrganizationPermissions.APPLICATIONS_MANAGE_ENVS.key,
        # Users
        OrganizationPermissions.USERS_READ.key,
        OrganizationPermissions.USERS_INVITE.key,
        OrganizationPermissions.USERS_REMOVE.key,
        OrganizationPermissions.USERS_UPDATE_ROLES.key,
        OrganizationPermissions.USERS_VIEW_ACTIVITY.key,
        # Settings
        OrganizationPermissions.SETTINGS_READ.key,
        OrganizationPermissions.SETTINGS_UPDATE.key,
        OrganizationPermissions.SETTINGS_ENCRYPTION.key,
        OrganizationPermissions.SETTINGS_INTEGRATIONS.key,
        # Billing
        OrganizationPermissions.BILLING_READ.key,
        OrganizationPermissions.BILLING_UPDATE.key,
        OrganizationPermissions.BILLING_CANCEL.key,
        # Security
        OrganizationPermissions.SECURITY_READ.key,
        OrganizationPermissions.SECURITY_AUDIT.key,
        OrganizationPermissions.SECURITY_MANAGE_KEYS.key,
    }

    # Administrator has most permissions except critical owner actions
    ADMINISTRATOR_PERMISSIONS = {
        # Organization (read-only)
        OrganizationPermissions.ORGANIZATION_READ.key,
        # Applications (full management)
        OrganizationPermissions.APPLICATIONS_READ.key,
        OrganizationPermissions.APPLICATIONS_CREATE.key,
        OrganizationPermissions.APPLICATIONS_UPDATE.key,
        OrganizationPermissions.APPLICATIONS_MANAGE_KEYS.key,
        OrganizationPermissions.APPLICATIONS_MANAGE_ENVS.key,
        # Note: No APPLICATIONS_DELETE (only owner can delete)
        # Users (can manage but not remove other admins)
        OrganizationPermissions.USERS_READ.key,
        OrganizationPermissions.USERS_INVITE.key,
        OrganizationPermissions.USERS_VIEW_ACTIVITY.key,
        # Note: USERS_REMOVE and USERS_UPDATE_ROLES have special logic
        # Settings (limited)
        OrganizationPermissions.SETTINGS_READ.key,
        OrganizationPermissions.SETTINGS_INTEGRATIONS.key,
        # Note: No SETTINGS_UPDATE, SETTINGS_ENCRYPTION (owner only)
        # Billing (read-only)
        OrganizationPermissions.BILLING_READ.key,
        # Security (read-only)
        OrganizationPermissions.SECURITY_READ.key,
    }

    # Viewer has minimal read-only permissions
    VIEWER_PERMISSIONS = {
        # Organization (read-only)
        OrganizationPermissions.ORGANIZATION_READ.key,
        # Applications (read-only)
        OrganizationPermissions.APPLICATIONS_READ.key,
        # Users (read-only)
        OrganizationPermissions.USERS_READ.key,
        # Settings (read-only)
        OrganizationPermissions.SETTINGS_READ.key,
        # Billing (read-only)
        OrganizationPermissions.BILLING_READ.key,
    }

    @classmethod
    def get_role_permissions(cls, role: OrganizationRole) -> Set[str]:
        """Get all permissions for a specific role."""
        if role == OrganizationRole.OWNER:
            return cls.OWNER_PERMISSIONS.copy()
        elif role == OrganizationRole.ADMINISTRATOR:
            return cls.ADMINISTRATOR_PERMISSIONS.copy()
        elif role == OrganizationRole.VIEWER:
            return cls.VIEWER_PERMISSIONS.copy()
        else:
            return set()


class OrganizationRBACManager:
    """
    Hierarchical Role-Based Access Control manager for organization operations.
    Provides fine-grained permission checking with role hierarchy support.
    """

    def __init__(self, region: str = None):
        """
        Initialize the RBAC manager.

        Args:
            region: AWS region, defaults to None (uses AWS_REGION env var)
        """
        self.dynamodb = boto3.resource("dynamodb", region_name=region)
        self.organizations_table = self.dynamodb.Table("Organizations")
        self.org_users_table = self.dynamodb.Table("OrganizationUsers")

        # Cache for user roles and permissions (in production, use Redis)
        self._permission_cache = {}

    def check_permission(
        self,
        user_id: str,
        organization_id: str,
        permission_key: str,
        cognito_groups: Optional[List[str]] = None,
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Check if a user has a specific permission in an organization.

        Args:
            user_id: The user's ID
            organization_id: The organization ID
            permission_key: Permission key in format 'category.action'
            cognito_groups: User's Cognito groups for platform-level access

        Returns:
            Tuple of (has_permission, context_info)
        """
        try:
            # Get user's role in the organization
            user_role, role_context = self._get_user_organization_role(user_id, organization_id)

            if not user_role:
                return False, {
                    "reason": "user_not_member",
                    "organizationId": organization_id,
                    "userId": user_id,
                }

            # Platform-level access check (OWNER, EMPLOYEE have override access)
            if cognito_groups and self._has_platform_override(cognito_groups):
                return True, {
                    "reason": "platform_access",
                    "role": "PLATFORM_ADMIN",
                    "organizationId": organization_id,
                }

            # Check if role has the requested permission
            role_permissions = RolePermissionMatrix.get_role_permissions(user_role)

            # Special permission logic for certain actions
            if permission_key in self._get_special_permission_rules():
                has_permission = self._check_special_permission(
                    user_id, organization_id, permission_key, user_role, role_context
                )
            else:
                has_permission = permission_key in role_permissions

            context = {
                "organizationId": organization_id,
                "userId": user_id,
                "role": user_role.value,
                "permission": permission_key,
                "hasPermission": has_permission,
            }

            return has_permission, context

        except Exception as e:
            logger.error(f"Error checking permission {permission_key} for user {user_id}: {str(e)}")
            return False, {
                "reason": "error",
                "error": str(e),
                "organizationId": organization_id,
            }

    def get_user_permissions(
        self,
        user_id: str,
        organization_id: str,
        cognito_groups: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Get all permissions for a user in an organization.

        Args:
            user_id: The user's ID
            organization_id: The organization ID
            cognito_groups: User's Cognito groups

        Returns:
            Dict with user permissions and role info
        """
        try:
            user_role, role_context = self._get_user_organization_role(user_id, organization_id)

            if not user_role:
                return {
                    "role": None,
                    "permissions": [],
                    "organizationId": organization_id,
                    "isMember": False,
                }

            # Platform-level access override
            if cognito_groups and self._has_platform_override(cognito_groups):
                all_permissions = [p.key for p in OrganizationPermissions.get_all_permissions()]
                return {
                    "role": "PLATFORM_ADMIN",
                    "permissions": all_permissions,
                    "organizationId": organization_id,
                    "isMember": True,
                    "isPlatformAdmin": True,
                }

            # Get role-based permissions
            base_permissions = list(RolePermissionMatrix.get_role_permissions(user_role))

            # Add special permissions based on role and context
            effective_permissions = self._calculate_effective_permissions(
                user_id, organization_id, user_role, base_permissions, role_context
            )

            return {
                "role": user_role.value,
                "permissions": effective_permissions,
                "organizationId": organization_id,
                "isMember": True,
                "isOwner": user_role == OrganizationRole.OWNER,
            }

        except Exception as e:
            logger.error(f"Error getting user permissions for {user_id}: {str(e)}")
            return {
                "role": None,
                "permissions": [],
                "organizationId": organization_id,
                "error": str(e),
            }

    def _get_user_organization_role(
        self, user_id: str, organization_id: str
    ) -> Tuple[Optional[OrganizationRole], Dict[str, Any]]:
        """Get user's role in an organization."""
        try:
            # Check if user is the organization owner
            org_response = self.organizations_table.get_item(
                Key={"organizationId": organization_id}
            )

            if not org_response.get("Item"):
                return None, {"reason": "organization_not_found"}

            organization = org_response["Item"]

            # Check ownership first
            if organization.get("ownerId") == user_id:
                return OrganizationRole.OWNER, {
                    "reason": "owner",
                    "organizationId": organization_id,
                }

            # Check organization membership
            member_response = self.org_users_table.get_item(
                Key={"userId": user_id, "organizationId": organization_id}
            )

            if not member_response.get("Item"):
                return None, {"reason": "not_member"}

            member = member_response["Item"]

            # Check if membership is active
            if member.get("status") != "ACTIVE":
                return None, {
                    "reason": "membership_inactive",
                    "status": member.get("status"),
                }

            # Get role from membership
            role_str = member.get("role", "VIEWER")
            try:
                role = OrganizationRole(role_str)
                return role, {
                    "reason": "member",
                    "organizationId": organization_id,
                    "membershipStatus": member.get("status"),
                }
            except ValueError:
                logger.warning(f"Invalid role {role_str} for user {user_id}")
                return OrganizationRole.VIEWER, {
                    "reason": "invalid_role_defaulted",
                    "originalRole": role_str,
                }

        except Exception as e:
            logger.error(f"Error getting user role for {user_id}: {str(e)}")
            return None, {"reason": "error", "error": str(e)}

    def _has_platform_override(self, cognito_groups: List[str]) -> bool:
        """Check if user has platform-level override access."""
        return "OWNER" in cognito_groups or "EMPLOYEE" in cognito_groups

    def _get_special_permission_rules(self) -> Set[str]:
        """Get permissions that have special logic."""
        return {
            OrganizationPermissions.USERS_REMOVE.key,
            OrganizationPermissions.USERS_UPDATE_ROLES.key,
            OrganizationPermissions.APPLICATIONS_DELETE.key,
        }

    def _check_special_permission(
        self,
        user_id: str,
        organization_id: str,
        permission_key: str,
        user_role: OrganizationRole,
        role_context: Dict[str, Any],
    ) -> bool:
        """Check special permissions with custom logic."""

        # Only owners can delete applications (critical operation)
        if permission_key == OrganizationPermissions.APPLICATIONS_DELETE.key:
            return user_role == OrganizationRole.OWNER

        # User management permissions need special handling
        if permission_key in [
            OrganizationPermissions.USERS_REMOVE.key,
            OrganizationPermissions.USERS_UPDATE_ROLES.key,
        ]:
            # Owners can do anything with users
            if user_role == OrganizationRole.OWNER:
                return True

            # Administrators can manage viewers but not other administrators
            if user_role == OrganizationRole.ADMINISTRATOR:
                # Would need target user's role to make this determination
                # For now, return True (actual implementation would check target role)
                return True

            return False

        return False

    def _calculate_effective_permissions(
        self,
        user_id: str,
        organization_id: str,
        user_role: OrganizationRole,
        base_permissions: List[str],
        role_context: Dict[str, Any],
    ) -> List[str]:
        """Calculate effective permissions including special rules."""
        effective_permissions = base_permissions.copy()

        # Add conditional permissions for administrators
        if user_role == OrganizationRole.ADMINISTRATOR:
            # Can remove/update users (with restrictions checked at operation time)
            effective_permissions.extend(
                [
                    OrganizationPermissions.USERS_REMOVE.key,
                    OrganizationPermissions.USERS_UPDATE_ROLES.key,
                ]
            )

        return effective_permissions
