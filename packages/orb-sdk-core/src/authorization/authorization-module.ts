/**
 * Authorization module for permission checking.
 *
 * @module authorization/authorization-module
 */

import type { UserRole, OrgRole, PermissionResult } from './types';
import { ROLE_HIERARCHY, ORG_ROLE_HIERARCHY } from './types';
import { AuthorizationError, ErrorCode } from '../errors/errors';
import type { TokenManager } from '../auth/token-manager';
import { jwtDecode } from 'jwt-decode';

/**
 * JWT payload with Cognito groups.
 */
interface CognitoJwtPayload {
  sub: string;
  'cognito:groups'?: string[];
  [key: string]: unknown;
}

/**
 * Cache entry for permission results.
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Authorization module configuration.
 */
export interface AuthorizationModuleConfig {
  /** Token manager for getting current tokens */
  tokenManager: TokenManager;
  /** Cache TTL in seconds (default: 300) */
  cacheTtlSeconds?: number;
}

/**
 * Authorization module for checking permissions and roles.
 *
 * @example
 * ```typescript
 * const authz = new AuthorizationModule({ tokenManager });
 *
 * // Check permission
 * const canRead = await authz.hasPermission('read:users');
 *
 * // Check role
 * const isOwner = await authz.hasRole('OWNER');
 *
 * // Check organization role
 * const isOrgAdmin = await authz.hasOrgRole('org-123', 'Admin');
 * ```
 */
export class AuthorizationModule {
  private readonly tokenManager: TokenManager;
  private readonly cacheTtlSeconds: number;
  private readonly permissionCache: Map<string, CacheEntry<boolean>> = new Map();
  private readonly roleCache: Map<string, CacheEntry<UserRole[]>> = new Map();

  constructor(config: AuthorizationModuleConfig) {
    this.tokenManager = config.tokenManager;
    this.cacheTtlSeconds = config.cacheTtlSeconds ?? 300;
  }

  /**
   * Check if the current user has a specific permission.
   *
   * @param permission - Permission to check (e.g., 'read:users')
   * @returns Whether the permission is granted
   */
  async hasPermission(permission: string): Promise<boolean> {
    // Check cache
    const cached = this.getCached(this.permissionCache, permission);
    if (cached !== undefined) {
      return cached;
    }

    // Get user roles from token
    const roles = await this.getRoles();

    // Map permission to required role
    // This is a simplified implementation - in production, this would
    // query the backend for permission resolution
    const result = this.checkPermissionAgainstRoles(permission, roles);

    // Cache result
    this.setCache(this.permissionCache, permission, result);

    return result;
  }

  /**
   * Check if the current user has a specific role.
   *
   * @param role - Role to check
   * @returns Whether the user has the role
   */
  async hasRole(role: UserRole): Promise<boolean> {
    const roles = await this.getRoles();
    return roles.some((userRole) => {
      const hierarchy = ROLE_HIERARCHY[userRole];
      return hierarchy !== undefined && hierarchy.includes(role);
    });
  }

