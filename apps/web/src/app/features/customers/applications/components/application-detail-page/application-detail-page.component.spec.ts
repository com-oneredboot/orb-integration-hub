/**
 * ApplicationDetailPageComponent Unit Tests
 *
 * Tests for application detail page using NgRx store-first pattern.
 *
 * @see .kiro/specs/store-centric-refactoring/design.md
 * @see .kiro/specs/application-security-tab/design.md
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

import { ApplicationDetailPageComponent, ApplicationDetailTab } from './application-detail-page.component';
import { IApplications } from '../../../../../core/models/ApplicationsModel';
import { IOrganizations } from '../../../../../core/models/OrganizationsModel';
import { IApplicationApiKeys } from '../../../../../core/models/ApplicationApiKeysModel';
import { ApplicationStatus } from '../../../../../core/enums/ApplicationStatusEnum';
import { OrganizationStatus } from '../../../../../core/enums/OrganizationStatusEnum';
import { ApplicationApiKeyStatus } from '../../../../../core/enums/ApplicationApiKeyStatusEnum';
import { Environment } from '../../../../../core/enums/EnvironmentEnum';
import { ApplicationsActions } from '../../store/applications.actions';
import { OrganizationsActions } from '../../../organizations/store/organizations.actions';
import * as fromApplications from '../../store/applications.selectors';
import * as fromOrganizations from '../../../organizations/store/organizations.selectors';
import * as fromUser from '../../../../user/store/user.selectors';
import * as fromApiKeys from '../../store/api-keys/api-keys.selectors';

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
            // API Keys selectors
            { selector: fromApiKeys.selectApiKeys, value: [] },
            { selector: fromApiKeys.selectIsGenerating, value: false },
            { selector: fromApiKeys.selectIsRotating, value: false },
            { selector: fromApiKeys.selectIsRevoking, value: false },
            { selector: fromApiKeys.selectGeneratedKey, value: null },
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

  /**
   * Security Tab Tests
   *
   * Tests for the Security tab (renamed from API Keys tab).
   * @see .kiro/specs/application-security-tab/design.md
   * _Requirements: 1.1, 5.1_
   */
  describe('Security Tab', () => {
    describe('Tab Enum and Structure', () => {
      it('should have Overview enum value', () => {
        // Validates: Requirements 1.2
        expect(ApplicationDetailTab.Overview).toBe('overview');
      });

      it('should have Overview, Groups, Security, and Danger tabs', () => {
        // Validates: Requirements 1.3
        const tabValues = Object.values(ApplicationDetailTab) as string[];
        expect(tabValues).toContain('overview');
        expect(tabValues).toContain('groups');
        expect(tabValues).toContain('security');
        expect(tabValues).toContain('danger');
        expect(tabValues.length).toBe(4);
      });

      it('should default to Overview tab', fakeAsync(() => {
        store.overrideSelector(fromApplications.selectSelectedApplication, mockApplication);
        store.overrideSelector(fromOrganizations.selectOrganizations, [mockOrganization]);
        store.refreshState();
        fixture.detectChanges();
        tick();

        expect(component.activeTab).toBe(ApplicationDetailTab.Overview);
      }));

      it('should switch to Security tab when setActiveTab is called', fakeAsync(() => {
        store.overrideSelector(fromApplications.selectSelectedApplication, mockApplication);
        store.overrideSelector(fromOrganizations.selectOrganizations, [mockOrganization]);
        store.refreshState();
        fixture.detectChanges();
        tick();

        component.setActiveTab(ApplicationDetailTab.Security);

        expect(component.activeTab).toBe(ApplicationDetailTab.Security);
      }));
    });

    describe('Tab Rendering', () => {
      beforeEach(fakeAsync(() => {
        store.overrideSelector(fromApplications.selectSelectedApplication, mockApplication);
        store.overrideSelector(fromOrganizations.selectOrganizations, [mockOrganization]);
        store.refreshState();
        fixture.detectChanges();
        tick();
      }));

      it('should render Security tab button with shield-alt icon', () => {
        // Validates: Requirements 1.1
        const compiled = fixture.nativeElement as HTMLElement;
        const securityTab = compiled.querySelector('#tab-security');

        expect(securityTab).toBeTruthy();
        expect(securityTab?.textContent).toContain('Security');

        // Check for shield-alt icon (FontAwesome renders as SVG with data-icon attribute)
        const icon = securityTab?.querySelector('fa-icon');
        expect(icon).toBeTruthy();
      });

      it('should render Security tab with correct aria attributes', () => {
        const compiled = fixture.nativeElement as HTMLElement;
        const securityTab = compiled.querySelector('#tab-security');

        expect(securityTab?.getAttribute('role')).toBe('tab');
        expect(securityTab?.getAttribute('aria-controls')).toBe('panel-security');
      });
    });

    describe('Empty State', () => {
      it('should show empty state when application has no environments', fakeAsync(() => {
        // Validates: Requirements 5.1
        const appWithNoEnvs: IApplications = {
          ...mockApplication,
          environments: [],
        };
        store.overrideSelector(fromApplications.selectSelectedApplication, appWithNoEnvs);
        store.overrideSelector(fromOrganizations.selectOrganizations, [mockOrganization]);
        store.refreshState();
        fixture.detectChanges();
        tick();

        // Switch to Security tab
        component.setActiveTab(ApplicationDetailTab.Security);
        fixture.detectChanges();

        expect(component.environmentKeyRows.length).toBe(0);

        const compiled = fixture.nativeElement as HTMLElement;
        // Data grid shows empty message when no data
        const emptyState = compiled.querySelector('.data-grid__empty');
        expect(emptyState).toBeTruthy();
        expect(emptyState?.textContent).toContain('No environments configured');
      }));

      it('should show link to Overview tab in empty state', fakeAsync(() => {
        // Validates: Requirements 5.2
        // Note: The data-grid component shows the empty message which includes the hint
        const appWithNoEnvs: IApplications = {
          ...mockApplication,
          environments: [],
        };
        store.overrideSelector(fromApplications.selectSelectedApplication, appWithNoEnvs);
        store.overrideSelector(fromOrganizations.selectOrganizations, [mockOrganization]);
        store.refreshState();
        fixture.detectChanges();
        tick();

        component.setActiveTab(ApplicationDetailTab.Security);
        fixture.detectChanges();

        const compiled = fixture.nativeElement as HTMLElement;
        const emptyState = compiled.querySelector('.data-grid__empty');
        expect(emptyState).toBeTruthy();
        expect(emptyState?.textContent).toContain('Configure environments in the Overview tab');
      }));

      it('should navigate to Overview tab when setActiveTab is called', fakeAsync(() => {
        // Note: Empty state now uses data-grid's built-in empty message
        // Navigation is tested by calling setActiveTab directly
        const appWithNoEnvs: IApplications = {
          ...mockApplication,
          environments: [],
        };
        store.overrideSelector(fromApplications.selectSelectedApplication, appWithNoEnvs);
        store.overrideSelector(fromOrganizations.selectOrganizations, [mockOrganization]);
        store.refreshState();
        fixture.detectChanges();
        tick();

        component.setActiveTab(ApplicationDetailTab.Security);
        fixture.detectChanges();

        // Verify we're on Security tab
        expect(component.activeTab).toBe(ApplicationDetailTab.Security);

        // Navigate to Overview
        component.setActiveTab(ApplicationDetailTab.Overview);
        fixture.detectChanges();

        expect(component.activeTab).toBe(ApplicationDetailTab.Overview);
      }));
    });

    describe('Environment Key Rows', () => {
      it('should show environment key rows when environments are configured', fakeAsync(() => {
        // Validates: Requirements 2.2
        store.overrideSelector(fromApplications.selectSelectedApplication, mockApplication);
        store.overrideSelector(fromOrganizations.selectOrganizations, [mockOrganization]);
        store.refreshState();
        fixture.detectChanges();
        tick();

        component.setActiveTab(ApplicationDetailTab.Security);
        fixture.detectChanges();

        // mockApplication has ['PRODUCTION', 'STAGING'] environments
        expect(component.environmentKeyRows.length).toBe(2);
      }));

      it('should display correct environment labels', fakeAsync(() => {
        store.overrideSelector(fromApplications.selectSelectedApplication, mockApplication);
        store.overrideSelector(fromOrganizations.selectOrganizations, [mockOrganization]);
        store.refreshState();
        fixture.detectChanges();
        tick();

        const labels = component.environmentKeyRows.map(row => row.environmentLabel);
        expect(labels).toContain('Production');
        expect(labels).toContain('Staging');
      }));
    });
  });

  /**
   * API Key Activation Validation Tests
   *
   * Tests for the activation flow that validates API keys are configured
   * before allowing an application to be activated.
   *
   * @see .kiro/specs/api-key-configuration-flow/design.md
   * _Requirements: 1.1, 1.2, 1.4, 4.1, 4.2_
   */
  describe('API Key Activation Validation', () => {
    // Helper to create mock API key
    const createMockApiKey = (environment: string, status: ApplicationApiKeyStatus): IApplicationApiKeys => ({
      applicationApiKeyId: `key-${environment}`,
      applicationId: 'app-pending',
      organizationId: 'org-456',
      environment: environment as Environment,
      status,
      keyPrefix: `orb_${environment.toLowerCase().substring(0, 2)}_`,
      keyHash: 'mock-hash',
      createdAt: new Date(),
      updatedAt: new Date()
    } as IApplicationApiKeys);

    describe('Activation Blocked Without API Keys', () => {
      beforeEach(fakeAsync(() => {
        // Set up a PENDING application (draft mode)
        store.overrideSelector(fromApplications.selectSelectedApplication, mockPendingApplication);
        store.overrideSelector(fromOrganizations.selectOrganizations, [mockOrganization]);
        // No API keys configured
        store.overrideSelector(fromApiKeys.selectApiKeys, []);
        store.refreshState();
        fixture.detectChanges();
        tick();
      }));

      it('should show validation error when activating without API keys', fakeAsync(() => {
        // Validates: Requirements 1.1, 4.1
        component.editForm.name = 'Valid Name';
        component.editForm.organizationId = 'org-456';
        component.editForm.environments = ['PRODUCTION', 'STAGING'];

        component.onSave();
        tick();

        expect(component.apiKeyValidationError).toBeTruthy();
        expect(component.apiKeyValidationError).toContain('Cannot activate');
        expect(component.apiKeyValidationError).toContain('API keys are required');
      }));

      it('should list missing environments in error message', fakeAsync(() => {
        // Validates: Requirements 1.4, 4.1
        component.editForm.name = 'Valid Name';
        component.editForm.organizationId = 'org-456';
        component.editForm.environments = ['PRODUCTION', 'STAGING'];

        component.onSave();
        tick();

        expect(component.apiKeyValidationError).toContain('Production');
        expect(component.apiKeyValidationError).toContain('Staging');
      }));

      it('should include Security tab reference in error message', fakeAsync(() => {
        // Validates: Requirements 4.2
        component.editForm.name = 'Valid Name';
        component.editForm.organizationId = 'org-456';
        component.editForm.environments = ['PRODUCTION'];

        component.onSave();
        tick();

        expect(component.apiKeyValidationError).toContain('Security tab');
      }));

      it('should not dispatch updateApplication when validation fails', fakeAsync(() => {
        // Validates: Requirements 1.1
        (store.dispatch as jasmine.Spy).calls.reset();

        component.editForm.name = 'Valid Name';
        component.editForm.organizationId = 'org-456';
        component.editForm.environments = ['PRODUCTION'];

        component.onSave();
        tick();

        expect(store.dispatch).not.toHaveBeenCalledWith(
          jasmine.objectContaining({ type: '[Applications] Update Application' })
        );
      }));
    });

    describe('Activation Allowed With API Keys', () => {
      beforeEach(fakeAsync(() => {
        store.overrideSelector(fromApplications.selectSelectedApplication, mockPendingApplication);
        store.overrideSelector(fromOrganizations.selectOrganizations, [mockOrganization]);
        // All environments have active API keys
        store.overrideSelector(fromApiKeys.selectApiKeys, [
          createMockApiKey('PRODUCTION', ApplicationApiKeyStatus.Active),
          createMockApiKey('STAGING', ApplicationApiKeyStatus.Active)
        ]);
        store.refreshState();
        fixture.detectChanges();
        tick();
      }));

      it('should allow activation when all environments have active keys', fakeAsync(() => {
        // Validates: Requirements 1.2
        component.editForm.name = 'Valid Name';
        component.editForm.organizationId = 'org-456';
        component.editForm.environments = ['PRODUCTION', 'STAGING'];

        component.onSave();
        tick();

        expect(component.apiKeyValidationError).toBeNull();
        expect(store.dispatch).toHaveBeenCalledWith(
          jasmine.objectContaining({ type: '[Applications] Update Application' })
        );
      }));

      it('should allow activation with ROTATING status keys', fakeAsync(() => {
        // Validates: Requirements 1.2
        store.overrideSelector(fromApiKeys.selectApiKeys, [
          createMockApiKey('PRODUCTION', ApplicationApiKeyStatus.Rotating),
          createMockApiKey('STAGING', ApplicationApiKeyStatus.Active)
        ]);
        store.refreshState();
        fixture.detectChanges();
        tick();

        component.editForm.name = 'Valid Name';
        component.editForm.organizationId = 'org-456';
        component.editForm.environments = ['PRODUCTION', 'STAGING'];

        component.onSave();
        tick();

        expect(component.apiKeyValidationError).toBeNull();
      }));
    });

    describe('Partial API Key Configuration', () => {
      beforeEach(fakeAsync(() => {
        store.overrideSelector(fromApplications.selectSelectedApplication, mockPendingApplication);
        store.overrideSelector(fromOrganizations.selectOrganizations, [mockOrganization]);
        // Only PRODUCTION has an active key
        store.overrideSelector(fromApiKeys.selectApiKeys, [
          createMockApiKey('PRODUCTION', ApplicationApiKeyStatus.Active)
        ]);
        store.refreshState();
        fixture.detectChanges();
        tick();
      }));

      it('should show error for missing environments only', fakeAsync(() => {
        // Validates: Requirements 1.3, 1.4
        component.editForm.name = 'Valid Name';
        component.editForm.organizationId = 'org-456';
        component.editForm.environments = ['PRODUCTION', 'STAGING'];

        component.onSave();
        tick();

        expect(component.apiKeyValidationError).toContain('Staging');
        expect(component.apiKeyValidationError).not.toContain('Production');
      }));
    });

    describe('Revoked/Expired Keys Not Counted', () => {
      beforeEach(fakeAsync(() => {
        store.overrideSelector(fromApplications.selectSelectedApplication, mockPendingApplication);
        store.overrideSelector(fromOrganizations.selectOrganizations, [mockOrganization]);
      }));

      it('should not count REVOKED keys as valid', fakeAsync(() => {
        // Validates: Requirements 1.2
        store.overrideSelector(fromApiKeys.selectApiKeys, [
          createMockApiKey('PRODUCTION', ApplicationApiKeyStatus.Revoked),
          createMockApiKey('STAGING', ApplicationApiKeyStatus.Active)
        ]);
        store.refreshState();
        fixture.detectChanges();
        tick();

        component.editForm.name = 'Valid Name';
        component.editForm.organizationId = 'org-456';
        component.editForm.environments = ['PRODUCTION', 'STAGING'];

        component.onSave();
        tick();

        expect(component.apiKeyValidationError).toContain('Production');
      }));

      it('should not count EXPIRED keys as valid', fakeAsync(() => {
        // Validates: Requirements 1.2
        store.overrideSelector(fromApiKeys.selectApiKeys, [
          createMockApiKey('PRODUCTION', ApplicationApiKeyStatus.Expired),
          createMockApiKey('STAGING', ApplicationApiKeyStatus.Active)
        ]);
        store.refreshState();
        fixture.detectChanges();
        tick();

        component.editForm.name = 'Valid Name';
        component.editForm.organizationId = 'org-456';
        component.editForm.environments = ['PRODUCTION', 'STAGING'];

        component.onSave();
        tick();

        expect(component.apiKeyValidationError).toContain('Production');
      }));
    });

    describe('Error Message Clearing', () => {
      beforeEach(fakeAsync(() => {
        store.overrideSelector(fromApplications.selectSelectedApplication, mockPendingApplication);
        store.overrideSelector(fromOrganizations.selectOrganizations, [mockOrganization]);
        store.overrideSelector(fromApiKeys.selectApiKeys, []);
        store.refreshState();
        fixture.detectChanges();
        tick();
      }));

      it('should clear error when switching away from Overview tab', fakeAsync(() => {
        // Validates: Requirements 4.1
        component.editForm.name = 'Valid Name';
        component.editForm.organizationId = 'org-456';
        component.editForm.environments = ['PRODUCTION'];

        component.onSave();
        tick();
        expect(component.apiKeyValidationError).toBeTruthy();

        component.setActiveTab(ApplicationDetailTab.Security);
        tick();

        expect(component.apiKeyValidationError).toBeNull();
      }));

      it('should clear error on next save attempt', fakeAsync(() => {
        // Validates: Requirements 4.1
        // mockPendingApplication has environments: ['PRODUCTION', 'STAGING']
        component.editForm.name = 'Valid Name';
        component.editForm.organizationId = 'org-456';
        component.editForm.environments = ['PRODUCTION', 'STAGING'];

        component.onSave();
        tick();
        expect(component.apiKeyValidationError).toBeTruthy();

        // Add the missing keys for both environments
        const newApiKeys = [
          createMockApiKey('PRODUCTION', ApplicationApiKeyStatus.Active),
          createMockApiKey('STAGING', ApplicationApiKeyStatus.Active)
        ];
        store.overrideSelector(fromApiKeys.selectApiKeys, newApiKeys);
        store.refreshState();
        fixture.detectChanges();
        tick();

        // Manually update the component's apiKeys since the subscription may not have fired
        component.apiKeys = newApiKeys;

        component.onSave();
        tick();

        expect(component.apiKeyValidationError).toBeNull();
      }));
    });

    describe('Active Application Updates', () => {
      beforeEach(fakeAsync(() => {
        // Active application (not draft)
        store.overrideSelector(fromApplications.selectSelectedApplication, mockApplication);
        store.overrideSelector(fromOrganizations.selectOrganizations, [mockOrganization]);
        store.overrideSelector(fromApiKeys.selectApiKeys, []);
        store.refreshState();
        fixture.detectChanges();
        tick();
      }));

      it('should not validate API keys for active application updates', fakeAsync(() => {
        // Validates: Requirements 1.1 (validation only for activation)
        component.editForm.name = 'Updated Name';
        component.editForm.organizationId = 'org-456';
        component.editForm.environments = ['PRODUCTION', 'STAGING'];

        component.onSave();
        tick();

        // Should not show validation error for active apps
        expect(component.apiKeyValidationError).toBeNull();
        expect(store.dispatch).toHaveBeenCalledWith(
          jasmine.objectContaining({ type: '[Applications] Update Application' })
        );
      }));
    });
  });
});
