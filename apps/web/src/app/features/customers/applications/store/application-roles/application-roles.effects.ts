/**
 * Application Roles Effects
 *
 * Handles side effects for application roles state management.
 * Follows the Organizations/Environments store pattern as the canonical reference.
 *
 * @see .kiro/specs/application-roles-management/design.md
 * _Requirements: 8.6, 9.1, 9.2, 9.3, 9.4_
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { map, catchError, switchMap, withLatestFrom, tap } from 'rxjs/operators';

import { ApplicationRolesActions } from './application-roles.actions';
import { selectApplicationId } from './application-roles.selectors';
import { ApplicationRolesService } from '../../../../../core/services/application-roles.service';
import { IApplicationRoles } from '../../../../../core/models/ApplicationRolesModel';
import { Connection } from '../../../../../core/types/graphql.types';

@Injectable()
export class ApplicationRolesEffects {
  constructor(
    private actions$: Actions,
    private applicationRolesService: ApplicationRolesService,
    private store: Store
  ) {}

  /**
   * Load Roles Effect
   * Loads all roles for an application using the ApplicationRoleIndex GSI.
   * _Requirements: 9.4_
   */
  loadRoles$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ApplicationRolesActions.loadRoles),
      tap((action) => {
        console.log('[ApplicationRolesEffects] Loading roles for application:', action.applicationId);
      }),
      switchMap((action) =>
        this.applicationRolesService.listByApplicationId(action.applicationId).pipe(
          tap((connection: Connection<IApplicationRoles>) => {
            console.log('[ApplicationRolesEffects] Loaded roles:', connection.items.length);
          }),
          map((connection: Connection<IApplicationRoles>) =>
            ApplicationRolesActions.loadRolesSuccess({ roles: connection.items })
          ),
          catchError((error) => {
            console.error('[ApplicationRolesEffects] Load error:', error);
            return of(
              ApplicationRolesActions.loadRolesFailure({
                error: error.message || 'Failed to load roles',
              })
            );
          })
        )
      )
    )
  );

  /**
   * Create Role Effect
   * Creates a new role with generated IDs.
   * _Requirements: 9.1, 9.3_
   */
  createRole$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ApplicationRolesActions.createRole),
      tap((action) => {
        console.log('[ApplicationRolesEffects] Creating role:', action.input);
      }),
      switchMap((action) =>
        this.applicationRolesService.create(action.input).pipe(
          tap((role: IApplicationRoles) => {
            console.log('[ApplicationRolesEffects] Created role:', role);
          }),
          map((role: IApplicationRoles) => ApplicationRolesActions.createRoleSuccess({ role })),
          catchError((error) => {
            console.error('[ApplicationRolesEffects] Create error:', error);
            return of(
              ApplicationRolesActions.createRoleFailure({
                error: error.message || 'Failed to create role',
              })
            );
          })
        )
      )
    )
  );

  /**
   * Update Role Effect
   * Updates an existing role.
   * _Requirements: 9.2_
   */
  updateRole$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ApplicationRolesActions.updateRole),
      tap((action) => {
        console.log('[ApplicationRolesEffects] Updating role:', action.input);
      }),
      switchMap((action) =>
        this.applicationRolesService.update(action.input).pipe(
          tap((role: IApplicationRoles) => {
            console.log('[ApplicationRolesEffects] Updated role:', role);
          }),
          map((role: IApplicationRoles) => ApplicationRolesActions.updateRoleSuccess({ role })),
          catchError((error) => {
            console.error('[ApplicationRolesEffects] Update error:', error);
            return of(
              ApplicationRolesActions.updateRoleFailure({
                error: error.message || 'Failed to update role',
              })
            );
          })
        )
      )
    )
  );

  /**
   * Deactivate Role Effect
   * Sets role status to INACTIVE.
   * _Requirements: 9.2_
   */
  deactivateRole$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ApplicationRolesActions.deactivateRole),
      tap((action) => {
        console.log('[ApplicationRolesEffects] Deactivating role:', action.applicationRoleId);
      }),
      switchMap((action) =>
        this.applicationRolesService.disable(action.applicationRoleId).pipe(
          tap((role: IApplicationRoles) => {
            console.log('[ApplicationRolesEffects] Deactivated role:', role);
          }),
          map((role: IApplicationRoles) => ApplicationRolesActions.deactivateRoleSuccess({ role })),
          catchError((error) => {
            console.error('[ApplicationRolesEffects] Deactivate error:', error);
            return of(
              ApplicationRolesActions.deactivateRoleFailure({
                error: error.message || 'Failed to deactivate role',
              })
            );
          })
        )
      )
    )
  );

  /**
   * Delete Role Effect
   * Sets role status to DELETED.
   * _Requirements: 9.2_
   */
  deleteRole$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ApplicationRolesActions.deleteRole),
      tap((action) => {
        console.log('[ApplicationRolesEffects] Deleting role:', action.applicationRoleId);
      }),
      switchMap((action) =>
        this.applicationRolesService.delete(action.applicationRoleId).pipe(
          tap(() => {
            console.log('[ApplicationRolesEffects] Deleted role:', action.applicationRoleId);
          }),
          map(() =>
            ApplicationRolesActions.deleteRoleSuccess({
              applicationRoleId: action.applicationRoleId,
            })
          ),
          catchError((error) => {
            console.error('[ApplicationRolesEffects] Delete error:', error);
            return of(
              ApplicationRolesActions.deleteRoleFailure({
                error: error.message || 'Failed to delete role',
              })
            );
          })
        )
      )
    )
  );

  /**
   * Refresh after successful operations
   */
  refreshAfterSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        ApplicationRolesActions.createRoleSuccess,
        ApplicationRolesActions.updateRoleSuccess,
        ApplicationRolesActions.deactivateRoleSuccess,
        ApplicationRolesActions.deleteRoleSuccess
      ),
      withLatestFrom(this.store.select(selectApplicationId)),
      switchMap(([, applicationId]) => {
        if (applicationId) {
          return of(ApplicationRolesActions.loadRoles({ applicationId }));
        }
        return of({ type: '[ApplicationRoles] No-op' });
      })
    )
  );
}
