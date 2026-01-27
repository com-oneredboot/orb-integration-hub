/**
 * ApplicationDetailPageComponent Unit Tests
 *
 * Tests for application detail page form validation and save/cancel flows.
 *
 * @see .kiro/specs/applications-management/design.md
 * _Requirements: 6.3_
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of, throwError, BehaviorSubject } from 'rxjs';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';

import { ApplicationDetailPageComponent } from './application-detail-page.component';
import { ApplicationService } from '../../../../../core/services/application.service';
import { OrganizationService } from '../../../../../core/services/organization.service';
import { IApplications } from '../../../../../core/models/ApplicationsModel';
import { IOrganizations } from '../../../../../core/models/OrganizationsModel';
import { ApplicationStatus } from '../../../../../core/enums/ApplicationStatusEnum';
import { OrganizationStatus } from '../../../../../core/enums/OrganizationStatusEnum';
import * as fromUser from '../../../../user/store/user.selectors';

describe('ApplicationDetailPageComponent', () => {
  let component: ApplicationDetailPageComponent;
  let fixture: ComponentFixture<ApplicationDetailPageComponent>;
  let store: MockStore;
  let router: Router;
  let applicationService: jasmine.SpyObj<ApplicationService>;
  let organizationService: jasmine.SpyObj<OrganizationService>;
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

  beforeEach(async () => {
    applicationService = jasmine.createSpyObj('ApplicationService', [
      'getApplication',
      'createDraft',
      'updateApplication',
      'deleteApplication',
    ]);
    organizationService = jasmine.createSpyObj('OrganizationService', [
      'getUserOrganizations',
    ]);

    paramMapSubject = new BehaviorSubject(convertToParamMap({ id: 'app-789' }));

    await TestBed.configureTestingModule({
      imports: [ApplicationDetailPageComponent, RouterTestingModule],
      providers: [
        provideMockStore({
          selectors: [
            { selector: fromUser.selectCurrentUser, value: mockUser },
            { selector: fromUser.selectDebugMode, value: false },
          ],
        }),
        { provide: ApplicationService, useValue: applicationService },
        { provide: OrganizationService, useValue: organizationService },
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
    fixture = TestBed.createComponent(ApplicationDetailPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    store.resetSelectors();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Validation', () => {
    beforeEach(fakeAsync(() => {
      organizationService.getUserOrganizations.and.returnValue(
        of({ items: [mockOrganization], nextToken: null })
      );
      applicationService.getApplication.and.returnValue(of(mockApplication));

      fixture.detectChanges();
      tick();
    }));

    it('should require application name', () => {
      component.editForm.name = '';
      component.editForm.organizationId = 'org-456';

      component.onSave();

      expect(component.validationErrors.name).toBe('Application name is required');
      expect(applicationService.updateApplication).not.toHaveBeenCalled();
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

    it('should pass validation with valid data', () => {
      component.editForm.name = 'Valid Name';
      component.editForm.organizationId = 'org-456';
      component.editForm.description = 'Valid description';
      component.editForm.environments = ['PRODUCTION'];

      applicationService.updateApplication.and.returnValue(of(mockApplication));

      component.onSave();

      expect(component.validationErrors.name).toBe('');
      expect(component.validationErrors.organizationId).toBe('');
      expect(component.validationErrors.environments).toBe('');
      expect(applicationService.updateApplication).toHaveBeenCalled();
    });

    it('should require at least one environment', () => {
      component.editForm.name = 'Valid Name';
      component.editForm.organizationId = 'org-456';
      component.editForm.environments = [];

      component.onSave();

      expect(component.validationErrors.environments).toBe(
        'At least one environment must be selected'
      );
      expect(applicationService.updateApplication).not.toHaveBeenCalled();
    });
  });

  describe('Environment Selection', () => {
    beforeEach(fakeAsync(() => {
      organizationService.getUserOrganizations.and.returnValue(
        of({ items: [mockOrganization], nextToken: null })
      );
      applicationService.getApplication.and.returnValue(of(mockApplication));

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

    it('should include environments in save payload', fakeAsync(() => {
      component.editForm.name = 'Test App';
      component.editForm.organizationId = 'org-456';
      component.editForm.environments = ['PRODUCTION', 'DEVELOPMENT'];

      applicationService.updateApplication.and.returnValue(of(mockApplication));

      component.onSave();
      tick();

      expect(applicationService.updateApplication).toHaveBeenCalledWith(
        jasmine.objectContaining({
          environments: ['PRODUCTION', 'DEVELOPMENT']
        })
      );
    }));

    it('should render environment checkboxes in template', () => {
      fixture.detectChanges();

      const checkboxes = fixture.nativeElement.querySelectorAll(
        '.app-detail-environments__checkbox'
      );
      expect(checkboxes.length).toBe(5);
    });

    it('should show selected state for checked environments', () => {
      fixture.detectChanges();

      const selectedItems = fixture.nativeElement.querySelectorAll(
        '.app-detail-environments__item--selected'
      );
      expect(selectedItems.length).toBe(2); // PRODUCTION and STAGING from mockApplication
    });
  });

  describe('Save Flow for PENDING Application', () => {
    beforeEach(fakeAsync(() => {
      organizationService.getUserOrganizations.and.returnValue(
        of({ items: [mockOrganization], nextToken: null })
      );
      applicationService.getApplication.and.returnValue(of(mockPendingApplication));

      paramMapSubject.next(convertToParamMap({ id: 'app-pending' }));
      fixture.detectChanges();
      tick();
    }));

    it('should detect PENDING status as draft mode', () => {
      expect(component.isDraft).toBe(true);
    });

    it('should change status to ACTIVE when saving PENDING application', fakeAsync(() => {
      component.editForm.name = 'Updated Name';
      component.editForm.organizationId = 'org-456';
      component.editForm.environments = ['PRODUCTION'];

      const updatedApp = { ...mockPendingApplication, status: ApplicationStatus.Active };
      applicationService.updateApplication.and.returnValue(of(updatedApp));

      component.onSave();
      tick();

      expect(applicationService.updateApplication).toHaveBeenCalledWith(
        jasmine.objectContaining({
          status: ApplicationStatus.Active,
        })
      );
    }));
  });

  describe('Cancel Deletes Draft', () => {
    beforeEach(fakeAsync(() => {
      organizationService.getUserOrganizations.and.returnValue(
        of({ items: [mockOrganization], nextToken: null })
      );
      applicationService.getApplication.and.returnValue(of(mockPendingApplication));

      paramMapSubject.next(convertToParamMap({ id: 'app-pending' }));
      fixture.detectChanges();
      tick();
    }));

    it('should delete draft application on cancel', fakeAsync(() => {
      applicationService.deleteApplication.and.returnValue(of(mockPendingApplication));

      component.onCancel();
      tick();

      expect(applicationService.deleteApplication).toHaveBeenCalledWith('app-pending');
      expect(router.navigate).toHaveBeenCalledWith(['/customers/applications']);
    }));

    it('should navigate even if delete fails', fakeAsync(() => {
      applicationService.deleteApplication.and.returnValue(
        throwError(() => new Error('Delete failed'))
      );

      component.onCancel();
      tick();

      expect(router.navigate).toHaveBeenCalledWith(['/customers/applications']);
    }));
  });

  describe('Cancel for Active Application', () => {
    beforeEach(fakeAsync(() => {
      organizationService.getUserOrganizations.and.returnValue(
        of({ items: [mockOrganization], nextToken: null })
      );
      applicationService.getApplication.and.returnValue(of(mockApplication));

      fixture.detectChanges();
      tick();
    }));

    it('should not delete active application on cancel', () => {
      component.onCancel();

      expect(applicationService.deleteApplication).not.toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/customers/applications']);
    });
  });

  describe('Organization Dropdown Loading', () => {
    it('should load organizations on init', fakeAsync(() => {
      organizationService.getUserOrganizations.and.returnValue(
        of({ items: [mockOrganization], nextToken: null })
      );
      applicationService.getApplication.and.returnValue(of(mockApplication));

      fixture.detectChanges();
      tick();

      expect(organizationService.getUserOrganizations).toHaveBeenCalledWith('user-123');
      expect(component.organizations.length).toBe(1);
    }));

    it('should auto-select organization when only one exists', fakeAsync(() => {
      organizationService.getUserOrganizations.and.returnValue(
        of({ items: [mockOrganization], nextToken: null })
      );
      applicationService.getApplication.and.returnValue(
        of({ ...mockApplication, organizationId: '' })
      );

      fixture.detectChanges();
      tick();

      expect(component.editForm.organizationId).toBe('org-456');
    }));

    it('should filter out non-ACTIVE organizations', fakeAsync(() => {
      const inactiveOrg: IOrganizations = {
        ...mockOrganization,
        organizationId: 'org-inactive',
        status: OrganizationStatus.Inactive,
      };

      organizationService.getUserOrganizations.and.returnValue(
        of({ items: [mockOrganization, inactiveOrg], nextToken: null })
      );
      applicationService.getApplication.and.returnValue(of(mockApplication));

      fixture.detectChanges();
      tick();

      expect(component.organizations.length).toBe(1);
      expect(component.organizations[0].organizationId).toBe('org-456');
    }));
  });

  describe('Delete Confirmation', () => {
    beforeEach(fakeAsync(() => {
      organizationService.getUserOrganizations.and.returnValue(
        of({ items: [mockOrganization], nextToken: null })
      );
      applicationService.getApplication.and.returnValue(of(mockApplication));

      fixture.detectChanges();
      tick();
    }));

    it('should call deleteApplication when confirmed', fakeAsync(() => {
      spyOn(window, 'confirm').and.returnValue(true);
      applicationService.deleteApplication.and.returnValue(of(mockApplication));

      component.onDelete();
      tick();

      expect(applicationService.deleteApplication).toHaveBeenCalledWith('app-789');
      expect(router.navigate).toHaveBeenCalledWith(['/customers/applications']);
    }));

    it('should not delete when confirmation is cancelled', () => {
      spyOn(window, 'confirm').and.returnValue(false);

      component.onDelete();

      expect(applicationService.deleteApplication).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should display error when application not found', fakeAsync(() => {
      organizationService.getUserOrganizations.and.returnValue(
        of({ items: [mockOrganization], nextToken: null })
      );
      applicationService.getApplication.and.returnValue(of(null));

      fixture.detectChanges();
      tick();

      expect(component.loadError).toBe('Application not found');
    }));

    it('should display error when loading fails', fakeAsync(() => {
      organizationService.getUserOrganizations.and.returnValue(
        of({ items: [mockOrganization], nextToken: null })
      );
      applicationService.getApplication.and.returnValue(
        throwError(() => new Error('Network error'))
      );

      fixture.detectChanges();
      tick();

      expect(component.loadError).toBe('Network error');
    }));

    it('should display save error when update fails', fakeAsync(() => {
      organizationService.getUserOrganizations.and.returnValue(
        of({ items: [mockOrganization], nextToken: null })
      );
      applicationService.getApplication.and.returnValue(of(mockApplication));

      fixture.detectChanges();
      tick();

      component.editForm.name = 'Valid Name';
      component.editForm.organizationId = 'org-456';
      component.editForm.environments = ['PRODUCTION'];

      applicationService.updateApplication.and.returnValue(
        throwError(() => new Error('Save failed'))
      );

      component.onSave();
      tick();

      expect(component.saveError).toBe('Save failed');
      expect(component.isSaving).toBe(false);
    }));
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
