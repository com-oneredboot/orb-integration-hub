/**
 * Application Users Selectors
 * 
 * Selectors for application user state management
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ApplicationUsersState, initialApplicationUsersState } from './application-users.state';

// Feature selector
export const selectApplicationUsersState = createFeatureSelector<ApplicationUsersState>('applicationUsers');

// Core data selectors
export const selectApplicationUsers = createSelector(
  selectApplicationUsersState,
  (state: ApplicationUsersState) => state?.applicationUsers ?? initialApplicationUsersState.applicationUsers
);

export const selectUsers = createSelector(
  selectApplicationUsersState,
  (state: ApplicationUsersState) => state?.users ?? initialApplicationUsersState.users
);

export const selectUserRows = createSelector(
  selectApplicationUsersState,
  (state: ApplicationUsersState) => state?.userRows ?? initialApplicationUsersState.userRows
);

export const selectFilteredUserRows = createSelector(
  selectApplicationUsersState,
  (state: ApplicationUsersState) => state?.filteredUserRows ?? initialApplicationUsersState.filteredUserRows
);

// Filter selectors
export const selectSearchTerm = createSelector(
  selectApplicationUsersState,
  (state: ApplicationUsersState) => state?.searchTerm ?? initialApplicationUsersState.searchTerm
);

export const selectRoleFilter = createSelector(
  selectApplicationUsersState,
  (state: ApplicationUsersState) => state?.roleFilter ?? initialApplicationUsersState.roleFilter
);

export const selectEnvironmentFilter = createSelector(
  selectApplicationUsersState,
  (state: ApplicationUsersState) => state?.environmentFilter ?? initialApplicationUsersState.environmentFilter
);

// Loading state selectors
export const selectIsLoading = createSelector(
  selectApplicationUsersState,
  (state: ApplicationUsersState) => state?.isLoading ?? initialApplicationUsersState.isLoading
);

export const selectIsAssigning = createSelector(
  selectApplicationUsersState,
  (state: ApplicationUsersState) => state?.isAssigning ?? initialApplicationUsersState.isAssigning
);

export const selectIsUnassigning = createSelector(
  selectApplicationUsersState,
  (state: ApplicationUsersState) => state?.isUnassigning ?? initialApplicationUsersState.isUnassigning
);

export const selectIsUpdatingRole = createSelector(
  selectApplicationUsersState,
  (state: ApplicationUsersState) => state?.isUpdatingRole ?? initialApplicationUsersState.isUpdatingRole
);

// Error selectors
export const selectError = createSelector(
  selectApplicationUsersState,
  (state: ApplicationUsersState) => state?.error ?? initialApplicationUsersState.error
);

export const selectAssignError = createSelector(
  selectApplicationUsersState,
  (state: ApplicationUsersState) => state?.assignError ?? initialApplicationUsersState.assignError
);

export const selectUnassignError = createSelector(
  selectApplicationUsersState,
  (state: ApplicationUsersState) => state?.unassignError ?? initialApplicationUsersState.unassignError
);

export const selectRoleUpdateError = createSelector(
  selectApplicationUsersState,
  (state: ApplicationUsersState) => state?.roleUpdateError ?? initialApplicationUsersState.roleUpdateError
);

// Operation result selectors
export const selectLastAssignedUser = createSelector(
  selectApplicationUsersState,
  (state: ApplicationUsersState) => state?.lastAssignedUser ?? initialApplicationUsersState.lastAssignedUser
);

export const selectLastUnassignedUserId = createSelector(
  selectApplicationUsersState,
  (state: ApplicationUsersState) => state?.lastUnassignedUserId ?? initialApplicationUsersState.lastUnassignedUserId
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
  selectRoleFilter,
  selectEnvironmentFilter,
  (searchTerm, roleFilter, environmentFilter) => 
    !!searchTerm || !!roleFilter || !!environmentFilter
);

export const selectIsAnyOperationInProgress = createSelector(
  selectIsLoading,
  selectIsAssigning,
  selectIsUnassigning,
  selectIsUpdatingRole,
  (isLoading, isAssigning, isUnassigning, isUpdatingRole) => 
    isLoading || isAssigning || isUnassigning || isUpdatingRole
);

export const selectHasAnyError = createSelector(
  selectError,
  selectAssignError,
  selectUnassignError,
  selectRoleUpdateError,
  (error, assignError, unassignError, roleUpdateError) => 
    !!error || !!assignError || !!unassignError || !!roleUpdateError
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
