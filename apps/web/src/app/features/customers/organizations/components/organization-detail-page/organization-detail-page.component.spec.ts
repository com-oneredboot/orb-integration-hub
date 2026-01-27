/**
 * OrganizationDetailPageComponent Unit Tests
 *
 * Tests for organization detail page including applications section.
 *
 * @see .kiro/specs/organizations-applications-integration/design.md
 * _Requirements: 2.1-2.8_
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of, throwError, BehaviorSubject } from 'rxjs';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';

import { OrganizationDetailPageComponent } from './organization-detail-page.component';
import { OrganizationService } from '../../../../../core/services/organization.service';
import { ApplicationService } from '../../../../../core/services/application.service';
import { Organizations } from '../../../../../core/models/OrganizationsModel';
import { IApplications } from '../../../../../core/models/ApplicationsModel';
import { OrganizationStatus } from '../../../../../core/enums/OrganizationStatusEnum';
import { ApplicationStatus } from '../../../../../core/enums/ApplicationStatusEnum';
import * as fromUser from '../../../../user/store/user.selectors';

describe('OrganizationDetailPageComponent', () => {
  let component: OrganizationDetailPageComponent;
  let fixture: ComponentFixture<OrganizationDetailPageComponent>;
  let store: MockStore;
  let router: Router;
  let organizationService: jasmine.SpyObj<OrganizationService>;
  let applicationService: jasmine.SpyObj<ApplicationService>;
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

  beforeEach(async () => {
    organizationService = jasmine.createSpyObj('OrganizationService', [
      'getOrganization',
      'updateOrganization',
      'deleteOrganization',
    ]);
    applicationService = jasmine.createSpyObj('ApplicationService', [
      'getApplicationsByOrganization',
    ]);
    paramMapSubject = new BehaviorSubject(convertToParamMap({ id: 'org-123' }));

    await TestBed.configureTestingModule({
      imports: [OrganizationDetailPageComponent],
      providers: [
        provideMockStore({
          selectors: [{ selector: fromUser.selectDebugMode, value: false }],
        }),
        { provide: OrganizationService, useValue: organizationService },
        { provide: ApplicationService, useValue: applicationService },
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

    fixture = TestBed.createComponent(OrganizationDetailPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    store.resetSelectors();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });


  describe('Organization Loading', () => {
    it('should load organization on init', fakeAsync(() => {
      organizationService.getOrganization.and.returnValue(of(mockOrganization));
      applicationService.getApplicationsByOrganization.and.returnValue(
        of({ items: mockApplications, nextToken: null })
      );

      fixture.detectChanges();
      tick();

      expect(organizationService.getOrganization).toHaveBeenCalledWith('org-123');
      expect(component.organization).toEqual(mockOrganization);
      expect(component.isLoading).toBe(false);
    }));

    it('should set isDraft to true for PENDING organizations', fakeAsync(() => {
      paramMapSubject.next(convertToParamMap({ id: 'org-draft' }));
      organizationService.getOrganization.and.returnValue(of(mockDraftOrganization));

      fixture.detectChanges();
      tick();

      expect(component.isDraft).toBe(true);
    }));

    it('should handle organization not found', fakeAsync(() => {
      organizationService.getOrganization.and.returnValue(of(null));

      fixture.detectChanges();
      tick();

      expect(component.loadError).toBe('Organization not found');
      expect(component.isLoading).toBe(false);
    }));

    it('should handle organization loading error', fakeAsync(() => {
      organizationService.getOrganization.and.returnValue(
        throwError(() => new Error('Network error'))
      );

      fixture.detectChanges();
      tick();

      expect(component.loadError).toBe('Network error');
      expect(component.isLoading).toBe(false);
    }));
  });

  describe('Applications Section', () => {
    beforeEach(() => {
      organizationService.getOrganization.and.returnValue(of(mockOrganization));
    });

    it('should load applications for non-draft organizations', fakeAsync(() => {
      applicationService.getApplicationsByOrganization.and.returnValue(
        of({ items: mockApplications, nextToken: null })
      );

      fixture.detectChanges();
      tick();

      expect(applicationService.getApplicationsByOrganization).toHaveBeenCalledWith('org-123');
      expect(component.applications.length).toBe(2);
      expect(component.isLoadingApplications).toBe(false);
    }));

    it('should NOT load applications for draft organizations', fakeAsync(() => {
      paramMapSubject.next(convertToParamMap({ id: 'org-draft' }));
      organizationService.getOrganization.and.returnValue(of(mockDraftOrganization));

      fixture.detectChanges();
      tick();

      expect(applicationService.getApplicationsByOrganization).not.toHaveBeenCalled();
    }));

    it('should filter out PENDING applications from the list', fakeAsync(() => {
      const appsWithPending: IApplications[] = [
        ...mockApplications,
        {
          applicationId: 'app-pending',
          name: 'Pending App',
          organizationId: 'org-123',
          ownerId: 'user-123',
          status: ApplicationStatus.Pending,
          apiKey: '',
          apiKeyNext: '',
          environments: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      applicationService.getApplicationsByOrganization.and.returnValue(
        of({ items: appsWithPending, nextToken: null })
      );

      fixture.detectChanges();
      tick();

      expect(component.applications.length).toBe(2);
      expect(component.applications.every(a => a.status !== ApplicationStatus.Pending)).toBe(true);
    }));

    it('should handle applications loading error', fakeAsync(() => {
      applicationService.getApplicationsByOrganization.and.returnValue(
        throwError(() => new Error('Failed to load applications'))
      );

      fixture.detectChanges();
      tick();

      expect(component.applicationsError).toBe('Failed to load applications');
      expect(component.isLoadingApplications).toBe(false);
    }));

    it('should display empty state when no applications exist', fakeAsync(() => {
      applicationService.getApplicationsByOrganization.and.returnValue(
        of({ items: [], nextToken: null })
      );
      // Mock updateOrganization for count sync (2 -> 0)
      organizationService.updateOrganization.and.returnValue(
        of(new Organizations({ ...mockOrganization, applicationCount: 0 }))
      );

      fixture.detectChanges();
      tick();

      expect(component.applications.length).toBe(0);
      expect(component.isLoadingApplications).toBe(false);
      expect(component.applicationsError).toBeNull();
    }));
  });

  describe('Application Navigation', () => {
    beforeEach(fakeAsync(() => {
      organizationService.getOrganization.and.returnValue(of(mockOrganization));
      applicationService.getApplicationsByOrganization.and.returnValue(
        of({ items: mockApplications, nextToken: null })
      );
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

  describe('Application Count Sync', () => {
    it('should sync application count when it differs from actual count', fakeAsync(() => {
      const orgWithWrongCount = new Organizations({
        ...mockOrganization,
        applicationCount: 5, // Wrong count
      });
      organizationService.getOrganization.and.returnValue(of(orgWithWrongCount));
      applicationService.getApplicationsByOrganization.and.returnValue(
        of({ items: mockApplications, nextToken: null })
      );
      organizationService.updateOrganization.and.returnValue(
        of(new Organizations({ ...orgWithWrongCount, applicationCount: 2 }))
      );

      fixture.detectChanges();
      tick();

      expect(organizationService.updateOrganization).toHaveBeenCalled();
      const updateCall = organizationService.updateOrganization.calls.mostRecent().args[0];
      expect(updateCall.applicationCount).toBe(2);
    }));

    it('should NOT sync application count when it matches', fakeAsync(() => {
      organizationService.getOrganization.and.returnValue(of(mockOrganization));
      applicationService.getApplicationsByOrganization.and.returnValue(
        of({ items: mockApplications, nextToken: null })
      );

      fixture.detectChanges();
      tick();

      // updateOrganization should not be called for count sync
      // (it may be called for other reasons, so we check the call args)
      const syncCalls = organizationService.updateOrganization.calls.all().filter(
        call => call.args[0].applicationCount !== undefined
      );
      expect(syncCalls.length).toBe(0);
    }));
  });
});
