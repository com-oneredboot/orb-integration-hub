/**
 * Users Reducer Unit Tests
 *
 * Unit tests for edge cases and specific examples in the users reducer.
 * Complements property-based tests with concrete scenarios.
 *
 * @see .kiro/specs/application-users-management/design.md
 */

import { usersReducer } from './users.reducer';
import { UsersState, initialUsersState } from './users.state';
import { UsersActions } from './users.actions';
import { UserWithRoles, RoleAssignment } from '../../../../core/graphql/GetApplicationUsers.graphql';
import { Action } from '@ngrx/store';

describe('Users Reducer Unit Tests', () => {
  // Mock data
  const mockRoleAssignment1: RoleAssignment = {
    applicationUserRoleId: 'role-1',
    applicationId: 'app-1',
    applicationName: 'App One',
    organizationId: 'org-1',
    organizationName: 'Org One',
    environment: 'production',
    roleId: 'role-id-1',
    roleName: 'Admin',
    status: 'ACTIVE',
    createdAt: 1704067200,
    updatedAt: 1705276800,
  };

  const mockRoleAssignment2: RoleAssignment = {
    applicationUserRoleId: 'role-2',
    applicationId: 'app-2',
    applicationName: 'App Two',
    organizationId: 'org-1',
    organizationName: 'Org One',
    environment: 'development',
    roleId: 'role-id-2',
    roleName: 'User',
    status: 'ACTIVE',
    createdAt: 1704153600,
    updatedAt: 1705363200,
  };

  const mockUser1: UserWithRoles = {
    userId: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    status: 'ACTIVE',
    roleAssignments: [mockRoleAssignment1, mockRoleAssignment2],
  };

  const mockUser2: UserWithRoles = {
    userId: 'user-2',
    firstName: 'Jane',
    lastName: 'Smith',
    status: 'INACTIVE',
    roleAssignments: [],
  };

  describe('Initial State', () => {
    it('should return the initial state when called with undefined state', () => {
      const action: Action = { type: 'UNKNOWN' };
      const state = usersReducer(undefined, action);

      expect(state).toEqual(initialUsersState);
    });

    it('should have empty arrays for usersWithRoles, userRows, and filteredUserRows', () => {
      expect(initialUsersState.usersWithRoles).toEqual([]);
      expect(initialUsersState.userRows).toEqual([]);
      expect(initialUsersState.filteredUserRows).toEqual([]);
    });

    it('should have empty strings for filter values', () => {
      expect(initialUsersState.searchTerm).toBe('');
      expect(initialUsersState.statusFilter).toBe('');
    });

    it('should have empty arrays for server-side filters', () => {
      expect(initialUsersState.organizationIds).toEqual([]);
      expect(initialUsersState.applicationIds).toEqual([]);
      expect(initialUsersState.environment).toBeNull();
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
          usersWithRoles: [],
        })
      );

      expect(state.usersWithRoles).toEqual([]);
      expect(state.userRows).toEqual([]);
      expect(state.filteredUserRows).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should build userRows from usersWithRoles', () => {
      const state = usersReducer(
        initialUsersState,
        UsersActions.loadUsersSuccess({
          usersWithRoles: [mockUser1],
        })
      );

      expect(state.userRows.length).toBe(1);
      expect(state.userRows[0].user.userId).toBe('user-1');
      expect(state.userRows[0].roleCount).toBe(2);
      expect(state.userRows[0].environments).toEqual(['development', 'production']);
      expect(state.userRows[0].organizationNames).toEqual(['Org One']);
      expect(state.userRows[0].applicationNames).toEqual(['App One', 'App Two']);
    });

    it('should handle users with no role assignments', () => {
      const state = usersReducer(
        initialUsersState,
        UsersActions.loadUsersSuccess({
          usersWithRoles: [mockUser2],
        })
      );

      expect(state.userRows.length).toBe(1);
      expect(state.userRows[0].user.userId).toBe('user-2');
      expect(state.userRows[0].roleCount).toBe(0);
      expect(state.userRows[0].environments).toEqual([]);
      expect(state.userRows[0].organizationNames).toEqual([]);
      expect(state.userRows[0].applicationNames).toEqual([]);
    });

    it('should extract unique environments from role assignments', () => {
      const userWithDuplicateEnvs: UserWithRoles = {
        userId: 'user-3',
        firstName: 'Bob',
        lastName: 'Johnson',
        status: 'ACTIVE',
        roleAssignments: [
          { ...mockRoleAssignment1, environment: 'production' },
          { ...mockRoleAssignment2, environment: 'production' },
        ],
      };

      const state = usersReducer(
        initialUsersState,
        UsersActions.loadUsersSuccess({
          usersWithRoles: [userWithDuplicateEnvs],
        })
      );

      expect(state.userRows[0].environments).toEqual(['production']);
    });

    it('should set lastLoadedTimestamp', () => {
      const beforeTime = Date.now();

      const state = usersReducer(
        initialUsersState,
        UsersActions.loadUsersSuccess({
          usersWithRoles: [],
        })
      );

      const afterTime = Date.now();

      expect(state.lastLoadedTimestamp).not.toBeNull();
      expect(state.lastLoadedTimestamp!).toBeGreaterThanOrEqual(beforeTime);
      expect(state.lastLoadedTimestamp!).toBeLessThanOrEqual(afterTime);
    });

    it('should set nextToken and hasMore when nextToken is provided', () => {
      const state = usersReducer(
        initialUsersState,
        UsersActions.loadUsersSuccess({
          usersWithRoles: [mockUser1],
          nextToken: 'next-token-123',
        })
      );

      expect(state.nextToken).toBe('next-token-123');
      expect(state.hasMore).toBe(true);
    });

    it('should set hasMore to false when nextToken is not provided', () => {
      const state = usersReducer(
        initialUsersState,
        UsersActions.loadUsersSuccess({
          usersWithRoles: [mockUser1],
        })
      );

      expect(state.nextToken).toBeNull();
      expect(state.hasMore).toBe(false);
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
      it('should handle empty search term (matches all users)', () => {
        let state = usersReducer(
          initialUsersState,
          UsersActions.loadUsersSuccess({
            usersWithRoles: [mockUser1, mockUser2],
          })
        );

        state = usersReducer(
          state,
          UsersActions.setSearchTerm({ searchTerm: '' })
        );

        expect(state.filteredUserRows.length).toBe(2);
      });

      it('should filter by firstName when search term matches', () => {
        let state = usersReducer(
          initialUsersState,
          UsersActions.loadUsersSuccess({
            usersWithRoles: [mockUser1, mockUser2],
          })
        );

        state = usersReducer(
          state,
          UsersActions.setSearchTerm({ searchTerm: 'John' })
        );

        expect(state.filteredUserRows.length).toBe(1);
        expect(state.filteredUserRows[0].user.userId).toBe('user-1');
      });

      it('should filter by lastName when search term matches', () => {
        let state = usersReducer(
          initialUsersState,
          UsersActions.loadUsersSuccess({
            usersWithRoles: [mockUser1, mockUser2],
          })
        );

        state = usersReducer(
          state,
          UsersActions.setSearchTerm({ searchTerm: 'Smith' })
        );

        expect(state.filteredUserRows.length).toBe(1);
        expect(state.filteredUserRows[0].user.userId).toBe('user-2');
      });

      it('should filter by userId when search term matches', () => {
        let state = usersReducer(
          initialUsersState,
          UsersActions.loadUsersSuccess({
            usersWithRoles: [mockUser1, mockUser2],
          })
        );

        state = usersReducer(
          state,
          UsersActions.setSearchTerm({ searchTerm: 'user-1' })
        );

        expect(state.filteredUserRows.length).toBe(1);
        expect(state.filteredUserRows[0].user.userId).toBe('user-1');
      });

      it('should be case-insensitive', () => {
        let state = usersReducer(
          initialUsersState,
          UsersActions.loadUsersSuccess({
            usersWithRoles: [mockUser1],
          })
        );

        state = usersReducer(
          state,
          UsersActions.setSearchTerm({ searchTerm: 'JOHN' })
        );

        expect(state.filteredUserRows.length).toBe(1);
        expect(state.filteredUserRows[0].user.userId).toBe('user-1');
      });
    });

    describe('setStatusFilter', () => {
      it('should handle empty status filter (matches all)', () => {
        let state = usersReducer(
          initialUsersState,
          UsersActions.loadUsersSuccess({
            usersWithRoles: [mockUser1, mockUser2],
          })
        );

        state = usersReducer(
          state,
          UsersActions.setStatusFilter({ statusFilter: '' })
        );

        expect(state.filteredUserRows.length).toBe(2);
      });

      it('should filter by status', () => {
        let state = usersReducer(
          initialUsersState,
          UsersActions.loadUsersSuccess({
            usersWithRoles: [mockUser1, mockUser2],
          })
        );

        state = usersReducer(
          state,
          UsersActions.setStatusFilter({ statusFilter: 'ACTIVE' })
        );

        expect(state.filteredUserRows.length).toBe(1);
        expect(state.filteredUserRows[0].user.userId).toBe('user-1');
      });

      it('should filter out users not matching status', () => {
        let state = usersReducer(
          initialUsersState,
          UsersActions.loadUsersSuccess({
            usersWithRoles: [mockUser1, mockUser2],
          })
        );

        state = usersReducer(
          state,
          UsersActions.setStatusFilter({ statusFilter: 'INACTIVE' })
        );

        expect(state.filteredUserRows.length).toBe(1);
        expect(state.filteredUserRows[0].user.userId).toBe('user-2');
      });
    });

    describe('Combined Filters', () => {
      it('should apply both search term and status filter', () => {
        let state = usersReducer(
          initialUsersState,
          UsersActions.loadUsersSuccess({
            usersWithRoles: [mockUser1, mockUser2],
          })
        );

        state = usersReducer(
          state,
          UsersActions.setSearchTerm({ searchTerm: 'J' })
        );

        state = usersReducer(
          state,
          UsersActions.setStatusFilter({ statusFilter: 'ACTIVE' })
        );

        expect(state.filteredUserRows.length).toBe(1);
        expect(state.filteredUserRows[0].user.userId).toBe('user-1');
      });

      it('should return empty array when no users match both filters', () => {
        let state = usersReducer(
          initialUsersState,
          UsersActions.loadUsersSuccess({
            usersWithRoles: [mockUser1],
          })
        );

        state = usersReducer(
          state,
          UsersActions.setSearchTerm({ searchTerm: 'NonExistent' })
        );

        state = usersReducer(
          state,
          UsersActions.setStatusFilter({ statusFilter: 'INACTIVE' })
        );

        expect(state.filteredUserRows).toEqual([]);
      });
    });

    describe('Server-side Filters', () => {
      it('should set organization filter', () => {
        const state = usersReducer(
          initialUsersState,
          UsersActions.setOrganizationFilter({ organizationIds: ['org-1', 'org-2'] })
        );

        expect(state.organizationIds).toEqual(['org-1', 'org-2']);
        expect(state.nextToken).toBeNull();
        expect(state.hasMore).toBe(false);
      });

      it('should set application filter', () => {
        const state = usersReducer(
          initialUsersState,
          UsersActions.setApplicationFilter({ applicationIds: ['app-1'] })
        );

        expect(state.applicationIds).toEqual(['app-1']);
        expect(state.nextToken).toBeNull();
        expect(state.hasMore).toBe(false);
      });

      it('should set environment filter', () => {
        const state = usersReducer(
          initialUsersState,
          UsersActions.setEnvironmentFilter({ environment: 'production' })
        );

        expect(state.environment).toBe('production');
        expect(state.nextToken).toBeNull();
        expect(state.hasMore).toBe(false);
      });
    });
  });

  describe('Selection Actions', () => {
    it('should set selected user', () => {
      const state = usersReducer(
        initialUsersState,
        UsersActions.selectUser({ user: mockUser1 })
      );

      expect(state.selectedUser).toEqual(mockUser1);
    });

    it('should set selected user to null', () => {
      const previousState: UsersState = {
        ...initialUsersState,
        selectedUser: mockUser1,
      };

      const state = usersReducer(
        previousState,
        UsersActions.selectUser({ user: null as unknown as UserWithRoles })
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
        UsersActions.setSelectedUserId({ userId: null as unknown as string })
      );

      expect(state.selectedUserId).toBeNull();
    });
  });

  describe('Pagination Actions', () => {
    it('should set loading state on loadMoreUsers', () => {
      const state = usersReducer(
        initialUsersState,
        UsersActions.loadMoreUsers()
      );

      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should append new users on loadMoreUsersSuccess', () => {
      let state = usersReducer(
        initialUsersState,
        UsersActions.loadUsersSuccess({
          usersWithRoles: [mockUser1],
          nextToken: 'token-1',
        })
      );

      state = usersReducer(
        state,
        UsersActions.loadMoreUsersSuccess({
          usersWithRoles: [mockUser2],
          nextToken: 'token-2',
        })
      );

      expect(state.usersWithRoles.length).toBe(2);
      expect(state.userRows.length).toBe(2);
      expect(state.nextToken).toBe('token-2');
      expect(state.hasMore).toBe(true);
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
        usersWithRoles: [mockUser1],
        isLoading: true,
        error: 'Some error',
        searchTerm: 'test',
        statusFilter: 'ACTIVE',
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
      expect(state.nextToken).toBeNull();
      expect(state.hasMore).toBe(false);
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
          usersWithRoles: [],
        })
      );

      expect(state.usersWithRoles).toEqual([]);
      expect(state.userRows).toEqual([]);
      expect(state.filteredUserRows).toEqual([]);
      expect(state.isLoading).toBe(false);
    });

    it('should preserve other state properties when updating filters', () => {
      let state = usersReducer(
        initialUsersState,
        UsersActions.loadUsersSuccess({
          usersWithRoles: [mockUser1],
        })
      );

      const timestamp = state.lastLoadedTimestamp;

      state = usersReducer(
        state,
        UsersActions.setSearchTerm({ searchTerm: 'John' })
      );

      expect(state.lastLoadedTimestamp).toBe(timestamp);
      expect(state.usersWithRoles).toEqual([mockUser1]);
      expect(state.userRows.length).toBe(1);
    });

    it('should handle state with existing filters when loading new data', () => {
      const previousState: UsersState = {
        ...initialUsersState,
        searchTerm: 'test',
        statusFilter: 'ACTIVE',
      };

      const state = usersReducer(
        previousState,
        UsersActions.loadUsersSuccess({
          usersWithRoles: [mockUser1],
        })
      );

      // Filters should be preserved
      expect(state.searchTerm).toBe('test');
      expect(state.statusFilter).toBe('ACTIVE');
      // But filteredUserRows should be reset to all rows
      expect(state.filteredUserRows.length).toBe(1);
    });
  });
});
