/**
 * Applications Effects
 *
 * Handles side effects for application state management.
 * Follows the same patterns as OrganizationsEffects.
 *
 * @see .kiro/specs/applications-management/design.md
 * @see .kiro/specs/store-centric-refactoring/design.md
 * _Requirements: 5.3, 1.1, 1.2_
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of, forkJoin } from 'rxjs';
import { map, catchError, switchMap, withLatestFrom, filter } from 'rxjs/operators';

import { ApplicationsActions } from './applications.actions';
import { ApplicationTableRow } from './applications.state';
import { ApplicationService } from '../../../../core/services/application.service';
import { OrganizationService } from '../../../../core/services/organization.service';
import { selectIsCreatingNew } from './applications.selectors';
import { selectCurrentUser } from '../../../user/store/user.selectors';
import { selectOrganizations } from '../../organizations/store/organizations.selectors';
import { IApplications } from '../../../../core/models/ApplicationsModel';
import { ApplicationStatus } from '../../../../core/enums/ApplicationStatusEnum';

@Injectable()
export class ApplicationsEffects {
  constructor(
    private actions$: Actions,
    private applicationService: ApplicationService,
    private organizationService: OrganizationService,
    private store: Store
  ) {}

  /**
   * Helper to format last activity time
   */
  private formatLastActivity(dateValue: string | Date | number | undefined): string {
    if (!dateValue) return 'Never';
    const date = typeof dateValue === 'number' ? new Date(dateValue * 1000)
      : dateValue instanceof Date ? dateValue : new Date(dateValue);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return diffMins + ' min ago';
    if (diffHours < 24) return diffHours + ' hour' + (diffHours > 1 ? 's' : '') + ' ago';
    if (diffDays < 7) return diffDays + ' day' + (diffDays > 1 ? 's' : '') + ' ago';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  /**
   * Load Applications Effect
   * Loads all applications for the current user across all their organizations.
   * Follows the same pattern as OrganizationsEffects.loadOrganizations$
   *
   * _Requirements: 1.1, 1.2_
   */
  loadApplications$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ApplicationsActions.loadApplications, ApplicationsActions.refreshApplications),
      withLatestFrom(
        this.store.select(selectCurrentUser),
        this.store.select(selectOrganizations)
      ),
      filter(([, currentUser]) => !!currentUser?.userId),
      switchMap(([, currentUser, organizations]) => {
        // If we have organizations in store, use them; otherwise load them first
        if (organizations && organizations.length > 0) {
          return this.loadApplicationsForOrganizations(organizations);
        }

        // Load organizations first, then applications
        return this.organizationService.getUserOrganizations(currentUser!.userId).pipe(
          switchMap(orgConnection => {
            const activeOrganizations = orgConnection.items.filter(org => org.status === 'ACTIVE');
            if (activeOrganizations.length === 0) {
              return of(ApplicationsActions.loadApplicationsSuccess({ applications: [] }));
            }
            return this.loadApplicationsForOrganizations(activeOrganizations);
          }),
          catchError(error =>
            of(ApplicationsActions.loadApplicationsFailure({
              error: error.message || 'Failed to load organizations'
            }))
          )
        );
      })
    )
  );

  /**
   * Helper to load applications for a list of organizations
   */
  private loadApplicationsForOrganizations(organizations: { organizationId: string; name: string; status?: string }[]) {
    const activeOrganizations = organizations.filter(org => org.status === 'ACTIVE' || !org.status);

    if (activeOrganizations.length === 0) {
      return of(ApplicationsActions.loadApplicationsSuccess({ applications: [] }));
    }

    const applicationRequests = activeOrganizations.map(org =>
      this.applicationService.getApplicationsByOrganization(org.organizationId).pipe(
        map(appConnection => ({
          organization: org,
          applications: appConnection.items
        })),
        catchError(() => of({ organization: org, applications: [] as IApplications[] }))
      )
    );

    return forkJoin(applicationRequests).pipe(
      map(results => {
        const allApplications: IApplications[] = [];
        const applicationRows: ApplicationTableRow[] = [];

        for (const result of results) {
          for (const app of result.applications) {
            // Skip PENDING (draft) applications in list view
            if (app.status === ApplicationStatus.Pending) continue;

            allApplications.push(app);
            applicationRows.push({
              application: app,
              organizationId: result.organization.organizationId,
              organizationName: result.organization.name,
              environmentCount: app.environments?.length || 0,
              userRole: 'OWNER', // TODO: Get actual role from membership
              lastActivity: this.formatLastActivity(app.updatedAt)
            });
          }
        }

        // Dispatch both applications and rows
        return ApplicationsActions.loadApplicationsSuccess({ applications: allApplications });
      }),
      catchError(error =>
        of(ApplicationsActions.loadApplicationsFailure({
          error: error.message || 'Failed to load applications'
        }))
      )
    );
  }

  /**
   * Load Single Application Effect
   * Loads a specific application by ID for detail page use.
   *
   * _Requirements: 3.1_
   */
  loadApplication$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ApplicationsActions.loadApplication),
      switchMap(action =>
        this.applicationService.getApplication(action.applicationId).pipe(
          map(application => {
            if (application) {
              return ApplicationsActions.loadApplicationSuccess({ application });
            }
            return ApplicationsActions.loadApplicationFailure({
              error: 'Application not found'
            });
          }),
          catchError(error =>
            of(ApplicationsActions.loadApplicationFailure({
              error: error.message || 'Failed to load application'
            }))
          )
        )
      )
    )
  );

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
