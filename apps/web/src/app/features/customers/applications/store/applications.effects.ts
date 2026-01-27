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
import { ApplicationService } from '../../../../core/services/application.service';
import { OrganizationService } from '../../../../core/services/organization.service';
import { selectIsCreatingNew } from './applications.selectors';
import { selectCurrentUser } from '../../../user/store/user.selectors';
import { selectOrganizations } from '../../organizations/store/organizations.selectors';
import { OrganizationsActions } from '../../organizations/store/organizations.actions';
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

        for (const result of results) {
          for (const app of result.applications) {
            // Skip PENDING (draft) applications in list view
            if (app.status === ApplicationStatus.Pending) continue;
            allApplications.push(app);
          }
        }

        // Dispatch applications - reducer will build applicationRows
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

  /**
   * Update Organization Application Counts Effect
   * When applications are loaded successfully, calculate counts per organization
   * and update the organizations store.
   */
  updateOrganizationApplicationCounts$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ApplicationsActions.loadApplicationsSuccess),
      withLatestFrom(this.store.select(selectOrganizations)),
      map(([action, organizations]) => {
        // Calculate application counts per organization
        const applicationCountsByOrg: Record<string, number> = {};
        
        // Initialize all organizations with 0
        for (const org of organizations) {
          applicationCountsByOrg[org.organizationId] = 0;
        }
        
        // Count applications per organization (only ACTIVE ones)
        for (const app of action.applications) {
          if (app.status !== ApplicationStatus.Pending && app.organizationId) {
            applicationCountsByOrg[app.organizationId] = 
              (applicationCountsByOrg[app.organizationId] || 0) + 1;
          }
        }
        
        return OrganizationsActions.updateOrganizationApplicationCounts({ applicationCountsByOrg });
      })
    )
  );
}
