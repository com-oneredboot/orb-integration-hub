/**
 * Groups Reducer
 *
 * Handles state changes for application group management.
 * Follows the same patterns as ApplicationsReducer.
 *
 * @see .kiro/specs/application-access-management/design.md
 * _Requirements: 8.1, 8.5_
 */

import { createReducer, on } from '@ngrx/store';
import { GroupsActions } from './groups.actions';
import { GroupsState, GroupTableRow, initialGroupsState } from './groups.state';

export const groupsReducer = createReducer(
  initialGroupsState,

  // Set Application Context
  on(
    GroupsActions.setApplicationContext,
    (state, { applicationId }): GroupsState => ({
      ...state,
      currentApplicationId: applicationId,
    })
  ),

  // Load Groups
  on(
    GroupsActions.loadGroups,
    (state): GroupsState => ({
      ...state,
      isLoading: true,
      error: null,
    })
  ),

  on(GroupsActions.loadGroupsSuccess, (state, { groups }): GroupsState => {
    const groupRows: GroupTableRow[] = groups.map((group) => ({
      group,
      applicationId: group.applicationId,
      memberCount: group.memberCount || 0,
      lastActivity: formatLastActivity(group.updatedAt),
    }));

    return {
      ...state,
      isLoading: false,
      groups,
      groupRows,
      filteredGroupRows: groupRows,
      error: null,
    };
  }),

  on(
    GroupsActions.loadGroupsFailure,
    (state, { error }): GroupsState => ({
      ...state,
      isLoading: false,
      error,
    })
  ),

  // Load Single Group
  on(
    GroupsActions.loadGroup,
    (state): GroupsState => ({
      ...state,
      isLoading: true,
      error: null,
    })
  ),

  on(
    GroupsActions.loadGroupSuccess,
    (state, { group }): GroupsState => ({
      ...state,
      isLoading: false,
      selectedGroup: group,
      error: null,
    })
  ),

  on(
    GroupsActions.loadGroupFailure,
    (state, { error }): GroupsState => ({
      ...state,
      isLoading: false,
      error,
    })
  ),

  // Create Group
  on(
    GroupsActions.createGroup,
    (state): GroupsState => ({
      ...state,
      isSaving: true,
      saveError: null,
    })
  ),

  on(GroupsActions.createGroupSuccess, (state, { group }): GroupsState => {
    const newRow: GroupTableRow = {
      group,
      applicationId: group.applicationId,
      memberCount: 0,
      lastActivity: formatLastActivity(group.updatedAt),
    };

    const updatedGroups = [...state.groups, group];
    const updatedRows = [...state.groupRows, newRow];

    return {
      ...state,
      isSaving: false,
      isCreatingNew: false,
      isInCreateMode: false,
      groups: updatedGroups,
      groupRows: updatedRows,
      filteredGroupRows: updatedRows.filter((row) =>
        applyFilters(row, state.searchTerm, state.statusFilter)
      ),
      selectedGroup: group,
      lastCreatedGroup: group,
      saveError: null,
    };
  }),

  on(
    GroupsActions.createGroupFailure,
    (state, { error }): GroupsState => ({
      ...state,
      isSaving: false,
      saveError: error,
    })
  ),

  // Update Group
  on(
    GroupsActions.updateGroup,
    (state): GroupsState => ({
      ...state,
      isSaving: true,
      saveError: null,
    })
  ),

  on(GroupsActions.updateGroupSuccess, (state, { group }): GroupsState => {
    const updatedGroups = state.groups.map((g) =>
      g.applicationGroupId === group.applicationGroupId ? group : g
    );

    const updatedRows = state.groupRows.map((row) =>
      row.group.applicationGroupId === group.applicationGroupId
        ? { ...row, group, lastActivity: formatLastActivity(group.updatedAt) }
        : row
    );

    return {
      ...state,
      isSaving: false,
      groups: updatedGroups,
      groupRows: updatedRows,
      filteredGroupRows: updatedRows.filter((row) =>
        applyFilters(row, state.searchTerm, state.statusFilter)
      ),
      selectedGroup:
        state.selectedGroup?.applicationGroupId === group.applicationGroupId
          ? group
          : state.selectedGroup,
      lastUpdatedGroup: group,
      saveError: null,
    };
  }),

  on(
    GroupsActions.updateGroupFailure,
    (state, { error }): GroupsState => ({
      ...state,
      isSaving: false,
      saveError: error,
    })
  ),

  // Delete Group
  on(
    GroupsActions.deleteGroup,
    (state): GroupsState => ({
      ...state,
      isDeleting: true,
      deleteError: null,
    })
  ),

  on(GroupsActions.deleteGroupSuccess, (state, { groupId }): GroupsState => {
    const updatedGroups = state.groups.filter(
      (g) => g.applicationGroupId !== groupId
    );
    const updatedRows = state.groupRows.filter(
      (row) => row.group.applicationGroupId !== groupId
    );

    return {
      ...state,
      isDeleting: false,
      groups: updatedGroups,
      groupRows: updatedRows,
      filteredGroupRows: updatedRows.filter((row) =>
        applyFilters(row, state.searchTerm, state.statusFilter)
      ),
      selectedGroup:
        state.selectedGroup?.applicationGroupId === groupId
          ? null
          : state.selectedGroup,
      lastDeletedGroupId: groupId,
      deleteError: null,
    };
  }),

  on(
    GroupsActions.deleteGroupFailure,
    (state, { error }): GroupsState => ({
      ...state,
      isDeleting: false,
      deleteError: error,
    })
  ),

  // Selection Management
  on(
    GroupsActions.selectGroup,
    (state, { group }): GroupsState => ({
      ...state,
      selectedGroup: group,
    })
  ),

  // Create Mode Management
  on(GroupsActions.enterCreateMode, (state, { placeholderGroup }): GroupsState => {
    const placeholderRow: GroupTableRow = {
      group: placeholderGroup,
      applicationId: placeholderGroup.applicationId || '',
      memberCount: 0,
      lastActivity: 'Just now',
    };

    const updatedRows = [placeholderRow, ...state.groupRows];

    return {
      ...state,
      isInCreateMode: true,
      isCreatingNew: true,
      groupRows: updatedRows,
      filteredGroupRows: updatedRows.filter((row) =>
        applyFilters(row, state.searchTerm, state.statusFilter)
      ),
      selectedGroup: placeholderGroup,
    };
  }),

  on(
    GroupsActions.exitCreateMode,
    (state): GroupsState => ({
      ...state,
      isInCreateMode: false,
      isCreatingNew: false,
    })
  ),

  on(GroupsActions.cancelCreateMode, (state): GroupsState => {
    const updatedRows = state.groupRows.filter(
      (row) => row.group.applicationGroupId !== 'new-group-placeholder'
    );

    return {
      ...state,
      isInCreateMode: false,
      isCreatingNew: false,
      groupRows: updatedRows,
      filteredGroupRows: updatedRows.filter((row) =>
        applyFilters(row, state.searchTerm, state.statusFilter)
      ),
      selectedGroup: null,
      saveError: null,
    };
  }),

  // Filter Management
  on(GroupsActions.setSearchTerm, (state, { searchTerm }): GroupsState => {
    const filteredRows = state.groupRows.filter((row) =>
      applyFilters(row, searchTerm, state.statusFilter)
    );

    return {
      ...state,
      searchTerm,
      filteredGroupRows: filteredRows,
    };
  }),

  on(GroupsActions.setStatusFilter, (state, { statusFilter }): GroupsState => {
    const filteredRows = state.groupRows.filter((row) =>
      applyFilters(row, state.searchTerm, statusFilter)
    );

    return {
      ...state,
      statusFilter,
      filteredGroupRows: filteredRows,
    };
  }),

  on(GroupsActions.applyFilters, (state): GroupsState => {
    const filteredRows = state.groupRows.filter((row) =>
      applyFilters(row, state.searchTerm, state.statusFilter)
    );

    return {
      ...state,
      filteredGroupRows: filteredRows,
    };
  }),

  // Group Rows Management
  on(GroupsActions.updateGroupRows, (state, { groupRows }): GroupsState => {
    const filteredRows = groupRows.filter((row) =>
      applyFilters(row, state.searchTerm, state.statusFilter)
    );

    return {
      ...state,
      groupRows,
      filteredGroupRows: filteredRows,
    };
  }),

  // Group Members Management
  on(
    GroupsActions.loadGroupMembers,
    (state): GroupsState => ({
      ...state,
      isLoadingMembers: true,
      membersError: null,
    })
  ),

  on(
    GroupsActions.loadGroupMembersSuccess,
    (state, { members }): GroupsState => ({
      ...state,
      isLoadingMembers: false,
      groupMembers: members,
      membersError: null,
    })
  ),

  on(
    GroupsActions.loadGroupMembersFailure,
    (state, { error }): GroupsState => ({
      ...state,
      isLoadingMembers: false,
      membersError: error,
    })
  ),

  on(
    GroupsActions.addMemberToGroupSuccess,
    (state, { member }): GroupsState => ({
      ...state,
      groupMembers: [...state.groupMembers, member],
    })
  ),

  on(
    GroupsActions.removeMemberFromGroupSuccess,
    (state, { membershipId }): GroupsState => ({
      ...state,
      groupMembers: state.groupMembers.filter(
        (m) => m.applicationGroupUserId !== membershipId
      ),
    })
  ),

  // Error Management
  on(
    GroupsActions.clearErrors,
    (state): GroupsState => ({
      ...state,
      error: null,
      saveError: null,
      deleteError: null,
      membersError: null,
    })
  ),

  on(
    GroupsActions.clearSaveError,
    (state): GroupsState => ({
      ...state,
      saveError: null,
    })
  ),

  on(
    GroupsActions.clearDeleteError,
    (state): GroupsState => ({
      ...state,
      deleteError: null,
    })
  ),

  on(
    GroupsActions.clearMembersError,
    (state): GroupsState => ({
      ...state,
      membersError: null,
    })
  ),

  // UI State Management
  on(
    GroupsActions.setLoading,
    (state, { isLoading }): GroupsState => ({
      ...state,
      isLoading,
    })
  ),

  on(
    GroupsActions.setSaving,
    (state, { isSaving }): GroupsState => ({
      ...state,
      isSaving,
    })
  ),

  on(
    GroupsActions.setDeleting,
    (state, { isDeleting }): GroupsState => ({
      ...state,
      isDeleting,
    })
  ),

  // Utility Actions
  on(
    GroupsActions.resetState,
    (): GroupsState => ({
      ...initialGroupsState,
    })
  ),

  on(
    GroupsActions.refreshGroups,
    (state): GroupsState => ({
      ...state,
      isLoading: true,
      error: null,
    })
  )
);

// Helper function to apply filters
function applyFilters(
  row: GroupTableRow,
  searchTerm: string,
  statusFilter: string
): boolean {
  const matchesSearch =
    !searchTerm ||
    row.group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.group.applicationGroupId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (row.group.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

  const matchesStatus = !statusFilter || row.group.status === statusFilter;

  return matchesSearch && matchesStatus;
}

// Helper function to format last activity as relative time
function formatLastActivity(
  dateValue: string | Date | number | undefined
): string {
  if (!dateValue) return 'Never';
  const date =
    typeof dateValue === 'number'
      ? new Date(dateValue * 1000)
      : dateValue instanceof Date
        ? dateValue
        : new Date(dateValue);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return diffMins + ' min ago';
  if (diffHours < 24)
    return diffHours + ' hour' + (diffHours > 1 ? 's' : '') + ' ago';
  if (diffDays < 7)
    return diffDays + ' day' + (diffDays > 1 ? 's' : '') + ' ago';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
