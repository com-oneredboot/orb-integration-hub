/**
 * Groups Selectors Unit Tests
 *
 * Tests for the groups NgRx selectors.
 *
 * @see .kiro/specs/application-access-management/design.md
 * _Requirements: 8.5_
 */

import {
  selectGroupsState,
  selectGroups,
  selectGroupRows,
  selectFilteredGroupRows,
  selectSelectedGroup,
  selectGroupMembers,
  selectIsLoading,
  selectIsCreatingNew,
  selectIsSaving,
  selectIsDeleting,
  selectIsLoadingMembers,
  selectError,
  selectSaveError,
  selectDeleteError,
  selectSearchTerm,
  selectStatusFilter,
  selectCurrentApplicationId,
  selectLastCreatedGroup,
  selectLastUpdatedGroup,
  selectLastDeletedGroupId,
  selectHasGroups,
  selectGroupCount,
  selectFilteredGroupCount,
  selectHasFiltersApplied,
  selectIsAnyOperationInProgress,
  selectHasAnyError,
} from './groups.selectors';
import { GroupsState, initialGroupsState, GroupTableRow } from './groups.state';
import { IApplicationGroups } from '../../../../../core/models/ApplicationGroupsModel';
import { IApplicationGroupUsers } from '../../../../../core/models/ApplicationGroupUsersModel';
import { ApplicationGroupStatus } from '../../../../../core/enums/ApplicationGroupStatusEnum';
import { ApplicationGroupUserStatus } from '../../../../../core/enums/ApplicationGroupUserStatusEnum';

