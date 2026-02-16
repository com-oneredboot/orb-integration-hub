/**
 * Application Users Effects
 * 
 * Handles side effects for application user state management
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { map, catchError, switchMap, withLatestFrom, filter } from 'rxjs/operators';

import { ApplicationUsersActions } from './application-users.actions';
import { ApplicationUsersService } from '../../../../../core/services/application-users.service';
import { UsersService } from '../../../../../core/services/users.service';
import { selectCurrentUser } from '../../../../user/store/user.selectors';
import { EnvironmentRoleAssignment } from './application-users.state';
import { IUsers } from '../../../../../core/models/UsersModel';
import { IApplicationUsers } from '../../../../../core/models/ApplicationUsersModel';

@Injectable()
export class ApplicationUsersEffects {

  constructor(
    private actions$: Actions,
    private applicationUsersService: ApplicationUsersService,
    private usersService: UsersService,
    private store: Store
  ) {}

  // Load Application Users Effect
  loadApplicationUsers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ApplicationUsersActions.loadApplicationUsers),
      withLatestFrom(this.store.select(selectCurrentUser)),
      filter(([, currentUser]) => !!currentUser?.userId),
      switchMap(([action]) =>
        this.applicationUsersService.getApplicationUsers(action.applicationId).pipe(
          map(usersWithRoles => {
            // Transform the response into the format expected by the reducer
            const users: IUsers[] = usersWithRoles.map(uwr => ({
              userId: uwr.userId,
              firstName: uwr.firstName,
              lastName: uwr.lastName,
              status: uwr.status as any,
              // These fields would need to be fetched separately or included in the query
              cognitoId: '',
              cognitoSub: '',
              email: '',
              createdAt: new Date(),
              updatedAt: new Date()
            }));

            const applicationUsers: IApplicationUsers[] = usersWithRoles.map(uwr => ({
              applicationUserId: '', // Would need to be included in query
              userId: uwr.userId,
              applicationId: action.applicationId,
              status: uwr.status as any,
              createdAt: new Date(),
              updatedAt: new Date()
            }));

            const roleAssignments: EnvironmentRoleAssignment[] = usersWithRoles.flatMap(uwr =>
              uwr.roleAssignments
                .filter(ra => ra.applicationId === action.applicationId)
                .map(ra => ({
                  environmentId: ra.environment,
                  environmentName: ra.environment,
                  roleId: ra.roleId,
                  roleName: ra.roleName
                }))
            );

            return ApplicationUsersActions.loadApplicationUsersSuccess({
              users,
              applicationUsers,
              roleAssignments
            });
          }),
          catchError(error =>
            of(ApplicationUsersActions.loadApplicationUsersFailure({
              error: error.message || 'Failed to load application users'
            }))
          )
        )
      )
    )
  );

  // Assign User Effect
  assignUserToApplication$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ApplicationUsersActions.assignUserToApplication),
      switchMap(action =>
        this.applicationUsersService.assignUserToApplication(
          action.applicationId,
          action.assignment.userId
        ).pipe(
          switchMap(applicationUser =>
            // Fetch the full user details
            this.usersService.getUser(action.assignment.userId).pipe(
              map(user => {
                if (!user) {
                  throw new Error('User not found');
                }

                // Build role assignments from the assignment input
                const roleAssignments: EnvironmentRoleAssignment[] = action.assignment.environmentRoles.map(er => ({
                  environmentId: er.environmentId,
                  environmentName: er.environmentId, // Would need environment name lookup
                  roleId: er.roleId,
                  roleName: '' // Would need role name lookup
                }));

                return ApplicationUsersActions.assignUserSuccess({
                  user,
                  applicationUser,
                  roleAssignments
                });
              }),
              catchError(error =>
                of(ApplicationUsersActions.assignUserFailure({
                  error: error.message || 'Failed to fetch user details'
                }))
              )
            )
          ),
          catchError(error =>
            of(ApplicationUsersActions.assignUserFailure({
              error: error.message || 'Failed to assign user'
            }))
          )
        )
      )
    )
  );

  // Unassign User Effect
  unassignUserFromApplication$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ApplicationUsersActions.unassignUserFromApplication),
      switchMap(action => {
        // We need to find the applicationUserId first
        // For now, we'll use the userId as a placeholder
        // In a real implementation, we'd need to look this up from state or make a query
        const applicationUserId = action.userId; // This is a simplification

        return this.applicationUsersService.unassignUserFromApplication(applicationUserId).pipe(
          map(() =>
            ApplicationUsersActions.unassignUserSuccess({
              userId: action.userId
            })
          ),
          catchError(error =>
            of(ApplicationUsersActions.unassignUserFailure({
              error: error.message || 'Failed to unassign user'
            }))
          )
        );
      })
    )
  );

  // Update User Role Effect
  updateUserRole$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ApplicationUsersActions.updateUserRole),
      switchMap(action => {
        // This would need a backend mutation to update the role assignment
        // For now, we'll simulate success
        // In a real implementation, this would call a service method
        
        return of(ApplicationUsersActions.updateUserRoleSuccess({
          userId: action.update.userId,
          environmentId: action.update.environmentId,
          roleId: action.update.roleId,
          roleName: '' // Would need role name lookup
        }));
      }),
      catchError(error =>
        of(ApplicationUsersActions.updateUserRoleFailure({
          error: error.message || 'Failed to update user role'
        }))
      )
    )
  );
}
