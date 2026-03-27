/**
 * Create Role Dialog Component Property Tests
 *
 * Property-based tests for form validation enforcement.
 * Tests the validation rules without Angular TestBed by replicating
 * the validation logic as pure functions.
 *
 * Feature: application-roles-management, Property 4: Form Validation Enforcement
 * **Validates: Requirements 5.2, 5.3, 5.4**
 */

import * as fc from 'fast-check';
import { ApplicationRoleType } from '../../../../../core/enums/ApplicationRoleTypeEnum';

// ---------------------------------------------------------------------------
// Pure validation logic (mirrors the Angular form validators)
// ---------------------------------------------------------------------------

interface FormErrors {
  roleName: { required?: boolean; maxlength?: boolean } | null;
  roleType: { required?: boolean } | null;
  description: { maxlength?: boolean } | null;
}

interface FormInput {
  roleName: string;
  roleType: string;
  description: string;
}

function validateForm(input: FormInput): { valid: boolean; errors: FormErrors } {
  const errors: FormErrors = {
    roleName: null,
    roleType: null,
    description: null,
  };

  // roleName: required, maxLength(100)
  if (!input.roleName || input.roleName.length === 0) {
    errors.roleName = { ...(errors.roleName || {}), required: true };
  }
  if (input.roleName && input.roleName.length > 100) {
    errors.roleName = { ...(errors.roleName || {}), maxlength: true };
  }

  // roleType: required
  if (!input.roleType || input.roleType.length === 0) {
    errors.roleType = { required: true };
  }

  // description: maxLength(500)
  if (input.description && input.description.length > 500) {
    errors.description = { maxlength: true };
  }

  const valid = !errors.roleName && !errors.roleType && !errors.description;
  return { valid, errors };
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const validRoleTypeArb = fc.constantFrom(
  ApplicationRoleType.Admin,
  ApplicationRoleType.User,
  ApplicationRoleType.Guest,
  ApplicationRoleType.Custom
);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Create Role Dialog Property Tests', () => {
  describe('Property 4: Form Validation Enforcement', () => {
    /**
     * Feature: application-roles-management, Property 4: Form Validation Enforcement
     * **Validates: Requirements 5.2, 5.3, 5.4**
     *
     * For any role creation form submission:
     * - Role name is required and must be ≤100 characters
     * - Role type is required and must be a valid ApplicationRoleType
     * - Description is optional but must be ≤500 characters if provided
     */

    it('form is valid when roleName (1-100 chars), valid roleType, and optional description (≤500 chars) are provided (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          validRoleTypeArb,
          fc.oneof(fc.constant(''), fc.string({ minLength: 0, maxLength: 500 })),
          (roleName, roleType, description) => {
            const result = validateForm({ roleName, roleType, description });
            return result.valid === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('form is invalid when roleName is empty (100 iterations)', () => {
      fc.assert(
        fc.property(
          validRoleTypeArb,
          fc.string({ minLength: 0, maxLength: 500 }),
          (roleType, description) => {
            const result = validateForm({ roleName: '', roleType, description });
            return result.valid === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('form is invalid when roleName exceeds 100 characters (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 101, maxLength: 300 }),
          validRoleTypeArb,
          (roleName, roleType) => {
            const result = validateForm({ roleName, roleType, description: '' });
            return result.valid === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('form is invalid when description exceeds 500 characters (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          validRoleTypeArb,
          fc.string({ minLength: 501, maxLength: 800 }),
          (roleName, roleType, description) => {
            const result = validateForm({ roleName, roleType, description });
            return result.valid === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('roleName required error is set when roleName is empty (100 iterations)', () => {
      fc.assert(
        fc.property(validRoleTypeArb, (roleType) => {
          const result = validateForm({ roleName: '', roleType, description: '' });
          return result.errors.roleName?.required === true;
        }),
        { numRuns: 100 }
      );
    });

    it('roleName maxlength error is set when roleName exceeds 100 chars (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 101, maxLength: 300 }),
          (roleName) => {
            const result = validateForm({
              roleName,
              roleType: ApplicationRoleType.User,
              description: '',
            });
            return result.errors.roleName?.maxlength === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('description is optional – form is valid with empty description (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          validRoleTypeArb,
          (roleName, roleType) => {
            const result = validateForm({ roleName, roleType, description: '' });
            return result.valid === true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
