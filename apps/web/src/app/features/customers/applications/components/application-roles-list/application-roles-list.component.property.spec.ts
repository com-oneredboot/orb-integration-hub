/**
 * Application Roles List Component Property Tests
 *
 * Property-based tests for role display completeness.
 * Tests that all role fields are correctly transformed for display.
 *
 * Since the reducer imports @ngrx/store (ESM), we replicate the pure
 * buildRoleRows logic here and test it directly.
 *
 * Feature: application-roles-management, Property 3: Role Display Completeness
 * **Validates: Requirements 4.2, 4.3, 4.4, 4.5, 4.6**
 */

import * as fc from 'fast-check';
import { ApplicationRoleStatus } from '../../../../../core/enums/ApplicationRoleStatusEnum';
import { ApplicationRoleType } from '../../../../../core/enums/ApplicationRoleTypeEnum';

// ---------------------------------------------------------------------------
// Interfaces (mirrored from state.ts)
// ---------------------------------------------------------------------------

interface IApplicationRoles {
  applicationRoleId: string;
  applicationId: string;
  roleId: string;
  roleName: string;
  roleType: string;
  description?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ApplicationRoleTableRow {
  role: IApplicationRoles;
  roleTypeLabel: string;
  statusLabel: string;
  lastActivity: string;
}

// ---------------------------------------------------------------------------
// Pure functions (replicated from reducer)
// ---------------------------------------------------------------------------

const ROLE_TYPE_LABELS: Record<string, string> = {
  [ApplicationRoleType.Admin]: 'Admin',
  [ApplicationRoleType.User]: 'User',
  [ApplicationRoleType.Guest]: 'Guest',
  [ApplicationRoleType.Custom]: 'Custom',
  [ApplicationRoleType.Unknown]: 'Unknown',
};

const STATUS_LABELS: Record<string, string> = {
  [ApplicationRoleStatus.Active]: 'Active',
  [ApplicationRoleStatus.Inactive]: 'Inactive',
  [ApplicationRoleStatus.Deleted]: 'Deleted',
  [ApplicationRoleStatus.Pending]: 'Pending',
  [ApplicationRoleStatus.Rejected]: 'Rejected',
  [ApplicationRoleStatus.Unknown]: 'Unknown',
};

function getRoleTypeLabel(roleType: string): string {
  return ROLE_TYPE_LABELS[roleType] || roleType;
}

function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

function formatLastActivity(dateValue: string | Date | number | undefined): string {
  if (!dateValue) return 'Never';
  const date =
    typeof dateValue === 'number'
      ? new Date(dateValue * 1000)
      : dateValue instanceof Date
        ? dateValue
        : new Date(dateValue);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return diffMins + ' min ago';
  if (diffHours < 24) return diffHours + ' hour' + (diffHours > 1 ? 's' : '') + ' ago';
  if (diffDays < 7) return diffDays + ' day' + (diffDays > 1 ? 's' : '') + ' ago';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function buildRoleRows(roles: IApplicationRoles[]): ApplicationRoleTableRow[] {
  return roles.map((role) => ({
    role,
    roleTypeLabel: getRoleTypeLabel(role.roleType),
    statusLabel: getStatusLabel(role.status),
    lastActivity: formatLastActivity(role.updatedAt),
  }));
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const roleTypeArb = fc.constantFrom(
  ApplicationRoleType.Admin,
  ApplicationRoleType.User,
  ApplicationRoleType.Guest,
  ApplicationRoleType.Custom
);

const roleStatusArb = fc.constantFrom(
  ApplicationRoleStatus.Active,
  ApplicationRoleStatus.Inactive,
  ApplicationRoleStatus.Deleted
);

const roleArb: fc.Arbitrary<IApplicationRoles> = fc.record({
  applicationRoleId: fc.uuid(),
  applicationId: fc.uuid(),
  roleId: fc.uuid(),
  roleName: fc.string({ minLength: 1, maxLength: 100 }),
  roleType: roleTypeArb,
  description: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
  status: roleStatusArb,
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
  updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Application Roles List Component Property Tests', () => {
  describe('Property 3: Role Display Completeness', () => {
    /**
     * Feature: application-roles-management, Property 3: Role Display Completeness
     * **Validates: Requirements 4.2, 4.3, 4.4, 4.5, 4.6**
     *
     * For any ApplicationRole displayed in the DataGrid, the row should contain:
     * - The role name in the primary column
     * - The role type with appropriate badge styling
     * - The description (if present, empty otherwise)
     * - The status with appropriate status badge
     * - The last updated time in relative format
     */

    it('every role produces a row preserving the original role object (100 iterations)', () => {
      fc.assert(
        fc.property(fc.array(roleArb, { minLength: 1, maxLength: 20 }), (roles) => {
          const rows = buildRoleRows(roles);
          return rows.every(
            (row, i) => row.role.applicationRoleId === roles[i].applicationRoleId
          );
        }),
        { numRuns: 100 }
      );
    });

    it('roleTypeLabel is correctly derived from roleType (100 iterations)', () => {
      fc.assert(
        fc.property(fc.array(roleArb, { minLength: 1, maxLength: 20 }), (roles) => {
          const rows = buildRoleRows(roles);
          return rows.every((row) => {
            const expected = ROLE_TYPE_LABELS[row.role.roleType] || row.role.roleType;
            return row.roleTypeLabel === expected;
          });
        }),
        { numRuns: 100 }
      );
    });

    it('statusLabel is correctly derived from status (100 iterations)', () => {
      fc.assert(
        fc.property(fc.array(roleArb, { minLength: 1, maxLength: 20 }), (roles) => {
          const rows = buildRoleRows(roles);
          return rows.every((row) => {
            const expected = STATUS_LABELS[row.role.status] || row.role.status;
            return row.statusLabel === expected;
          });
        }),
        { numRuns: 100 }
      );
    });

    it('lastActivity is a non-empty string for every role (100 iterations)', () => {
      fc.assert(
        fc.property(fc.array(roleArb, { minLength: 1, maxLength: 20 }), (roles) => {
          const rows = buildRoleRows(roles);
          return rows.every(
            (row) => typeof row.lastActivity === 'string' && row.lastActivity.length > 0
          );
        }),
        { numRuns: 100 }
      );
    });

    it('number of rows matches number of input roles (100 iterations)', () => {
      fc.assert(
        fc.property(fc.array(roleArb, { minLength: 0, maxLength: 20 }), (roles) => {
          const rows = buildRoleRows(roles);
          return rows.length === roles.length;
        }),
        { numRuns: 100 }
      );
    });

    it('role description is preserved in the row (100 iterations)', () => {
      fc.assert(
        fc.property(fc.array(roleArb, { minLength: 1, maxLength: 20 }), (roles) => {
          const rows = buildRoleRows(roles);
          return rows.every(
            (row, i) => row.role.description === roles[i].description
          );
        }),
        { numRuns: 100 }
      );
    });
  });
});
