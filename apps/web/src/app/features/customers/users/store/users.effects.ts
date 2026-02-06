/**
 * Users Effects
 * 
 * Handles side effects for users state management
 * Following the Organizations pattern - effects handle API calls only
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { map, catchError, switchMap, withLatestFrom, filter } from 'rxjs/operators';

import { UsersActions } from './users.actions';
import { selectCurrentUser } from '../../../user/store/user.selectors';

// TODO: Import UsersService when implemented in task 6
// import { UsersService } from '../../../../core/services/users.service';

@Injectable()
export class UsersEffects {

  constructor(
    private actions$: Actions,
    // TODO: Inject UsersService when implemented in task 6
    // private usersService: UsersService,
    private store: Store
  ) {}

  /**
   * Load Users Effect
   * 
   * Triggers when loadUsers or refreshUsers actions are dispatched.
   * Gets current user from store, calls UsersService to fetch users and application user records,
   * then dispatches success or failure action.
   * 
   * _Requirements: 2.1, 10.2_
   */
  loadUsers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UsersActions.loadUsers, UsersActions.refreshUsers),
      withLatestFrom(this.store.select(selectCurrentUser)),
      filter(([, currentUser]) => !!currentUser?.userId),
      switchMap(([, currentUser]) => {
        // TODO: Replace with actual service call in task 6
        // For now, return empty data to allow compilation
        console.warn('[UsersEffects] UsersService not yet implemented - returning empty data');
        
        return of({
          users: [],
          applicationUserRecords: []
        }).pipe(
          map(({ users, applicationUserRecords }) =>
            UsersActions.loadUsersSuccess({ 
              users,
              applicationUserRecords
            })
          ),
          catchError(error =>
            of(UsersActions.loadUsersFailure({
              error: error.message || 'Failed to load users'
            }))
          )
        );

        /* TODO: Uncomment when UsersService is implemented in task 6
        return this.usersService.getApplicationUsers(currentUser!.userId).pipe(
          map(({ users, applicationUserRecords }) =>
            UsersActions.loadUsersSuccess({ 
              users,
              applicationUserRecords
            })
          ),
          catchError(error =>
            of(UsersActions.loadUsersFailure({
              error: error.message || 'Failed to load users'
            }))
          )
        );
        */
      })
    )
  );
}
