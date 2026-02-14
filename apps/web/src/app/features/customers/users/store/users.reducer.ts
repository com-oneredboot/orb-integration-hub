/**
 * Users Reducer
 * 
 * Handles state changes for users management
 */

import { createReducer, on } from '@ngrx/store';
import { UsersActions } from './users.actions';
import { UsersState, initialUsersState, UserTableRow } from './users.state';

export const usersReducer = createReducer(
  initialUsersState,

  // Load Users
  on(UsersActions.loadUsers, (state): UsersState => ({
    ...state,
    isLoading: true,
    error: null
  })),

  on(UsersActions.loadUsersSuccess, (state, { usersWithRoles, nextToken }): UsersState => {
    // Build user rows from GetApplicationUsers response
    const userRows: UserTableRow[] = usersWithRoles.map(userWithRoles => {
      // Extract unique environments, organizations, and applications from role assignments
      const environments = new Set<string>();
      const organizationNames = new Set<string>();
      const applicationNames = new Set<string>();
      let lastUpdated: Date | null = null;

      userWithRoles.roleAssignments.forEach(role => {
        environments.add(role.environment);
        organizationNames.add(role.organizationName);
        applicationNames.add(role.applicationName);

        // Track most recent updatedAt (Unix timestamp in seconds)
        const roleUpdatedAt = new Date(role.updatedAt * 1000);
        if (!lastUpdated || roleUpdatedAt > lastUpdated) {
          lastUpdated = roleUpdatedAt;
        }
      });

      return {
        user: userWithRoles,
        userStatus: userWithRoles.status,
        roleCount: userWithRoles.roleAssignments.length,
        environments: Array.from(environments).sort(),
        organizationNames: Array.from(organizationNames).sort(),
        applicationNames: Array.from(applicationNames).sort(),
        lastActivity: formatLastActivity(lastUpdated),
        roleAssignments: userWithRoles.roleAssignments
      };
    });

    return {
      ...state,
      isLoading: false,
      usersWithRoles,
      userRows,
      filteredUserRows: userRows,
      nextToken: nextToken || null,
      hasMore: !!nextToken,
      error: null,
      lastLoadedTimestamp: Date.now()
    };
  }),

  on(UsersActions.loadUsersFailure, (state, { error }): UsersState => ({
    ...state,
    isLoading: false,
    error
  })),

  // Selection Management
  on(UsersActions.selectUser, (state, { user }): UsersState => ({
    ...state,
    selectedUser: user
  })),

  on(UsersActions.setSelectedUserId, (state, { userId }): UsersState => ({
    ...state,
    selectedUserId: userId
  })),

  // Filter Management (client-side filters)
  on(UsersActions.setSearchTerm, (state, { searchTerm }): UsersState => {
    const filteredRows = state.userRows.filter(row => 
      applyFilters(row, searchTerm, state.statusFilter)
    );

    return {
      ...state,
      searchTerm,
      filteredUserRows: filteredRows
    };
  }),

  on(UsersActions.setStatusFilter, (state, { statusFilter }): UsersState => {
    const filteredRows = state.userRows.filter(row => 
      applyFilters(row, state.searchTerm, statusFilter)
    );

    return {
      ...state,
      statusFilter,
      filteredUserRows: filteredRows
    };
  }),

  // Server-side filters (trigger reload)
  on(UsersActions.setOrganizationFilter, (state, { organizationIds }): UsersState => ({
    ...state,
    organizationIds,
    nextToken: null,
    hasMore: false
  })),

  on(UsersActions.setApplicationFilter, (state, { applicationIds }): UsersState => ({
    ...state,
    applicationIds,
    nextToken: null,
    hasMore: false
  })),

  on(UsersActions.setEnvironmentFilter, (state, { environment }): UsersState => ({
    ...state,
    environment,
    nextToken: null,
    hasMore: false
  })),

  on(UsersActions.applyFilters, (state): UsersState => {
    const filteredRows = state.userRows.filter(row => 
      applyFilters(row, state.searchTerm, state.statusFilter)
    );

    return {
      ...state,
      filteredUserRows: filteredRows
    };
  }),

  // User Rows Management
  on(UsersActions.updateUserRows, (state, { userRows }): UsersState => {
    const filteredRows = userRows.filter(row => 
      applyFilters(row, state.searchTerm, state.statusFilter)
    );

    return {
      ...state,
      userRows,
      filteredUserRows: filteredRows
    };
  }),

  on(UsersActions.updateFilteredUserRows, (state, { filteredRows }): UsersState => ({
    ...state,
    filteredUserRows: filteredRows
  })),

  // Error Management
  on(UsersActions.clearErrors, (state): UsersState => ({
    ...state,
    error: null
  })),

  // Pagination
  on(UsersActions.loadMoreUsers, (state): UsersState => ({
    ...state,
    isLoading: true,
    error: null
  })),

  on(UsersActions.loadMoreUsersSuccess, (state, { usersWithRoles, nextToken }): UsersState => {
    // Append new users to existing data
    const allUsersWithRoles = [...state.usersWithRoles, ...usersWithRoles];

    // Build new user rows
    const newUserRows: UserTableRow[] = usersWithRoles.map(userWithRoles => {
      const environments = new Set<string>();
      const organizationNames = new Set<string>();
      const applicationNames = new Set<string>();
      let lastUpdated: Date | null = null;

      userWithRoles.roleAssignments.forEach(role => {
        environments.add(role.environment);
        organizationNames.add(role.organizationName);
        applicationNames.add(role.applicationName);

        const roleUpdatedAt = new Date(role.updatedAt * 1000);
        if (!lastUpdated || roleUpdatedAt > lastUpdated) {
          lastUpdated = roleUpdatedAt;
        }
      });

      return {
        user: userWithRoles,
        userStatus: userWithRoles.status,
        roleCount: userWithRoles.roleAssignments.length,
        environments: Array.from(environments).sort(),
        organizationNames: Array.from(organizationNames).sort(),
        applicationNames: Array.from(applicationNames).sort(),
        lastActivity: formatLastActivity(lastUpdated),
        roleAssignments: userWithRoles.roleAssignments
      };
    });

    const allUserRows = [...state.userRows, ...newUserRows];

    return {
      ...state,
      isLoading: false,
      usersWithRoles: allUsersWithRoles,
      userRows: allUserRows,
      filteredUserRows: allUserRows,
      nextToken: nextToken || null,
      hasMore: !!nextToken,
      error: null
    };
  }),

  // Utility Actions
  on(UsersActions.resetState, (): UsersState => ({
    ...initialUsersState
  })),

  on(UsersActions.refreshUsers, (state): UsersState => ({
    ...state,
    isLoading: true,
    error: null,
    nextToken: null,
    hasMore: false
  }))
);

// Helper function to apply filters
function applyFilters(
  row: UserTableRow,
  searchTerm: string,
  statusFilter: string
): boolean {
  const matchesSearch = !searchTerm || 
    row.user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.user.userId.toLowerCase().includes(searchTerm.toLowerCase());
  
  const matchesStatus = !statusFilter || 
    row.userStatus === statusFilter;
  
  return matchesSearch && matchesStatus;
}

// Helper function to format last activity as relative time
function formatLastActivity(dateValue: string | Date | number | null | undefined): string {
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
