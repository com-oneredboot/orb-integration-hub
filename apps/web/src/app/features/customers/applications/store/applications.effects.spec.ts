/**
 * Applications Effects Unit Tests
 *
 * Tests for ApplicationsEffects - Store-Centric Refactoring
 *
 * @see .kiro/specs/store-centric-refactoring/design.md
 * _Requirements: 7.2, 1.1, 1.2, 3.1_
 */

import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Observable, of, throwError } from 'rxjs';

import { ApplicationsEffects } from './applications.effects';
import { ApplicationsActions } from './applications.actions';
import { ApplicationService } from '../../../../core/services/application.service';
import { OrganizationService } from '../../../../core/services/organization.service';
import { IApplications } from '../../../../core/models/ApplicationsModel';
import { ApplicationStatus } from '../../../../core/enums/ApplicationStatusEnum';
import { selectCurrentUser } from '../../../user/store/user.selectors';
import { selectOrganizations } from '../../organizations/store/organizations.selectors';
import { selectIsCreatingNew } from './applications.selectors';

describe('ApplicationsEffects', () => {
  let actions$: Observable<unknown>;
  let effects: ApplicationsEffects;
  let applicationServiceSpy: jasmine.SpyObj<ApplicationService>;
  let organizationServiceSpy: jasmine.SpyObj<OrganizationService>;
  let store: MockStore;

  const mockUser = {
    userId: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User'
  };

  const mockOrganizations = [
    { organizationId: 'org-1', name: 'Org One', status: 'ACTIVE' },
    { organizationId: 'org-2', name: 'Org Two', status: 'ACTIVE' }
  ];

  const mockApplication: IApplications = {
    applicationId: 'app-123',
    name: 'Test Application',
    organizationId: 'org-1',
    ownerId: 'user-123',
    status: ApplicationStatus.Active,
    environments: ['PRODUCTION', 'STAGING'],
    apiKey: 'test-api-key-123',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockApplications: IApplications[] = [
    mockApplication,
    {
      applicationId: 'app-456',
      name: 'Another App',
      organizationId: 'org-2',
      ownerId: 'user-123',
      status: ApplicationStatus.Active,
      environments: ['DEVELOPMENT'],
      apiKey: 'test-api-key-456',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  beforeEach(() => {
    applicationServiceSpy = jasmine.createSpyObj('ApplicationService', [
      'getApplication',
      'getApplicationsByOrganization',
      'createApplication',
      'updateApplication',
      'deleteApplication',
      'createDraft'
    ]);

    organizationServiceSpy = jasmine.createSpyObj('OrganizationService', [
      'getUserOrganizations'
    ]);

    TestBed.configureTestingModule({
      providers: [
        ApplicationsEffects,
        provideMockActions(() => actions$),
        provideMockStore({
          selectors: [
            { selector: selectCurrentUser, value: mockUser },
            { selector: selectOrganizations, value: mockOrganizations },
            { selector: selectIsCreatingNew, value: false }
          ]
        }),
        { provide: ApplicationService, useValue: applicationServiceSpy },
        { provide: OrganizationService, useValue: organizationServiceSpy }
      ]
    });

    effects = TestBed.inject(ApplicationsEffects);
    store = TestBed.inject(MockStore);
  });

  afterEach(() => {
    store.resetSelectors();
  });

  describe('loadApplications$', () => {
    it('should dispatch loadApplicationsSuccess when applications are loaded successfully', (done) => {
      applicationServiceSpy.getApplicationsByOrganization.and.callFake((orgId: string) => {
        const apps = mockApplications.filter(app => app.organizationId === orgId);
        return of({ items: apps, nextToken: null });
      });

      actions$ = of(ApplicationsActions.loadApplications());

      effects.loadApplications$.subscribe(action => {
        expect(action.type).toBe('[Applications] Load Applications Success');
        expect(applicationServiceSpy.getApplicationsByOrganization).toHaveBeenCalled();
        done();
      });
    });

    it('should dispatch loadApplicationsSuccess with empty array when no organizations exist', (done) => {
      store.overrideSelector(selectOrganizations, []);
      organizationServiceSpy.getUserOrganizations.and.returnValue(
        of({ items: [], nextToken: null })
      );

      actions$ = of(ApplicationsActions.loadApplications());

      effects.loadApplications$.subscribe(action => {
        expect(action.type).toBe('[Applications] Load Applications Success');
        if (action.type === '[Applications] Load Applications Success') {
          const successAction = action as ReturnType<typeof ApplicationsActions.loadApplicationsSuccess>;
          expect(successAction.applications).toEqual([]);
        }
        done();
      });
    });

    it('should dispatch loadApplicationsFailure on service error', (done) => {
      store.overrideSelector(selectOrganizations, []);
      organizationServiceSpy.getUserOrganizations.and.returnValue(
        throwError(() => new Error('Network error'))
      );

      actions$ = of(ApplicationsActions.loadApplications());

      effects.loadApplications$.subscribe(action => {
        expect(action.type).toBe('[Applications] Load Applications Failure');
        done();
      });
    });

    it('should also trigger on refreshApplications action', (done) => {
      applicationServiceSpy.getApplicationsByOrganization.and.returnValue(
        of({ items: [], nextToken: null })
      );

      actions$ = of(ApplicationsActions.refreshApplications());

      effects.loadApplications$.subscribe(action => {
        expect(action.type).toBe('[Applications] Load Applications Success');
        done();
      });
    });

    it('should filter out PENDING applications from results', (done) => {
      const appsWithPending: IApplications[] = [
        mockApplication,
        {
          applicationId: 'app-pending',
          name: 'Pending App',
          organizationId: 'org-1',
          ownerId: 'user-123',
          status: ApplicationStatus.Pending,
          environments: [],
          apiKey: '',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      applicationServiceSpy.getApplicationsByOrganization.and.returnValue(
        of({ items: appsWithPending, nextToken: null })
      );

      actions$ = of(ApplicationsActions.loadApplications());

      effects.loadApplications$.subscribe(action => {
        if (action.type === '[Applications] Load Applications Success') {
          const successAction = action as ReturnType<typeof ApplicationsActions.loadApplicationsSuccess>;
          const pendingApps = successAction.applications.filter(
            app => app.status === ApplicationStatus.Pending
          );
          expect(pendingApps.length).toBe(0);
        }
        done();
      });
    });
  });

  describe('loadApplication$', () => {
    it('should dispatch loadApplicationSuccess when application is found', (done) => {
      applicationServiceSpy.getApplication.and.returnValue(of(mockApplication));

      actions$ = of(ApplicationsActions.loadApplication({ applicationId: 'app-123' }));

      effects.loadApplication$.subscribe(action => {
        expect(action.type).toBe('[Applications] Load Application Success');
        if (action.type === '[Applications] Load Application Success') {
          const successAction = action as ReturnType<typeof ApplicationsActions.loadApplicationSuccess>;
          expect(successAction.application.applicationId).toBe('app-123');
        }
        expect(applicationServiceSpy.getApplication).toHaveBeenCalledWith('app-123');
        done();
      });
    });

    it('should dispatch loadApplicationFailure when application is not found', (done) => {
      applicationServiceSpy.getApplication.and.returnValue(of(null as unknown as IApplications));

      actions$ = of(ApplicationsActions.loadApplication({ applicationId: 'non-existent' }));

      effects.loadApplication$.subscribe(action => {
        expect(action.type).toBe('[Applications] Load Application Failure');
        done();
      });
    });

    it('should dispatch loadApplicationFailure on service error', (done) => {
      applicationServiceSpy.getApplication.and.returnValue(
        throwError(() => new Error('Failed to load'))
      );

      actions$ = of(ApplicationsActions.loadApplication({ applicationId: 'app-123' }));

      effects.loadApplication$.subscribe(action => {
        expect(action.type).toBe('[Applications] Load Application Failure');
        done();
      });
    });
  });

  describe('createDraftApplication$', () => {
    it('should dispatch createDraftApplicationSuccess on successful draft creation', (done) => {
      const draftApp: IApplications = {
        ...mockApplication,
        status: ApplicationStatus.Pending
      };
      applicationServiceSpy.createDraft.and.returnValue(of(draftApp));

      actions$ = of(ApplicationsActions.createDraftApplication({
        ownerId: 'user-123',
        organizationId: 'org-1'
      }));

      effects.createDraftApplication$.subscribe(action => {
        expect(action.type).toBe('[Applications] Create Draft Application Success');
        expect(applicationServiceSpy.createDraft).toHaveBeenCalledWith('user-123', 'org-1');
        done();
      });
    });

    it('should dispatch createDraftApplicationFailure on error', (done) => {
      applicationServiceSpy.createDraft.and.returnValue(
        throwError(() => new Error('Failed to create draft'))
      );

      actions$ = of(ApplicationsActions.createDraftApplication({
        ownerId: 'user-123',
        organizationId: 'org-1'
      }));

      effects.createDraftApplication$.subscribe(action => {
        expect(action.type).toBe('[Applications] Create Draft Application Failure');
        done();
      });
    });
  });

  describe('updateApplication$', () => {
    it('should dispatch updateApplicationSuccess on successful update', (done) => {
      const updatedApp = { ...mockApplication, name: 'Updated Name' };
      applicationServiceSpy.updateApplication.and.returnValue(of(updatedApp));

      actions$ = of(ApplicationsActions.updateApplication({
        input: { applicationId: 'app-123', name: 'Updated Name' }
      }));

      effects.updateApplication$.subscribe(action => {
        expect(action.type).toBe('[Applications] Update Application Success');
        if (action.type === '[Applications] Update Application Success') {
          const successAction = action as ReturnType<typeof ApplicationsActions.updateApplicationSuccess>;
          expect(successAction.application.name).toBe('Updated Name');
        }
        done();
      });
    });

    it('should dispatch updateApplicationFailure on error', (done) => {
      applicationServiceSpy.updateApplication.and.returnValue(
        throwError(() => new Error('Update failed'))
      );

      actions$ = of(ApplicationsActions.updateApplication({
        input: { applicationId: 'app-123', name: 'Updated Name' }
      }));

      effects.updateApplication$.subscribe(action => {
        expect(action.type).toBe('[Applications] Update Application Failure');
        done();
      });
    });
  });

  describe('deleteApplication$', () => {
    it('should dispatch deleteApplicationSuccess on successful deletion', (done) => {
      applicationServiceSpy.deleteApplication.and.returnValue(of(mockApplication));

      actions$ = of(ApplicationsActions.deleteApplication({ applicationId: 'app-123', organizationId: 'org-123' }));

      effects.deleteApplication$.subscribe(action => {
        expect(action.type).toBe('[Applications] Delete Application Success');
        if (action.type === '[Applications] Delete Application Success') {
          const successAction = action as ReturnType<typeof ApplicationsActions.deleteApplicationSuccess>;
          expect(successAction.applicationId).toBe('app-123');
        }
        expect(applicationServiceSpy.deleteApplication).toHaveBeenCalledWith('app-123');
        done();
      });
    });

    it('should dispatch deleteApplicationFailure on error', (done) => {
      applicationServiceSpy.deleteApplication.and.returnValue(
        throwError(() => new Error('Delete failed'))
      );

      actions$ = of(ApplicationsActions.deleteApplication({ applicationId: 'app-123', organizationId: 'org-123' }));

      effects.deleteApplication$.subscribe(action => {
        expect(action.type).toBe('[Applications] Delete Application Failure');
        done();
      });
    });
  });

  describe('refreshAfterSuccessfulOperation$', () => {
    it('should dispatch loadApplications after createApplicationSuccess', (done) => {
      actions$ = of(ApplicationsActions.createApplicationSuccess({ application: mockApplication }));

      effects.refreshAfterSuccessfulOperation$.subscribe(action => {
        expect(action.type).toBe('[Applications] Load Applications');
        done();
      });
    });

    it('should dispatch loadApplications after updateApplicationSuccess', (done) => {
      actions$ = of(ApplicationsActions.updateApplicationSuccess({ application: mockApplication }));

      effects.refreshAfterSuccessfulOperation$.subscribe(action => {
        expect(action.type).toBe('[Applications] Load Applications');
        done();
      });
    });

    it('should dispatch loadApplications after deleteApplicationSuccess', (done) => {
      actions$ = of(ApplicationsActions.deleteApplicationSuccess({ applicationId: 'app-123', organizationId: 'org-123' }));

      effects.refreshAfterSuccessfulOperation$.subscribe(action => {
        expect(action.type).toBe('[Applications] Load Applications');
        done();
      });
    });
  });
});
