/**
 * Users Selectors Property Tests
 *
 * Property-based tests for users selectors using fast-check.
 * Validates universal correctness properties across all valid inputs.
 *
 * @see .kiro/specs/application-users-management/design.md
 */

import * as fc from 'fast-check';
import {
  selectFilteredUserCount,
  selectFilteredUserRows,
  selectUserCount,
  selectHasUsers,
} from './users.selectors';
import { UsersState, UserTableRow } from './users.state';
import { UserWithRoles, RoleAssignment } from '../../../../core/graphql/GetApplicationUsers.graphql';

// Arbitrary for valid user status
const userStatusArb = fc.constantFrom('ACTIVE', 'INACTIVE', 'PENDING', 'DELETED');

// Arbitrary for valid environment
const environmentArb = fc.constantFrom('production', 'staging', 'development');

// Arbitrary for valid user names
const userNameArb = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0);

// Arbitrary for valid RoleAssignment
const roleAssignmentArb: fc.Arbitrary<RoleAssignment> = fc.record({
  applicationUserRoleId: fc.uuid(),
  applicationId: fc.uuid(),
  applicationName: fc.string({ minLength: 1, maxLength: 50 }),
  organizationId: fc.uuid(),
  organizationName: fc.string({ minLength: 1, maxLength: 50 }),
  environment: environmentArb,
  roleId: fc.uuid(),
  roleName: fc.string({ minLength: 1, maxLength: 50 }),
  permissions: fc.array(fc.string(), { minLength: 0, maxLength: 5 }),
  status: fc.constantFrom('ACTIVE', 'INACTIVE', 'PENDING', 'DELETED'),
  createdAt: fc.integer({ min: 1640000000, max: 1800000000 }),
  updatedAt: fc.integer({ min: 1640000000, max: 1800000000 }),
});

// Arbitrary for valid UserWithRoles
const userWithRolesArb: fc.Arbitrary<UserWithRoles> = fc.record({
  userId: fc.uuid(),
  firstName: userNameArb,
  lastName: userNameArb,
  status: userStatusArb,
  roleAssignments: fc.array(roleAssignmentArb, { minLength: 0, maxLength: 10 }),
});

// Arbitrary for UserTableRow
const userTableRowArb: fc.Arbitrary<UserTableRow> = fc.record({
  user: userWithRolesArb,
  userStatus: userStatusArb,
  roleCount: fc.nat({ max: 100 }),
  environments: fc.array(environmentArb, { maxLength: 10 }),
  organizationNames: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }),
  applicationNames: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }),
  lastActivity: fc.string(),
  roleAssignments: fc.array(roleAssignmentArb, { maxLength: 100 }),
});

// Arbitrary for UsersState with valid filtered rows (subset of userRows)
const usersStateArb: fc.Arbitrary<UsersState> = fc.record({
  usersWithRoles: fc.array(userWithRolesArb, { maxLength: 50 }),
  userRows: fc.array(userTableRowArb, { maxLength: 50 }),
  selectedUser: fc.option(userWithRolesArb, { nil: null }),
  selectedUserId: fc.option(fc.uuid(), { nil: null }),
  organizationIds: fc.array(fc.uuid(), { maxLength: 10 }),
  applicationIds: fc.array(fc.uuid(), { maxLength: 10 }),
  environment: fc.option(environmentArb, { nil: null }),
  searchTerm: fc.string({ maxLength: 50 }),
  statusFilter: fc.string({ maxLength: 20 }),
  nextToken: fc.option(fc.string(), { nil: null }),
  hasMore: fc.boolean(),
  isLoading: fc.boolean(),
  error: fc.option(fc.string(), { nil: null }),
  lastLoadedTimestamp: fc.option(fc.nat(), { nil: null }),
}).chain(state => {
  // Generate filteredUserRows as a subset of userRows
  return fc.subarray(state.userRows).map(filteredUserRows => ({
    ...state,
    filteredUserRows,
  }));
});

