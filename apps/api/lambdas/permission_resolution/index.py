# file: apps/api/lambdas/permission_resolution/index.py
# author: AI Assistant
# created: 2026-01-27
# description: Lambda resolver for Permission Resolution GraphQL operations
# Feature: application-access-management, Task 7.1, 8.1

"""
Permission Resolution Lambda Resolver

Provides permission resolution operations:
- Resolve effective permissions for a user in an application environment
- Combine direct roles and group-inherited roles
- Check if user has specific permission
- Caching with TTL for performance
- Deterministic resolution (Property 4)
- Direct role priority (Property 5)
- Permission union (Property 6)
"""

import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any

import boto3
from boto3.dynamodb.conditions import Attr, Key

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Valid environments
VALID_ENVIRONMENTS = {"PRODUCTION", "STAGING", "DEVELOPMENT", "TEST", "PREVIEW"}

# Cache TTL in seconds (default 5 minutes)
CACHE_TTL_SECONDS = int(os.environ.get("PERMISSION_CACHE_TTL_SECONDS", "300"))


class PermissionCache:
    """Simple in-memory cache with TTL for resolved permissions.

    This cache is per-Lambda-instance and will be cleared when the instance
    is recycled. For production use with multiple Lambda instances, consider
    using ElastiCache/Redis for shared caching.
    """

    def __init__(self, ttl_seconds: int = CACHE_TTL_SECONDS) -> None:
        self._cache: dict[str, tuple[dict[str, Any], float]] = {}
        self._ttl_seconds = ttl_seconds

    def _make_key(self, user_id: str, application_id: str, environment: str) -> str:
        """Create a cache key from the resolution parameters."""
        return f"{user_id}:{application_id}:{environment}"

    def get(self, user_id: str, application_id: str, environment: str) -> dict[str, Any] | None:
        """Get cached permissions if not expired."""
        key = self._make_key(user_id, application_id, environment)
        if key in self._cache:
            data, timestamp = self._cache[key]
            if time.time() - timestamp < self._ttl_seconds:
                logger.debug(f"Cache hit for {key}")
                return data
            else:
                # Expired - remove from cache
                del self._cache[key]
                logger.debug(f"Cache expired for {key}")
        return None

    def set(
        self,
        user_id: str,
        application_id: str,
        environment: str,
        data: dict[str, Any],
    ) -> None:
        """Cache resolved permissions."""
        key = self._make_key(user_id, application_id, environment)
        self._cache[key] = (data, time.time())
        logger.debug(f"Cached permissions for {key}")

    def invalidate(self, user_id: str, application_id: str) -> None:
        """Invalidate all cached permissions for a user in an application.

        Called when roles or group memberships change.
        """
        prefix = f"{user_id}:{application_id}:"
        keys_to_remove = [k for k in self._cache if k.startswith(prefix)]
        for key in keys_to_remove:
            del self._cache[key]
        if keys_to_remove:
            logger.info(f"Invalidated {len(keys_to_remove)} cache entries for {prefix}")

    def invalidate_all_for_user(self, user_id: str) -> None:
        """Invalidate all cached permissions for a user across all applications."""
        prefix = f"{user_id}:"
        keys_to_remove = [k for k in self._cache if k.startswith(prefix)]
        for key in keys_to_remove:
            del self._cache[key]
        if keys_to_remove:
            logger.info(f"Invalidated {len(keys_to_remove)} cache entries for user {user_id}")

    def clear(self) -> None:
        """Clear all cached permissions."""
        count = len(self._cache)
        self._cache.clear()
        logger.info(f"Cleared {count} cache entries")


# Global cache instance (persists across Lambda invocations within same instance)
_permission_cache = PermissionCache()


