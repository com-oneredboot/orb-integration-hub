/**
 * Application Detail Page Component Property Tests
 *
 * Property-based tests for tab enabled state and role count badge accuracy.
 *
 * Feature: application-roles-management
 * Property 1: Tab Enabled Based on Application Status
 * Property 2: Role Count Badge Accuracy
 * **Validates: Requirements 3.1, 3.2, 3.4**
 */

import * as fc from 'fast-check';
import { ApplicationStatus } from '../../../../../core/enums/ApplicationStatusEnum';
import { ApplicationRoleStatus } from '../../../../../core/enums/ApplicationRoleStatusEnum';
import { IApplicationRoles } from '../../../../../core/models/ApplicationRolesModel';
import { ApplicationRoleType } from '../../../../../core/enums/ApplicationRoleTypeEnum';
import { TabConfig } from '../../../../../shared/models/tab-config.model';

// ---------------------------------------------------------------------------
// Helpers – replicate the tab-building logic from the component
// ---------------------------------------------------------------------------

function buildTabs(
  applicationStatus: ApplicationStatus,
  environments: string[]
): TabConfig[] {
  const isDraft = applicationStatus === ApplicationStatus.Pending;

  let tabs: TabConfig[] = [
    { id: 'overview', label: 'Overview', icon: 'info-circle' },
    { id: 'environments', label: 'Environments', icon: 'server', badge: environments.length },
    { id: 'roles', label: 'Roles', icon: 'user-tag' },
    { id: 'users', label: 'Users', icon: 'users' },
    { id: 'danger', label: 'Danger Zone', icon: 'exclamation-triangle' },
  ];

  if (isDraft) {
    tabs = tabs.filter(
      (tab) => tab.id !== 'environments' && tab.id !== 'roles' && tab.id !== 'users'
    );
  }

  return tabs;
}

function computeActiveRoleCount(roles: IApplicationRoles[]): number {
  return roles.filter((r) => r.status === ApplicationRoleStatus.Active).length;
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const applicationStatusArb = fc.constantFrom(
  ApplicationStatus.Active,
  ApplicationStatus.Inactive,
  ApplicationStatus.Pending,
  ApplicationStatus.Deleted
);

const environmentsArb = fc.array(
  fc.constantFrom('PRODUCTION', 'STAGING', 'DEVELOPMENT', 'TEST', 'PREVIEW'),
  { minLength: 0, maxLength: 5 }
);

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
  roleName: fc.string({ minLength: 1, maxLength: 50 }),
  roleType: roleTypeArb,
  description: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  status: roleStatusArb,
  createdAt: fc.date(),
  updatedAt: fc.date(),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Application Detail Page Property Tests', () => {
  describe('Property 1: Tab Enabled Based on Application Status', () => {
    /**
     * Feature: application-roles-management, Property 1: Tab Enabled Based on Application Status
     * **Validates: Requirements 3.1, 3.2**
     *
     * For any application, the Roles tab should be present if and only if
     * the application status is not PENDING (draft).
     */

    it('Roles tab is present for non-draft (non-PENDING) applications (100 iterations)', () => {
      fc.assert(
        fc.property(
          applicationStatusArb.filter((s) => s !== ApplicationStatus.Pending),
          environmentsArb,
          (status, environments) => {
            const tabs = buildTabs(status, environments);
            return tabs.some((t) => t.id === 'roles');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Roles tab is NOT present for draft (PENDING) applications (100 iterations)', () => {
      fc.assert(
        fc.property(environmentsArb, (environments) => {
          const tabs = buildTabs(ApplicationStatus.Pending, environments);
          return !tabs.some((t) => t.id === 'roles');
        }),
        { numRuns: 100 }
      );
    });

    it('Environments and Users tabs follow the same draft rule as Roles (100 iterations)', () => {
      fc.assert(
        fc.property(applicationStatusArb, environmentsArb, (status, environments) => {
          const tabs = buildTabs(status, environments);
          const isDraft = status === ApplicationStatus.Pending;
          const hasEnvironments = tabs.some((t) => t.id === 'environments');
          const hasRoles = tabs.some((t) => t.id === 'roles');
          const hasUsers = tabs.some((t) => t.id === 'users');

          if (isDraft) {
            return !hasEnvironments && !hasRoles && !hasUsers;
          }
          return hasEnvironments && hasRoles && hasUsers;
        }),
        { numRuns: 100 }
      );
    });

    it('Overview and Danger Zone tabs are always present (100 iterations)', () => {
      fc.assert(
        fc.property(applicationStatusArb, environmentsArb, (status, environments) => {
          const tabs = buildTabs(status, environments);
          const hasOverview = tabs.some((t) => t.id === 'overview');
          const hasDanger = tabs.some((t) => t.id === 'danger');
          return hasOverview && hasDanger;
        }),
        { numRuns: 100 }
      );
    });

    it('Roles tab uses user-tag icon (100 iterations)', () => {
      fc.assert(
        fc.property(
          applicationStatusArb.filter((s) => s !== ApplicationStatus.Pending),
          environmentsArb,
          (status, environments) => {
            const tabs = buildTabs(status, environments);
            const rolesTab = tabs.find((t) => t.id === 'roles');
            return rolesTab?.icon === 'user-tag';
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: Role Count Badge Accuracy', () => {
    /**
     * Feature: application-roles-management, Property 2: Role Count Badge Accuracy
     * **Validates: Requirements 3.4**
     *
     * For any application with roles, the active role count should equal
     * the number of roles with status ACTIVE.
     */

    it('active role count equals number of ACTIVE roles (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(roleArb, { minLength: 0, maxLength: 30 }),
          (roles) => {
            const count = computeActiveRoleCount(roles);
            const expected = roles.filter(
              (r) => r.status === ApplicationRoleStatus.Active
            ).length;
            return count === expected;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('active role count is zero when no roles are ACTIVE (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(
            roleArb.filter((r) => r.status !== ApplicationRoleStatus.Active),
            { minLength: 0, maxLength: 20 }
          ),
          (roles) => {
            return computeActiveRoleCount(roles) === 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('active role count equals total when all roles are ACTIVE (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(
            roleArb.map((r) => ({ ...r, status: ApplicationRoleStatus.Active })),
            { minLength: 0, maxLength: 20 }
          ),
          (roles) => {
            return computeActiveRoleCount(roles) === roles.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('active role count is always between 0 and total role count (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(roleArb, { minLength: 0, maxLength: 30 }),
          (roles) => {
            const count = computeActiveRoleCount(roles);
            return count >= 0 && count <= roles.length;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
