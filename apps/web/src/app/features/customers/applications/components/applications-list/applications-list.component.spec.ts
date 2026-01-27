/**
 * ApplicationsListComponent Unit Tests
 *
 * Tests for applications list component data loading and user interactions.
 *
 * @see .kiro/specs/applications-management/design.md
 * _Requirements: 6.2_
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of, throwError } from 'rxjs';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faRocket, faPlus, faSearch, faServer, faSpinner } from '@fortawesome/free-solid-svg-icons';

import { ApplicationsListComponent, ApplicationListRow } from './applications-list.component';
import { ApplicationService } from '../../../../../core/services/application.service';
import { OrganizationService } from '../../../../../core/services/organization.service';
import { IApplications } from '../../../../../core/models/ApplicationsModel';
import { IOrganizations } from '../../../../../core/models/OrganizationsModel';
import { ApplicationStatus } from '../../../../../core/enums/ApplicationStatusEnum';
import { OrganizationStatus } from '../../../../../core/enums/OrganizationStatusEnum';
import * as fromUser from '../../../../user/store/user.selectors';

describe('ApplicationsListComponent', () => {
  let component: ApplicationsListComponent;
  let fixture: ComponentFixture<ApplicationsListComponent>;
  let store: MockStore;
  let router: jasmine.SpyObj<Router>;
  let applicationService: jasmine.SpyObj<ApplicationService>;
  let organizationService: jasmine.SpyObj<OrganizationService>;

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

  beforeEach(async () => {
    router = jasmine.createSpyObj('Router', ['navigate']);
    applicationService = jasmine.createSpyObj('ApplicationService', [
      'getApplicationsByOrganization',
    ]);
    organizationService = jasmine.createSpyObj('OrganizationService', [
      'getUserOrganizations',
    ]);

    await TestBed.configureTestingModule({
      imports: [ApplicationsListComponent],
      providers: [
        provideMockStore({
          selectors: [{ selector: fromUser.selectCurrentUser, value: mockUser }],
        }),
        { provide: Router, useValue: router },
        { provide: ApplicationService, useValue: applicationService },
        { provide: OrganizationService, useValue: organizationService },
      ],
    }).compileComponents();

    // Register FontAwesome icons
    const library = TestBed.inject(FaIconLibrary);
    library.addIcons(faRocket, faPlus, faSearch, faServer, faSpinner);

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(ApplicationsListComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    store.resetSelectors();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Data Loading', () => {
    it('should load applications on init when user is available', fakeAsync(() => {
      organizationService.getUserOrganizations.and.returnValue(
        of({ items: [mockOrganization], nextToken: null })
      );
      applicationService.getApplicationsByOrganization.and.returnValue(
        of({ items: [mockApplication], nextToken: null })
      );

      fixture.detectChanges();
      tick();

      expect(organizationService.getUserOrganizations).toHaveBeenCalledWith('user-123');
      expect(applicationService.getApplicationsByOrganization).toHaveBeenCalledWith(
        'org-456'
      );
      expect(component.applicationRows.length).toBe(1);
      expect(component.isLoading).toBe(false);
    }));

    it('should set isLoading to false after loading completes', fakeAsync(() => {
      organizationService.getUserOrganizations.and.returnValue(
        of({ items: [mockOrganization], nextToken: null })
      );
      applicationService.getApplicationsByOrganization.and.returnValue(
        of({ items: [mockApplication], nextToken: null })
      );

      fixture.detectChanges();
      tick();

      // isLoading should be false after loading completes
      expect(component.isLoading).toBe(false);
    }));

    it('should handle empty organizations', fakeAsync(() => {
      organizationService.getUserOrganizations.and.returnValue(
        of({ items: [], nextToken: null })
      );

      fixture.detectChanges();
      tick();

      expect(component.applicationRows.length).toBe(0);
      expect(component.isLoading).toBe(false);
    }));

    it('should handle application loading errors gracefully', fakeAsync(() => {
      organizationService.getUserOrganizations.and.returnValue(
        of({ items: [mockOrganization], nextToken: null })
      );
      applicationService.getApplicationsByOrganization.and.returnValue(
        throwError(() => new Error('Failed to load'))
      );

      fixture.detectChanges();
      tick();

      // Should still complete without crashing
      expect(component.isLoading).toBe(false);
    }));

    it('should filter out PENDING applications from the list', fakeAsync(() => {
      const pendingApp: IApplications = {
        ...mockApplication,
        applicationId: 'app-pending',
        status: ApplicationStatus.Pending,
      };

      organizationService.getUserOrganizations.and.returnValue(
        of({ items: [mockOrganization], nextToken: null })
      );
      applicationService.getApplicationsByOrganization.and.returnValue(
        of({ items: [mockApplication, pendingApp], nextToken: null })
      );

      fixture.detectChanges();
      tick();

      // Only active application should be in the list
      expect(component.applicationRows.length).toBe(1);
      expect(component.applicationRows[0].application.status).toBe(
        ApplicationStatus.Active
      );
    }));
  });

  describe('Row Click Navigation', () => {
    it('should navigate to application detail on row click', () => {
      component.onRowClick(mockApplication);

      expect(router.navigate).toHaveBeenCalledWith([
        '/customers/applications',
        'app-789',
      ]);
    });
  });

  describe('Create Button Behavior', () => {
    it('should navigate to new application route on create', () => {
      component.onCreateApplication();

      expect(router.navigate).toHaveBeenCalled();
      const navigateArgs = router.navigate.calls.mostRecent().args[0];
      expect(navigateArgs[0]).toBe('/customers/applications');
      expect(navigateArgs[1]).toMatch(/^new-\d+$/);
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      component.applicationRows = [
        {
          application: mockApplication,
          organizationName: 'Test Organization',
          environmentCount: 2,
          userRole: 'OWNER',
          lastActivity: '1 day ago',
        },
        {
          application: {
            ...mockApplication,
            applicationId: 'app-2',
            name: 'Another App',
            organizationId: 'org-other',
          },
          organizationName: 'Other Organization',
          environmentCount: 1,
          userRole: 'DEVELOPER',
          lastActivity: '2 days ago',
        },
      ];
    });

    it('should filter by search term', () => {
      component.searchTerm = 'Test';
      component.onSearchChange();

      expect(component.filteredApplicationRows.length).toBe(1);
      expect(component.filteredApplicationRows[0].application.name).toBe(
        'Test Application'
      );
    });

    it('should filter by organization', () => {
      component.organizationFilter = 'org-456';
      component.onFilterChange();

      expect(component.filteredApplicationRows.length).toBe(1);
      expect(component.filteredApplicationRows[0].application.organizationId).toBe(
        'org-456'
      );
    });

    it('should filter by status', () => {
      component.applicationRows[1].application.status = ApplicationStatus.Inactive;
      component.statusFilter = 'ACTIVE';
      component.onFilterChange();

      expect(component.filteredApplicationRows.length).toBe(1);
      expect(component.filteredApplicationRows[0].application.status).toBe(
        ApplicationStatus.Active
      );
    });

    it('should apply multiple filters together', () => {
      component.searchTerm = 'Test';
      component.organizationFilter = 'org-456';
      component.onFilterChange();

      expect(component.filteredApplicationRows.length).toBe(1);
    });

    it('should be case-insensitive when searching', () => {
      component.searchTerm = 'test';
      component.onSearchChange();

      expect(component.filteredApplicationRows.length).toBe(1);
    });
  });

  describe('Application Selection', () => {
    it('should emit applicationSelected event when application is selected', () => {
      spyOn(component.applicationSelected, 'emit');

      component.onApplicationSelected(mockApplication);

      expect(component.applicationSelected.emit).toHaveBeenCalledWith(mockApplication);
    });
  });

  describe('Track By Function', () => {
    it('should return applicationId for tracking', () => {
      const row: ApplicationListRow = {
        application: mockApplication,
        organizationName: 'Test',
        environmentCount: 1,
        userRole: 'OWNER',
        lastActivity: 'Now',
      };

      const result = component.trackByApplicationId(0, row);

      expect(result).toBe('app-789');
    });
  });

  describe('Role Class', () => {
    it('should return lowercase role class', () => {
      expect(component.getRoleClass('OWNER')).toBe('owner');
      expect(component.getRoleClass('ADMINISTRATOR')).toBe('administrator');
      expect(component.getRoleClass('DEVELOPER')).toBe('developer');
    });
  });
});
