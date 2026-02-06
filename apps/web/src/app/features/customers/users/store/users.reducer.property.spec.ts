/**
 * Users Reducer Property Tests
 *
 * Property-based tests for users reducer using fast-check.
 * Validates universal correctness properties across all valid inputs.
 *
 * @see .kiro/specs/application-users-list/design.md
 */

import * as fc from 'fast-check';
import { usersReducer } from './users.reducer';
import { initialUsersState } from './users.state';
import { UsersActions } from './users.actions';
import { IUsers } from '../../../../core/models/UsersModel';
import { IApplicationUsers } from '../../../../core/models/ApplicationUsersModel';
import { ApplicationUserStatus } from '../../../../core/enums/ApplicationUserStatusEnum';
import { UserStatus } from '../../../../core/enums/UserStatusEnum';

// Arbitrary for valid user status
const userStatusArb = fc.constantFrom(
  UserStatus.Active,
  UserStatus.Inactive,
  UserStatus.Pending
);

// Arbitrary for valid application user status
const applicationUserStatusArb = fc.constantFrom(
  ApplicationUserStatus.Active,
  ApplicationUserStatus.Inactive,
  ApplicationUserStatus.Pending,
  ApplicationUserStatus.Deleted,
  ApplicationUserStatus.Rejected,
  ApplicationUserStatus.Unknown
);

// Arbitrary for valid user names
const userNameArb = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0);

// Arbitrary for valid email
const emailArb = fc
  .emailAddress()
  .filter((s) => s.length > 0);

// Arbitrary for valid IUsers
const userArb: fc.Arbitrary<IUsers> = fc.record({
  userId: fc.uuid(),
  cognitoId: fc.uuid(),
  cognitoSub: fc.uuid(),
  email: emailArb,
  firstName: userNameArb,
  lastName: userNameArb,
  status: userStatusArb,
  createdAt: fc.date(),
  updatedAt: fc.date(),
  phoneNumber: fc.option(fc.string(), { nil: undefined }),
  groups: fc.option(fc.array(fc.string()), { nil: undefined }),
  emailVerified: fc.option(fc.boolean(), { nil: undefined }),
  phoneVerified: fc.option(fc.boolean(), { nil: undefined }),
  mfaEnabled: fc.option(fc.boolean(), { nil: undefined }),
  mfaSetupComplete: fc.option(fc.boolean(), { nil: undefined }),
});

// Note: _applicationUserArb is defined for potential future use in property tests

// Arbitrary for valid IApplicationUsers
const _applicationUserArb: fc.Arbitrary<IApplicationUsers> = fc.record({
  applicationUserId: fc.uuid(),
  userId: fc.uuid(),
  applicationId: fc.uuid(),
  status: applicationUserStatusArb,
  createdAt: fc.date(),
  updatedAt: fc.date(),
});

