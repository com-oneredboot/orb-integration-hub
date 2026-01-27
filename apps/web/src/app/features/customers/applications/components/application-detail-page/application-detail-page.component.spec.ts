/**
 * ApplicationDetailPageComponent Unit Tests
 *
 * Tests for application detail page using NgRx store-first pattern.
 *
 * @see .kiro/specs/store-centric-refactoring/design.md
 * _Requirements: 3.1-3.5, 7.1_
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { BehaviorSubject, ReplaySubject } from 'rxjs';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { Action } from '@ngrx/store';

import { ApplicationDetailPageComponent } from './application-detail-page.component';
import { IApplications } from '../../../../../core/models/ApplicationsModel';
import { IOrganizations } from '../../../../../core/models/OrganizationsModel';
import { ApplicationStatus } from '../../../../../core/enums/ApplicationStatusEnum';
import { OrganizationStatus } from '../../../../../core/enums/OrganizationStatusEnum';
import { ApplicationsActions } from '../../store/applications.actions';
import { OrganizationsActions } from '../../../organizations/store/organizations.actions';
import * as fromApplications from '../../store/applications.selectors';
import * as fromOrganizations from '../../../organizations/store/organizations.selectors';
import * as fromUser from '../../../../user/store/user.selectors';

describe('ApplicationDetailPageComponent', () => {
  let component: ApplicationDetailPageComponent;
  let fixture: ComponentFixture<ApplicationDetailPageComponent>;
  let store: MockStore;
  let router: Router;
  let actions$: ReplaySubject<Action>;
  let paramMapSubject: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  const mockUser = {
    userId: 'user-123',
    email: 'test@example.com',
  };

  const mockOrganization: IOrganizations = {
    organizationId: 'org-456',
    name: 'Test Organization',
    ownerId: 'user-123',
    status: OrganizationStatus.Active,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockApplication: IApplications = {
    applicationId: 'app-789',
    name: 'Test Application',
    organizationId: 'org-456',
    ownerId: 'user-123',
    status: ApplicationStatus.Active,
    apiKey: 'api-key',
    apiKeyNext: '',
    environments: ['PRODUCTION', 'STAGING'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPendingApplication: IApplications = {
    ...mockApplication,
    applicationId: 'app-pending',
    name: 'New Application',
    status: ApplicationStatus.Pending,
  };

  const initialState = {
    applications: {
      applications: [],
      selectedApplication: null,
      isLoading: false,
      isSaving: false,
      isDeleting: false,
      error: null,
      saveError: null,
    },
    organizations: {
      organizations: [],
    },
    user: {
      currentUser: mockUser,
      debugMode: false,
    },
  };

  beforeEach(async () => {
    actions$ = new ReplaySubject<Action>(1);
    paramMapSubject = new BehaviorSubject(convertToParamMap({ id: 'app-789' }));

    await TestBed.configureTestingModule({
      imports: [ApplicationDetailPageComponent, RouterTestingModule],
      providers: [
        provideMockStore({
          initialState,
          selectors: [
            { selector: fromApplications.selectSelectedApplication, value: null },
            { selector: fromApplications.selectIsLoading, value: false },
            { selector: fromApplications.selectIsSaving, value: false },
            { selector: fromApplications.selectError, value: null },
            { selector: fromApplications.selectSaveError, value: null },
            { selector: fromOrganizations.selectOrganizations, value: [] },
            { selector: fromUser.selectCurrentUser, value: mockUser },
            { selector: fromUser.selectDebugMode, value: false },
          ],
        }),
        provideMockActions(() => actions$),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: paramMapSubject.asObservable(),
          },
        },
      ],
    }).compileComponents();

    // Register FontAwesome icons
    const library = TestBed.inject(FaIconLibrary);
    library.addIconPacks(fas);

    store = TestBed.inject(MockStore);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    spyOn(store, 'dispatch').and.callThrough();

    fixture = TestBed.createComponent(ApplicationDetailPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    store.resetSelectors();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Store Dispatches', () => {
    it('should dispatch loadApplication on init', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      expect(store.dispatch).toHaveBeenCalledWith(
        ApplicationsActions.loadApplication({ applicationId: 'app-789' })
      );
    }));

    it('should dispatch loadOrganizations on init', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      expect(store.dispatch).toHaveBeenCalledWith(
        OrganizationsActions.loadOrganizations()
      );
    }));

    it('should dispatch updateApplication on save', fakeAsync(() => {
      store.overrideSelector(fromApplications.selectSelectedApplication, mockApplication);
      store.overrideSelector(fromOrganizations.selectOrganizations, [mockOrganization]);
      store.refreshState();
      fixture.detectChanges();
      tick();

      component.editForm.name = 'Updated Name';
      component.editForm.organizationId = 'org-456';
      component.editForm.environments = ['PRODUCTION'];
      component.onSave();

      expect(store.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[Applications] Update Application',
        })
      );
    }));

    it('should dispatch deleteApplication on delete', fakeAsync(() => {
      store.overrideSelector(fromApplications.selectSelectedApplication, mockApplication);
      store.refreshState();
      fixture.detectChanges();
      tick();

      spyOn(window, 'confirm').and.returnValue(true);
      component.onDelete();

      expect(store.dispatch).toHaveBeenCalledWith(
        ApplicationsActions.deleteApplication({ applicationId: 'app-789', organizationId: 'org-456' })
      );
    }));

    it('should dispatch deleteApplication on cancel for draft', fakeAsync(() => {
      store.overrideSelector(fromApplications.selectSelectedApplication, mockPendingApplication);
      store.refreshState();
      fixture.detectChanges();
      tick();

      component.onCancel();

      expect(store.dispatch).toHaveBeenCalledWith(
        ApplicationsActions.deleteApplication({ applicationId: 'app-pending', organizationId: 'org-456' })
      );
    }));
  });

  describe('Store Selectors', () => {
    it('should update application from store selector', fakeAsync(() => {
      store.overrideSelector(fromApplications.selectSelectedApplication, mockApplication);
      store.refreshState();
      fixture.detectChanges();
      tick();

      expect(component.application).toEqual(mockApplication);
      expect(component.isDraft).toBe(false);
    }));

    it('should set isDraft to true for PENDING applications', fakeAsync(() => {
      store.overrideSelector(fromApplications.selectSelectedApplication, mockPendingApplication);
      store.refreshState();
      fixture.detectChanges();
      tick();

      expect(component.isDraft).toBe(true);
    }));

    it('should update loadError from store error selector', fakeAsync(() => {
      store.overrideSelector(fromApplications.selectError, 'Application not found');
      store.refreshState();
      fixture.detectChanges();
      tick();

      expect(component.loadError).toBe('Application not found');
    }));

    it('should get organizations from store', fakeAsync(() => {
      store.overrideSelector(fromOrganizations.selectOrganizations, [mockOrganization]);
      store.refreshState();
      fixture.detectChanges();
      tick();

      let orgs: IOrganizations[] = [];
      component.organizations$.subscribe(o => orgs = o);
      tick();

      expect(orgs.length).toBe(1);
      expect(orgs[0].organizationId).toBe('org-456');
    }));
  });

  describe('Navigation on Success Actions', () => {
    it('should navigate to list on updateApplicationSuccess', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      actions$.next(ApplicationsActions.updateApplicationSuccess({ application: mockApplication }));
      tick();

      expect(router.navigate).toHaveBeenCalledWith(['/customers/applications']);
    }));

    it('should navigate to list on deleteApplicationSuccess', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      actions$.next(ApplicationsActions.deleteApplicationSuccess({ applicationId: 'app-789', organizationId: 'org-123' }));
      tick();

      expect(router.navigate).toHaveBeenCalledWith(['/customers/applications']);
    }));
  });

  describe('Form Validation', () => {
    beforeEach(fakeAsync(() => {
      store.overrideSelector(fromApplications.selectSelectedApplication, mockApplication);
      store.overrideSelector(fromOrganizations.selectOrganizations, [mockOrganization]);
      store.refreshState();
      fixture.detectChanges();
      tick();
    }));

    it('should require application name', () => {
      component.editForm.name = '';
      component.editForm.organizationId = 'org-456';

      component.onSave();

      expect(component.validationErrors.name).toBe('Application name is required');
    });

    it('should require name to be at least 2 characters', () => {
      component.editForm.name = 'A';
      component.editForm.organizationId = 'org-456';

      component.onSave();

      expect(component.validationErrors.name).toBe(
        'Application name must be at least 2 characters'
      );
    });

    it('should require name to be at most 100 characters', () => {
      component.editForm.name = 'A'.repeat(101);
      component.editForm.organizationId = 'org-456';

      component.onSave();

      expect(component.validationErrors.name).toBe(
        'Application name cannot exceed 100 characters'
      );
    });

    it('should require organization selection', () => {
      component.editForm.name = 'Valid Name';
      component.editForm.organizationId = '';

      component.onSave();

      expect(component.validationErrors.organizationId).toBe(
        'Please select an organization'
      );
    });

    it('should limit description to 500 characters', () => {
      component.editForm.name = 'Valid Name';
      component.editForm.organizationId = 'org-456';
      component.editForm.description = 'A'.repeat(501);

      component.onSave();

      expect(component.validationErrors.description).toBe(
        'Description cannot exceed 500 characters'
      );
    });

    it('should require at least one environment', () => {
      component.editForm.name = 'Valid Name';
      component.editForm.organizationId = 'org-456';
      component.editForm.environments = [];

      component.onSave();

      expect(component.validationErrors.environments).toBe(
        'At least one environment must be selected'
      );
    });
  });

  describe('Environment Selection', () => {
    beforeEach(fakeAsync(() => {
      store.overrideSelector(fromApplications.selectSelectedApplication, mockApplication);
      store.overrideSelector(fromOrganizations.selectOrganizations, [mockOrganization]);
      store.refreshState();
      fixture.detectChanges();
      tick();
    }));

    it('should display all available environments', () => {
      expect(component.availableEnvironments.length).toBe(5);
      expect(component.availableEnvironments.map(e => e.value)).toEqual([
        'PRODUCTION', 'STAGING', 'DEVELOPMENT', 'TEST', 'PREVIEW'
      ]);
    });

    it('should load environments from application', () => {
      expect(component.editForm.environments).toEqual(['PRODUCTION', 'STAGING']);
    });

    it('should toggle environment on when not selected', () => {
      component.editForm.environments = ['PRODUCTION'];

      component.onEnvironmentToggle('DEVELOPMENT');

      expect(component.editForm.environments).toContain('DEVELOPMENT');
      expect(component.editForm.environments).toContain('PRODUCTION');
    });

    it('should toggle environment off when selected', () => {
      component.editForm.environments = ['PRODUCTION', 'STAGING'];

      component.onEnvironmentToggle('STAGING');

      expect(component.editForm.environments).not.toContain('STAGING');
      expect(component.editForm.environments).toContain('PRODUCTION');
    });

    it('should correctly identify selected environments', () => {
      component.editForm.environments = ['PRODUCTION', 'STAGING'];

      expect(component.isEnvironmentSelected('PRODUCTION')).toBe(true);
      expect(component.isEnvironmentSelected('STAGING')).toBe(true);
      expect(component.isEnvironmentSelected('DEVELOPMENT')).toBe(false);
    });

    it('should clear validation error when environment is selected', () => {
      component.editForm.environments = [];
      component.validationErrors.environments = 'At least one environment must be selected';

      component.onEnvironmentToggle('PRODUCTION');

      expect(component.validationErrors.environments).toBe('');
    });
  });

  describe('Save Flow for PENDING Application', () => {
    beforeEach(fakeAsync(() => {
      store.overrideSelector(fromApplications.selectSelectedApplication, mockPendingApplication);
      store.overrideSelector(fromOrganizations.selectOrganizations, [mockOrganization]);
      store.refreshState();
      fixture.detectChanges();
      tick();
    }));

    it('should detect PENDING status as draft mode', () => {
      expect(component.isDraft).toBe(true);
    });
  });

  describe('Cancel for Active Application', () => {
    beforeEach(fakeAsync(() => {
      store.overrideSelector(fromApplications.selectSelectedApplication, mockApplication);
      store.refreshState();
      fixture.detectChanges();
      tick();
    }));

    it('should not dispatch delete for active application on cancel', () => {
      // Clear previous dispatch calls
      (store.dispatch as jasmine.Spy).calls.reset();

      component.onCancel();

      // Should navigate but not dispatch delete
      expect(router.navigate).toHaveBeenCalledWith(['/customers/applications']);
      expect(store.dispatch).not.toHaveBeenCalledWith(
        jasmine.objectContaining({ type: '[Applications] Delete Application' })
      );
    });
  });

  describe('Delete Confirmation', () => {
    beforeEach(fakeAsync(() => {
      store.overrideSelector(fromApplications.selectSelectedApplication, mockApplication);
      store.refreshState();
      fixture.detectChanges();
      tick();
    }));

    it('should not dispatch delete when confirmation is cancelled', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      (store.dispatch as jasmine.Spy).calls.reset();

      component.onDelete();

      expect(store.dispatch).not.toHaveBeenCalledWith(
        jasmine.objectContaining({ type: '[Applications] Delete Application' })
      );
    });
  });

  describe('Date Formatting', () => {
    it('should format Date objects', () => {
      const date = new Date('2024-01-15T10:30:00');
      const result = component.formatDate(date);

      expect(result).toContain('January');
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });

    it('should format Unix timestamps', () => {
      const timestamp = 1705315800; // 2024-01-15 10:30:00 UTC
      const result = component.formatDate(timestamp);

      expect(result).toContain('2024');
    });

    it('should return N/A for undefined dates', () => {
      const result = component.formatDate(undefined);

      expect(result).toBe('N/A');
    });
  });
});
