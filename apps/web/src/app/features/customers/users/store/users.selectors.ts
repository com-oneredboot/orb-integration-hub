/**
 * Users Selectors
 * 
 * Selectors for users state management
 * Following the Organizations pattern - simple state accessors only
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { UsersState, initialUsersState } from './users.state';

// Feature selector
export const selectUsersState = createFeatureSelector<UsersState>('users');

// Core data selectors
export const selectUsersWithRoles = createSelector(
  selectUsersState,
  (state: UsersState) => state?.usersWithRoles ?? initialUsersState.usersWithRoles
);

export const selectUserRows = createSelector(
  selectUsersState,
  (state: UsersState) => state?.userRows ?? initialUsersState.userRows
);

export const selectFilteredUserRows = createSelector(
  selectUsersState,
  (state: UsersState) => state?.filteredUserRows ?? initialUsersState.filteredUserRows
);

export const selectSelectedUser = createSelector(
  selectUsersState,
  (state: UsersState) => state?.selectedUser ?? initialUsersState.selectedUser
);

export const selectSelectedUserId = createSelector(
  selectUsersState,
  (state: UsersState) => state?.selectedUserId ?? initialUsersState.selectedUserId
);

// Filter selectors - client-side
export const selectSearchTerm = createSelector(
  selectUsersState,
  (state: UsersState) => state?.searchTerm ?? initialUsersState.searchTerm
);

export const selectStatusFilter = createSelector(
  selectUsersState,
  (state: UsersState) => state?.statusFilter ?? initialUsersState.statusFilter
);

// Filter selectors - server-side
export const selectOrganizationIds = createSelector(
  selectUsersState,
  (state: UsersState) => state?.organizationIds ?? initialUsersState.organizationIds
);

export const selectApplicationIds = createSelector(
  selectUsersState,
  (state: UsersState) => state?.applicationIds ?? initialUsersState.applicationIds
);

export const selectEnvironment = createSelector(
  selectUsersState,
  (state: UsersState) => state?.environment ?? initialUsersState.environment
);

// Pagination selectors
export const selectNextToken = createSelector(
  selectUsersState,
  (state: UsersState) => state?.nextToken ?? initialUsersState.nextToken
);

export const selectHasMore = createSelector(
  selectUsersState,
  (state: UsersState) => state?.hasMore ?? initialUsersState.hasMore
);

// Loading state selectors
export const selectIsLoading = createSelector(
  selectUsersState,
  (state: UsersState) => state?.isLoading ?? initialUsersState.isLoading
);

// Error selectors
export const selectError = createSelector(
  selectUsersState,
  (state: UsersState) => state?.error ?? initialUsersState.error
);

// Operation state selectors
export const selectLastLoadedTimestamp = createSelector(
  selectUsersState,
  (state: UsersState) => state?.lastLoadedTimestamp ?? initialUsersState.lastLoadedTimestamp
);

// Computed selectors
export const selectHasUsers = createSelector(
  selectUsersWithRoles,
  (usersWithRoles) => usersWithRoles.length > 0
);

export const selectUserCount = createSelector(
  selectUsersWithRoles,
  (usersWithRoles) => usersWithRoles.length
);

export const selectFilteredUserCount = createSelector(
  selectFilteredUserRows,
  (filteredRows) => filteredRows.length
);

export const selectHasFiltersApplied = createSelector(
  selectSearchTerm,
  selectStatusFilter,
  selectOrganizationIds,
  selectApplicationIds,
  selectEnvironment,
  (searchTerm, statusFilter, organizationIds, applicationIds, environment) => 
    !!searchTerm || !!statusFilter || organizationIds.length > 0 || applicationIds.length > 0 || !!environment
);

// User by ID selector (memoized)
export const selectUserById = (userId: string) => createSelector(
  selectUsersWithRoles,
  (usersWithRoles) => usersWithRoles.find(uwr => uwr.userId === userId)
);

// User row by ID selector (memoized)
export const selectUserRowById = (userId: string) => createSelector(
  selectUserRows,
  (userRows) => userRows.find(row => row.user.userId === userId)
);
