/**
 * Users Reducer Property Tests
 *
 * Property-based tests for users reducer using fast-check.
 * Validates universal correctness properties across all valid inputs.
 *
 * @see .kiro/specs/application-users-management/design.md
 */

import * as fc from 'fast-check';
import { usersReducer } from './users.reducer';
import { initialUsersState } from './users.state';
import { UsersActions } from './users.actions';
import { UserWithRoles, RoleAssignment } from '../../../../core/graphql/GetApplicationUsers.graphql';

// Arbitrary for valid user status
const userStatusArb = fc.constantFrom('ACTIVE', 'INACTIVE', 'PENDING', 'DELETED');

// Arbitrary for valid role assignment status
const roleStatusArb = fc.constantFrom('ACTIVE', 'INACTIVE', 'PENDING', 'DELETED');

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
  status: roleStatusArb,
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

describe('Users Reducer Property Tests', () => {
  describe('Feature: application-users-management, Property 1: User Data Preservation', () => {
    /**
     * Feature: application-users-management, Property 1: User Data Preservation
     * **Validates: Requirements 2.1**
     *
     * For any set of UserWithRoles, loading users SHALL preserve all user data
     * in the userRows, including userId, firstName, lastName, status, and roleAssignments.
     */
    it('should preserve all user data in userRows after load (100 iterations)', () => {
      expect(() => {
        fc.assert(
          fc.property(
            fc.array(userWithRolesArb, { minLength: 1, maxLength: 20 }),
            (usersWithRoles) => {
              // Dispatch loadUsersSuccess action
              const state = usersReducer(
                initialUsersState,
                UsersActions.loadUsersSuccess({ usersWithRoles })
              );

              // Property: All user data should be preserved
              return state.userRows.every((row, index) => {
                const originalUser = usersWithRoles[index];
                return (
                  row.user.userId === originalUser.userId &&
                  row.user.firstName === originalUser.firstName &&
                  row.user.lastName === originalUser.lastName &&
                  row.user.status === originalUser.status &&
                  row.userStatus === originalUser.status &&
                  row.roleAssignments.length === originalUser.roleAssignments.length
                );
              });
            }
          ),
          { numRuns: 100 }
        );
      }).not.toThrow();
    });

    it('should correctly count role assignments for each user (100 iterations)', () => {
      expect(() => {
        fc.assert(
          fc.property(
            userWithRolesArb,
            (userWithRoles) => {
              const usersWithRoles = [userWithRoles];

              // Dispatch loadUsersSuccess action
              const state = usersReducer(
                initialUsersState,
                UsersActions.loadUsersSuccess({ usersWithRoles })
              );

              // Property: roleCount should match the number of role assignments
              return (
                state.userRows.length === 1 &&
                state.userRows[0].roleCount === userWithRoles.roleAssignments.length
              );
            }
          ),
          { numRuns: 100 }
        );
      }).not.toThrow();
    });

    it('should extract unique environments from role assignments (100 iterations)', () => {
      expect(() => {
        fc.assert(
          fc.property(
            fc.uuid(),
            userNameArb,
            userNameArb,
            userStatusArb,
            fc.array(roleAssignmentArb, { minLength: 1, maxLength: 10 }),
            (userId, firstName, lastName, status, roleAssignments) => {
              const userWithRoles: UserWithRoles = {
                userId,
                firstName,
                lastName,
                status,
                roleAssignments,
              };

              // Dispatch loadUsersSuccess action
              const state = usersReducer(
                initialUsersState,
                UsersActions.loadUsersSuccess({ usersWithRoles: [userWithRoles] })
              );

              // Extract unique environments from role assignments
              const expectedEnvironments = Array.from(
                new Set(roleAssignments.map(r => r.environment))
              ).sort();

              // Property: environments should match unique environments from role assignments
              return (
                state.userRows.length === 1 &&
                state.userRows[0].environments.length === expectedEnvironments.length &&
                state.userRows[0].environments.every((env, idx) => env === expectedEnvironments[idx])
              );
            }
          ),
          { numRuns: 100 }
        );
      }).not.toThrow();
    });

    it('should extract unique organization names from role assignments (100 iterations)', () => {
      expect(() => {
        fc.assert(
          fc.property(
            fc.uuid(),
            userNameArb,
            userNameArb,
            userStatusArb,
            fc.array(roleAssignmentArb, { minLength: 1, maxLength: 10 }),
            (userId, firstName, lastName, status, roleAssignments) => {
              const userWithRoles: UserWithRoles = {
                userId,
                firstName,
                lastName,
                status,
                roleAssignments,
              };

              // Dispatch loadUsersSuccess action
              const state = usersReducer(
                initialUsersState,
                UsersActions.loadUsersSuccess({ usersWithRoles: [userWithRoles] })
              );

              // Extract unique organization names from role assignments
              const expectedOrgNames = Array.from(
                new Set(roleAssignments.map(r => r.organizationName))
              ).sort();

              // Property: organizationNames should match unique org names from role assignments
              return (
                state.userRows.length === 1 &&
                state.userRows[0].organizationNames.length === expectedOrgNames.length &&
                state.userRows[0].organizationNames.every((name, idx) => name === expectedOrgNames[idx])
              );
            }
          ),
          { numRuns: 100 }
        );
      }).not.toThrow();
    });

    it('should extract unique application names from role assignments (100 iterations)', () => {
      expect(() => {
        fc.assert(
          fc.property(
            fc.uuid(),
            userNameArb,
            userNameArb,
            userStatusArb,
            fc.array(roleAssignmentArb, { minLength: 1, maxLength: 10 }),
            (userId, firstName, lastName, status, roleAssignments) => {
              const userWithRoles: UserWithRoles = {
                userId,
                firstName,
                lastName,
                status,
                roleAssignments,
              };

              // Dispatch loadUsersSuccess action
              const state = usersReducer(
                initialUsersState,
                UsersActions.loadUsersSuccess({ usersWithRoles: [userWithRoles] })
              );

              // Extract unique application names from role assignments
              const expectedAppNames = Array.from(
                new Set(roleAssignments.map(r => r.applicationName))
              ).sort();

              // Property: applicationNames should match unique app names from role assignments
              return (
                state.userRows.length === 1 &&
                state.userRows[0].applicationNames.length === expectedAppNames.length &&
                state.userRows[0].applicationNames.every((name, idx) => name === expectedAppNames[idx])
              );
            }
          ),
          { numRuns: 100 }
        );
      }).not.toThrow();
    });

    it('should initialize filteredUserRows equal to userRows after load (100 iterations)', () => {
      expect(() => {
        fc.assert(
          fc.property(
            fc.array(userWithRolesArb, { minLength: 1, maxLength: 20 }),
            (usersWithRoles) => {
              // Dispatch loadUsersSuccess action
              const state = usersReducer(
                initialUsersState,
                UsersActions.loadUsersSuccess({ usersWithRoles })
              );

              // Property: filteredUserRows should equal userRows initially
              return (
                state.filteredUserRows.length === state.userRows.length &&
                state.filteredUserRows.every((row, index) => 
                  row.user.userId === state.userRows[index].user.userId
                )
              );
            }
          ),
          { numRuns: 100 }
        );
      }).not.toThrow();
    });

    it('should handle empty user list (100 iterations)', () => {
      expect(() => {
        fc.assert(
          fc.property(
            fc.constant([] as UserWithRoles[]),
            (usersWithRoles) => {
              // Dispatch loadUsersSuccess action with empty array
              const state = usersReducer(
                initialUsersState,
                UsersActions.loadUsersSuccess({ usersWithRoles })
              );

              // Property: userRows and filteredUserRows should be empty
              return (
                state.userRows.length === 0 &&
                state.filteredUserRows.length === 0 &&
                state.isLoading === false &&
                state.error === null
              );
            }
          ),
          { numRuns: 100 }
        );
      }).not.toThrow();
    });

    it('should set lastLoadedTimestamp on successful load (100 iterations)', () => {
      expect(() => {
        fc.assert(
          fc.property(
            fc.array(userWithRolesArb, { minLength: 0, maxLength: 20 }),
            (usersWithRoles) => {
              const beforeTime = Date.now();

              // Dispatch loadUsersSuccess action
              const state = usersReducer(
                initialUsersState,
                UsersActions.loadUsersSuccess({ usersWithRoles })
              );

              const afterTime = Date.now();

              // Property: lastLoadedTimestamp should be set to current time
              return (
                state.lastLoadedTimestamp !== null &&
                state.lastLoadedTimestamp >= beforeTime &&
                state.lastLoadedTimestamp <= afterTime
              );
            }
          ),
          { numRuns: 100 }
        );
      }).not.toThrow();
    });
  });

  describe('Feature: application-users-management, Property 7: Combined Filter Application', () => {
    /**
     * Feature: application-users-management, Property 7: Combined Filter Application
     * **Validates: Requirements 6.1, 6.3, 6.4**
     *
     * For any user list, search term, and status filter, applying both filters
     * simultaneously SHALL return only users that match both the search term
     * (in firstName, lastName, or userId, case-insensitive) AND the status filter.
     */
    it('should apply both search term and status filter simultaneously (100 iterations)', () => {
      expect(() => {
        fc.assert(
          fc.property(
            fc.array(userWithRolesArb, { minLength: 5, maxLength: 20 }),
            fc.string({ minLength: 1, maxLength: 10 }),
            userStatusArb,
            (usersWithRoles, searchTerm, statusFilter) => {
              // Load users into state
              let state = usersReducer(
                initialUsersState,
                UsersActions.loadUsersSuccess({ usersWithRoles })
              );

              // Apply search term
              state = usersReducer(
                state,
                UsersActions.setSearchTerm({ searchTerm })
              );

              // Apply status filter
              state = usersReducer(
                state,
                UsersActions.setStatusFilter({ statusFilter })
              );

              // Property: All filtered users must match BOTH criteria
              const allMatchBothFilters = state.filteredUserRows.every((row) => {
                const matchesSearch =
                  row.user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  row.user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  row.user.userId.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesStatus = row.userStatus === statusFilter;
                return matchesSearch && matchesStatus;
              });

              // Property: No users that match both criteria should be excluded
              const noValidUsersExcluded = state.userRows.every((row) => {
                const matchesSearch =
                  row.user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  row.user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  row.user.userId.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesStatus = row.userStatus === statusFilter;
                const shouldBeIncluded = matchesSearch && matchesStatus;
                const isIncluded = state.filteredUserRows.some(
                  (filteredRow) => filteredRow.user.userId === row.user.userId
                );
                return !shouldBeIncluded || isIncluded;
              });

              return allMatchBothFilters && noValidUsersExcluded;
            }
          ),
          { numRuns: 100 }
        );
      }).not.toThrow();
    });

    it('should return empty array when no users match both filters (100 iterations)', () => {
      expect(() => {
        fc.assert(
          fc.property(
            fc.array(userWithRolesArb, { minLength: 5, maxLength: 20 }),
            (usersWithRoles) => {
              // Ensure all users have status ACTIVE
              const activeUsers = usersWithRoles.map((user) => ({
                ...user,
                status: 'ACTIVE' as const,
              }));

              // Load users into state
              let state = usersReducer(
                initialUsersState,
                UsersActions.loadUsersSuccess({ usersWithRoles: activeUsers })
              );

              // Apply search term that won't match any user
              const unmatchableSearchTerm = 'ZZZZZZZZZZZZZZZZZZZZZ';
              state = usersReducer(
                state,
                UsersActions.setSearchTerm({ searchTerm: unmatchableSearchTerm })
              );

              // Apply status filter for INACTIVE (but all users are ACTIVE)
              state = usersReducer(
                state,
                UsersActions.setStatusFilter({ statusFilter: 'INACTIVE' })
              );

              // Property: filteredUserRows should be empty
              return state.filteredUserRows.length === 0;
            }
          ),
          { numRuns: 100 }
        );
      }).not.toThrow();
    });

    it('should match search term case-insensitively in firstName, lastName, or userId (100 iterations)', () => {
      expect(() => {
        fc.assert(
          fc.property(
            userWithRolesArb,
            fc.constantFrom('upper', 'lower', 'mixed'),
            (user, caseVariant) => {
              const usersWithRoles = [user];

              // Load users into state
              let state = usersReducer(
                initialUsersState,
                UsersActions.loadUsersSuccess({ usersWithRoles })
              );

              // Create search term from firstName with different case
              const searchTerm =
                caseVariant === 'upper'
                  ? user.firstName.toUpperCase()
                  : caseVariant === 'lower'
                  ? user.firstName.toLowerCase()
                  : user.firstName.charAt(0).toUpperCase() + user.firstName.slice(1).toLowerCase();

              // Apply search term
              state = usersReducer(
                state,
                UsersActions.setSearchTerm({ searchTerm })
              );

              // Property: User should be found regardless of case
              return state.filteredUserRows.length === 1 &&
                state.filteredUserRows[0].user.userId === user.userId;
            }
          ),
          { numRuns: 100 }
        );
      }).not.toThrow();
    });

    it('should filter by status exactly (no partial matches) (100 iterations)', () => {
      expect(() => {
        fc.assert(
          fc.property(
            fc.array(userWithRolesArb, { minLength: 10, maxLength: 20 }),
            userStatusArb,
            (usersWithRoles, targetStatus) => {
              // Assign various statuses to users
              const usersWithStatuses = usersWithRoles.map((user, index) => ({
                ...user,
                status: index % 3 === 0 ? 'ACTIVE' as const :
                        index % 3 === 1 ? 'INACTIVE' as const :
                        'PENDING' as const,
              }));

              // Load users into state
              let state = usersReducer(
                initialUsersState,
                UsersActions.loadUsersSuccess({ usersWithRoles: usersWithStatuses })
              );

              // Apply status filter
              state = usersReducer(
                state,
                UsersActions.setStatusFilter({ statusFilter: targetStatus })
              );

              // Property: All filtered users must have exactly the target status
              const allMatchStatus = state.filteredUserRows.every(
                (row) => row.userStatus === targetStatus
              );

              // Property: All users with target status should be included
              const expectedCount = usersWithStatuses.filter(
                (user) => user.status === targetStatus
              ).length;
              const actualCount = state.filteredUserRows.length;

              return allMatchStatus && actualCount === expectedCount;
            }
          ),
          { numRuns: 100 }
        );
      }).not.toThrow();
    });

    it('should handle empty search term (matches all users) with status filter (100 iterations)', () => {
      expect(() => {
        fc.assert(
          fc.property(
            fc.array(userWithRolesArb, { minLength: 5, maxLength: 20 }),
            userStatusArb,
            (usersWithRoles, statusFilter) => {
              // Assign the target status to half the users
              const usersWithStatuses = usersWithRoles.map((user, index) => ({
                ...user,
                status: index % 2 === 0 ? statusFilter : 'ACTIVE' as const,
              }));

              // Load users into state
              let state = usersReducer(
                initialUsersState,
                UsersActions.loadUsersSuccess({ usersWithRoles: usersWithStatuses })
              );

              // Apply empty search term (should match all)
              state = usersReducer(
                state,
                UsersActions.setSearchTerm({ searchTerm: '' })
              );

              // Apply status filter
              state = usersReducer(
                state,
                UsersActions.setStatusFilter({ statusFilter })
              );

              // Property: Should return all users with the target status
              const expectedCount = usersWithStatuses.filter(
                (user) => user.status === statusFilter
              ).length;

              return state.filteredUserRows.length === expectedCount &&
                state.filteredUserRows.every((row) => row.userStatus === statusFilter);
            }
          ),
          { numRuns: 100 }
        );
      }).not.toThrow();
    });

    it('should handle search term with empty status filter (matches all statuses) (100 iterations)', () => {
      expect(() => {
        fc.assert(
          fc.property(
            fc.array(userWithRolesArb, { minLength: 5, maxLength: 20 }),
            fc.string({ minLength: 2, maxLength: 5 }),
            (usersWithRoles, searchSubstring) => {
              // Ensure at least one user has the search substring in their name
              const usersWithSearchable = usersWithRoles.map((user, index) => {
                if (index === 0) {
                  return {
                    ...user,
                    firstName: searchSubstring + user.firstName,
                  };
                }
                return user;
              });

              // Load users into state
              let state = usersReducer(
                initialUsersState,
                UsersActions.loadUsersSuccess({ usersWithRoles: usersWithSearchable })
              );

              // Apply search term
              state = usersReducer(
                state,
                UsersActions.setSearchTerm({ searchTerm: searchSubstring })
              );

              // Apply empty status filter (should match all statuses)
              state = usersReducer(
                state,
                UsersActions.setStatusFilter({ statusFilter: '' })
              );

              // Property: Should return all users matching search term, regardless of status
              const allMatchSearch = state.filteredUserRows.every((row) =>
                row.user.firstName.toLowerCase().includes(searchSubstring.toLowerCase()) ||
                row.user.lastName.toLowerCase().includes(searchSubstring.toLowerCase()) ||
                row.user.userId.toLowerCase().includes(searchSubstring.toLowerCase())
              );

              // At least the first user should be included
              const firstUserIncluded = state.filteredUserRows.some(
                (row) => row.user.userId === usersWithSearchable[0].userId
              );

              return allMatchSearch && firstUserIncluded;
            }
          ),
          { numRuns: 100 }
        );
      }).not.toThrow();
    });

    it('should maintain filter state when applying filters in different order (100 iterations)', () => {
      expect(() => {
        fc.assert(
          fc.property(
            fc.array(userWithRolesArb, { minLength: 10, maxLength: 20 }),
            fc.string({ minLength: 1, maxLength: 5 }),
            userStatusArb,
            (usersWithRoles, searchTerm, statusFilter) => {
              // Scenario 1: Apply search term first, then status filter
              let state1 = usersReducer(
                initialUsersState,
                UsersActions.loadUsersSuccess({ usersWithRoles })
              );
              state1 = usersReducer(
                state1,
                UsersActions.setSearchTerm({ searchTerm })
              );
              state1 = usersReducer(
                state1,
                UsersActions.setStatusFilter({ statusFilter })
              );

              // Scenario 2: Apply status filter first, then search term
              let state2 = usersReducer(
                initialUsersState,
                UsersActions.loadUsersSuccess({ usersWithRoles })
              );
              state2 = usersReducer(
                state2,
                UsersActions.setStatusFilter({ statusFilter })
              );
              state2 = usersReducer(
                state2,
                UsersActions.setSearchTerm({ searchTerm })
              );

              // Property: Both scenarios should produce the same filtered results
              const sameLength = state1.filteredUserRows.length === state2.filteredUserRows.length;
              const sameUserIds = state1.filteredUserRows.every((row1) =>
                state2.filteredUserRows.some((row2) => row2.user.userId === row1.user.userId)
              );

              return sameLength && sameUserIds;
            }
          ),
          { numRuns: 100 }
        );
      }).not.toThrow();
    });
  });
});
