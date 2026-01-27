/**
 * Applications Effects
 *
 * Handles side effects for application state management.
 * Follows the same patterns as OrganizationsEffects.
 *
 * @see .kiro/specs/applications-management/design.md
 * _Requirements: 5.3_
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { map, catchError, switchMap, withLatestFrom, filter } from 'rxjs/operators';

import { ApplicationsActions } from './applications.actions';
import { ApplicationService } from '../../../../core/services/application.service';
import { selectIsCreatingNew } from './applications.selectors';
import { selectCurrentUser } from '../../../user/store/user.selectors';

@Injectable()
export class ApplicationsEffects {
  constructor(
    private actions$: Actions,
    private applicationService: ApplicationService,
    private store: Store
  ) {}

  // Create Draft Application Effect (create-on-click pattern)
  createDraftApplication$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ApplicationsActions.createDraftApplication),
      withLatestFrom(this.store.select(selectCurrentUser)),
      filter(([, currentUser]) => !!currentUser?.userId),
      switchMap(([action, currentUser]) =>
        this.applicationService
          .createDraft(currentUser!.userId, action.organizationId || '')
          .pipe(
            map((application) =>
              ApplicationsActions.createDraftApplicationSuccess({ application })
            ),
            catchError((error) =>
              of(
                ApplicationsActions.createDraftApplicationFailure({
                  error: error.message || 'Failed to create draft application',
                })
              )
            )
          )
      )
    )
  );

  // Create Application Effect
  createApplication$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ApplicationsActions.createApplication),
      withLatestFrom(this.store.select(selectIsCreatingNew)),
      switchMap(([action, isCreatingNew]) => {
        // Only proceed if we're actually in create mode
        if (!isCreatingNew) {
          return of(
            ApplicationsActions.createApplicationFailure({
              error: 'Not in create mode',
            })
          );
        }

        return this.applicationService.createApplication(action.input).pipe(
          map((application) =>
            ApplicationsActions.createApplicationSuccess({ application })
          ),
          catchError((error) =>
            of(
              ApplicationsActions.createApplicationFailure({
                error: error.message || 'Failed to create application',
              })
            )
          )
        );
      })
    )
  );

  // Update Application Effect
  updateApplication$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ApplicationsActions.updateApplication),
      switchMap((action) =>
        this.applicationService.updateApplication(action.input).pipe(
          map((application) =>
            ApplicationsActions.updateApplicationSuccess({ application })
          ),
          catchError((error) =>
            of(
              ApplicationsActions.updateApplicationFailure({
                error: error.message || 'Failed to update application',
              })
            )
          )
        )
      )
    )
  );

  // Delete Application Effect
  deleteApplication$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ApplicationsActions.deleteApplication),
      switchMap((action) =>
        this.applicationService.deleteApplication(action.applicationId).pipe(
          map(() =>
            ApplicationsActions.deleteApplicationSuccess({
              applicationId: action.applicationId,
            })
          ),
          catchError((error) =>
            of(
              ApplicationsActions.deleteApplicationFailure({
                error: error.message || 'Failed to delete application',
              })
            )
          )
        )
      )
    )
  );

  // Auto-refresh applications after successful operations
  refreshAfterSuccessfulOperation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        ApplicationsActions.createApplicationSuccess,
        ApplicationsActions.updateApplicationSuccess,
        ApplicationsActions.deleteApplicationSuccess
      ),
      switchMap(() => of(ApplicationsActions.loadApplications()))
    )
  );
}