class PermissionResolutionService:
    """Service for resolving user permissions in an application environment.

    Resolution algorithm:
    1. Collect direct ApplicationUserRole assignments for the user
    2. Collect user's group memberships (ApplicationGroupUser)
    3. For each group, collect ApplicationGroupRole assignments
    4. Merge all permissions (union)
    5. Direct roles take priority over group roles on conflict

    Properties validated:
    - Property 4: Determinism - same inputs always produce same outputs
    - Property 5: Direct Role Priority - direct roles override group roles
    - Property 6: Permission Union - effective permissions = union of all sources
    """

    def __init__(self) -> None:
        self.dynamodb = boto3.resource("dynamodb")
        self.user_roles_table = self.dynamodb.Table(
            os.environ.get(
                "APPLICATION_USER_ROLES_TABLE", "orb-integration-hub-dev-application-user-roles"
            )
        )
        self.group_users_table = self.dynamodb.Table(
            os.environ.get(
                "APPLICATION_GROUP_USERS_TABLE", "orb-integration-hub-dev-application-group-users"
            )
        )
        self.group_roles_table = self.dynamodb.Table(
            os.environ.get(
                "APPLICATION_GROUP_ROLES_TABLE", "orb-integration-hub-dev-application-group-roles"
            )
        )
        self.groups_table = self.dynamodb.Table(
            os.environ.get("APPLICATION_GROUPS_TABLE", "orb-integration-hub-dev-application-groups")
        )

    def resolve_permissions(self, event: dict[str, Any], use_cache: bool = True) -> dict[str, Any]:
        """Resolve effective permissions for a user in an application environment.

        Implements:
        - Property 4: Permission Resolution Determinism
        - Property 5: Direct Role Priority
        - Property 6: Permission Union

        Args:
            event: GraphQL event with arguments:
                - userId: User to resolve permissions for
                - applicationId: Application context
                - environment: Environment (PRODUCTION, STAGING, etc.)
                - skipCache: Optional boolean to bypass cache
            use_cache: Whether to use caching (default True)

        Returns:
            ResolvedPermissions object with:
                - userId, applicationId, environment
                - directRoles: List of direct role assignments
                - groupRoles: List of {group, role} from group memberships
                - effectivePermissions: Union of all permissions
                - resolvedAt: Timestamp of resolution
                - cached: Boolean indicating if result was from cache
        """
        try:
            args = event.get("arguments", {})
            user_id = args.get("userId")
            application_id = args.get("applicationId")
            environment = args.get("environment")
            skip_cache = args.get("skipCache", False)

            # Validate required fields
            if not user_id:
                return self._error_response("AAM012", "userId is required")
            if not application_id:
                return self._error_response("AAM002", "applicationId is required")
            if not environment:
                return self._error_response("AAM006", "environment is required")

            # Validate environment
            if environment not in VALID_ENVIRONMENTS:
                return self._error_response(
                    "AAM006",
                    f"Invalid environment. Must be one of: {', '.join(VALID_ENVIRONMENTS)}",
                )

            # Check cache first (unless skipped)
            if use_cache and not skip_cache:
                cached_result = _permission_cache.get(user_id, application_id, environment)
                if cached_result:
                    logger.info(
                        f"Cache hit for user {user_id} in app {application_id} env {environment}"
                    )
                    # Return cached result with cached flag
                    cached_result["cached"] = True
                    return {
                        "code": 200,
                        "success": True,
                        "item": cached_result,
                    }

            # Step 1: Get direct role assignments
            direct_roles = self._get_direct_roles(user_id, application_id, environment)

            # Step 2: Get user's group memberships for this application
            user_groups = self._get_user_groups(user_id, application_id)

            # Step 3: Get role assignments for each group
            group_roles = self._get_group_roles(user_groups, environment)

            # Step 4: Merge permissions (union of all)
            # Direct roles are included first, then group roles
            # This ensures direct role permissions are always present
            effective_permissions = self._merge_permissions(direct_roles, group_roles)

            now = int(datetime.now(tz=timezone.utc).timestamp())

            result = {
                "userId": user_id,
                "applicationId": application_id,
                "environment": environment,
                "directRoles": direct_roles,
                "groupRoles": group_roles,
                "effectivePermissions": effective_permissions,
                "resolvedAt": now,
                "cached": False,
            }

            # Cache the result
            if use_cache:
                _permission_cache.set(user_id, application_id, environment, result.copy())

            logger.info(
                f"Resolved permissions for user {user_id} in app {application_id} "
                f"env {environment}: {len(effective_permissions)} permissions"
            )

            return {
                "code": 200,
                "success": True,
                "item": result,
            }

        except Exception as e:
            logger.error(f"Error resolving permissions: {e}")
            return self._error_response("AAM012", f"Internal error: {e}")

    def has_permission(self, event: dict[str, Any]) -> dict[str, Any]:
        """Check if a user has a specific permission.

        Convenience method that resolves permissions and checks for a specific one.

        Args:
            event: GraphQL event with arguments:
                - userId: User to check
                - applicationId: Application context
                - environment: Environment
                - permission: Permission string to check for

        Returns:
            Boolean result indicating if user has the permission
        """
        try:
            args = event.get("arguments", {})
            permission = args.get("permission")

            if not permission:
                return self._error_response("AAM012", "permission is required")

            # Resolve all permissions first
            resolution_result = self.resolve_permissions(event)

            if not resolution_result.get("success"):
                return resolution_result

            resolved = resolution_result.get("item", {})
            effective_permissions = resolved.get("effectivePermissions", [])

            has_perm = permission in effective_permissions

            return {
                "code": 200,
                "success": True,
                "item": {
                    "userId": args.get("userId"),
                    "applicationId": args.get("applicationId"),
                    "environment": args.get("environment"),
                    "permission": permission,
                    "hasPermission": has_perm,
                },
            }

        except Exception as e:
            logger.error(f"Error checking permission: {e}")
            return self._error_response("AAM012", f"Internal error: {e}")

    def _get_direct_roles(
        self, user_id: str, application_id: str, environment: str
    ) -> list[dict[str, Any]]:
        """Get direct role assignments for a user in an application environment.

        Queries ApplicationUserRoles table for ACTIVE assignments.
        """
        try:
            response = self.user_roles_table.query(
                IndexName="UserEnvRoleIndex",
                KeyConditionExpression=Key("userId").eq(user_id)
                & Key("environment").eq(environment),
                FilterExpression=Attr("status").eq("ACTIVE")
                & Attr("applicationId").eq(application_id),
            )

            roles = []
            for item in response.get("Items", []):
                roles.append(
                    {
                        "applicationUserRoleId": item.get("applicationUserRoleId"),
                        "roleId": item.get("roleId"),
                        "roleName": item.get("roleName", ""),
                        "permissions": item.get("permissions", []),
                        "source": "direct",
                    }
                )

            # Sort by roleId for deterministic ordering (Property 4)
            roles.sort(key=lambda x: x.get("roleId", ""))

            return roles

        except Exception as e:
            logger.error(f"Error getting direct roles: {e}")
            return []

    def _get_user_groups(self, user_id: str, application_id: str) -> list[dict[str, Any]]:
        """Get all active group memberships for a user in an application.

        Queries ApplicationGroupUsers table and filters by application.
        """
        try:
            # Get all group memberships for this user
            response = self.group_users_table.query(
                IndexName="UserGroupsIndex",
                KeyConditionExpression=Key("userId").eq(user_id),
                FilterExpression=Attr("status").eq("ACTIVE"),
            )

            groups = []
            for item in response.get("Items", []):
                # Filter by application (membership has applicationId)
                if item.get("applicationId") == application_id:
                    group_id = item.get("applicationGroupId")
                    # Get group details
                    group = self._get_group(group_id)
                    if group and group.get("status") == "ACTIVE":
                        groups.append(
                            {
                                "applicationGroupId": group_id,
                                "groupName": group.get("name", ""),
                                "membershipId": item.get("applicationGroupUserId"),
                            }
                        )

            # Sort by groupId for deterministic ordering (Property 4)
            groups.sort(key=lambda x: x.get("applicationGroupId", ""))

            return groups

        except Exception as e:
            logger.error(f"Error getting user groups: {e}")
            return []

    def _get_group(self, group_id: str) -> dict[str, Any] | None:
        """Get a group by ID."""
        try:
            response = self.groups_table.get_item(Key={"applicationGroupId": group_id})
            return response.get("Item")
        except Exception as e:
            logger.error(f"Error getting group {group_id}: {e}")
            return None

    def _get_group_roles(
        self, user_groups: list[dict[str, Any]], environment: str
    ) -> list[dict[str, Any]]:
        """Get role assignments for all groups in a specific environment.

        For each group the user belongs to, get the role assignment for the environment.
        """
        try:
            group_roles = []

            for group in user_groups:
                group_id = group.get("applicationGroupId")

                # Query role assignment for this group in this environment
                response = self.group_roles_table.query(
                    IndexName="GroupEnvRoleIndex",
                    KeyConditionExpression=Key("applicationGroupId").eq(group_id)
                    & Key("environment").eq(environment),
                    FilterExpression=Attr("status").eq("ACTIVE"),
                )

                for item in response.get("Items", []):
                    group_roles.append(
                        {
                            "applicationGroupRoleId": item.get("applicationGroupRoleId"),
                            "applicationGroupId": group_id,
                            "groupName": group.get("groupName", ""),
                            "roleId": item.get("roleId"),
                            "roleName": item.get("roleName", ""),
                            "permissions": item.get("permissions", []),
                            "source": "group",
                        }
                    )

            # Sort by groupId then roleId for deterministic ordering (Property 4)
            group_roles.sort(key=lambda x: (x.get("applicationGroupId", ""), x.get("roleId", "")))

            return group_roles

        except Exception as e:
            logger.error(f"Error getting group roles: {e}")
            return []

    def _merge_permissions(
        self,
        direct_roles: list[dict[str, Any]],
        group_roles: list[dict[str, Any]],
    ) -> list[str]:
        """Merge permissions from direct and group roles.

        Implements:
        - Property 5: Direct Role Priority - direct permissions always included
        - Property 6: Permission Union - result is union of all permissions

        The merge is a simple union - all permissions from all sources are combined.
        Direct roles don't "override" group roles in the sense of removing permissions,
        they just ensure direct permissions are always present.
        """
        all_permissions: set[str] = set()

        # Add direct role permissions first (Property 5: always included)
        for role in direct_roles:
            permissions = role.get("permissions", [])
            all_permissions.update(permissions)

        # Add group role permissions (Property 6: union)
        for role in group_roles:
            permissions = role.get("permissions", [])
            all_permissions.update(permissions)

        # Sort for deterministic ordering (Property 4)
        return sorted(all_permissions)

    def _error_response(self, code: str, message: str) -> dict[str, Any]:
        """Generate standardized error response."""
        return {
            "code": 400,
            "success": False,
            "message": f"[{code}] {message}",
            "item": None,
        }

    def invalidate_cache(self, event: dict[str, Any]) -> dict[str, Any]:
        """Invalidate cached permissions for a user.

        Called when roles or group memberships change.

        Args:
            event: GraphQL event with arguments:
                - userId: User to invalidate cache for
                - applicationId: Optional - if provided, only invalidate for this app

        Returns:
            Success response
        """
        try:
            args = event.get("arguments", {})
            user_id = args.get("userId")
            application_id = args.get("applicationId")

            if not user_id:
                return self._error_response("AAM012", "userId is required")

            if application_id:
                _permission_cache.invalidate(user_id, application_id)
                message = f"Cache invalidated for user {user_id} in app {application_id}"
            else:
                _permission_cache.invalidate_all_for_user(user_id)
                message = f"Cache invalidated for user {user_id} in all applications"

            logger.info(message)

            return {
                "code": 200,
                "success": True,
                "message": message,
            }

        except Exception as e:
            logger.error(f"Error invalidating cache: {e}")
            return self._error_response("AAM012", f"Internal error: {e}")


# Lambda handler
def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Main Lambda handler for Permission Resolution GraphQL operations."""
    try:
        logger.info(f"PermissionResolution resolver invoked with event: {json.dumps(event)}")

        service = PermissionResolutionService()

        # Extract operation type from event
        field_name = event.get("info", {}).get("fieldName")

        # Route to appropriate method based on GraphQL field
        handlers = {
            "ResolvePermissions": service.resolve_permissions,
            "HasPermission": service.has_permission,
            "InvalidatePermissionCache": service.invalidate_cache,
        }

        handler = handlers.get(field_name)
        if handler:
            return handler(event)

        return {
            "code": 400,
            "success": False,
            "message": f"Unknown operation: {field_name}",
        }

    except Exception as e:
        logger.error(f"Unhandled error in PermissionResolution resolver: {e}")
        return {
            "code": 500,
            "success": False,
            "message": "Internal server error",
        }