describe('Groups Selectors', () => {
  const createMockGroup = (overrides: Partial<IApplicationGroups> = {}): IApplicationGroups => ({
    applicationGroupId: 'group-1',
    applicationId: 'app-1',
    name: 'Test Group',
    description: 'Test Description',
    status: ApplicationGroupStatus.Active,
    memberCount: 5,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-15'),
    ...overrides,
  });

  const createMockMember = (overrides: Partial<IApplicationGroupUsers> = {}): IApplicationGroupUsers => ({
    applicationGroupUserId: 'member-1',
    applicationGroupId: 'group-1',
    userId: 'user-1',
    applicationId: 'app-1',
    status: ApplicationGroupUserStatus.Active,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-15'),
    ...overrides,
  });

  const createMockState = (groupsState: Partial<GroupsState> = {}): { groups: GroupsState } => ({
    groups: {
      ...initialGroupsState,
      ...groupsState,
    },
  });

  describe('selectGroupsState', () => {
    it('should select the groups state', () => {
      const state = createMockState();
      const result = selectGroupsState(state);
      expect(result).toEqual(initialGroupsState);
    });
  });

  describe('selectGroups', () => {
    it('should return empty array when no groups', () => {
      const state = createMockState();
      const result = selectGroups(state);
      expect(result).toEqual([]);
    });

    it('should return groups array', () => {
      const groups = [createMockGroup(), createMockGroup({ applicationGroupId: 'group-2' })];
      const state = createMockState({ groups });
      const result = selectGroups(state);
      expect(result).toEqual(groups);
    });
  });

  describe('selectGroupRows', () => {
    it('should return empty array when no group rows', () => {
      const state = createMockState();
      const result = selectGroupRows(state);
      expect(result).toEqual([]);
    });

    it('should return group rows', () => {
      const groupRows: GroupTableRow[] = [
        { group: createMockGroup(), applicationId: 'app-1', memberCount: 5, lastActivity: 'Just now' },
      ];
      const state = createMockState({ groupRows });
      const result = selectGroupRows(state);
      expect(result).toEqual(groupRows);
    });
  });

  describe('selectFilteredGroupRows', () => {
    it('should return filtered group rows', () => {
      const filteredGroupRows: GroupTableRow[] = [
        { group: createMockGroup(), applicationId: 'app-1', memberCount: 5, lastActivity: '2 hours ago' },
      ];
      const state = createMockState({ filteredGroupRows });
      const result = selectFilteredGroupRows(state);
      expect(result).toEqual(filteredGroupRows);
    });
  });

  describe('selectSelectedGroup', () => {
    it('should return null when no group selected', () => {
      const state = createMockState();
      const result = selectSelectedGroup(state);
      expect(result).toBeNull();
    });

    it('should return selected group', () => {
      const selectedGroup = createMockGroup();
      const state = createMockState({ selectedGroup });
      const result = selectSelectedGroup(state);
      expect(result).toEqual(selectedGroup);
    });
  });

  describe('selectGroupMembers', () => {
    it('should return empty array when no members', () => {
      const state = createMockState();
      const result = selectGroupMembers(state);
      expect(result).toEqual([]);
    });

    it('should return members array', () => {
      const groupMembers = [createMockMember(), createMockMember({ applicationGroupUserId: 'member-2' })];
      const state = createMockState({ groupMembers });
      const result = selectGroupMembers(state);
      expect(result).toEqual(groupMembers);
    });
  });


  describe('Loading State Selectors', () => {
    it('selectIsLoading should return loading state', () => {
      const state = createMockState({ isLoading: true });
      expect(selectIsLoading(state)).toBe(true);
    });

    it('selectIsCreatingNew should return creating state', () => {
      const state = createMockState({ isCreatingNew: true });
      expect(selectIsCreatingNew(state)).toBe(true);
    });

    it('selectIsSaving should return saving state', () => {
      const state = createMockState({ isSaving: true });
      expect(selectIsSaving(state)).toBe(true);
    });

    it('selectIsDeleting should return deleting state', () => {
      const state = createMockState({ isDeleting: true });
      expect(selectIsDeleting(state)).toBe(true);
    });

    it('selectIsLoadingMembers should return loading members state', () => {
      const state = createMockState({ isLoadingMembers: true });
      expect(selectIsLoadingMembers(state)).toBe(true);
    });
  });

  describe('Error Selectors', () => {
    it('selectError should return error', () => {
      const state = createMockState({ error: 'Test error' });
      expect(selectError(state)).toBe('Test error');
    });

    it('selectSaveError should return save error', () => {
      const state = createMockState({ saveError: 'Save error' });
      expect(selectSaveError(state)).toBe('Save error');
    });

    it('selectDeleteError should return delete error', () => {
      const state = createMockState({ deleteError: 'Delete error' });
      expect(selectDeleteError(state)).toBe('Delete error');
    });
  });

  describe('Filter Selectors', () => {
    it('selectSearchTerm should return search term', () => {
      const state = createMockState({ searchTerm: 'admin' });
      expect(selectSearchTerm(state)).toBe('admin');
    });

    it('selectStatusFilter should return status filter', () => {
      const state = createMockState({ statusFilter: ApplicationGroupStatus.Active });
      expect(selectStatusFilter(state)).toBe(ApplicationGroupStatus.Active);
    });
  });

  describe('Context Selectors', () => {
    it('selectCurrentApplicationId should return application ID', () => {
      const state = createMockState({ currentApplicationId: 'app-123' });
      expect(selectCurrentApplicationId(state)).toBe('app-123');
    });
  });

  describe('Operation Result Selectors', () => {
    it('selectLastCreatedGroup should return last created group', () => {
      const group = createMockGroup();
      const state = createMockState({ lastCreatedGroup: group });
      expect(selectLastCreatedGroup(state)).toEqual(group);
    });

    it('selectLastUpdatedGroup should return last updated group', () => {
      const group = createMockGroup();
      const state = createMockState({ lastUpdatedGroup: group });
      expect(selectLastUpdatedGroup(state)).toEqual(group);
    });

    it('selectLastDeletedGroupId should return last deleted group ID', () => {
      const state = createMockState({ lastDeletedGroupId: 'group-deleted' });
      expect(selectLastDeletedGroupId(state)).toBe('group-deleted');
    });
  });

  describe('Computed Selectors', () => {
    it('selectHasGroups should return true when groups exist', () => {
      const state = createMockState({ groups: [createMockGroup()] });
      expect(selectHasGroups(state)).toBe(true);
    });

    it('selectHasGroups should return false when no groups', () => {
      const state = createMockState({ groups: [] });
      expect(selectHasGroups(state)).toBe(false);
    });

    it('selectGroupCount should return number of groups', () => {
      const state = createMockState({ groups: [createMockGroup(), createMockGroup({ applicationGroupId: 'group-2' })] });
      expect(selectGroupCount(state)).toBe(2);
    });

    it('selectFilteredGroupCount should return number of filtered groups', () => {
      const filteredGroupRows: GroupTableRow[] = [
        { group: createMockGroup(), applicationId: 'app-1', memberCount: 5, lastActivity: 'Just now' },
        { group: createMockGroup({ applicationGroupId: 'group-2' }), applicationId: 'app-1', memberCount: 3, lastActivity: '1 hour ago' },
      ];
      const state = createMockState({ filteredGroupRows });
      expect(selectFilteredGroupCount(state)).toBe(2);
    });

    it('selectHasFiltersApplied should return true when search term is set', () => {
      const state = createMockState({ searchTerm: 'admin' });
      expect(selectHasFiltersApplied(state)).toBe(true);
    });

    it('selectHasFiltersApplied should return true when status filter is set', () => {
      const state = createMockState({ statusFilter: ApplicationGroupStatus.Active });
      expect(selectHasFiltersApplied(state)).toBe(true);
    });

    it('selectHasFiltersApplied should return false when no filters', () => {
      const state = createMockState({ searchTerm: '', statusFilter: '' });
      expect(selectHasFiltersApplied(state)).toBe(false);
    });

    it('selectIsAnyOperationInProgress should return true when loading', () => {
      const state = createMockState({ isLoading: true });
      expect(selectIsAnyOperationInProgress(state)).toBe(true);
    });

    it('selectIsAnyOperationInProgress should return true when saving', () => {
      const state = createMockState({ isSaving: true });
      expect(selectIsAnyOperationInProgress(state)).toBe(true);
    });

    it('selectIsAnyOperationInProgress should return false when idle', () => {
      const state = createMockState({ isLoading: false, isSaving: false, isDeleting: false });
      expect(selectIsAnyOperationInProgress(state)).toBe(false);
    });

    it('selectHasAnyError should return true when error exists', () => {
      const state = createMockState({ error: 'Some error' });
      expect(selectHasAnyError(state)).toBe(true);
    });

    it('selectHasAnyError should return false when no errors', () => {
      const state = createMockState({ error: null, saveError: null, deleteError: null, membersError: null });
      expect(selectHasAnyError(state)).toBe(false);
    });
  });

  describe('Default Values', () => {
    it('should return default values when state is undefined', () => {
      const emptyState = { groups: undefined as unknown as GroupsState };

      expect(selectGroups(emptyState)).toEqual([]);
      expect(selectGroupRows(emptyState)).toEqual([]);
      expect(selectFilteredGroupRows(emptyState)).toEqual([]);
      expect(selectSelectedGroup(emptyState)).toBeNull();
      expect(selectGroupMembers(emptyState)).toEqual([]);
      expect(selectIsLoading(emptyState)).toBe(false);
      expect(selectError(emptyState)).toBeNull();
      expect(selectSearchTerm(emptyState)).toBe('');
      expect(selectStatusFilter(emptyState)).toBe('');
    });
  });
});
