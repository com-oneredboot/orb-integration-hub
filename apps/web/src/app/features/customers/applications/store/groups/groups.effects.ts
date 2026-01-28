/**
 * Groups Effects
 *
 * Handles side effects for application group state management.
 * Follows the same patterns as ApplicationsEffects.
 *
 * @see .kiro/specs/application-access-management/design.md
 * _Requirements: 8.1, 8.3_
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import {
  map,
  catchError,
  switchMap,
  withLatestFrom,
  filter,
} from 'rxjs/operators';

import { GroupsActions } from './groups.actions';
import { GroupService } from '../../../../../core/services/group.service';
import { selectCurrentApplicationId } from './groups.selectors';

@Injectable()
export class GroupsEffects {
  constructor(
    private actions$: Actions,
    private groupService: GroupService,
    private store: Store
  ) {}

  /**
   * Load Groups Effect
   * Loads all groups for a specific application.
   */
  loadGroups$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GroupsActions.loadGroups, GroupsActions.refreshGroups),
      switchMap((action) =>
        this.groupService.getGroupsByApplication(action.applicationId).pipe(
          map((connection) =>
            GroupsActions.loadGroupsSuccess({ groups: connection.items })
          ),
          catchError((error) =>
            of(
              GroupsActions.loadGroupsFailure({
                error: error.message || 'Failed to load groups',
              })
            )
          )
        )
      )
    )
  );

  /**
   * Load Single Group Effect
   */
  loadGroup$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GroupsActions.loadGroup),
      switchMap((action) =>
        this.groupService.getGroup(action.groupId).pipe(
          map((group) => {
            if (group) {
              return GroupsActions.loadGroupSuccess({ group });
            }
            return GroupsActions.loadGroupFailure({ error: 'Group not found' });
          }),
          catchError((error) =>
            of(
              GroupsActions.loadGroupFailure({
                error: error.message || 'Failed to load group',
              })
            )
          )
        )
      )
    )
  );

  /**
   * Create Group Effect
   */
  createGroup$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GroupsActions.createGroup),
      switchMap((action) =>
        this.groupService.createGroup(action.input).pipe(
          map((group) => GroupsActions.createGroupSuccess({ group })),
          catchError((error) =>
            of(
              GroupsActions.createGroupFailure({
                error: error.message || 'Failed to create group',
              })
            )
          )
        )
      )
    )
  );

  /**
   * Update Group Effect
   */
  updateGroup$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GroupsActions.updateGroup),
      switchMap((action) =>
        this.groupService.updateGroup(action.input).pipe(
          map((group) => GroupsActions.updateGroupSuccess({ group })),
          catchError((error) =>
            of(
              GroupsActions.updateGroupFailure({
                error: error.message || 'Failed to update group',
              })
            )
          )
        )
      )
    )
  );

  /**
   * Delete Group Effect
   */
  deleteGroup$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GroupsActions.deleteGroup),
      switchMap((action) =>
        this.groupService.deleteGroup(action.groupId).pipe(
          map(() =>
            GroupsActions.deleteGroupSuccess({
              groupId: action.groupId,
              applicationId: action.applicationId,
            })
          ),
          catchError((error) =>
            of(
              GroupsActions.deleteGroupFailure({
                error: error.message || 'Failed to delete group',
              })
            )
          )
        )
      )
    )
  );

  /**
   * Load Group Members Effect
   */
  loadGroupMembers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GroupsActions.loadGroupMembers),
      switchMap((action) =>
        this.groupService.getGroupMembers(action.groupId).pipe(
          map((connection) =>
            GroupsActions.loadGroupMembersSuccess({ members: connection.items })
          ),
          catchError((error) =>
            of(
              GroupsActions.loadGroupMembersFailure({
                error: error.message || 'Failed to load group members',
              })
            )
          )
        )
      )
    )
  );

  /**
   * Add Member to Group Effect
   */
  addMemberToGroup$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GroupsActions.addMemberToGroup),
      switchMap((action) =>
        this.groupService.addMemberToGroup(action.groupId, action.userId).pipe(
          map((member) => GroupsActions.addMemberToGroupSuccess({ member })),
          catchError((error) =>
            of(
              GroupsActions.addMemberToGroupFailure({
                error: error.message || 'Failed to add member to group',
              })
            )
          )
        )
      )
    )
  );

  /**
   * Remove Member from Group Effect
   */
  removeMemberFromGroup$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GroupsActions.removeMemberFromGroup),
      switchMap((action) =>
        this.groupService.removeMemberFromGroup(action.membershipId).pipe(
          map(() =>
            GroupsActions.removeMemberFromGroupSuccess({
              membershipId: action.membershipId,
            })
          ),
          catchError((error) =>
            of(
              GroupsActions.removeMemberFromGroupFailure({
                error: error.message || 'Failed to remove member from group',
              })
            )
          )
        )
      )
    )
  );

  /**
   * Load Group Roles Effect
   */
  loadGroupRoles$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GroupsActions.loadGroupRoles),
      switchMap((action) =>
        this.groupService.getGroupRoles(action.groupId).pipe(
          map((connection) =>
            GroupsActions.loadGroupRolesSuccess({ roles: connection.items })
          ),
          catchError((error) =>
            of(
              GroupsActions.loadGroupRolesFailure({
                error: error.message || 'Failed to load group roles',
              })
            )
          )
        )
      )
    )
  );

  /**
   * Assign Role to Group Effect
   */
  assignRoleToGroup$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GroupsActions.assignRoleToGroup),
      switchMap((action) =>
        this.groupService.assignRoleToGroup(action.input).pipe(
          map((role) => GroupsActions.assignRoleToGroupSuccess({ role })),
          catchError((error) =>
            of(
              GroupsActions.assignRoleToGroupFailure({
                error: error.message || 'Failed to assign role to group',
              })
            )
          )
        )
      )
    )
  );

  /**
   * Remove Role from Group Effect
   */
  removeRoleFromGroup$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GroupsActions.removeRoleFromGroup),
      switchMap((action) =>
        this.groupService.removeRoleFromGroup(action.roleAssignmentId).pipe(
          map(() =>
            GroupsActions.removeRoleFromGroupSuccess({
              roleAssignmentId: action.roleAssignmentId,
            })
          ),
          catchError((error) =>
            of(
              GroupsActions.removeRoleFromGroupFailure({
                error: error.message || 'Failed to remove role from group',
              })
            )
          )
        )
      )
    )
  );

  /**
   * Auto-refresh groups after successful operations
   */
  refreshAfterSuccessfulOperation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        GroupsActions.createGroupSuccess,
        GroupsActions.updateGroupSuccess,
        GroupsActions.deleteGroupSuccess
      ),
      withLatestFrom(this.store.select(selectCurrentApplicationId)),
      filter(([, applicationId]) => !!applicationId),
      switchMap(([, applicationId]) =>
        of(GroupsActions.loadGroups({ applicationId: applicationId! }))
      )
    )
  );
}
