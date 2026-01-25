/**
 * Organizations Effects
 * 
 * Handles side effects for organization state management
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { map, catchError, switchMap, withLatestFrom, filter } from 'rxjs/operators';

import { OrganizationsActions } from './organizations.actions';
import { OrganizationService } from '../../../../core/services/organization.service';
import { selectIsCreatingNew } from './organizations.selectors';
import { selectCurrentUser } from '../../../user/store/user.selectors';

@Injectable()
export class OrganizationsEffects {

  constructor(
    private actions$: Actions,
    private organizationService: OrganizationService,
    private store: Store
  ) {}

  // Load Organizations Effect
  loadOrganizations$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OrganizationsActions.loadOrganizations, OrganizationsActions.refreshOrganizations),
      withLatestFrom(this.store.select(selectCurrentUser)),
      filter(([, currentUser]) => !!currentUser?.userId),
      switchMap(([, currentUser]) =>
        this.organizationService.getUserOrganizations(currentUser!.userId).pipe(
          map(connection => 
            OrganizationsActions.loadOrganizationsSuccess({ 
              organizations: connection.items 
            })
          ),
          catchError(error => 
            of(OrganizationsActions.loadOrganizationsFailure({ 
              error: error.message || 'Failed to load organizations' 
            }))
          )
        )
      )
    )
  );

  // Create Draft Organization Effect (create-on-click pattern)
  createDraftOrganization$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OrganizationsActions.createDraftOrganization),
      withLatestFrom(this.store.select(selectCurrentUser)),
      filter(([, currentUser]) => !!currentUser?.userId),
      switchMap(([, currentUser]) =>
        this.organizationService.createDraft(currentUser!.userId).pipe(
          map(organization => 
            OrganizationsActions.createDraftOrganizationSuccess({ organization })
          ),
          catchError(error => 
            of(OrganizationsActions.createDraftOrganizationFailure({ 
              error: error.message || 'Failed to create draft organization' 
            }))
          )
        )
      )
    )
  );

  // Create Organization Effect
  createOrganization$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OrganizationsActions.createOrganization),
      withLatestFrom(this.store.select(selectIsCreatingNew)),
      switchMap(([action, isCreatingNew]) => {
        // Only proceed if we're actually in create mode
        if (!isCreatingNew) {
          return of(OrganizationsActions.createOrganizationFailure({ 
            error: 'Not in create mode' 
          }));
        }

        return this.organizationService.createOrganization(action.input).pipe(
          map(organization => 
            OrganizationsActions.createOrganizationSuccess({ organization })
          ),
          catchError(error => 
            of(OrganizationsActions.createOrganizationFailure({ 
              error: error.message || 'Failed to create organization' 
            }))
          )
        );
      })
    )
  );

  // Update Organization Effect
  updateOrganization$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OrganizationsActions.updateOrganization),
      switchMap(action =>
        this.organizationService.updateOrganization(action.input).pipe(
          map(organization => 
            OrganizationsActions.updateOrganizationSuccess({ organization })
          ),
          catchError(error => 
            of(OrganizationsActions.updateOrganizationFailure({ 
              error: error.message || 'Failed to update organization' 
            }))
          )
        )
      )
    )
  );

  // Delete Organization Effect
  deleteOrganization$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OrganizationsActions.deleteOrganization),
      switchMap(action =>
        this.organizationService.deleteOrganization(action.organizationId).pipe(
          map(() => 
            OrganizationsActions.deleteOrganizationSuccess({ 
              organizationId: action.organizationId 
            })
          ),
          catchError(error => 
            of(OrganizationsActions.deleteOrganizationFailure({ 
              error: error.message || 'Failed to delete organization' 
            }))
          )
        )
      )
    )
  );

  // Auto-refresh organizations after successful operations
  refreshAfterSuccessfulOperation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        OrganizationsActions.createOrganizationSuccess,
        OrganizationsActions.updateOrganizationSuccess,
        OrganizationsActions.deleteOrganizationSuccess
      ),
      // Add a small delay to ensure backend consistency
      switchMap(() => 
        of(OrganizationsActions.loadOrganizations()).pipe(
          // Optional: add delay here if needed for backend consistency
          // delay(1000)
        )
      )
    )
  );
}