describe('Users Reducer Property Tests', () => {
  describe('Feature: application-users-list, Property 1: User Query Filtering', () => {
    /**
     * Feature: application-users-list, Property 1: User Query Filtering
     * **Validates: Requirements 2.1, 2.4**
     *
     * For any set of Users and ApplicationUsers records, the query SHALL return
     * only users who have at least one ApplicationUsers record with status ACTIVE,
     * INACTIVE, or PENDING, and SHALL exclude users who have only REMOVED status
     * ApplicationUsers records.
     */
    it('should include users with at least one ACTIVE, INACTIVE, or PENDING ApplicationUsers record (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(userArb, { minLength: 1, maxLength: 20 }),
          fc.array(applicationUserStatusArb, { minLength: 1, maxLength: 5 }),
          (users, statuses) => {
            // For each user, create ApplicationUsers records with the given statuses
            const applicationUserRecords: IApplicationUsers[] = [];
            
            users.forEach((user) => {
              statuses.forEach((status) => {
                applicationUserRecords.push({
                  applicationUserId: fc.sample(fc.uuid(), 1)[0],
                  userId: user.userId,
                  applicationId: fc.sample(fc.uuid(), 1)[0],
                  status,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                });
              });
            });

            // Dispatch loadUsersSuccess action
            const state = usersReducer(
              initialUsersState,
              UsersActions.loadUsersSuccess({ users, applicationUserRecords })
            );

            // Check if user has at least one valid status (ACTIVE, INACTIVE, or PENDING)
            const hasValidStatus = statuses.some(
              (status) =>
                status === ApplicationUserStatus.Active ||
                status === ApplicationUserStatus.Inactive ||
                status === ApplicationUserStatus.Pending
            );

            if (hasValidStatus) {
              // Property: All users should be included in userRows
              return state.userRows.length === users.length;
            } else {
              // Property: No users should be included (all have only invalid statuses)
              return state.userRows.length === 0;
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should exclude users with only DELETED, REJECTED, or UNKNOWN status ApplicationUsers records (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(userArb, { minLength: 1, maxLength: 20 }),
          (users) => {
            // Create ApplicationUsers records with only invalid statuses
            const invalidStatuses = [
              ApplicationUserStatus.Deleted,
              ApplicationUserStatus.Rejected,
              ApplicationUserStatus.Unknown,
            ];
            
            const applicationUserRecords: IApplicationUsers[] = [];
            
            users.forEach((user) => {
              // Each user gets 1-3 ApplicationUsers records with invalid statuses
              const numRecords = fc.sample(fc.integer({ min: 1, max: 3 }), 1)[0];
              for (let i = 0; i < numRecords; i++) {
                const status = invalidStatuses[i % invalidStatuses.length];
                applicationUserRecords.push({
                  applicationUserId: fc.sample(fc.uuid(), 1)[0],
                  userId: user.userId,
                  applicationId: fc.sample(fc.uuid(), 1)[0],
                  status,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                });
              }
            });

            // Dispatch loadUsersSuccess action
            const state = usersReducer(
              initialUsersState,
              UsersActions.loadUsersSuccess({ users, applicationUserRecords })
            );

            // Property: No users should be included (all have only invalid statuses)
            return state.userRows.length === 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include users with mixed valid and invalid status ApplicationUsers records (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(userArb, { minLength: 1, maxLength: 20 }),
          (users) => {
            const applicationUserRecords: IApplicationUsers[] = [];
            
            users.forEach((user) => {
              // Each user gets one ACTIVE record and one DELETED record
              applicationUserRecords.push({
                applicationUserId: fc.sample(fc.uuid(), 1)[0],
                userId: user.userId,
                applicationId: fc.sample(fc.uuid(), 1)[0],
                status: ApplicationUserStatus.Active,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
              
              applicationUserRecords.push({
                applicationUserId: fc.sample(fc.uuid(), 1)[0],
                userId: user.userId,
                applicationId: fc.sample(fc.uuid(), 1)[0],
                status: ApplicationUserStatus.Deleted,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            });

            // Dispatch loadUsersSuccess action
            const state = usersReducer(
              initialUsersState,
              UsersActions.loadUsersSuccess({ users, applicationUserRecords })
            );

            // Property: All users should be included (each has at least one valid status)
            return state.userRows.length === users.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return empty userRows when no ApplicationUsers records exist (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(userArb, { minLength: 1, maxLength: 20 }),
          (users) => {
            // No ApplicationUsers records
            const applicationUserRecords: IApplicationUsers[] = [];

            // Dispatch loadUsersSuccess action
            const state = usersReducer(
              initialUsersState,
              UsersActions.loadUsersSuccess({ users, applicationUserRecords })
            );

            // Property: No users should be included (no ApplicationUsers records)
            return state.userRows.length === 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly count applications for users with multiple valid ApplicationUsers records (100 iterations)', () => {
      fc.assert(
        fc.property(
          userArb,
          fc.integer({ min: 1, max: 10 }),
          (user, numApplications) => {
            const users = [user];
            const applicationUserRecords: IApplicationUsers[] = [];
            
            // Create multiple ACTIVE ApplicationUsers records for the user
            for (let i = 0; i < numApplications; i++) {
              applicationUserRecords.push({
                applicationUserId: fc.sample(fc.uuid(), 1)[0],
                userId: user.userId,
                applicationId: fc.sample(fc.uuid(), 1)[0],
                status: ApplicationUserStatus.Active,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            }

            // Dispatch loadUsersSuccess action
            const state = usersReducer(
              initialUsersState,
              UsersActions.loadUsersSuccess({ users, applicationUserRecords })
            );

            // Property: User should have correct application count
            return (
              state.userRows.length === 1 &&
              state.userRows[0].applicationCount === numApplications &&
              state.userRows[0].applicationIds.length === numApplications
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not count DELETED, REJECTED, or UNKNOWN status ApplicationUsers in application count (100 iterations)', () => {
      fc.assert(
        fc.property(
          userArb,
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 1, max: 5 }),
          (user, numValid, numInvalid) => {
            const users = [user];
            const applicationUserRecords: IApplicationUsers[] = [];
            
            // Create valid ApplicationUsers records
            for (let i = 0; i < numValid; i++) {
              applicationUserRecords.push({
                applicationUserId: fc.sample(fc.uuid(), 1)[0],
                userId: user.userId,
                applicationId: fc.sample(fc.uuid(), 1)[0],
                status: ApplicationUserStatus.Active,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            }
            
            // Create invalid ApplicationUsers records
            const invalidStatuses = [
              ApplicationUserStatus.Deleted,
              ApplicationUserStatus.Rejected,
              ApplicationUserStatus.Unknown,
            ];
            
            for (let i = 0; i < numInvalid; i++) {
              const status = invalidStatuses[i % invalidStatuses.length];
              applicationUserRecords.push({
                applicationUserId: fc.sample(fc.uuid(), 1)[0],
                userId: user.userId,
                applicationId: fc.sample(fc.uuid(), 1)[0],
                status,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            }

            // Dispatch loadUsersSuccess action
            const state = usersReducer(
              initialUsersState,
              UsersActions.loadUsersSuccess({ users, applicationUserRecords })
            );

            // Property: User should only count valid ApplicationUsers records
            return (
              state.userRows.length === 1 &&
              state.userRows[0].applicationCount === numValid &&
              state.userRows[0].applicationIds.length === numValid
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve user data in userRows (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(userArb, { minLength: 1, maxLength: 20 }),
          (users) => {
            const applicationUserRecords: IApplicationUsers[] = [];
            
            // Create one ACTIVE ApplicationUsers record for each user
            users.forEach((user) => {
              applicationUserRecords.push({
                applicationUserId: fc.sample(fc.uuid(), 1)[0],
                userId: user.userId,
                applicationId: fc.sample(fc.uuid(), 1)[0],
                status: ApplicationUserStatus.Active,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            });

            // Dispatch loadUsersSuccess action
            const state = usersReducer(
              initialUsersState,
              UsersActions.loadUsersSuccess({ users, applicationUserRecords })
            );

            // Property: All user data should be preserved in userRows
            return state.userRows.every((row, index) => {
              const originalUser = users[index];
              return (
                row.user.userId === originalUser.userId &&
                row.user.firstName === originalUser.firstName &&
                row.user.lastName === originalUser.lastName &&
                row.user.email === originalUser.email &&
                row.user.status === originalUser.status &&
                row.userStatus === originalUser.status
              );
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should initialize filteredUserRows equal to userRows after load (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(userArb, { minLength: 1, maxLength: 20 }),
          (users) => {
            const applicationUserRecords: IApplicationUsers[] = [];
            
            // Create one ACTIVE ApplicationUsers record for each user
            users.forEach((user) => {
              applicationUserRecords.push({
                applicationUserId: fc.sample(fc.uuid(), 1)[0],
                userId: user.userId,
                applicationId: fc.sample(fc.uuid(), 1)[0],
                status: ApplicationUserStatus.Active,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            });

            // Dispatch loadUsersSuccess action
            const state = usersReducer(
              initialUsersState,
              UsersActions.loadUsersSuccess({ users, applicationUserRecords })
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
    });

    it('should handle users with no matching ApplicationUsers records (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(userArb, { minLength: 2, maxLength: 20 }),
          fc.integer({ min: 0, max: 10 }),
          (users, numUsersWithRecords) => {
            // Ensure numUsersWithRecords doesn't exceed users length
            const actualNumUsersWithRecords = Math.min(numUsersWithRecords, users.length);
            
            const applicationUserRecords: IApplicationUsers[] = [];
            
            // Create ApplicationUsers records for only some users
            for (let i = 0; i < actualNumUsersWithRecords; i++) {
              applicationUserRecords.push({
                applicationUserId: fc.sample(fc.uuid(), 1)[0],
                userId: users[i].userId,
                applicationId: fc.sample(fc.uuid(), 1)[0],
                status: ApplicationUserStatus.Active,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            }

            // Dispatch loadUsersSuccess action
            const state = usersReducer(
              initialUsersState,
              UsersActions.loadUsersSuccess({ users, applicationUserRecords })
            );

            // Property: Only users with ApplicationUsers records should be included
            return state.userRows.length === actualNumUsersWithRecords;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Feature: application-users-list, Property 7: Combined Filter Application', () => {
    /**
     * Feature: application-users-list, Property 7: Combined Filter Application
     * **Validates: Requirements 6.1, 6.3, 6.4**
     *
     * For any user list, search term, and status filter, applying both filters
     * simultaneously SHALL return only users that match both the search term
     * (in firstName or lastName, case-insensitive) AND the status filter.
     */
    it('should apply both search term and status filter simultaneously (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(userArb, { minLength: 5, maxLength: 20 }),
          fc.string({ minLength: 1, maxLength: 10 }),
          userStatusArb,
          (users, searchTerm, statusFilter) => {
            // Create ApplicationUsers records for all users
            const applicationUserRecords: IApplicationUsers[] = users.map((user) => ({
              applicationUserId: fc.sample(fc.uuid(), 1)[0],
              userId: user.userId,
              applicationId: fc.sample(fc.uuid(), 1)[0],
              status: ApplicationUserStatus.Active,
              createdAt: new Date(),
              updatedAt: new Date(),
            }));

            // Load users into state
            let state = usersReducer(
              initialUsersState,
              UsersActions.loadUsersSuccess({ users, applicationUserRecords })
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
    });

    it('should return empty array when no users match both filters (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(userArb, { minLength: 5, maxLength: 20 }),
          (users) => {
            // Ensure all users have status ACTIVE
            const activeUsers = users.map((user) => ({
              ...user,
              status: UserStatus.Active,
            }));

            // Create ApplicationUsers records for all users
            const applicationUserRecords: IApplicationUsers[] = activeUsers.map((user) => ({
              applicationUserId: fc.sample(fc.uuid(), 1)[0],
              userId: user.userId,
              applicationId: fc.sample(fc.uuid(), 1)[0],
              status: ApplicationUserStatus.Active,
              createdAt: new Date(),
              updatedAt: new Date(),
            }));

            // Load users into state
            let state = usersReducer(
              initialUsersState,
              UsersActions.loadUsersSuccess({ users: activeUsers, applicationUserRecords })
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
              UsersActions.setStatusFilter({ statusFilter: UserStatus.Inactive })
            );

            // Property: filteredUserRows should be empty
            return state.filteredUserRows.length === 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should match search term case-insensitively in firstName or lastName (100 iterations)', () => {
      fc.assert(
        fc.property(
          userArb,
          fc.constantFrom('upper', 'lower', 'mixed'),
          (user, caseVariant) => {
            const users = [user];
            const applicationUserRecords: IApplicationUsers[] = [
              {
                applicationUserId: fc.sample(fc.uuid(), 1)[0],
                userId: user.userId,
                applicationId: fc.sample(fc.uuid(), 1)[0],
                status: ApplicationUserStatus.Active,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ];

            // Load users into state
            let state = usersReducer(
              initialUsersState,
              UsersActions.loadUsersSuccess({ users, applicationUserRecords })
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
    });

    it('should filter by status exactly (no partial matches) (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(userArb, { minLength: 10, maxLength: 20 }),
          userStatusArb,
          (users, targetStatus) => {
            // Assign various statuses to users
            const usersWithStatuses = users.map((user, index) => ({
              ...user,
              status: index % 3 === 0 ? UserStatus.Active :
                      index % 3 === 1 ? UserStatus.Inactive :
                      UserStatus.Pending,
            }));

            // Create ApplicationUsers records for all users
            const applicationUserRecords: IApplicationUsers[] = usersWithStatuses.map((user) => ({
              applicationUserId: fc.sample(fc.uuid(), 1)[0],
              userId: user.userId,
              applicationId: fc.sample(fc.uuid(), 1)[0],
              status: ApplicationUserStatus.Active,
              createdAt: new Date(),
              updatedAt: new Date(),
            }));

            // Load users into state
            let state = usersReducer(
              initialUsersState,
              UsersActions.loadUsersSuccess({ users: usersWithStatuses, applicationUserRecords })
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
    });

    it('should handle empty search term (matches all users) with status filter (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(userArb, { minLength: 5, maxLength: 20 }),
          userStatusArb,
          (users, statusFilter) => {
            // Assign the target status to half the users
            const usersWithStatuses = users.map((user, index) => ({
              ...user,
              status: index % 2 === 0 ? statusFilter : UserStatus.Active,
            }));

            // Create ApplicationUsers records for all users
            const applicationUserRecords: IApplicationUsers[] = usersWithStatuses.map((user) => ({
              applicationUserId: fc.sample(fc.uuid(), 1)[0],
              userId: user.userId,
              applicationId: fc.sample(fc.uuid(), 1)[0],
              status: ApplicationUserStatus.Active,
              createdAt: new Date(),
              updatedAt: new Date(),
            }));

            // Load users into state
            let state = usersReducer(
              initialUsersState,
              UsersActions.loadUsersSuccess({ users: usersWithStatuses, applicationUserRecords })
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
    });

    it('should handle search term with empty status filter (matches all statuses) (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(userArb, { minLength: 5, maxLength: 20 }),
          fc.string({ minLength: 2, maxLength: 5 }),
          (users, searchSubstring) => {
            // Ensure at least one user has the search substring in their name
            const usersWithSearchable = users.map((user, index) => {
              if (index === 0) {
                return {
                  ...user,
                  firstName: searchSubstring + user.firstName,
                };
              }
              return user;
            });

            // Create ApplicationUsers records for all users
            const applicationUserRecords: IApplicationUsers[] = usersWithSearchable.map((user) => ({
              applicationUserId: fc.sample(fc.uuid(), 1)[0],
              userId: user.userId,
              applicationId: fc.sample(fc.uuid(), 1)[0],
              status: ApplicationUserStatus.Active,
              createdAt: new Date(),
              updatedAt: new Date(),
            }));

            // Load users into state
            let state = usersReducer(
              initialUsersState,
              UsersActions.loadUsersSuccess({ users: usersWithSearchable, applicationUserRecords })
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
    });

    it('should maintain filter state when applying filters in different order (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(userArb, { minLength: 10, maxLength: 20 }),
          fc.string({ minLength: 1, maxLength: 5 }),
          userStatusArb,
          (users, searchTerm, statusFilter) => {
            // Create ApplicationUsers records for all users
            const applicationUserRecords: IApplicationUsers[] = users.map((user) => ({
              applicationUserId: fc.sample(fc.uuid(), 1)[0],
              userId: user.userId,
              applicationId: fc.sample(fc.uuid(), 1)[0],
              status: ApplicationUserStatus.Active,
              createdAt: new Date(),
              updatedAt: new Date(),
            }));

            // Scenario 1: Apply search term first, then status filter
            let state1 = usersReducer(
              initialUsersState,
              UsersActions.loadUsersSuccess({ users, applicationUserRecords })
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
              UsersActions.loadUsersSuccess({ users, applicationUserRecords })
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
    });
  });
});
