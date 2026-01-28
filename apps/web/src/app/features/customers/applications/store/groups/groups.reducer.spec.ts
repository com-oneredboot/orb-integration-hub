/**
 * Groups Reducer Unit Tests
 *
 * Tests for the groups NgRx reducer.
 *
 * @see .kiro/specs/application-access-management/design.md
 * _Requirements: 8.5_
 */

import { groupsReducer } from './groups.reducer';
import { GroupsActions } from './groups.actions';
import { GroupsState, GroupTableRow, initialGroupsState } from './groups.state';
import { IApplicationGroups } from '../../../../../core/models/ApplicationGroupsModel';
import { IApplicationGroupUsers } from '../../../../../core/models/ApplicationGroupUsersModel';
import { ApplicationGroupStatus } from '../../../../../core/enums/ApplicationGroupStatusEnum';
import { ApplicationGroupUserStatus } from '../../../../../core/enums/ApplicationGroupUserStatusEnum';

describe('Groups Reducer', () => {
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

  describe('Initial State', () => {
    it('should return the initial state', () => {
      const action = { type: 'UNKNOWN' };
      const state = groupsReducer(undefined, action);
      expect(state).toEqual(initialGroupsState);
    });
  });

  describe('Load Groups', () => {
    it('should set isLoading to true on loadGroups', () => {
      const action = GroupsActions.loadGroups({ applicationId: 'app-1' });
      const state = groupsReducer(initialGroupsState, action);
      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should populate groups and groupRows on loadGroupsSuccess', () => {
      const groups = [
        createMockGroup({ applicationGroupId: 'group-1', name: 'Group A' }),
        createMockGroup({ applicationGroupId: 'group-2', name: 'Group B' }),
      ];
      const action = GroupsActions.loadGroupsSuccess({ groups });
      const state = groupsReducer(initialGroupsState, action);

      expect(state.isLoading).toBe(false);
      expect(state.groups).toEqual(groups);
      expect(state.groupRows.length).toBe(2);
      expect(state.filteredGroupRows.length).toBe(2);
      expect(state.error).toBeNull();
    });

    it('should set error on loadGroupsFailure', () => {
      const action = GroupsActions.loadGroupsFailure({ error: 'Failed to load' });
      const state = groupsReducer(initialGroupsState, action);

      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Failed to load');
    });
  });

  describe('Load Single Group', () => {
    it('should set isLoading to true on loadGroup', () => {
      const action = GroupsActions.loadGroup({ groupId: 'group-1' });
      const state = groupsReducer(initialGroupsState, action);
      expect(state.isLoading).toBe(true);
    });

    it('should set selectedGroup on loadGroupSuccess', () => {
      const group = createMockGroup();
      const action = GroupsActions.loadGroupSuccess({ group });
      const state = groupsReducer(initialGroupsState, action);

      expect(state.isLoading).toBe(false);
      expect(state.selectedGroup).toEqual(group);
    });

    it('should set error on loadGroupFailure', () => {
      const action = GroupsActions.loadGroupFailure({ error: 'Group not found' });
      const state = groupsReducer(initialGroupsState, action);

      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Group not found');
    });
  });

  describe('Create Group', () => {
    it('should set isSaving to true on createGroup', () => {
      const action = GroupsActions.createGroup({
        input: { applicationId: 'app-1', name: 'New Group' },
      });
      const state = groupsReducer(initialGroupsState, action);
      expect(state.isSaving).toBe(true);
    });

    it('should add group to state on createGroupSuccess', () => {
      const group = createMockGroup();
      const action = GroupsActions.createGroupSuccess({ group });
      const state = groupsReducer(initialGroupsState, action);

      expect(state.isSaving).toBe(false);
      expect(state.lastCreatedGroup).toEqual(group);
      expect(state.groups).toContain(group);
    });

    it('should set error on createGroupFailure', () => {
      const action = GroupsActions.createGroupFailure({ error: 'Create failed' });
      const state = groupsReducer(initialGroupsState, action);

      expect(state.isSaving).toBe(false);
      expect(state.saveError).toBe('Create failed');
    });
  });


  describe('Update Group', () => {
    it('should set isSaving to true on updateGroup', () => {
      const action = GroupsActions.updateGroup({
        input: { applicationGroupId: 'group-1', name: 'Updated' },
      });
      const state = groupsReducer(initialGroupsState, action);
      expect(state.isSaving).toBe(true);
    });

    it('should update group in state on updateGroupSuccess', () => {
      const existingGroup = createMockGroup({ name: 'Original' });
      const updatedGroup = createMockGroup({ name: 'Updated' });

      const initialState: GroupsState = {
        ...initialGroupsState,
        groups: [existingGroup],
        groupRows: [{ group: existingGroup, applicationId: 'app-1', memberCount: 0, lastActivity: 'Just now' }],
        filteredGroupRows: [{ group: existingGroup, applicationId: 'app-1', memberCount: 0, lastActivity: 'Just now' }],
      };

      const action = GroupsActions.updateGroupSuccess({ group: updatedGroup });
      const state = groupsReducer(initialState, action);

      expect(state.isSaving).toBe(false);
      expect(state.groups[0].name).toBe('Updated');
      expect(state.lastUpdatedGroup).toEqual(updatedGroup);
    });

    it('should set error on updateGroupFailure', () => {
      const action = GroupsActions.updateGroupFailure({ error: 'Update failed' });
      const state = groupsReducer(initialGroupsState, action);

      expect(state.isSaving).toBe(false);
      expect(state.saveError).toBe('Update failed');
    });
  });

  describe('Delete Group', () => {
    it('should set isDeleting to true on deleteGroup', () => {
      const action = GroupsActions.deleteGroup({
        groupId: 'group-1',
        applicationId: 'app-1',
      });
      const state = groupsReducer(initialGroupsState, action);
      expect(state.isDeleting).toBe(true);
    });

    it('should remove group from state on deleteGroupSuccess', () => {
      const group = createMockGroup();
      const initialState: GroupsState = {
        ...initialGroupsState,
        groups: [group],
        groupRows: [{ group, applicationId: 'app-1', memberCount: 0, lastActivity: 'Just now' }],
        filteredGroupRows: [{ group, applicationId: 'app-1', memberCount: 0, lastActivity: 'Just now' }],
      };

      const action = GroupsActions.deleteGroupSuccess({
        groupId: 'group-1',
        applicationId: 'app-1',
      });
      const state = groupsReducer(initialState, action);

      expect(state.isDeleting).toBe(false);
      expect(state.groups.length).toBe(0);
      expect(state.groupRows.length).toBe(0);
      expect(state.lastDeletedGroupId).toBe('group-1');
    });

    it('should set error on deleteGroupFailure', () => {
      const action = GroupsActions.deleteGroupFailure({ error: 'Delete failed' });
      const state = groupsReducer(initialGroupsState, action);

      expect(state.isDeleting).toBe(false);
      expect(state.deleteError).toBe('Delete failed');
    });
  });

  describe('Group Members', () => {
    it('should set isLoadingMembers to true on loadGroupMembers', () => {
      const action = GroupsActions.loadGroupMembers({ groupId: 'group-1' });
      const state = groupsReducer(initialGroupsState, action);
      expect(state.isLoadingMembers).toBe(true);
    });

    it('should populate groupMembers on loadGroupMembersSuccess', () => {
      const members = [
        createMockMember({ applicationGroupUserId: 'member-1' }),
        createMockMember({ applicationGroupUserId: 'member-2' }),
      ];
      const action = GroupsActions.loadGroupMembersSuccess({ members });
      const state = groupsReducer(initialGroupsState, action);

      expect(state.isLoadingMembers).toBe(false);
      expect(state.groupMembers).toEqual(members);
    });

    it('should add member on addMemberToGroupSuccess', () => {
      const member = createMockMember();
      const action = GroupsActions.addMemberToGroupSuccess({ member });
      const state = groupsReducer(initialGroupsState, action);

      expect(state.groupMembers).toContain(member);
    });

    it('should remove member on removeMemberFromGroupSuccess', () => {
      const member = createMockMember();
      const initialState: GroupsState = {
        ...initialGroupsState,
        groupMembers: [member],
      };

      const action = GroupsActions.removeMemberFromGroupSuccess({
        membershipId: 'member-1',
      });
      const state = groupsReducer(initialState, action);

      expect(state.groupMembers.length).toBe(0);
    });
  });


  describe('Filtering', () => {
    it('should filter groups by search term', () => {
      const groups = [
        createMockGroup({ applicationGroupId: 'group-1', name: 'Admins' }),
        createMockGroup({ applicationGroupId: 'group-2', name: 'Users' }),
        createMockGroup({ applicationGroupId: 'group-3', name: 'Guests' }),
      ];

      const loadAction = GroupsActions.loadGroupsSuccess({ groups });
      let state = groupsReducer(initialGroupsState, loadAction);

      const filterAction = GroupsActions.setSearchTerm({ searchTerm: 'admin' });
      state = groupsReducer(state, filterAction);

      expect(state.searchTerm).toBe('admin');
      expect(state.filteredGroupRows.length).toBe(1);
      expect(state.filteredGroupRows[0].group.name).toBe('Admins');
    });

    it('should filter groups by status', () => {
      const groups = [
        createMockGroup({ applicationGroupId: 'group-1', status: ApplicationGroupStatus.Active }),
        createMockGroup({ applicationGroupId: 'group-2', status: ApplicationGroupStatus.Deleted }),
      ];

      const loadAction = GroupsActions.loadGroupsSuccess({ groups });
      let state = groupsReducer(initialGroupsState, loadAction);

      const filterAction = GroupsActions.setStatusFilter({
        statusFilter: ApplicationGroupStatus.Active,
      });
      state = groupsReducer(state, filterAction);

      expect(state.statusFilter).toBe(ApplicationGroupStatus.Active);
      expect(state.filteredGroupRows.length).toBe(1);
      expect(state.filteredGroupRows[0].group.status).toBe(ApplicationGroupStatus.Active);
    });

    it('should combine search and status filters', () => {
      const groups = [
        createMockGroup({
          applicationGroupId: 'group-1',
          name: 'Active Admins',
          status: ApplicationGroupStatus.Active,
        }),
        createMockGroup({
          applicationGroupId: 'group-2',
          name: 'Deleted Admins',
          status: ApplicationGroupStatus.Deleted,
        }),
        createMockGroup({
          applicationGroupId: 'group-3',
          name: 'Active Users',
          status: ApplicationGroupStatus.Active,
        }),
      ];

      const loadAction = GroupsActions.loadGroupsSuccess({ groups });
      let state = groupsReducer(initialGroupsState, loadAction);

      state = groupsReducer(state, GroupsActions.setSearchTerm({ searchTerm: 'admin' }));
      state = groupsReducer(
        state,
        GroupsActions.setStatusFilter({ statusFilter: ApplicationGroupStatus.Active })
      );

      expect(state.filteredGroupRows.length).toBe(1);
      expect(state.filteredGroupRows[0].group.name).toBe('Active Admins');
    });
  });

  describe('Select Group', () => {
    it('should set selectedGroup on selectGroup', () => {
      const group = createMockGroup();
      const action = GroupsActions.selectGroup({ group });
      const state = groupsReducer(initialGroupsState, action);

      expect(state.selectedGroup).toEqual(group);
    });
  });

  describe('Clear Errors', () => {
    it('should clear all errors on clearErrors', () => {
      const initialState: GroupsState = {
        ...initialGroupsState,
        error: 'Some error',
        saveError: 'Save error',
        deleteError: 'Delete error',
      };

      const action = GroupsActions.clearErrors();
      const state = groupsReducer(initialState, action);

      expect(state.error).toBeNull();
      expect(state.saveError).toBeNull();
      expect(state.deleteError).toBeNull();
    });
  });

  describe('Reset State', () => {
    it('should reset to initial state on resetState', () => {
      const modifiedState: GroupsState = {
        ...initialGroupsState,
        groups: [createMockGroup()],
        isLoading: true,
        error: 'Some error',
      };

      const action = GroupsActions.resetState();
      const state = groupsReducer(modifiedState, action);

      expect(state).toEqual(initialGroupsState);
    });
  });
});
