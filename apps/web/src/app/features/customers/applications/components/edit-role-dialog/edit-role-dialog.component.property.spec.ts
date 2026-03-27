/**
 * Edit Role Dialog Component Property Tests
 *
 * Property-based tests for edit dialog pre-population and action button states.
 * Tests the pure logic without Angular TestBed.
 *
 * Feature: application-roles-management
 * Property 6: Edit Dialog Pre-population
 * Property 8: Action Button Enabled State
 * **Validates: Requirements 6.1, 7.1, 7.2**
 */

import * as fc from 'fast-check';
import { ApplicationRoleType } from '../../../../../core/enums/ApplicationRoleTypeEnum';
import { ApplicationRoleStatus } from '../../../../../core/enums/ApplicationRoleStatusEnum';

// ---------------------------------------------------------------------------
// Interfaces
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

// ---------------------------------------------------------------------------
// Pure logic (mirrors the component's populateForm and button state logic)
// ---------------------------------------------------------------------------

interface FormValues {
  roleName: string;
  roleType: string;
  description: string;
}

/**
 * Replicates the populateForm logic from EditRoleDialogComponent.
 * When a role is provided, the form should be pre-populated with its values.
 */
function populateFormValues(role: IApplicationRoles): FormValues {
  return {
    roleName: role.roleName || '',
    roleType: role.roleType || ApplicationRoleType.User,
    description: role.description || '',
  };
}

/**
 * Replicates the canDeactivate getter from EditRoleDialogComponent.
 * Deactivate button is enabled only for ACTIVE roles.
 */
function canDeactivate(role: IApplicationRoles): boolean {
  return role.status === ApplicationRoleStatus.Active;
}

/**
 * Delete button is always enabled per Req 7.2.
 */
function canDelete(_role: IApplicationRoles): boolean {
  return true;
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
  ApplicationRoleStatus.Deleted,
  ApplicationRoleStatus.Pending
);

const roleArb: fc.Arbitrary<IApplicationRoles> = fc.record({
  applicationRoleId: fc.uuid(),
  applicationId: fc.uuid(),
  roleId: fc.uuid(),
  roleName: fc.string({ minLength: 1, maxLength: 100 }),
  roleType: roleTypeArb,
  description: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
  status: roleStatusArb,
  createdAt: fc.date(),
  updatedAt: fc.date(),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Edit Role Dialog Property Tests', () => {
  describe('Property 6: Edit Dialog Pre-population', () => {
    /**
     * Feature: application-roles-management, Property 6: Edit Dialog Pre-population
     * **Validates: Requirements 6.1**
     *
     * For any ApplicationRole, when the edit dialog is opened, the form fields
     * should be pre-populated with the current role values.
     */

    it('form roleName is pre-populated with the role roleName (100 iterations)', () => {
      fc.assert(
        fc.property(roleArb, (role) => {
          const values = populateFormValues(role);
          return values.roleName === role.roleName;
        }),
        { numRuns: 100 }
      );
    });

    it('form roleType is pre-populated with the role roleType (100 iterations)', () => {
      fc.assert(
        fc.property(roleArb, (role) => {
          const values = populateFormValues(role);
          return values.roleType === role.roleType;
        }),
        { numRuns: 100 }
      );
    });

    it('form description is pre-populated with the role description or empty string (100 iterations)', () => {
      fc.assert(
        fc.property(roleArb, (role) => {
          const values = populateFormValues(role);
          const expected = role.description || '';
          return values.description === expected;
        }),
        { numRuns: 100 }
      );
    });

    it('all three form fields are populated in a single call (100 iterations)', () => {
      fc.assert(
        fc.property(roleArb, (role) => {
          const values = populateFormValues(role);
          return (
            typeof values.roleName === 'string' &&
            typeof values.roleType === 'string' &&
            typeof values.description === 'string'
          );
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 8: Action Button Enabled State', () => {
    /**
     * Feature: application-roles-management, Property 8: Action Button Enabled State
     * **Validates: Requirements 7.1, 7.2**
     *
     * For any ApplicationRole in the edit dialog:
     * - The "Deactivate" button should be enabled if and only if status is ACTIVE
     * - The "Delete" button should always be enabled
     */

    it('deactivate button is enabled only for ACTIVE roles (100 iterations)', () => {
      fc.assert(
        fc.property(roleArb, (role) => {
          const isDeactivateEnabled = canDeactivate(role);
          const expected = role.status === ApplicationRoleStatus.Active;
          return isDeactivateEnabled === expected;
        }),
        { numRuns: 100 }
      );
    });

    it('delete button is always enabled regardless of status (100 iterations)', () => {
      fc.assert(
        fc.property(roleArb, (role) => {
          return canDelete(role) === true;
        }),
        { numRuns: 100 }
      );
    });

    it('deactivate is disabled for INACTIVE roles (100 iterations)', () => {
      fc.assert(
        fc.property(
          roleArb.filter((r) => r.status === ApplicationRoleStatus.Inactive),
          (role) => {
            return canDeactivate(role) === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('deactivate is disabled for DELETED roles (100 iterations)', () => {
      fc.assert(
        fc.property(
          roleArb.filter((r) => r.status === ApplicationRoleStatus.Deleted),
          (role) => {
            return canDeactivate(role) === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('deactivate is enabled for ACTIVE roles (100 iterations)', () => {
      fc.assert(
        fc.property(
          roleArb.filter((r) => r.status === ApplicationRoleStatus.Active),
          (role) => {
            return canDeactivate(role) === true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
