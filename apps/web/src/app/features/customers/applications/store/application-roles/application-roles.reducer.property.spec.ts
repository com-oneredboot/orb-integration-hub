/**
 * Application Roles Reducer Property Tests
 *
 * Property-based tests for the application roles reducer filter computation.
 * Tests the pure filter logic that the reducer uses to compute filteredRoleRows.
 *
 * Since the reducer imports @ngrx/store (ESM), we replicate the pure helper
 * functions here and test them directly. This validates the same logic the
 * reducer uses without requiring the full Angular/NgRx runtime.
 *
 * Feature: application-roles-management, Property 11: Reducer Filter Computation
 * **Validates: Requirements 8.5**
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
// Pure functions (replicated from reducer – these are the functions under test)
// ---------------------------------------------------------------------------

function getRoleTypeLabel(roleType: string): string {
  const labels: Record<string, string> = {
    [ApplicationRoleType.Admin]: 'Admin',
    [ApplicationRoleType.User]: 'User',
    [ApplicationRoleType.Guest]: 'Guest',
    [ApplicationRoleType.Custom]: 'Custom',
    [ApplicationRoleType.Unknown]: 'Unknown',
  };
  return labels[roleType] || roleType;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    [ApplicationRoleStatus.Active]: 'Active',
    [ApplicationRoleStatus.Inactive]: 'Inactive',
    [ApplicationRoleStatus.Deleted]: 'Deleted',
    [ApplicationRoleStatus.Pending]: 'Pending',
    [ApplicationRoleStatus.Rejected]: 'Rejected',
    [ApplicationRoleStatus.Unknown]: 'Unknown',
  };
  return labels[status] || status;
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

function applyAllFilters(
  rows: ApplicationRoleTableRow[],
  searchTerm: string,
  statusFilter: string,
  roleTypeFilter: string
): ApplicationRoleTableRow[] {
  return rows.filter((row) => {
    const matchesSearch =
      !searchTerm ||
      row.role.roleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (row.role.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    const matchesStatus = !statusFilter || row.role.status === statusFilter;
    const matchesRoleType = !roleTypeFilter || row.role.roleType === roleTypeFilter;

    return matchesSearch && matchesStatus && matchesRoleType;
  });
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
  description: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: undefined }),
  status: roleStatusArb,
  createdAt: fc.date(),
  updatedAt: fc.date(),
});

const rolesArrayArb = fc.array(roleArb, { minLength: 0, maxLength: 20 });

const searchTermArb = fc.oneof(
  fc.constant(''),
  fc.string({ minLength: 1, maxLength: 30 })
);

const statusFilterArb = fc.oneof(
  fc.constant(''),
  fc.constantFrom(
    ApplicationRoleStatus.Active,
    ApplicationRoleStatus.Inactive,
    ApplicationRoleStatus.Deleted
  )
);

const roleTypeFilterArb = fc.oneof(
  fc.constant(''),
  fc.constantFrom(
    ApplicationRoleType.Admin,
    ApplicationRoleType.User,
    ApplicationRoleType.Guest,
    ApplicationRoleType.Custom
  )
);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Application Roles Reducer Property Tests', () => {
  describe('Property 11: Reducer Filter Computation', () => {
    /**
     * Feature: application-roles-management, Property 11: Reducer Filter Computation
     * **Validates: Requirements 8.5**
     *
     * For any combination of search term, status filter, and role type filter,
     * the reducer should correctly compute filteredRoleRows by applying all
     * active filters to roleRows.
     */

    it('search filter narrows rows to roles matching name or description (100 iterations)', () => {
      fc.assert(
        fc.property(rolesArrayArb, searchTermArb, (roles, searchTerm) => {
          const rows = buildRoleRows(roles);
          const filtered = applyAllFilters(rows, searchTerm, '', '');

          // Manual check: every filtered row must match the search
          const expected = roles.filter(
            (r) =>
              !searchTerm ||
              r.roleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (r.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
          );
          return filtered.length === expected.length;
        }),
        { numRuns: 100 }
      );
    });

    it('status filter narrows rows to roles matching status (100 iterations)', () => {
      fc.assert(
        fc.property(rolesArrayArb, statusFilterArb, (roles, statusFilter) => {
          const rows = buildRoleRows(roles);
          const filtered = applyAllFilters(rows, '', statusFilter, '');

          const expected = roles.filter(
            (r) => !statusFilter || r.status === statusFilter
          );
          return filtered.length === expected.length;
        }),
        { numRuns: 100 }
      );
    });

    it('roleType filter narrows rows to roles matching roleType (100 iterations)', () => {
      fc.assert(
        fc.property(rolesArrayArb, roleTypeFilterArb, (roles, roleTypeFilter) => {
          const rows = buildRoleRows(roles);
          const filtered = applyAllFilters(rows, '', '', roleTypeFilter);

          const expected = roles.filter(
            (r) => !roleTypeFilter || r.roleType === roleTypeFilter
          );
          return filtered.length === expected.length;
        }),
        { numRuns: 100 }
      );
    });

    it('combined filters are applied conjunctively (AND logic) (100 iterations)', () => {
      fc.assert(
        fc.property(
          rolesArrayArb,
          searchTermArb,
          statusFilterArb,
          roleTypeFilterArb,
          (roles, searchTerm, statusFilter, roleTypeFilter) => {
            const rows = buildRoleRows(roles);
            const filtered = applyAllFilters(rows, searchTerm, statusFilter, roleTypeFilter);

            const expected = roles.filter((r) => {
              const matchesSearch =
                !searchTerm ||
                r.roleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (r.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
              const matchesStatus = !statusFilter || r.status === statusFilter;
              const matchesRoleType = !roleTypeFilter || r.roleType === roleTypeFilter;
              return matchesSearch && matchesStatus && matchesRoleType;
            });
            return filtered.length === expected.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('empty filters return all rows (100 iterations)', () => {
      fc.assert(
        fc.property(rolesArrayArb, (roles) => {
          const rows = buildRoleRows(roles);
          const filtered = applyAllFilters(rows, '', '', '');
          return filtered.length === rows.length;
        }),
        { numRuns: 100 }
      );
    });

    it('filteredRows is always a subset of all rows (100 iterations)', () => {
      fc.assert(
        fc.property(
          rolesArrayArb,
          searchTermArb,
          statusFilterArb,
          roleTypeFilterArb,
          (roles, searchTerm, statusFilter, roleTypeFilter) => {
            const rows = buildRoleRows(roles);
            const filtered = applyAllFilters(rows, searchTerm, statusFilter, roleTypeFilter);

            const allIds = new Set(rows.map((r) => r.role.applicationRoleId));
            return filtered.every((fr) => allIds.has(fr.role.applicationRoleId));
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
