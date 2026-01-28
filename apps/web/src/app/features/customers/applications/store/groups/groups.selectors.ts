/**
 * Groups Selectors
 *
 * Selectors for application group state management.
 * Follows the same patterns as ApplicationsSelectors.
 *
 * @see .kiro/specs/application-access-management/design.md
 * _Requirements: 8.1, 8.5_
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { GroupsState, initialGroupsState } from './groups.state';

// Feature selector
export const selectGroupsState = createFeatureSelector<GroupsState>('groups');

// Core data selectors
export const selectGroups = createSelector(
  selectGroupsState,
  (state: GroupsState) => state?.groups ?? initialGroupsState.groups
);

export const selectGroupRows = createSelector(
  selectGroupsState,
  (state: GroupsState) => state?.groupRows ?? initialGroupsState.groupRows
);

export const selectSelectedGroup = createSelector(
  selectGroupsState,
  (state: GroupsState) =>
    state?.selectedGroup ?? initialGroupsState.selectedGroup
);

export const selectCurrentApplicationId = createSelector(
  selectGroupsState,
  (state: GroupsState) =>
    state?.currentApplicationId ?? initialGroupsState.currentApplicationId
);

// Group members selectors
export const selectGroupMembers = createSelector(
  selectGroupsState,
  (state: GroupsState) => state?.groupMembers ?? initialGroupsState.groupMembers
);

// Filter selectors
export const selectSearchTerm = createSelector(
  selectGroupsState,
  (state: GroupsState) => state?.searchTerm ?? initialGroupsState.searchTerm
);

export const selectStatusFilter = createSelector(
  selectGroupsState,
  (state: GroupsState) => state?.statusFilter ?? initialGroupsState.statusFilter
);

// Filtered groups selector (from state, computed by reducer)
export const selectFilteredGroupRows = createSelector(
  selectGroupsState,
  (state: GroupsState) =>
    state?.filteredGroupRows ?? initialGroupsState.filteredGroupRows
);

// UI state selectors
export const selectIsInCreateMode = createSelector(
  selectGroupsState,
  (state: GroupsState) =>
    state?.isInCreateMode ?? initialGroupsState.isInCreateMode
);

export const selectIsCreatingNew = createSelector(
  selectGroupsState,
  (state: GroupsState) =>
    state?.isCreatingNew ?? initialGroupsState.isCreatingNew
);

// Loading state selectors
export const selectIsLoading = createSelector(
  selectGroupsState,
  (state: GroupsState) => state?.isLoading ?? initialGroupsState.isLoading
);

export const selectIsSaving = createSelector(
  selectGroupsState,
  (state: GroupsState) => state?.isSaving ?? initialGroupsState.isSaving
);

export const selectIsDeleting = createSelector(
  selectGroupsState,
  (state: GroupsState) => state?.isDeleting ?? initialGroupsState.isDeleting
);

export const selectIsLoadingMembers = createSelector(
  selectGroupsState,
  (state: GroupsState) =>
    state?.isLoadingMembers ?? initialGroupsState.isLoadingMembers
);

// Error selectors
export const selectError = createSelector(
  selectGroupsState,
  (state: GroupsState) => state?.error ?? initialGroupsState.error
);

export const selectSaveError = createSelector(
  selectGroupsState,
  (state: GroupsState) => state?.saveError ?? initialGroupsState.saveError
);

export const selectDeleteError = createSelector(
  selectGroupsState,
  (state: GroupsState) => state?.deleteError ?? initialGroupsState.deleteError
);

export const selectMembersError = createSelector(
  selectGroupsState,
  (state: GroupsState) => state?.membersError ?? initialGroupsState.membersError
);

// Operation result selectors
export const selectLastCreatedGroup = createSelector(
  selectGroupsState,
  (state: GroupsState) =>
    state?.lastCreatedGroup ?? initialGroupsState.lastCreatedGroup
);

export const selectLastUpdatedGroup = createSelector(
  selectGroupsState,
  (state: GroupsState) =>
    state?.lastUpdatedGroup ?? initialGroupsState.lastUpdatedGroup
);

export const selectLastDeletedGroupId = createSelector(
  selectGroupsState,
  (state: GroupsState) =>
    state?.lastDeletedGroupId ?? initialGroupsState.lastDeletedGroupId
);

// Computed selectors
export const selectHasGroups = createSelector(
  selectGroups,
  (groups) => groups.length > 0
);

export const selectGroupCount = createSelector(
  selectGroups,
  (groups) => groups.length
);

export const selectFilteredGroupCount = createSelector(
  selectFilteredGroupRows,
  (filteredRows) => filteredRows.length
);

export const selectHasFiltersApplied = createSelector(
  selectSearchTerm,
  selectStatusFilter,
  (searchTerm, statusFilter) => !!searchTerm || !!statusFilter
);

export const selectIsAnyOperationInProgress = createSelector(
  selectIsLoading,
  selectIsSaving,
  selectIsDeleting,
  (isLoading, isSaving, isDeleting) => isLoading || isSaving || isDeleting
);

export const selectHasAnyError = createSelector(
  selectError,
  selectSaveError,
  selectDeleteError,
  selectMembersError,
  (error, saveError, deleteError, membersError) =>
    !!error || !!saveError || !!deleteError || !!membersError
);

// Group by ID selector (memoized)
export const selectGroupById = (groupId: string) =>
  createSelector(selectGroups, (groups) =>
    groups.find((g) => g.applicationGroupId === groupId)
  );

// Group row by ID selector (memoized)
export const selectGroupRowById = (groupId: string) =>
  createSelector(selectGroupRows, (groupRows) =>
    groupRows.find((row) => row.group.applicationGroupId === groupId)
  );

// Member count for selected group
export const selectSelectedGroupMemberCount = createSelector(
  selectGroupMembers,
  (members) => members.length
);