  /**
   * Check if the current user has a specific role in an organization.
   *
   * @param orgId - Organization ID
   * @param role - Organization role to check
   * @returns Whether the user has the role in the organization
   */
  async hasOrgRole(orgId: string, role: OrgRole): Promise<boolean> {
    // This would typically query the backend for organization membership
    // For now, we check if the user has any role that includes the required role
    const cacheKey = `org:${orgId}:${role}`;
    const cached = this.getCached(this.permissionCache, cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    // In a real implementation, this would query the backend
    // For now, return false as we don't have org membership data
    const result = false;

    this.setCache(this.permissionCache, cacheKey, result);
    return result;
  }

  /**
   * Get all permissions for the current user.
   *
   * @returns Array of permission strings
   */
  async getPermissions(): Promise<string[]> {
    const roles = await this.getRoles();
    return this.getPermissionsForRoles(roles);
  }

  /**
   * Get all roles for the current user.
   *
   * @returns Array of user roles
   */
  async getRoles(): Promise<UserRole[]> {
    const cacheKey = 'user:roles';
    const cached = this.getCached(this.roleCache, cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const tokens = await this.tokenManager.getTokens();
    if (tokens === null) {
      return [];
    }

    try {
      const decoded = jwtDecode<CognitoJwtPayload>(tokens.idToken);
      const groups = decoded['cognito:groups'] ?? [];
      const roles = groups.filter((g: string): g is UserRole =>
        ['USER', 'CUSTOMER', 'EMPLOYEE', 'OWNER'].includes(g)
      );

      this.setCache(this.roleCache, cacheKey, roles);
      return roles;
    } catch {
      return [];
    }
  }

  /**
   * Get all organization roles for the current user.
   *
   * @param orgId - Organization ID
   * @returns Array of organization roles
   */
  async getOrgRoles(orgId: string): Promise<OrgRole[]> {
    // This would typically query the backend
    // For now, return empty array
    void orgId;
    return [];
  }

  /**
   * Invalidate the permission cache.
   */
  invalidateCache(): void {
    this.permissionCache.clear();
    this.roleCache.clear();
  }

  /**
   * Require a permission, throwing if not granted.
   *
   * @param permission - Permission to require
   * @throws {AuthorizationError} If permission is not granted
   */
  async requirePermission(permission: string): Promise<void> {
    const hasPermission = await this.hasPermission(permission);
    if (!hasPermission) {
      throw new AuthorizationError(
        `Permission denied: ${permission}`,
        ErrorCode.PERMISSION_DENIED
      );
    }
  }

  /**
   * Require a role, throwing if not granted.
   *
   * @param role - Role to require
   * @throws {AuthorizationError} If role is not granted
   */
  async requireRole(role: UserRole): Promise<void> {
    const hasRole = await this.hasRole(role);
    if (!hasRole) {
      throw new AuthorizationError(
        `Insufficient role: ${role} required`,
        ErrorCode.INSUFFICIENT_ROLE
      );
    }
  }

  /**
   * Check permission against user roles.
   */
  private checkPermissionAgainstRoles(
    permission: string,
    roles: UserRole[]
  ): boolean {
    // Simple permission mapping
    // In production, this would be more sophisticated
    const [action, resource] = permission.split(':');

    // OWNER can do everything
    if (roles.includes('OWNER')) {
      return true;
    }

    // EMPLOYEE can read and write most things
    if (roles.includes('EMPLOYEE')) {
      return action === 'read' || action === 'write';
    }

    // CUSTOMER can read their own data
    if (roles.includes('CUSTOMER')) {
      return action === 'read';
    }

    // USER has minimal permissions
    if (roles.includes('USER')) {
      return action === 'read' && resource === 'self';
    }

    return false;
  }

  /**
   * Get permissions for a set of roles.
   */
  private getPermissionsForRoles(roles: UserRole[]): string[] {
    const permissions: Set<string> = new Set();

    for (const role of roles) {
      switch (role) {
        case 'OWNER':
          permissions.add('read:*');
          permissions.add('write:*');
          permissions.add('delete:*');
          permissions.add('admin:*');
          break;
        case 'EMPLOYEE':
          permissions.add('read:*');
          permissions.add('write:*');
          break;
        case 'CUSTOMER':
          permissions.add('read:self');
          permissions.add('read:organization');
          break;
        case 'USER':
          permissions.add('read:self');
          break;
      }
    }

    return Array.from(permissions);
  }

  /**
   * Get a cached value if not expired.
   */
  private getCached<T>(
    cache: Map<string, CacheEntry<T>>,
    key: string
  ): T | undefined {
    const entry = cache.get(key);
    if (entry === undefined) {
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /**
   * Set a cached value.
   */
  private setCache<T>(
    cache: Map<string, CacheEntry<T>>,
    key: string,
    value: T
  ): void {
    cache.set(key, {
      value,
      expiresAt: Date.now() + this.cacheTtlSeconds * 1000,
    });
  }
}
