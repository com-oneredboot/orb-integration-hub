/**
 * OrganizationDetailPageComponent Unit Tests
 *
 * Tests for organization detail page using NgRx store-first pattern.
 * Updated for tabbed interface with Applications tab.
 *
 * @see .kiro/specs/organization-applications-tab/design.md
 * _Requirements: 4.1-4.4, 7.1_
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { BehaviorSubject, ReplaySubject } from 'rxjs';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { Action } from '@ngrx/store';

import { OrganizationDetailPageComponent } from './organization-detail-page.component';
import { Organizations } from '../../../../../core/models/OrganizationsModel';
import { IApplications } from '../../../../../core/models/ApplicationsModel';
import { OrganizationStatus } from '../../../../../core/enums/OrganizationStatusEnum';
import { ApplicationStatus } from '../../../../../core/enums/ApplicationStatusEnum';
import { OrganizationsActions } from '../../store/organizations.actions';
import * as fromOrganizations from '../../store/organizations.selectors';
import * as fromUser from '../../../../user/store/user.selectors';

describe('OrganizationDetailPageComponent', () => {
  let component: OrganizationDetailPageComponent;
  let fixture: ComponentFixture<OrganizationDetailPageComponent>;
  let store: MockStore;
  let router: Router;
  let actions$: ReplaySubject<Action>;
  let paramMapSubject: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  const mockOrganization: Organizations = new Organizations({
    organizationId: 'org-123',
    name: 'Test Organization',
    description: 'Test description',
    ownerId: 'user-123',
    status: OrganizationStatus.Active,
    applicationCount: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mockDraftOrganization: Organizations = new Organizations({
    organizationId: 'org-draft',
    name: 'New Organization',
    description: '',
    ownerId: 'user-123',
    status: OrganizationStatus.Pending,
    applicationCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mockApplications: IApplications[] = [
    {
      applicationId: 'app-1',
      name: 'Application One',
      organizationId: 'org-123',
      ownerId: 'user-123',
      status: ApplicationStatus.Active,
      apiKey: 'key-1',
      apiKeyNext: '',
      environments: ['PRODUCTION', 'STAGING'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      applicationId: 'app-2',
      name: 'Application Two',
      organizationId: 'org-123',
      ownerId: 'user-123',
      status: ApplicationStatus.Active,
      apiKey: 'key-2',
      apiKeyNext: '',
      environments: ['PRODUCTION'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const initialState = {
    organizations: {
      organizations: [],
      selectedOrganization: null,
      organizationApplications: {},
      loadingApplications: {},
      applicationsError: {},
      isLoading: false,
      isSaving: false,
      isDeleting: false,
      error: null,
      saveError: null,
      deleteError: null,
    },
  };

  beforeEach(async () => {
    actions$ = new ReplaySubject<Action>(1);
    paramMapSubject = new BehaviorSubject(convertToParamMap({ id: 'org-123' }));

    await TestBed.configureTestingModule({
      imports: [OrganizationDetailPageComponent],
      providers: [
        provideMockStore({
          initialState,
          selectors: [
            { selector: fromOrganizations.selectSelectedOrganization, value: null },
            { selector: fromOrganizations.selectIsLoading, value: false },
            { selector: fromOrganizations.selectIsSaving, value: false },
            { selector: fromOrganizations.selectIsDeleting, value: false },
            { selector: fromOrganizations.selectError, value: null },
            { selector: fromOrganizations.selectSaveError, value: null },
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

    fixture = TestBed.createComponent(OrganizationDetailPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    store.resetSelectors();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Store Dispatches', () => {
    it('should dispatch loadOrganization on init', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      expect(store.dispatch).toHaveBeenCalledWith(
        OrganizationsActions.loadOrganization({ organizationId: 'org-123' })
      );
    }));

    it('should dispatch updateOrganization on save', fakeAsync(() => {
      store.overrideSelector(fromOrganizations.selectSelectedOrganization, mockOrganization);
      store.refreshState();
      fixture.detectChanges();
      tick();

      component.editForm.name = 'Updated Name';
      component.onSave();

      expect(store.dispatch).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: '[Organizations] Update Organization',
        })
      );
    }));

    it('should dispatch deleteOrganization on delete', fakeAsync(() => {
      store.overrideSelector(fromOrganizations.selectSelectedOrganization, mockOrganization);
      store.refreshState();
      fixture.detectChanges();
      tick();

      spyOn(window, 'confirm').and.returnValue(true);
      component.onDelete();

      expect(store.dispatch).toHaveBeenCalledWith(
        OrganizationsActions.deleteOrganization({ organizationId: 'org-123' })
      );
    }));

    it('should dispatch deleteOrganization on cancel for draft', fakeAsync(() => {
      store.overrideSelector(fromOrganizations.selectSelectedOrganization, mockDraftOrganization);
      store.refreshState();
      fixture.detectChanges();
      tick();

      component.onCancel();

      expect(store.dispatch).toHaveBeenCalledWith(
        OrganizationsActions.deleteOrganization({ organizationId: 'org-draft' })
      );
    }));

    it('should dispatch loadOrganizationApplications when applications tab is selected', fakeAsync(() => {
      store.overrideSelector(fromOrganizations.selectSelectedOrganization, mockOrganization);
      store.refreshState();
      fixture.detectChanges();
      tick();

      // Clear previous dispatch calls
      (store.dispatch as jasmine.Spy).calls.reset();

      component.setActiveTab('applications');

      expect(store.dispatch).toHaveBeenCalledWith(
        OrganizationsActions.loadOrganizationApplications({ organizationId: 'org-123' })
      );
    }));
  });

  describe('Store Selectors', () => {
    it('should update organization from store selector', fakeAsync(() => {
      store.overrideSelector(fromOrganizations.selectSelectedOrganization, mockOrganization);
      store.refreshState();
      fixture.detectChanges();
      tick();

      expect(component.organization).toEqual(mockOrganization);
      expect(component.isDraft).toBe(false);
    }));

    it('should set isDraft to true for PENDING organizations', fakeAsync(() => {
      store.overrideSelector(fromOrganizations.selectSelectedOrganization, mockDraftOrganization);
      store.refreshState();
      fixture.detectChanges();
      tick();

      expect(component.isDraft).toBe(true);
    }));

    it('should update loadError from store error selector', fakeAsync(() => {
      store.overrideSelector(fromOrganizations.selectError, 'Organization not found');
      store.refreshState();
      fixture.detectChanges();
      tick();

      expect(component.loadError).toBe('Organization not found');
    }));
  });

  describe('Tab Management', () => {
    beforeEach(fakeAsync(() => {
      store.overrideSelector(fromOrganizations.selectSelectedOrganization, mockOrganization);
      store.refreshState();
      fixture.detectChanges();
      tick();
    }));

    it('should default to overview tab', () => {
      expect(component.activeTab).toBe('overview');
    });

    it('should switch to security tab', () => {
      component.setActiveTab('security');
      expect(component.activeTab).toBe('security');
    });

    it('should switch to stats tab', () => {
      component.setActiveTab('stats');
      expect(component.activeTab).toBe('stats');
    });

    it('should switch to applications tab', () => {
      component.setActiveTab('applications');
      expect(component.activeTab).toBe('applications');
    });

    it('should switch to danger tab', () => {
      component.setActiveTab('danger');
      expect(component.activeTab).toBe('danger');
    });

    it('should only load applications once when tab is selected multiple times', fakeAsync(() => {
      (store.dispatch as jasmine.Spy).calls.reset();

      component.setActiveTab('applications');
      component.setActiveTab('overview');
      component.setActiveTab('applications');

      const loadAppsCalls = (store.dispatch as jasmine.Spy).calls.allArgs()
        .filter((args: unknown[]) => (args[0] as Action).type === '[Organizations] Load Organization Applications');

      expect(loadAppsCalls.length).toBe(1);
    }));
  });

  describe('Navigation on Success Actions', () => {
    it('should navigate to list on updateOrganizationSuccess', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      actions$.next(OrganizationsActions.updateOrganizationSuccess({ organization: mockOrganization }));
      tick();

      expect(router.navigate).toHaveBeenCalledWith(['/customers/organizations']);
    }));

    it('should navigate to list on deleteOrganizationSuccess', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      actions$.next(OrganizationsActions.deleteOrganizationSuccess({ organizationId: 'org-123' }));
      tick();

      expect(router.navigate).toHaveBeenCalledWith(['/customers/organizations']);
    }));
  });

  describe('Application Navigation', () => {
    beforeEach(fakeAsync(() => {
      store.overrideSelector(fromOrganizations.selectSelectedOrganization, mockOrganization);
      store.refreshState();
      fixture.detectChanges();
      tick();
    }));

    it('should navigate to application detail on row click', () => {
      component.onApplicationClick(mockApplications[0]);

      expect(router.navigate).toHaveBeenCalledWith([
        '/customers/applications',
        'app-1',
      ]);
    });

    it('should navigate to create application with organizationId', () => {
      component.onCreateApplication();

      expect(router.navigate).toHaveBeenCalledWith(
        ['/customers/applications'],
        { queryParams: { organizationId: 'org-123', create: 'true' } }
      );
    });
  });

  describe('Environment Count', () => {
    it('should return correct environment count', () => {
      expect(component.getEnvironmentCount(mockApplications[0])).toBe(2);
      expect(component.getEnvironmentCount(mockApplications[1])).toBe(1);
    });

    it('should return 0 for undefined environments', () => {
      const appWithoutEnvs: IApplications = {
        ...mockApplications[0],
        environments: undefined as unknown as string[],
      };
      expect(component.getEnvironmentCount(appWithoutEnvs)).toBe(0);
    });
  });

  describe('Form Validation', () => {
    beforeEach(fakeAsync(() => {
      store.overrideSelector(fromOrganizations.selectSelectedOrganization, mockOrganization);
      store.refreshState();
      fixture.detectChanges();
      tick();
    }));

    it('should validate required name', () => {
      component.editForm.name = '';
      component.onSave();

      expect(component.validationErrors.name).toBe('Organization name is required');
    });

    it('should validate name minimum length', () => {
      component.editForm.name = 'A';
      component.onSave();

      expect(component.validationErrors.name).toBe('Organization name must be at least 2 characters');
    });

    it('should validate name maximum length', () => {
      component.editForm.name = 'A'.repeat(101);
      component.onSave();

      expect(component.validationErrors.name).toBe('Organization name cannot exceed 100 characters');
    });

    it('should validate description maximum length', () => {
      component.editForm.description = 'A'.repeat(501);
      component.onSave();

      expect(component.validationErrors.description).toBe('Description cannot exceed 500 characters');
    });
  });

  describe('Reload Applications', () => {
    beforeEach(fakeAsync(() => {
      store.overrideSelector(fromOrganizations.selectSelectedOrganization, mockOrganization);
      store.refreshState();
      fixture.detectChanges();
      tick();
    }));

    it('should dispatch loadOrganizationApplications on retry', () => {
      (store.dispatch as jasmine.Spy).calls.reset();
      component.loadApplications();

      expect(store.dispatch).toHaveBeenCalledWith(
        OrganizationsActions.loadOrganizationApplications({ organizationId: 'org-123' })
      );
    });
  });

  describe('Cancel Behavior', () => {
    it('should navigate back for non-draft organizations', fakeAsync(() => {
      store.overrideSelector(fromOrganizations.selectSelectedOrganization, mockOrganization);
      store.refreshState();
      fixture.detectChanges();
      tick();

      component.onCancel();

      expect(router.navigate).toHaveBeenCalledWith(['/customers/organizations']);
    }));
  });
});
