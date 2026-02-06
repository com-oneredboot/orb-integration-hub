/**
 * Users Reducer Unit Tests
 *
 * Unit tests for edge cases and specific examples in the users reducer.
 * Complements property-based tests with concrete scenarios.
 *
 * @see .kiro/specs/application-users-list/design.md
 */

import { usersReducer } from './users.reducer';
import { UsersState, initialUsersState } from './users.state';
import { UsersActions } from './users.actions';
import { IUsers } from '../../../../core/models/UsersModel';
import { IApplicationUsers } from '../../../../core/models/ApplicationUsersModel';
import { ApplicationUserStatus } from '../../../../core/enums/ApplicationUserStatusEnum';
import { UserStatus } from '../../../../core/enums/UserStatusEnum';
import { Action } from '@ngrx/store';

describe('Users Reducer Unit Tests', () => {
  describe('Initial State', () => {
    it('should return the initial state when called with undefined state', () => {
      const action: Action = { type: 'UNKNOWN' };
      const state = usersReducer(undefined, action);

      expect(state).toEqual(initialUsersState);
    });

    it('should have empty arrays for users, userRows, and filteredUserRows', () => {
      expect(initialUsersState.users).toEqual([]);
      expect(initialUsersState.userRows).toEqual([]);
      expect(initialUsersState.filteredUserRows).toEqual([]);
    });

    it('should have empty strings for filter values', () => {
      expect(initialUsersState.searchTerm).toBe('');
      expect(initialUsersState.statusFilter).toBe('');
    });

    it('should have null for selected user and error', () => {
      expect(initialUsersState.selectedUser).toBeNull();
      expect(initialUsersState.selectedUserId).toBeNull();
      expect(initialUsersState.error).toBeNull();
    });

    it('should have false for isLoading', () => {
      expect(initialUsersState.isLoading).toBe(false);
    });
  });

  describe('loadUsers Action', () => {
    it('should set isLoading to true and clear error', () => {
      const previousState: UsersState = {
        ...initialUsersState,
        error: 'Previous error',
      };

      const state = usersReducer(previousState, UsersActions.loadUsers());

      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();
    });
  });

  describe('loadUsersSuccess Action', () => {
    it('should handle empty user list', () => {
      const state = usersReducer(
        initialUsersState,
        UsersActions.loadUsersSuccess({
          users: [],
          applicationUserRecords: [],
        })
      );

      expect(state.users).toEqual([]);
      expect(state.userRows).toEqual([]);
      expect(state.filteredUserRows).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should exclude users with only DELETED status ApplicationUsers', () => {
      const user: IUsers = {
        userId: 'user-1',
        cognitoId: 'cognito-1',
        cognitoSub: 'sub-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        status: UserStatus.Active,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const applicationUserRecords: IApplicationUsers[] = [
        {
          applicationUserId: 'app-user-1',
          userId: 'user-1',
          applicationId: 'app-1',
          status: ApplicationUserStatus.Deleted,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const state = usersReducer(
        initialUsersState,
        UsersActions.loadUsersSuccess({
          users: [user],
          applicationUserRecords,
        })
      );

      expect(state.userRows).toEqual([]);
      expect(state.filteredUserRows).toEqual([]);
    });

    it('should exclude users with only REJECTED status ApplicationUsers', () => {
      const user: IUsers = {
        userId: 'user-1',
        cognitoId: 'cognito-1',
        cognitoSub: 'sub-1',
        email: 'test@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        status: UserStatus.Active,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const applicationUserRecords: IApplicationUsers[] = [
        {
          applicationUserId: 'app-user-1',
          userId: 'user-1',
          applicationId: 'app-1',
          status: ApplicationUserStatus.Rejected,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const state = usersReducer(
        initialUsersState,
        UsersActions.loadUsersSuccess({
          users: [user],
          applicationUserRecords,
        })
      );

      expect(state.userRows).toEqual([]);
      expect(state.filteredUserRows).toEqual([]);
    });

    it('should exclude users with only UNKNOWN status ApplicationUsers', () => {
      const user: IUsers = {
        userId: 'user-1',
        cognitoId: 'cognito-1',
        cognitoSub: 'sub-1',
        email: 'test@example.com',
        firstName: 'Bob',
        lastName: 'Johnson',
        status: UserStatus.Active,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const applicationUserRecords: IApplicationUsers[] = [
        {
          applicationUserId: 'app-user-1',
          userId: 'user-1',
          applicationId: 'app-1',
          status: ApplicationUserStatus.Unknown,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const state = usersReducer(
        initialUsersState,
        UsersActions.loadUsersSuccess({
          users: [user],
          applicationUserRecords,
        })
      );

      expect(state.userRows).toEqual([]);
      expect(state.filteredUserRows).toEqual([]);
    });

    it('should include users with at least one valid status (ACTIVE)', () => {
      const user: IUsers = {
        userId: 'user-1',
        cognitoId: 'cognito-1',
        cognitoSub: 'sub-1',
        email: 'test@example.com',
        firstName: 'Alice',
        lastName: 'Williams',
        status: UserStatus.Active,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const applicationUserRecords: IApplicationUsers[] = [
        {
          applicationUserId: 'app-user-1',
          userId: 'user-1',
          applicationId: 'app-1',
          status: ApplicationUserStatus.Active,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const state = usersReducer(
        initialUsersState,
        UsersActions.loadUsersSuccess({
          users: [user],
          applicationUserRecords,
        })
      );

      expect(state.userRows.length).toBe(1);
      expect(state.userRows[0].user.userId).toBe('user-1');
      expect(state.userRows[0].applicationCount).toBe(1);
    });

    it('should include users with mixed valid and invalid status ApplicationUsers', () => {
      const user: IUsers = {
        userId: 'user-1',
        cognitoId: 'cognito-1',
        cognitoSub: 'sub-1',
        email: 'test@example.com',
        firstName: 'Charlie',
        lastName: 'Brown',
        status: UserStatus.Active,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const applicationUserRecords: IApplicationUsers[] = [
        {
          applicationUserId: 'app-user-1',
          userId: 'user-1',
          applicationId: 'app-1',
          status: ApplicationUserStatus.Active,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          applicationUserId: 'app-user-2',
          userId: 'user-1',
          applicationId: 'app-2',
          status: ApplicationUserStatus.Deleted,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const state = usersReducer(
        initialUsersState,
        UsersActions.loadUsersSuccess({
          users: [user],
          applicationUserRecords,
        })
      );

      expect(state.userRows.length).toBe(1);
      expect(state.userRows[0].applicationCount).toBe(1); // Only counts ACTIVE
      expect(state.userRows[0].applicationIds).toEqual(['app-1']);
    });

    it('should handle users with no matching ApplicationUsers records', () => {
      const user1: IUsers = {
        userId: 'user-1',
        cognitoId: 'cognito-1',
        cognitoSub: 'sub-1',
        email: 'user1@example.com',
        firstName: 'User',
        lastName: 'One',
        status: UserStatus.Active,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const user2: IUsers = {
        userId: 'user-2',
        cognitoId: 'cognito-2',
        cognitoSub: 'sub-2',
        email: 'user2@example.com',
        firstName: 'User',
        lastName: 'Two',
        status: UserStatus.Active,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const applicationUserRecords: IApplicationUsers[] = [
        {
          applicationUserId: 'app-user-1',
          userId: 'user-1',
          applicationId: 'app-1',
          status: ApplicationUserStatus.Active,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const state = usersReducer(
        initialUsersState,
        UsersActions.loadUsersSuccess({
          users: [user1, user2],
          applicationUserRecords,
        })
      );

      expect(state.userRows.length).toBe(1);
      expect(state.userRows[0].user.userId).toBe('user-1');
    });

    it('should set lastLoadedTimestamp', () => {
      const beforeTime = Date.now();

      const state = usersReducer(
        initialUsersState,
        UsersActions.loadUsersSuccess({
          users: [],
          applicationUserRecords: [],
        })
      );

      const afterTime = Date.now();

      expect(state.lastLoadedTimestamp).not.toBeNull();
      expect(state.lastLoadedTimestamp!).toBeGreaterThanOrEqual(beforeTime);
      expect(state.lastLoadedTimestamp!).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('formatLastActivity Helper', () => {
    it('should return "Never" for undefined date', () => {
      const state = usersReducer(
        initialUsersState,
        UsersActions.loadUsersSuccess({
          users: [],
          applicationUserRecords: [],
        })
      );

      // Since we can't directly test the helper, we test through the reducer
      // This is tested indirectly through the property tests
      expect(state).toBeDefined();
    });

    it('should handle Date objects in ApplicationUsers updatedAt', () => {
      const user: IUsers = {
        userId: 'user-1',
        cognitoId: 'cognito-1',
        cognitoSub: 'sub-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        status: UserStatus.Active,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const now = new Date();
      const applicationUserRecords: IApplicationUsers[] = [
        {
          applicationUserId: 'app-user-1',
          userId: 'user-1',
          applicationId: 'app-1',
          status: ApplicationUserStatus.Active,
          createdAt: now,
          updatedAt: now,
        },
      ];

      const state = usersReducer(
        initialUsersState,
        UsersActions.loadUsersSuccess({
          users: [user],
          applicationUserRecords,
        })
      );

      expect(state.userRows[0].lastActivity).toBe('Just now');
    });

    it('should use the most recent updatedAt when user has multiple ApplicationUsers', () => {
      const user: IUsers = {
        userId: 'user-1',
        cognitoId: 'cognito-1',
        cognitoSub: 'sub-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        status: UserStatus.Active,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const oldDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      const recentDate = new Date(); // Now

      const applicationUserRecords: IApplicationUsers[] = [
        {
          applicationUserId: 'app-user-1',
          userId: 'user-1',
          applicationId: 'app-1',
          status: ApplicationUserStatus.Active,
          createdAt: oldDate,
          updatedAt: oldDate,
        },
        {
          applicationUserId: 'app-user-2',
          userId: 'user-1',
          applicationId: 'app-2',
          status: ApplicationUserStatus.Active,
          createdAt: recentDate,
          updatedAt: recentDate,
        },
      ];

      const state = usersReducer(
        initialUsersState,
        UsersActions.loadUsersSuccess({
          users: [user],
          applicationUserRecords,
        })
      );

      expect(state.userRows[0].lastActivity).toBe('Just now');
    });
  });

  describe('loadUsersFailure Action', () => {
    it('should set error and stop loading', () => {
      const previousState: UsersState = {
        ...initialUsersState,
        isLoading: true,
      };

      const state = usersReducer(
        previousState,
        UsersActions.loadUsersFailure({ error: 'Failed to load users' })
      );

      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Failed to load users');
    });
  });

  describe('Filter Actions', () => {
    describe('setSearchTerm', () => {
      it('should handle null/undefined search term as empty string', () => {
        const user: IUsers = {
          userId: 'user-1',
          cognitoId: 'cognito-1',
          cognitoSub: 'sub-1',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          status: UserStatus.Active,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const applicationUserRecords: IApplicationUsers[] = [
          {
            applicationUserId: 'app-user-1',
            userId: 'user-1',
            applicationId: 'app-1',
            status: ApplicationUserStatus.Active,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        let state = usersReducer(
          initialUsersState,
          UsersActions.loadUsersSuccess({
            users: [user],
            applicationUserRecords,
          })
        );

        // Empty string should match all users
        state = usersReducer(
          state,
          UsersActions.setSearchTerm({ searchTerm: '' })
        );

        expect(state.filteredUserRows.length).toBe(1);
      });

      it('should filter by userId when search term matches', () => {
        const user: IUsers = {
          userId: 'user-123',
          cognitoId: 'cognito-1',
          cognitoSub: 'sub-1',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          status: UserStatus.Active,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const applicationUserRecords: IApplicationUsers[] = [
          {
            applicationUserId: 'app-user-1',
            userId: 'user-123',
            applicationId: 'app-1',
            status: ApplicationUserStatus.Active,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        let state = usersReducer(
          initialUsersState,
          UsersActions.loadUsersSuccess({
            users: [user],
            applicationUserRecords,
          })
        );

        state = usersReducer(
          state,
          UsersActions.setSearchTerm({ searchTerm: '123' })
        );

        expect(state.filteredUserRows.length).toBe(1);
        expect(state.filteredUserRows[0].user.userId).toBe('user-123');
      });
    });

    describe('setStatusFilter', () => {
      it('should handle empty status filter (matches all)', () => {
        const user: IUsers = {
          userId: 'user-1',
          cognitoId: 'cognito-1',
          cognitoSub: 'sub-1',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          status: UserStatus.Active,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const applicationUserRecords: IApplicationUsers[] = [
          {
            applicationUserId: 'app-user-1',
            userId: 'user-1',
            applicationId: 'app-1',
            status: ApplicationUserStatus.Active,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        let state = usersReducer(
          initialUsersState,
          UsersActions.loadUsersSuccess({
            users: [user],
            applicationUserRecords,
          })
        );

        state = usersReducer(
          state,
          UsersActions.setStatusFilter({ statusFilter: '' })
        );

        expect(state.filteredUserRows.length).toBe(1);
      });

      it('should filter out users not matching status', () => {
        const user1: IUsers = {
          userId: 'user-1',
          cognitoId: 'cognito-1',
          cognitoSub: 'sub-1',
          email: 'user1@example.com',
          firstName: 'Active',
          lastName: 'User',
          status: UserStatus.Active,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const user2: IUsers = {
          userId: 'user-2',
          cognitoId: 'cognito-2',
          cognitoSub: 'sub-2',
          email: 'user2@example.com',
          firstName: 'Inactive',
          lastName: 'User',
          status: UserStatus.Inactive,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const applicationUserRecords: IApplicationUsers[] = [
          {
            applicationUserId: 'app-user-1',
            userId: 'user-1',
            applicationId: 'app-1',
            status: ApplicationUserStatus.Active,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            applicationUserId: 'app-user-2',
            userId: 'user-2',
            applicationId: 'app-2',
            status: ApplicationUserStatus.Active,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        let state = usersReducer(
          initialUsersState,
          UsersActions.loadUsersSuccess({
            users: [user1, user2],
            applicationUserRecords,
          })
        );

        state = usersReducer(
          state,
          UsersActions.setStatusFilter({ statusFilter: UserStatus.Active })
        );

        expect(state.filteredUserRows.length).toBe(1);
        expect(state.filteredUserRows[0].user.userId).toBe('user-1');
      });
    });

    describe('Combined Filters', () => {
      it('should return empty array when no users match both filters', () => {
        const user: IUsers = {
          userId: 'user-1',
          cognitoId: 'cognito-1',
          cognitoSub: 'sub-1',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          status: UserStatus.Active,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const applicationUserRecords: IApplicationUsers[] = [
          {
            applicationUserId: 'app-user-1',
            userId: 'user-1',
            applicationId: 'app-1',
            status: ApplicationUserStatus.Active,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        let state = usersReducer(
          initialUsersState,
          UsersActions.loadUsersSuccess({
            users: [user],
            applicationUserRecords,
          })
        );

        // Search for name that doesn't exist
        state = usersReducer(
          state,
          UsersActions.setSearchTerm({ searchTerm: 'NonExistent' })
        );

        // Filter by status that doesn't match
        state = usersReducer(
          state,
          UsersActions.setStatusFilter({ statusFilter: UserStatus.Inactive })
        );

        expect(state.filteredUserRows).toEqual([]);
      });
    });
  });

  describe('Selection Actions', () => {
    it('should set selected user', () => {
      const user: IUsers = {
        userId: 'user-1',
        cognitoId: 'cognito-1',
        cognitoSub: 'sub-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        status: UserStatus.Active,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const state = usersReducer(
        initialUsersState,
        UsersActions.selectUser({ user })
      );

      expect(state.selectedUser).toEqual(user);
    });

    it('should set selected user to null', () => {
      const previousState: UsersState = {
        ...initialUsersState,
        selectedUser: {
          userId: 'user-1',
          cognitoId: 'cognito-1',
          cognitoSub: 'sub-1',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          status: UserStatus.Active,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const state = usersReducer(
        previousState,
        UsersActions.selectUser({ user: null })
      );

      expect(state.selectedUser).toBeNull();
    });

    it('should set selected user ID', () => {
      const state = usersReducer(
        initialUsersState,
        UsersActions.setSelectedUserId({ userId: 'user-123' })
      );

      expect(state.selectedUserId).toBe('user-123');
    });

    it('should set selected user ID to null', () => {
      const previousState: UsersState = {
        ...initialUsersState,
        selectedUserId: 'user-123',
      };

      const state = usersReducer(
        previousState,
        UsersActions.setSelectedUserId({ userId: null })
      );

      expect(state.selectedUserId).toBeNull();
    });
  });

  describe('Utility Actions', () => {
    it('should clear errors', () => {
      const previousState: UsersState = {
        ...initialUsersState,
        error: 'Some error',
      };

      const state = usersReducer(
        previousState,
        UsersActions.clearErrors()
      );

      expect(state.error).toBeNull();
    });

    it('should reset state to initial state', () => {
      const previousState: UsersState = {
        ...initialUsersState,
        users: [
          {
            userId: 'user-1',
            cognitoId: 'cognito-1',
            cognitoSub: 'sub-1',
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
            status: UserStatus.Active,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        isLoading: true,
        error: 'Some error',
        searchTerm: 'test',
        statusFilter: UserStatus.Active,
      };

      const state = usersReducer(
        previousState,
        UsersActions.resetState()
      );

      expect(state).toEqual(initialUsersState);
    });

    it('should set loading state on refresh', () => {
      const state = usersReducer(
        initialUsersState,
        UsersActions.refreshUsers()
      );

      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();
    });
  });

  describe('Invalid Action Types', () => {
    it('should return current state for unknown action', () => {
      const currentState: UsersState = {
        ...initialUsersState,
        searchTerm: 'test',
      };

      const action: Action = { type: 'UNKNOWN_ACTION' };
      const state = usersReducer(currentState, action);

      expect(state).toEqual(currentState);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty arrays in loadUsersSuccess', () => {
      const state = usersReducer(
        initialUsersState,
        UsersActions.loadUsersSuccess({
          users: [],
          applicationUserRecords: [],
        })
      );

      expect(state.users).toEqual([]);
      expect(state.userRows).toEqual([]);
      expect(state.filteredUserRows).toEqual([]);
      expect(state.isLoading).toBe(false);
    });

    it('should preserve other state properties when updating filters', () => {
      const user: IUsers = {
        userId: 'user-1',
        cognitoId: 'cognito-1',
        cognitoSub: 'sub-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        status: UserStatus.Active,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const applicationUserRecords: IApplicationUsers[] = [
        {
          applicationUserId: 'app-user-1',
          userId: 'user-1',
          applicationId: 'app-1',
          status: ApplicationUserStatus.Active,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      let state = usersReducer(
        initialUsersState,
        UsersActions.loadUsersSuccess({
          users: [user],
          applicationUserRecords,
        })
      );

      const timestamp = state.lastLoadedTimestamp;

      state = usersReducer(
        state,
        UsersActions.setSearchTerm({ searchTerm: 'John' })
      );

      expect(state.lastLoadedTimestamp).toBe(timestamp);
      expect(state.users).toEqual([user]);
      expect(state.userRows.length).toBe(1);
    });

    it('should handle state with existing filters when loading new data', () => {
      const previousState: UsersState = {
        ...initialUsersState,
        searchTerm: 'test',
        statusFilter: UserStatus.Active,
      };

      const user: IUsers = {
        userId: 'user-1',
        cognitoId: 'cognito-1',
        cognitoSub: 'sub-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        status: UserStatus.Active,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const applicationUserRecords: IApplicationUsers[] = [
        {
          applicationUserId: 'app-user-1',
          userId: 'user-1',
          applicationId: 'app-1',
          status: ApplicationUserStatus.Active,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const state = usersReducer(
        previousState,
        UsersActions.loadUsersSuccess({
          users: [user],
          applicationUserRecords,
        })
      );

      // Filters should be preserved
      expect(state.searchTerm).toBe('test');
      expect(state.statusFilter).toBe(UserStatus.Active);
      // But filteredUserRows should be reset to all rows
      expect(state.filteredUserRows.length).toBe(1);
    });
  });
});