describe('Users Selectors Property Tests', () => {
  describe('Feature: application-users-management, Property 13: Total Count Display', () => {
    /**
     * Feature: application-users-management, Property 13: Total Count Display
     * **Validates: Requirements 4.5**
     *
     * For any user list state, the total count displayed SHALL always equal
     * the length of the filteredUserRows array.
     */
    it('should return the count of filtered user rows (100 iterations)', () => {
      expect(() => {
        fc.assert(
          fc.property(usersStateArb, (state) => {
            const mockAppState = { users: state };
            const count = selectFilteredUserCount(mockAppState);
            return count === state.filteredUserRows.length;
          }),
          { numRuns: 100 }
        );
      }).not.toThrow();
    });

    it('should return 0 when filteredUserRows is empty (100 iterations)', () => {
      expect(() => {
        fc.assert(
          fc.property(usersStateArb, (state) => {
            const emptyState = {
              ...state,
              filteredUserRows: [],
            };
            const mockAppState = { users: emptyState };
            const count = selectFilteredUserCount(mockAppState);
            return count === 0;
          }),
          { numRuns: 100 }
        );
      }).not.toThrow();
    });

    it('should handle large numbers of filtered users (100 iterations)', () => {
      expect(() => {
        fc.assert(
          fc.property(
            fc.integer({ min: 0, max: 1000 }),
            (length) => {
              const rows: UserTableRow[] = Array.from({ length }, (_, i) => ({
                user: {
                  userId: `user-${i}`,
                  firstName: `First${i}`,
                  lastName: `Last${i}`,
                  status: 'ACTIVE' as const,
                  roleAssignments: [],
                },
                userStatus: 'ACTIVE' as const,
                roleCount: 0,
                environments: [],
                organizationNames: [],
                applicationNames: [],
                lastActivity: 'Just now',
                roleAssignments: [],
              }));

              const state: UsersState = {
                usersWithRoles: [],
                userRows: rows,
                filteredUserRows: rows,
                selectedUser: null,
                selectedUserId: null,
                organizationIds: [],
                applicationIds: [],
                environment: null,
                searchTerm: '',
                statusFilter: '',
                nextToken: null,
                hasMore: false,
                isLoading: false,
                error: null,
                lastLoadedTimestamp: null,
              };

              const mockAppState = { users: state };
              const count = selectFilteredUserCount(mockAppState);
              return count === length;
            }
          ),
          { numRuns: 100 }
        );
      }).not.toThrow();
    });
  });

  describe('Feature: application-users-management, Property 14: Filtered List Consistency', () => {
    /**
     * Feature: application-users-management, Property 14: Filtered List Consistency
     * **Validates: Requirements 6.1, 6.3**
     *
     * For any user list state, the filteredUserRows SHALL always be a subset
     * of userRows, and every user in filteredUserRows SHALL exist in userRows.
     */
    it('should ensure filteredUserRows is a subset of userRows (100 iterations)', () => {
      expect(() => {
        fc.assert(
          fc.property(usersStateArb, (state) => {
            const mockAppState = { users: state };
            const filteredRows = selectFilteredUserRows(mockAppState);

            // Property: Every filtered row should exist in userRows
            return filteredRows.every((filteredRow) =>
              state.userRows.some((row) => row.user.userId === filteredRow.user.userId)
            );
          }),
          { numRuns: 100 }
        );
      }).not.toThrow();
    });

    it('should handle empty filteredUserRows (100 iterations)', () => {
      expect(() => {
        fc.assert(
          fc.property(usersStateArb, (state) => {
            const emptyState = {
              ...state,
              filteredUserRows: [],
            };
            const mockAppState = { users: emptyState };
            const filteredRows = selectFilteredUserRows(mockAppState);

            // Property: Should return empty array
            return filteredRows.length === 0;
          }),
          { numRuns: 100 }
        );
      }).not.toThrow();
    });

    it('should handle filteredUserRows equal to userRows (100 iterations)', () => {
      expect(() => {
        fc.assert(
          fc.property(usersStateArb, (state) => {
            const fullState = {
              ...state,
              filteredUserRows: state.userRows,
            };
            const mockAppState = { users: fullState };
            const filteredRows = selectFilteredUserRows(mockAppState);

            // Property: Should return all rows
            return filteredRows.length === state.userRows.length;
          }),
          { numRuns: 100 }
        );
      }).not.toThrow();
    });
  });

  describe('Feature: application-users-management, Property 15: User Count Accuracy', () => {
    /**
     * Feature: application-users-management, Property 15: User Count Accuracy
     * **Validates: Requirements 4.5**
     *
     * For any user list state, the user count SHALL always equal the length
     * of the usersWithRoles array.
     */
    it('should return the count of users (100 iterations)', () => {
      expect(() => {
        fc.assert(
          fc.property(usersStateArb, (state) => {
            const mockAppState = { users: state };
            const count = selectUserCount(mockAppState);
            return count === state.usersWithRoles.length;
          }),
          { numRuns: 100 }
        );
      }).not.toThrow();
    });

    it('should return 0 when usersWithRoles is empty (100 iterations)', () => {
      expect(() => {
        fc.assert(
          fc.property(usersStateArb, (state) => {
            const emptyState = {
              ...state,
              usersWithRoles: [],
            };
            const mockAppState = { users: emptyState };
            const count = selectUserCount(mockAppState);
            return count === 0;
          }),
          { numRuns: 100 }
        );
      }).not.toThrow();
    });
  });

  describe('Feature: application-users-management, Property 16: Has Users Flag', () => {
    /**
     * Feature: application-users-management, Property 16: Has Users Flag
     * **Validates: Requirements 4.5**
     *
     * For any user list state, hasUsers SHALL be true if and only if
     * usersWithRoles is non-empty.
     */
    it('should return true when users exist (100 iterations)', () => {
      expect(() => {
        fc.assert(
          fc.property(
            fc.array(userWithRolesArb, { minLength: 1, maxLength: 50 }),
            (usersWithRoles) => {
              const state: UsersState = {
                usersWithRoles,
                userRows: [],
                filteredUserRows: [],
                selectedUser: null,
                selectedUserId: null,
                organizationIds: [],
                applicationIds: [],
                environment: null,
                searchTerm: '',
                statusFilter: '',
                nextToken: null,
                hasMore: false,
                isLoading: false,
                error: null,
                lastLoadedTimestamp: null,
              };

              const mockAppState = { users: state };
              const hasUsers = selectHasUsers(mockAppState);
              return hasUsers === true;
            }
          ),
          { numRuns: 100 }
        );
      }).not.toThrow();
    });

    it('should return false when users array is empty (100 iterations)', () => {
      expect(() => {
        fc.assert(
          fc.property(fc.constant(true), () => {
            const state: UsersState = {
              usersWithRoles: [],
              userRows: [],
              filteredUserRows: [],
              selectedUser: null,
              selectedUserId: null,
              organizationIds: [],
              applicationIds: [],
              environment: null,
              searchTerm: '',
              statusFilter: '',
              nextToken: null,
              hasMore: false,
              isLoading: false,
              error: null,
              lastLoadedTimestamp: null,
            };

            const mockAppState = { users: state };
            const hasUsers = selectHasUsers(mockAppState);
            return hasUsers === false;
          }),
          { numRuns: 100 }
        );
      }).not.toThrow();
    });
  });

  describe('Selector Memoization Properties', () => {
    /**
     * Property: Selectors should return the same reference when state hasn't changed
     */
    it('should return the same reference for unchanged state (100 iterations)', () => {
      expect(() => {
        fc.assert(
          fc.property(usersStateArb, (state) => {
            const mockAppState = { users: state };
            const result1 = selectFilteredUserRows(mockAppState);
            const result2 = selectFilteredUserRows(mockAppState);
            return result1 === result2;
          }),
          { numRuns: 100 }
        );
      }).not.toThrow();
    });
  });
});
