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
import { map, catchError, switchMap, withLatestFrom, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { UsersActions } from './users.actions';
import { UsersService } from '../../../../core/services/users.service';
import { 
  selectOrganizationIds, 
  selectApplicationIds, 
  selectEnvironment,
  selectNextToken 
} from './users.selectors';

@Injectable()
export class UsersEffects {

  constructor(
    private actions$: Actions,
    private usersService: UsersService,
    private store: Store
  ) {}

  /**
   * Load Users Effect
   * 
   * Triggers when loadUsers or refreshUsers actions are dispatched.
   * Calls GetApplicationUsers Lambda query with current filters,
   * then dispatches success or failure action.
   * 
   * _Requirements: 2.1, 10.2_
   */
  loadUsers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UsersActions.loadUsers, UsersActions.refreshUsers),
      withLatestFrom(
        this.store.select(selectOrganizationIds),
        this.store.select(selectApplicationIds),
        this.store.select(selectEnvironment)
      ),
      switchMap(([, organizationIds, applicationIds, environment]) => {
        const input = {
          organizationIds: organizationIds.length > 0 ? organizationIds : undefined,
          applicationIds: applicationIds.length > 0 ? applicationIds : undefined,
          environment: environment || undefined,
          limit: 50
        };

        return this.usersService.getApplicationUsersWithRoles(input).pipe(
          map(output => 
            UsersActions.loadUsersSuccess({
              usersWithRoles: output.users,
              nextToken: output.nextToken
            })
          ),
          catchError(error => {
            console.error('[UsersEffects] Failed to load users:', error);
            return of(UsersActions.loadUsersFailure({
              error: error.message || 'Failed to load users'
            }));
          })
        );
      })
    )
  );

  /**
   * Load More Users Effect
   * 
   * Handles pagination by loading the next page of users.
   * Uses the nextToken from state to fetch the next batch.
   * 
   * _Requirements: 2.1_
   */
  loadMoreUsers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UsersActions.loadMoreUsers),
      withLatestFrom(
        this.store.select(selectOrganizationIds),
        this.store.select(selectApplicationIds),
        this.store.select(selectEnvironment),
        this.store.select(selectNextToken)
      ),
      switchMap(([, organizationIds, applicationIds, environment, nextToken]) => {
        if (!nextToken) {
          return of(UsersActions.loadUsersFailure({
            error: 'No more users to load'
          }));
        }

        const input = {
          organizationIds: organizationIds.length > 0 ? organizationIds : undefined,
          applicationIds: applicationIds.length > 0 ? applicationIds : undefined,
          environment: environment || undefined,
          limit: 50,
          nextToken
        };

        return this.usersService.getApplicationUsersWithRoles(input).pipe(
          map(output => 
            UsersActions.loadMoreUsersSuccess({
              usersWithRoles: output.users,
              nextToken: output.nextToken
            })
          ),
          catchError(error => {
            console.error('[UsersEffects] Failed to load more users:', error);
            return of(UsersActions.loadUsersFailure({
              error: error.message || 'Failed to load more users'
            }));
          })
        );
      })
    )
  );

  /**
   * Filter Change Effect
   * 
   * Triggers reload when server-side filters change.
   * Debounces to avoid excessive API calls.
   * 
   * _Requirements: 2.2_
   */
  filterChange$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        UsersActions.setOrganizationFilter,
        UsersActions.setApplicationFilter,
        UsersActions.setEnvironmentFilter
      ),
      debounceTime(300),
      distinctUntilChanged(),
      map(() => UsersActions.loadUsers())
    )
  );
}
