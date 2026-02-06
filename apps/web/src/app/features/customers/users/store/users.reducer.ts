/**
 * Users Reducer
 * 
 * Handles state changes for users management
 */

import { createReducer, on } from '@ngrx/store';
import { UsersActions } from './users.actions';
import { UsersState, initialUsersState, UserTableRow } from './users.state';
import { ApplicationUserStatus } from '../../../../core/enums/ApplicationUserStatusEnum';

export const usersReducer = createReducer(
  initialUsersState,

  // Load Users
  on(UsersActions.loadUsers, (state): UsersState => ({
    ...state,
    isLoading: true,
    error: null
  })),

  on(UsersActions.loadUsersSuccess, (state, { users, applicationUserRecords }): UsersState => {
    // Build user rows from raw data
    // Group ApplicationUsers by userId to calculate counts and filter
    const userApplicationsMap = new Map<string, { applicationIds: string[]; lastUpdated: Date }>();
    
    applicationUserRecords.forEach(appUser => {
      // Only include ACTIVE, INACTIVE, or PENDING status (exclude DELETED, REJECTED, UNKNOWN)
      if (
        appUser.status === ApplicationUserStatus.Active ||
        appUser.status === ApplicationUserStatus.Inactive ||
        appUser.status === ApplicationUserStatus.Pending
      ) {
        const existing = userApplicationsMap.get(appUser.userId);
        const updatedAt = appUser.updatedAt instanceof Date 
          ? appUser.updatedAt 
          : new Date(appUser.updatedAt);
        
        if (existing) {
          existing.applicationIds.push(appUser.applicationId);
          // Keep the most recent updatedAt
          if (updatedAt > existing.lastUpdated) {
            existing.lastUpdated = updatedAt;
          }
        } else {
          userApplicationsMap.set(appUser.userId, {
            applicationIds: [appUser.applicationId],
            lastUpdated: updatedAt
          });
        }
      }
    });

    // Build table rows, filtering out users with no valid ApplicationUsers
    const userRows: UserTableRow[] = users
      .filter(user => userApplicationsMap.has(user.userId))
      .map(user => {
        const appData = userApplicationsMap.get(user.userId)!;
        return {
          user,
          userStatus: user.status,
          applicationCount: appData.applicationIds.length,
          applicationIds: appData.applicationIds,
          lastActivity: formatLastActivity(appData.lastUpdated)
        };
      });

    return {
      ...state,
      isLoading: false,
      users,
      applicationUserRecords,
      userRows,
      filteredUserRows: userRows,
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

  // Filter Management
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

  // Utility Actions
  on(UsersActions.resetState, (): UsersState => ({
    ...initialUsersState
  })),

  on(UsersActions.refreshUsers, (state): UsersState => ({
    ...state,
    isLoading: true,
    error: null
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
