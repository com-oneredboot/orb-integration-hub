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
export const selectUsers = createSelector(
  selectUsersState,
  (state: UsersState) => state?.users ?? initialUsersState.users
);

export const selectApplicationUserRecords = createSelector(
  selectUsersState,
  (state: UsersState) => state?.applicationUserRecords ?? initialUsersState.applicationUserRecords
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

// Filter selectors
export const selectSearchTerm = createSelector(
  selectUsersState,
  (state: UsersState) => state?.searchTerm ?? initialUsersState.searchTerm
);

export const selectStatusFilter = createSelector(
  selectUsersState,
  (state: UsersState) => state?.statusFilter ?? initialUsersState.statusFilter
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
  selectUsers,
  (users) => users.length > 0
);

export const selectUserCount = createSelector(
  selectUsers,
  (users) => users.length
);

export const selectFilteredUserCount = createSelector(
  selectFilteredUserRows,
  (filteredRows) => filteredRows.length
);

export const selectHasFiltersApplied = createSelector(
  selectSearchTerm,
  selectStatusFilter,
  (searchTerm, statusFilter) => 
    !!searchTerm || !!statusFilter
);

// User by ID selector (memoized)
export const selectUserById = (userId: string) => createSelector(
  selectUsers,
  (users) => users.find(user => user.userId === userId)
);

// User row by ID selector (memoized)
export const selectUserRowById = (userId: string) => createSelector(
  selectUserRows,
  (userRows) => userRows.find(row => row.user.userId === userId)
);
