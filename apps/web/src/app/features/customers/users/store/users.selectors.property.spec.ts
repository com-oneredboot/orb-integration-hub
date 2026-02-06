/**
 * Users Selectors Property Tests
 *
 * Property-based tests for users selectors using fast-check.
 * Validates universal correctness properties across all valid inputs.
 *
 * @see .kiro/specs/application-users-list/design.md
 */

import * as fc from 'fast-check';
import {
  selectFilteredUserCount,
  selectFilteredUserRows,
} from './users.selectors';
import { UsersState, UserTableRow } from './users.state';
import { IUsers } from '../../../../core/models/UsersModel';
import { IApplicationUsers } from '../../../../core/models/ApplicationUsersModel';
import { UserStatus } from '../../../../core/enums/UserStatusEnum';
import { ApplicationUserStatus } from '../../../../core/enums/ApplicationUserStatusEnum';

// Arbitrary for valid user status
const userStatusArb = fc.constantFrom(
  UserStatus.Active,
  UserStatus.Inactive,
  UserStatus.Pending
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

// Arbitrary for UserTableRow
const userTableRowArb: fc.Arbitrary<UserTableRow> = fc.record({
  user: userArb,
  userStatus: userStatusArb,
  applicationCount: fc.nat({ max: 100 }),
  applicationIds: fc.array(fc.uuid(), { maxLength: 100 }),
  lastActivity: fc.string(),
});

// Arbitrary for valid IApplicationUsers
const applicationUserArb: fc.Arbitrary<IApplicationUsers> = fc.record({
  applicationUserId: fc.uuid(),
  userId: fc.uuid(),
  applicationId: fc.uuid(),
  status: fc.constantFrom(
    ApplicationUserStatus.Active,
    ApplicationUserStatus.Inactive,
    ApplicationUserStatus.Pending,
    ApplicationUserStatus.Deleted
  ),
  createdAt: fc.date(),
  updatedAt: fc.date(),
});

// Arbitrary for UsersState
const usersStateArb: fc.Arbitrary<UsersState> = fc.record({
  users: fc.array(userArb, { maxLength: 50 }),
  applicationUserRecords: fc.array(applicationUserArb, { maxLength: 50 }),
  userRows: fc.array(userTableRowArb, { maxLength: 50 }),
  filteredUserRows: fc.array(userTableRowArb, { maxLength: 50 }),
  selectedUser: fc.option(userArb, { nil: null }),
  selectedUserId: fc.option(fc.uuid(), { nil: null }),
  searchTerm: fc.string({ maxLength: 50 }),
  statusFilter: fc.string({ maxLength: 20 }),
  isLoading: fc.boolean(),
  error: fc.option(fc.string(), { nil: null }),
  lastLoadedTimestamp: fc.option(fc.nat(), { nil: null }),
});

describe('Users Selectors Property Tests', () => {
  describe('Feature: application-users-list, Property 13: Total Count Display', () => {
    /**
     * Feature: application-users-list, Property 13: Total Count Display
     * **Validates: Requirements 4.5**
     *
     * For any user list, the displayed total count SHALL equal the length of
     * the filtered user list.
     */
    it('should return count equal to filteredUserRows length for any state (100 iterations)', () => {
      fc.assert(
        fc.property(usersStateArb, (state) => {
          const mockAppState = { users: state };

          // Get the filtered user rows
          const filteredRows = selectFilteredUserRows(mockAppState);

          // Get the filtered user count
          const count = selectFilteredUserCount(mockAppState);

          // Property: Count must equal the length of filtered rows
          return count === filteredRows.length;
        }),
        { numRuns: 100 }
      );
    });

    it('should return 0 when filteredUserRows is empty (100 iterations)', () => {
      fc.assert(
        fc.property(usersStateArb, (state) => {
          // Force filteredUserRows to be empty
          const emptyState: UsersState = {
            ...state,
            filteredUserRows: [],
          };
          const mockAppState = { users: emptyState };

          // Get the filtered user count
          const count = selectFilteredUserCount(mockAppState);

          // Property: Count must be 0 when filtered rows is empty
          return count === 0;
        }),
        { numRuns: 100 }
      );
    });

    it('should return positive count when filteredUserRows has items (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(userTableRowArb, { minLength: 1, maxLength: 50 }),
          (filteredRows) => {
            const state: UsersState = {
              users: [],
              applicationUserRecords: [],
              userRows: [],
              filteredUserRows: filteredRows,
              selectedUser: null,
              selectedUserId: null,
              searchTerm: '',
              statusFilter: '',
              isLoading: false,
              error: null,
              lastLoadedTimestamp: null,
            };
            const mockAppState = { users: state };

            // Get the filtered user count
            const count = selectFilteredUserCount(mockAppState);

            // Property: Count must be positive and equal to array length
            return count > 0 && count === filteredRows.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain count consistency across multiple selector calls (100 iterations)', () => {
      fc.assert(
        fc.property(usersStateArb, (state) => {
          const mockAppState = { users: state };

          // Call selectors multiple times
          const count1 = selectFilteredUserCount(mockAppState);
          const count2 = selectFilteredUserCount(mockAppState);
          const rows1 = selectFilteredUserRows(mockAppState);
          const rows2 = selectFilteredUserRows(mockAppState);

          // Property: Multiple calls should return consistent results
          return (
            count1 === count2 &&
            rows1.length === rows2.length &&
            count1 === rows1.length
          );
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Selector Memoization Properties', () => {
    it('should return same reference for same state (100 iterations)', () => {
      fc.assert(
        fc.property(usersStateArb, (state) => {
          const mockAppState = { users: state };

          // Call selector twice with same state
          const result1 = selectFilteredUserRows(mockAppState);
          const result2 = selectFilteredUserRows(mockAppState);

          // Property: Same state should return same reference (memoization)
          return result1 === result2;
        }),
        { numRuns: 100 }
      );
    });

    it('should handle undefined state gracefully (100 iterations)', () => {
      fc.assert(
        fc.property(fc.constant(undefined), (undefinedState) => {
          const mockAppState = { users: undefinedState };

          // Call selectors with undefined state
          const filteredRows = selectFilteredUserRows(mockAppState);
          const count = selectFilteredUserCount(mockAppState);

          // Property: Should return empty array and 0 count for undefined state
          return (
            Array.isArray(filteredRows) &&
            filteredRows.length === 0 &&
            count === 0
          );
        }),
        { numRuns: 100 }
      );
    });

    it('should handle null state gracefully (100 iterations)', () => {
      fc.assert(
        fc.property(fc.constant(null), (nullState) => {
          const mockAppState = { users: nullState as unknown as UsersState };

          // Call selectors with null state
          const filteredRows = selectFilteredUserRows(mockAppState);
          const count = selectFilteredUserCount(mockAppState);

          // Property: Should return empty array and 0 count for null state
          return (
            Array.isArray(filteredRows) &&
            filteredRows.length === 0 &&
            count === 0
          );
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Selector Consistency Properties', () => {
    it('should maintain consistency between filteredUserRows and count (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(userTableRowArb, { maxLength: 100 }),
          (rows) => {
            const state: UsersState = {
              users: [],
              applicationUserRecords: [],
              userRows: rows,
              filteredUserRows: rows,
              selectedUser: null,
              selectedUserId: null,
              searchTerm: '',
              statusFilter: '',
              isLoading: false,
              error: null,
              lastLoadedTimestamp: null,
            };
            const mockAppState = { users: state };

            const filteredRows = selectFilteredUserRows(mockAppState);
            const count = selectFilteredUserCount(mockAppState);

            // Property: Count must always equal the length of filtered rows
            return count === filteredRows.length && count === rows.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle large datasets efficiently (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(userTableRowArb, { minLength: 50, maxLength: 200 }),
          (rows) => {
            const state: UsersState = {
              users: [],
              applicationUserRecords: [],
              userRows: rows,
              filteredUserRows: rows,
              selectedUser: null,
              selectedUserId: null,
              searchTerm: '',
              statusFilter: '',
              isLoading: false,
              error: null,
              lastLoadedTimestamp: null,
            };
            const mockAppState = { users: state };

            const startTime = performance.now();
            const count = selectFilteredUserCount(mockAppState);
            const endTime = performance.now();

            // Property: Selector should execute quickly even with large datasets
            // (< 10ms for up to 200 items)
            return count === rows.length && (endTime - startTime) < 10;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Edge Case Properties', () => {
    it('should handle state with mismatched userRows and filteredUserRows (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(userTableRowArb, { maxLength: 50 }),
          fc.array(userTableRowArb, { maxLength: 50 }),
          (userRows, filteredRows) => {
            const state: UsersState = {
              users: [],
              applicationUserRecords: [],
              userRows: userRows,
              filteredUserRows: filteredRows,
              selectedUser: null,
              selectedUserId: null,
              searchTerm: '',
              statusFilter: '',
              isLoading: false,
              error: null,
              lastLoadedTimestamp: null,
            };
            const mockAppState = { users: state };

            const selectedFilteredRows = selectFilteredUserRows(mockAppState);
            const count = selectFilteredUserCount(mockAppState);

            // Property: Selector should return filteredUserRows, not userRows
            // Count should match filteredUserRows length
            return (
              selectedFilteredRows === filteredRows &&
              count === filteredRows.length
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle state with all fields at boundary values (100 iterations)', () => {
      fc.assert(
        fc.property(fc.nat({ max: 1000 }), (length) => {
          // Create array of exact length
          const rows: UserTableRow[] = Array.from({ length }, (_, i) => ({
            user: {
              userId: `user-${i}`,
              cognitoId: `cognito-${i}`,
              cognitoSub: `sub-${i}`,
              email: `user${i}@example.com`,
              firstName: `First${i}`,
              lastName: `Last${i}`,
              status: UserStatus.Active,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            userStatus: UserStatus.Active,
            applicationCount: i,
            applicationIds: [],
            lastActivity: 'Just now',
          }));

          const state: UsersState = {
            users: [],
            applicationUserRecords: [],
            userRows: rows,
            filteredUserRows: rows,
            selectedUser: null,
            selectedUserId: null,
            searchTerm: '',
            statusFilter: '',
            isLoading: false,
            error: null,
            lastLoadedTimestamp: null,
          };
          const mockAppState = { users: state };

          const count = selectFilteredUserCount(mockAppState);

          // Property: Count should exactly match the generated length
          return count === length;
        }),
        { numRuns: 100 }
      );
    });
  });
});
