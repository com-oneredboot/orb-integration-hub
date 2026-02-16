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
import { map, catchError, switchMap, withLatestFrom, filter, mergeMap } from 'rxjs/operators';

import { ApplicationsActions } from './applications.actions';
import { ApplicationService } from '../../../../core/services/application.service';
import { OrganizationService } from '../../../../core/services/organization.service';
import { ApplicationRolesService, CreateRoleInput } from '../../../../core/services/application-roles.service';
import { selectIsCreatingNew, selectApplications } from './applications.selectors';
import { selectCurrentUser } from '../../../user/store/user.selectors';
import { selectOrganizations } from '../../organizations/store/organizations.selectors';
import { OrganizationsActions } from '../../organizations/store/organizations.actions';
import { IApplications } from '../../../../core/models/ApplicationsModel';
import { ApplicationStatus } from '../../../../core/enums/ApplicationStatusEnum';
import { ApplicationRoleType } from '../../../../core/enums/ApplicationRoleTypeEnum';

@Injectable()
export class ApplicationsEffects {
  constructor(
    private actions$: Actions,
    private applicationService: ApplicationService,
    private organizationService: OrganizationService,
    private applicationRolesService: ApplicationRolesService,
    private store: Store
  ) {}

  /**
   * Load Applications Effect
   * Loads all applications for the current user across all their organizations.
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
        if (organizations && organizations.length > 0) {
          return this.loadApplicationsForOrganizations(organizations);
        }

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
            if (app.status === ApplicationStatus.Pending) continue;
            allApplications.push(app);
          }
        }
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
            return ApplicationsActions.loadApplicationFailure({ error: 'Application not found' });
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

  /**
   * Create Draft Application Effect (create-on-click pattern)
   */
  createDraftApplication$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ApplicationsActions.createDraftApplication),
      withLatestFrom(this.store.select(selectCurrentUser)),
      filter(([, currentUser]) => !!currentUser?.userId),
      switchMap(([action, currentUser]) =>
        this.applicationService.createDraft(currentUser!.userId, action.organizationId || '').pipe(
          map(application => ApplicationsActions.createDraftApplicationSuccess({ application })),
          catchError(error =>
            of(ApplicationsActions.createDraftApplicationFailure({
              error: error.message || 'Failed to create draft application'
            }))
          )
        )
      )
    )
  );

  /**
   * Create Application Effect
   */
  createApplication$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ApplicationsActions.createApplication),
      withLatestFrom(this.store.select(selectIsCreatingNew)),
      switchMap(([action, isCreatingNew]) => {
        if (!isCreatingNew) {
          return of(ApplicationsActions.createApplicationFailure({ error: 'Not in create mode' }));
        }
        return this.applicationService.createApplication(action.input).pipe(
          map(application => ApplicationsActions.createApplicationSuccess({ application })),
          catchError(error =>
            of(ApplicationsActions.createApplicationFailure({
              error: error.message || 'Failed to create application'
            }))
          )
        );
      })
    )
  );

  /**
   * Update Application Effect
   */
  updateApplication$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ApplicationsActions.updateApplication),
      switchMap(action =>
        this.applicationService.updateApplication(action.input).pipe(
          map(application => ApplicationsActions.updateApplicationSuccess({ application })),
          catchError(error =>
            of(ApplicationsActions.updateApplicationFailure({
              error: error.message || 'Failed to update application'
            }))
          )
        )
      )
    )
  );

  /**
   * Delete Application Effect
   */
  deleteApplication$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ApplicationsActions.deleteApplication),
      switchMap(action =>
        this.applicationService.deleteApplication(action.applicationId).pipe(
          map(() => ApplicationsActions.deleteApplicationSuccess({
            applicationId: action.applicationId,
            organizationId: action.organizationId
          })),
          catchError(error =>
            of(ApplicationsActions.deleteApplicationFailure({
              error: error.message || 'Failed to delete application'
            }))
          )
        )
      )
    )
  );

  /**
   * Auto-refresh applications after successful operations
   */
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
   * Create Default Roles on Application Activation
   * When an application is successfully created (activated from PENDING to ACTIVE),
   * create the 4 default roles: Owner, Administrator, User, Guest.
   * Errors are logged but don't block the application creation.
   * _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_
   */
  createDefaultRolesOnActivation$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(ApplicationsActions.createApplicationSuccess),
        filter((action) => action.application.status === ApplicationStatus.Active),
        mergeMap((action) => {
          const { applicationId, organizationId } = action.application;

          const defaultRoles: CreateRoleInput[] = [
            {
              applicationId,
              organizationId,
              roleName: 'Owner',
              roleType: ApplicationRoleType.Admin,
              description: 'Full administrative access to the application',
            },
            {
              applicationId,
              organizationId,
              roleName: 'Administrator',
              roleType: ApplicationRoleType.Admin,
              description: 'Administrative access to manage application settings',
            },
            {
              applicationId,
              organizationId,
              roleName: 'User',
              roleType: ApplicationRoleType.User,
              description: 'Standard user access to the application',
            },
            {
              applicationId,
              organizationId,
              roleName: 'Guest',
              roleType: ApplicationRoleType.Guest,
              description: 'Limited guest access to the application',
            },
          ];

          // Create all default roles in parallel, catching errors individually
          return forkJoin(
            defaultRoles.map((roleInput) =>
              this.applicationRolesService.create(roleInput).pipe(
                map((role) => {
                  console.log(
                    `[ApplicationsEffects] Created default role: ${role.roleName} for application ${applicationId}`
                  );
                  return { success: true, role };
                }),
                catchError((error) => {
                  console.error(
                    `[ApplicationsEffects] Failed to create default role ${roleInput.roleName}:`,
                    error
                  );
                  return of({ success: false, error: error.message, roleName: roleInput.roleName });
                })
              )
            )
          ).pipe(
            map((results) => {
              const successCount = results.filter((r) => r.success).length;
              const failCount = results.filter((r) => !r.success).length;
              console.log(
                `[ApplicationsEffects] Default roles creation complete: ${successCount} succeeded, ${failCount} failed`
              );
              return { type: '[Applications] Default Roles Created' };
            })
          );
        })
      ),
    { dispatch: false }
  );

  /**
   * Update Organization Application Count After Create
   * Persists the updated count to the database.
   */
  updateOrgCountAfterCreate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ApplicationsActions.createApplicationSuccess),
      filter(action => !!action.application.organizationId),
      switchMap(action =>
        this.applicationService.getApplicationsByOrganization(action.application.organizationId).pipe(
          switchMap(connection => {
            const activeCount = connection.items.filter(
              app => app.status !== ApplicationStatus.Pending
            ).length;
            return this.organizationService.updateApplicationCount(
              action.application.organizationId,
              activeCount
            ).pipe(
              map(() => OrganizationsActions.updateOrganizationApplicationCount({
                organizationId: action.application.organizationId,
                applicationCount: activeCount
              })),
              catchError(() => of({ type: '[Organizations] Update Count Failed' }))
            );
          }),
          catchError(() => of({ type: '[Organizations] Update Count Failed' }))
        )
      )
    )
  );

  /**
   * Update Organization Application Count After Delete
   * Persists the updated count to the database.
   */
  updateOrgCountAfterDelete$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ApplicationsActions.deleteApplicationSuccess),
      filter(action => !!action.organizationId),
      switchMap(action =>
        this.applicationService.getApplicationsByOrganization(action.organizationId).pipe(
          switchMap(connection => {
            const activeCount = connection.items.filter(
              app => app.status !== ApplicationStatus.Pending
            ).length;
            return this.organizationService.updateApplicationCount(
              action.organizationId,
              activeCount
            ).pipe(
              map(() => OrganizationsActions.updateOrganizationApplicationCount({
                organizationId: action.organizationId,
                applicationCount: activeCount
              })),
              catchError(() => of({ type: '[Organizations] Update Count Failed' }))
            );
          }),
          catchError(() => of({ type: '[Organizations] Update Count Failed' }))
        )
      )
    )
  );

  /**
   * Sync Organization Application Count on Detail Page
   * When organization detail page loads, verify the applicationCount matches
   * the actual number of applications and update the database if needed.
   */
  syncOrgApplicationCountOnDetailPage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OrganizationsActions.loadOrganizationSuccess),
      withLatestFrom(this.store.select(selectApplications)),
      mergeMap(([action, applications]) => {
        const organizationId = action.organization.organizationId;
        const actualCount = applications.filter(
          app => app.organizationId === organizationId && app.status !== ApplicationStatus.Pending
        ).length;

        if (action.organization.applicationCount !== actualCount) {
          return this.organizationService.updateApplicationCount(organizationId, actualCount).pipe(
            map(() => OrganizationsActions.updateOrganizationApplicationCount({
              organizationId,
              applicationCount: actualCount
            })),
            catchError(() => of({ type: '[Organizations] Application Count Update Failed' }))
          );
        }

        return of({ type: '[Organizations] Application Count Already Synced' });
      })
    )
  );
}
