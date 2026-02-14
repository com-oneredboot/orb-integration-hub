/**
 * Authorization types for the Orb SDK.
 *
 * @module authorization/types
 */

/**
 * User roles matching orb-integration-hub user groups.
 */
export type UserRole = 'USER' | 'CUSTOMER' | 'EMPLOYEE' | 'OWNER';

/**
 * Organization roles.
 */
export type OrgRole = 'Admin' | 'Member' | 'Viewer';

/**
 * Permission check result.
 */
export interface PermissionResult {
  /** Whether the permission is granted */
  granted: boolean;
  /** Reason for denial if not granted */
  reason?: string;
}

/**
 * Role hierarchy - higher roles include permissions of lower roles.
 */
export const ROLE_HIERARCHY: Record<UserRole, UserRole[]> = {
  USER: ['USER'],
  CUSTOMER: ['USER', 'CUSTOMER'],
  EMPLOYEE: ['USER', 'CUSTOMER', 'EMPLOYEE'],
  OWNER: ['USER', 'CUSTOMER', 'EMPLOYEE', 'OWNER'],
};

/**
 * Organization role hierarchy.
 */
export const ORG_ROLE_HIERARCHY: Record<OrgRole, OrgRole[]> = {
  Viewer: ['Viewer'],
  Member: ['Viewer', 'Member'],
  Admin: ['Viewer', 'Member', 'Admin'],
};
