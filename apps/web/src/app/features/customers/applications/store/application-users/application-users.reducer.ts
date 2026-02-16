/**
 * Application Users Reducer
 * 
 * Handles state changes for application user management
 */

import { createReducer, on } from '@ngrx/store';
import { ApplicationUsersActions } from './application-users.actions';
import { 
  ApplicationUsersState, 
  initialApplicationUsersState, 
  ApplicationUserTableRow 
} from './application-users.state';

export const applicationUsersReducer = createReducer(
  initialApplicationUsersState,

  // Load Application Users
  on(ApplicationUsersActions.loadApplicationUsers, (state): ApplicationUsersState => ({
    ...state,
    isLoading: true,
    error: null
  })),

  on(ApplicationUsersActions.loadApplicationUsersSuccess, (state, { users, applicationUsers, roleAssignments }): ApplicationUsersState => {
    // Build table rows from raw data
    const userRows: ApplicationUserTableRow[] = users.map((user) => {
      const appUser = applicationUsers.find(au => au.userId === user.userId);
      const userRoleAssignments = roleAssignments.filter(ra => 
        // Match role assignments for this user (would need to be passed with user context)
        // For now, we'll use empty array and populate this when we have the full data structure
        false
      );

      return {
        user,
        applicationUser: appUser!,
        roleAssignments: userRoleAssignments,
        lastActivity: formatLastActivity(user.updatedAt)
      };
    });

    return {
      ...state,
      isLoading: false,
      users,
      applicationUsers,
      userRows,
      filteredUserRows: userRows,
      error: null
    };
  }),

  on(ApplicationUsersActions.loadApplicationUsersFailure, (state, { error }): ApplicationUsersState => ({
    ...state,
    isLoading: false,
    error
  })),

  // Assign User
  on(ApplicationUsersActions.assignUserToApplication, (state): ApplicationUsersState => ({
    ...state,
    isAssigning: true,
    assignError: null
  })),

  on(ApplicationUsersActions.assignUserSuccess, (state, { user, applicationUser, roleAssignments }): ApplicationUsersState => {
    // Add new user to lists
    const updatedUsers = [...state.users, user];
    const updatedApplicationUsers = [...state.applicationUsers, applicationUser];

    const newRow: ApplicationUserTableRow = {
      user,
      applicationUser,
      roleAssignments,
      lastActivity: formatLastActivity(user.updatedAt)
    };

    const updatedRows = [...state.userRows, newRow];

    return {
      ...state,
      isAssigning: false,
      users: updatedUsers,
      applicationUsers: updatedApplicationUsers,
      userRows: updatedRows,
      filteredUserRows: updatedRows.filter(row => 
        applyFilters(row, state.searchTerm, state.roleFilter, state.environmentFilter)
      ),
      lastAssignedUser: user,
      assignError: null
    };
  }),

  on(ApplicationUsersActions.assignUserFailure, (state, { error }): ApplicationUsersState => ({
    ...state,
    isAssigning: false,
    assignError: error
  })),

  // Unassign User
  on(ApplicationUsersActions.unassignUserFromApplication, (state): ApplicationUsersState => ({
    ...state,
    isUnassigning: true,
    unassignError: null
  })),

  on(ApplicationUsersActions.unassignUserSuccess, (state, { userId }): ApplicationUsersState => {
    const updatedUsers = state.users.filter(u => u.userId !== userId);
    const updatedApplicationUsers = state.applicationUsers.filter(au => au.userId !== userId);
    const updatedRows = state.userRows.filter(row => row.user.userId !== userId);

    return {
      ...state,
      isUnassigning: false,
      users: updatedUsers,
      applicationUsers: updatedApplicationUsers,
      userRows: updatedRows,
      filteredUserRows: updatedRows.filter(row => 
        applyFilters(row, state.searchTerm, state.roleFilter, state.environmentFilter)
      ),
      lastUnassignedUserId: userId,
      unassignError: null
    };
  }),

  on(ApplicationUsersActions.unassignUserFailure, (state, { error }): ApplicationUsersState => ({
    ...state,
    isUnassigning: false,
    unassignError: error
  })),

  // Update User Role
  on(ApplicationUsersActions.updateUserRole, (state): ApplicationUsersState => ({
    ...state,
    isUpdatingRole: true,
    roleUpdateError: null
  })),

  on(ApplicationUsersActions.updateUserRoleSuccess, (state, { userId, environmentId, roleId, roleName }): ApplicationUsersState => {
    // Update role assignment in user rows
    const updatedRows = state.userRows.map(row => {
      if (row.user.userId === userId) {
        const updatedRoleAssignments = row.roleAssignments.map(ra => 
          ra.environmentId === environmentId
            ? { ...ra, roleId, roleName }
            : ra
        );
        return { ...row, roleAssignments: updatedRoleAssignments };
      }
      return row;
    });

    return {
      ...state,
      isUpdatingRole: false,
      userRows: updatedRows,
      filteredUserRows: updatedRows.filter(row => 
        applyFilters(row, state.searchTerm, state.roleFilter, state.environmentFilter)
      ),
      roleUpdateError: null
    };
  }),

  on(ApplicationUsersActions.updateUserRoleFailure, (state, { error }): ApplicationUsersState => ({
    ...state,
    isUpdatingRole: false,
    roleUpdateError: error
  })),

  // Filter Management
  on(ApplicationUsersActions.setSearchTerm, (state, { searchTerm }): ApplicationUsersState => {
    const filteredRows = state.userRows.filter(row => 
      applyFilters(row, searchTerm, state.roleFilter, state.environmentFilter)
    );

    return {
      ...state,
      searchTerm,
      filteredUserRows: filteredRows
    };
  }),

  on(ApplicationUsersActions.setRoleFilter, (state, { roleFilter }): ApplicationUsersState => {
    const filteredRows = state.userRows.filter(row => 
      applyFilters(row, state.searchTerm, roleFilter, state.environmentFilter)
    );

    return {
      ...state,
      roleFilter,
      filteredUserRows: filteredRows
    };
  }),

  on(ApplicationUsersActions.setEnvironmentFilter, (state, { environmentFilter }): ApplicationUsersState => {
    const filteredRows = state.userRows.filter(row => 
      applyFilters(row, state.searchTerm, state.roleFilter, environmentFilter)
    );

    return {
      ...state,
      environmentFilter,
      filteredUserRows: filteredRows
    };
  }),

  on(ApplicationUsersActions.applyFilters, (state): ApplicationUsersState => {
    const filteredRows = state.userRows.filter(row => 
      applyFilters(row, state.searchTerm, state.roleFilter, state.environmentFilter)
    );

    return {
      ...state,
      filteredUserRows: filteredRows
    };
  }),

  // Error Management
  on(ApplicationUsersActions.clearErrors, (state): ApplicationUsersState => ({
    ...state,
    error: null,
    assignError: null,
    unassignError: null,
    roleUpdateError: null
  })),

  on(ApplicationUsersActions.clearAssignError, (state): ApplicationUsersState => ({
    ...state,
    assignError: null
  })),

  on(ApplicationUsersActions.clearUnassignError, (state): ApplicationUsersState => ({
    ...state,
    unassignError: null
  })),

  on(ApplicationUsersActions.clearRoleUpdateError, (state): ApplicationUsersState => ({
    ...state,
    roleUpdateError: null
  })),

  // Utility Actions
  on(ApplicationUsersActions.resetState, (): ApplicationUsersState => ({
    ...initialApplicationUsersState
  }))
);

// Helper function to apply filters
function applyFilters(
  row: ApplicationUserTableRow,
  searchTerm: string,
  roleFilter: string,
  environmentFilter: string
): boolean {
  const matchesSearch = !searchTerm || 
    row.user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.user.email.toLowerCase().includes(searchTerm.toLowerCase());
  
  const matchesRole = !roleFilter || 
    row.roleAssignments.some(ra => ra.roleId === roleFilter);
  
  const matchesEnvironment = !environmentFilter || 
    row.roleAssignments.some(ra => ra.environmentId === environmentFilter);
  
  return matchesSearch && matchesRole && matchesEnvironment;
}

// Helper function to format last activity as relative time
function formatLastActivity(dateValue: string | Date | number | undefined): string {
  if (!dateValue) return 'Never';
  const date = typeof dateValue === 'number' ? new Date(dateValue * 1000)
    : dateValue instanceof Date ? dateValue : new Date(dateValue);
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
