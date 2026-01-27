/**
 * ApplicationDetailPageComponent Property-Based Tests
 *
 * Property tests for application detail page behavior.
 *
 * @see .kiro/specs/applications-management/design.md
 * _Requirements: 6.3_
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of, BehaviorSubject } from 'rxjs';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';
import * as fc from 'fast-check';

import { ApplicationDetailPageComponent } from './application-detail-page.component';
import { ApplicationService } from '../../../../../core/services/application.service';
import { OrganizationService } from '../../../../../core/services/organization.service';
import { IApplications } from '../../../../../core/models/ApplicationsModel';
import { IOrganizations } from '../../../../../core/models/OrganizationsModel';
import { ApplicationStatus } from '../../../../../core/enums/ApplicationStatusEnum';
import { OrganizationStatus } from '../../../../../core/enums/OrganizationStatusEnum';
import * as fromUser from '../../../../user/store/user.selectors';

describe('ApplicationDetailPageComponent Property Tests', () => {
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

  // Arbitrary for valid application names (2-100 chars)
  const validNameArbitrary = fc.string({ minLength: 2, maxLength: 100 }).filter(s => s.trim().length >= 2);

  // Arbitrary for invalid application names
  const invalidNameArbitrary = fc.oneof(
    fc.constant(''),
    fc.constant(' '),
    fc.string({ minLength: 1, maxLength: 1 }), // Too short
    fc.string({ minLength: 101, maxLength: 150 }) // Too long
  );

  // Arbitrary for valid descriptions (0-500 chars)
  const validDescriptionArbitrary = fc.string({ minLength: 0, maxLength: 500 });

  // Arbitrary for invalid descriptions (>500 chars)
  const invalidDescriptionArbitrary = fc.string({ minLength: 501, maxLength: 600 });

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

    const library = TestBed.inject(FaIconLibrary);
    library.addIconPacks(fas);

    store = TestBed.inject(MockStore);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  afterEach(() => {
    store.resetSelectors();
  });

  /**
   * Property 6: Status Transition on Save
   *
   * For any application with PENDING status, saving the application with valid data
   * SHALL result in the application having ACTIVE status.
   *
   * Validates: Requirements 3.6
   */
  describe('Property 6: Status Transition on Save', () => {
    it('should transition PENDING to ACTIVE on save for any valid name', fakeAsync(() => {
      fc.assert(
        fc.property(validNameArbitrary, (validName) => {
          // Setup pending application
          const pendingApp: IApplications = {
            applicationId: 'app-pending',
            name: 'Draft App',
            organizationId: 'org-456',
            ownerId: 'user-123',
            status: ApplicationStatus.Pending,
            apiKey: 'api-key',
            apiKeyNext: '',
            environments: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          organizationService.getUserOrganizations.and.returnValue(
            of({ items: [mockOrganization], nextToken: null })
          );
          applicationService.getApplication.and.returnValue(of(pendingApp));

          let capturedInput: Partial<IApplications> | null = null;
          applicationService.updateApplication.and.callFake((input) => {
            capturedInput = input;
            return of({ ...pendingApp, ...input });
          });

          paramMapSubject.next(convertToParamMap({ id: 'app-pending' }));
          fixture = TestBed.createComponent(ApplicationDetailPageComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
          tick();

          // Set valid form data
          component.editForm.name = validName;
          component.editForm.organizationId = 'org-456';

          // Save
          component.onSave();
          tick();

          // Verify status transition
          expect(capturedInput).not.toBeNull();
          expect(capturedInput!.status).toBe(ApplicationStatus.Active);
          return true;
        }),
        { numRuns: 100 }
      );
    }));
  });

  /**
   * Property 7: Draft Deletion on Cancel
   *
   * For any application with PENDING status, canceling the edit SHALL result
   * in the application being deleted from the system.
   *
   * Validates: Requirements 3.7
   */
  describe('Property 7: Draft Deletion on Cancel', () => {
    it('should delete draft on cancel for any pending application', fakeAsync(() => {
      fc.assert(
        fc.property(fc.uuid(), (appId) => {
          const pendingApp: IApplications = {
            applicationId: appId,
            name: 'Draft App',
            organizationId: 'org-456',
            ownerId: 'user-123',
            status: ApplicationStatus.Pending,
            apiKey: 'api-key',
            apiKeyNext: '',
            environments: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          organizationService.getUserOrganizations.and.returnValue(
            of({ items: [mockOrganization], nextToken: null })
          );
          applicationService.getApplication.and.returnValue(of(pendingApp));
          applicationService.deleteApplication.and.returnValue(of(pendingApp));

          paramMapSubject.next(convertToParamMap({ id: appId }));
          fixture = TestBed.createComponent(ApplicationDetailPageComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
          tick();

          // Cancel
          component.onCancel();
          tick();

          // Verify deletion was called with correct ID
          expect(applicationService.deleteApplication).toHaveBeenCalledWith(appId);
          return true;
        }),
        { numRuns: 100 }
      );
    }));

    it('should NOT delete active application on cancel', fakeAsync(() => {
      fc.assert(
        fc.property(fc.uuid(), (appId) => {
          const activeApp: IApplications = {
            applicationId: appId,
            name: 'Active App',
            organizationId: 'org-456',
            ownerId: 'user-123',
            status: ApplicationStatus.Active,
            apiKey: 'api-key',
            apiKeyNext: '',
            environments: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          organizationService.getUserOrganizations.and.returnValue(
            of({ items: [mockOrganization], nextToken: null })
          );
          applicationService.getApplication.and.returnValue(of(activeApp));
          applicationService.deleteApplication.calls.reset();

          paramMapSubject.next(convertToParamMap({ id: appId }));
          fixture = TestBed.createComponent(ApplicationDetailPageComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
          tick();

          // Cancel
          component.onCancel();

          // Verify deletion was NOT called
          expect(applicationService.deleteApplication).not.toHaveBeenCalled();
          return true;
        }),
        { numRuns: 100 }
      );
    }));
  });

  /**
   * Property 8: Validation Rejects Invalid Input
   *
   * For any application form submission with an empty name or missing organizationId,
   * the validation SHALL fail and the application SHALL NOT be saved.
   *
   * Validates: Requirements 3.8, 4.1
   */
  describe('Property 8: Validation Rejects Invalid Input', () => {
    beforeEach(fakeAsync(() => {
      const app: IApplications = {
        applicationId: 'app-789',
        name: 'Test App',
        organizationId: 'org-456',
        ownerId: 'user-123',
        status: ApplicationStatus.Active,
        apiKey: 'api-key',
        apiKeyNext: '',
        environments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      organizationService.getUserOrganizations.and.returnValue(
        of({ items: [mockOrganization], nextToken: null })
      );
      applicationService.getApplication.and.returnValue(of(app));

      fixture = TestBed.createComponent(ApplicationDetailPageComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      tick();
    }));

    it('should reject empty or too-short names', () => {
      fc.assert(
        fc.property(invalidNameArbitrary, (invalidName) => {
          applicationService.updateApplication.calls.reset();

          component.editForm.name = invalidName;
          component.editForm.organizationId = 'org-456';

          component.onSave();

          // Validation should fail
          expect(component.validationErrors.name).not.toBe('');
          expect(applicationService.updateApplication).not.toHaveBeenCalled();
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should reject missing organization', () => {
      fc.assert(
        fc.property(validNameArbitrary, (validName) => {
          applicationService.updateApplication.calls.reset();

          component.editForm.name = validName;
          component.editForm.organizationId = '';

          component.onSave();

          // Validation should fail
          expect(component.validationErrors.organizationId).toBe('Please select an organization');
          expect(applicationService.updateApplication).not.toHaveBeenCalled();
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should reject descriptions over 500 characters', () => {
      fc.assert(
        fc.property(invalidDescriptionArbitrary, (longDescription) => {
          applicationService.updateApplication.calls.reset();

          component.editForm.name = 'Valid Name';
          component.editForm.organizationId = 'org-456';
          component.editForm.description = longDescription;

          component.onSave();

          // Validation should fail
          expect(component.validationErrors.description).toBe('Description cannot exceed 500 characters');
          expect(applicationService.updateApplication).not.toHaveBeenCalled();
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should accept valid input combinations', () => {
      fc.assert(
        fc.property(validNameArbitrary, validDescriptionArbitrary, (validName, validDesc) => {
          applicationService.updateApplication.calls.reset();
          applicationService.updateApplication.and.returnValue(of({
            applicationId: 'app-789',
            name: validName,
            organizationId: 'org-456',
            ownerId: 'user-123',
            status: ApplicationStatus.Active,
            apiKey: 'api-key',
            apiKeyNext: '',
            environments: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          component.editForm.name = validName;
          component.editForm.organizationId = 'org-456';
          component.editForm.description = validDesc;

          component.onSave();

          // Validation should pass
          expect(component.validationErrors.name).toBe('');
          expect(component.validationErrors.organizationId).toBe('');
          expect(component.validationErrors.description).toBe('');
          expect(applicationService.updateApplication).toHaveBeenCalled();
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});
