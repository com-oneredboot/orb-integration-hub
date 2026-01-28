/**
 * Groups Actions
 *
 * Defines all actions for application group state management.
 * Follows the same patterns as ApplicationsActions.
 *
 * @see .kiro/specs/application-access-management/design.md
 * _Requirements: 8.1, 8.3_
 */

import { createActionGroup, emptyProps, props } from '@ngrx/store';
import {
  IApplicationGroups,
  ApplicationGroupsCreateInput,
  ApplicationGroupsUpdateInput,
} from '../../../../../core/models/ApplicationGroupsModel';
import { IApplicationGroupUsers } from '../../../../../core/models/ApplicationGroupUsersModel';
import {
  IApplicationGroupRoles,
  ApplicationGroupRolesCreateInput,
} from '../../../../../core/models/ApplicationGroupRolesModel';
import { Environment } from '../../../../../core/enums/EnvironmentEnum';
import { GroupTableRow } from './groups.state';

export const GroupsActions = createActionGroup({
  source: 'Groups',
  events: {
    // Set Application Context
    'Set Application Context': props<{ applicationId: string }>(),

    // Load Groups (for an application)
    'Load Groups': props<{ applicationId: string }>(),
    'Load Groups Success': props<{ groups: IApplicationGroups[] }>(),
    'Load Groups Failure': props<{ error: string }>(),

    // Load Single Group (for detail page)
    'Load Group': props<{ groupId: string }>(),
    'Load Group Success': props<{ group: IApplicationGroups }>(),
    'Load Group Failure': props<{ error: string }>(),

    // Create Group
    'Create Group': props<{ input: Partial<ApplicationGroupsCreateInput> }>(),
    'Create Group Success': props<{ group: IApplicationGroups }>(),
    'Create Group Failure': props<{ error: string }>(),

    // Update Group
    'Update Group': props<{ input: Partial<ApplicationGroupsUpdateInput> }>(),
    'Update Group Success': props<{ group: IApplicationGroups }>(),
    'Update Group Failure': props<{ error: string }>(),

    // Delete Group
    'Delete Group': props<{ groupId: string; applicationId: string }>(),
    'Delete Group Success': props<{ groupId: string; applicationId: string }>(),
    'Delete Group Failure': props<{ error: string }>(),

    // Selection Management
    'Select Group': props<{ group: IApplicationGroups | null }>(),

    // Create Mode Management
    'Enter Create Mode': props<{ placeholderGroup: IApplicationGroups }>(),
    'Exit Create Mode': emptyProps(),
    'Cancel Create Mode': emptyProps(),

    // Filter Management
    'Set Search Term': props<{ searchTerm: string }>(),
    'Set Status Filter': props<{ statusFilter: string }>(),
    'Apply Filters': emptyProps(),

    // Group Rows Management (for table display)
    'Update Group Rows': props<{ groupRows: GroupTableRow[] }>(),
    'Update Filtered Group Rows': props<{ filteredRows: GroupTableRow[] }>(),

    // Group Members Management
    'Load Group Members': props<{ groupId: string }>(),
    'Load Group Members Success': props<{ members: IApplicationGroupUsers[] }>(),
    'Load Group Members Failure': props<{ error: string }>(),

    'Add Member To Group': props<{ groupId: string; userId: string }>(),
    'Add Member To Group Success': props<{ member: IApplicationGroupUsers }>(),
    'Add Member To Group Failure': props<{ error: string }>(),

    'Remove Member From Group': props<{ groupId: string; userId: string; membershipId: string }>(),
    'Remove Member From Group Success': props<{ membershipId: string }>(),
    'Remove Member From Group Failure': props<{ error: string }>(),

    // Group Role Assignment Management
    'Load Group Roles': props<{ groupId: string }>(),
    'Load Group Roles Success': props<{ roles: IApplicationGroupRoles[] }>(),
    'Load Group Roles Failure': props<{ error: string }>(),

    'Assign Role To Group': props<{ input: Partial<ApplicationGroupRolesCreateInput> }>(),
    'Assign Role To Group Success': props<{ role: IApplicationGroupRoles }>(),
    'Assign Role To Group Failure': props<{ error: string }>(),

    'Remove Role From Group': props<{ roleAssignmentId: string; groupId: string; environment: Environment }>(),
    'Remove Role From Group Success': props<{ roleAssignmentId: string }>(),
    'Remove Role From Group Failure': props<{ error: string }>(),

    'Clear Roles Error': emptyProps(),
    'Clear Roles Save Error': emptyProps(),
    'Clear Roles Delete Error': emptyProps(),

    // Error Management
    'Clear Errors': emptyProps(),
    'Clear Save Error': emptyProps(),
    'Clear Delete Error': emptyProps(),
    'Clear Members Error': emptyProps(),

    // UI State Management
    'Set Loading': props<{ isLoading: boolean }>(),
    'Set Saving': props<{ isSaving: boolean }>(),
    'Set Deleting': props<{ isDeleting: boolean }>(),

    // Utility Actions
    'Reset State': emptyProps(),
    'Refresh Groups': props<{ applicationId: string }>(),
  },
});
