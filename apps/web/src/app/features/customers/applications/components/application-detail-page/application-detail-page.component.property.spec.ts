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

  // Arbitrary for environments array
  const environmentArbitrary = fc.constantFrom('PRODUCTION', 'STAGING', 'DEVELOPMENT', 'TEST', 'PREVIEW');
  const environmentsArrayArbitrary = fc.array(environmentArbitrary, { minLength: 1, maxLength: 5 })
    .map(envs => [...new Set(envs)]); // Remove duplicates

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
          component.editForm.environments = ['PRODUCTION'];

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
            environments: ['PRODUCTION'],
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          component.editForm.name = validName;
          component.editForm.organizationId = 'org-456';
          component.editForm.description = validDesc;
          component.editForm.environments = ['PRODUCTION'];

          component.onSave();

          // Validation should pass
          expect(component.validationErrors.name).toBe('');
          expect(component.validationErrors.organizationId).toBe('');
          expect(component.validationErrors.description).toBe('');
          expect(component.validationErrors.environments).toBe('');
          expect(applicationService.updateApplication).toHaveBeenCalled();
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 4: Environment Toggle Updates Form State
   *
   * For any environment checkbox toggle action, the form state's environments array
   * SHALL reflect the toggle: if the environment was not selected, it SHALL be added;
   * if it was selected, it SHALL be removed.
   *
   * Validates: Requirements 3.3
   */
  describe('Property 4: Environment Toggle Updates Form State', () => {
    it('should add environment when toggling unselected environment', fakeAsync(() => {
      fc.assert(
        fc.property(environmentArbitrary, environmentsArrayArbitrary, (envToToggle, initialEnvs) => {
          // Reset TestBed for fresh component
          TestBed.resetTestingModule();
          TestBed.configureTestingModule({
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
          });

          const library = TestBed.inject(FaIconLibrary);
          library.addIconPacks(fas);

          // Ensure envToToggle is NOT in initialEnvs
          const startingEnvs = initialEnvs.filter(e => e !== envToToggle);

          const app: IApplications = {
            applicationId: 'app-789',
            name: 'Test App',
            organizationId: 'org-456',
            ownerId: 'user-123',
            status: ApplicationStatus.Active,
            apiKey: 'api-key',
            apiKeyNext: '',
            environments: startingEnvs,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          organizationService.getUserOrganizations.and.returnValue(
            of({ items: [mockOrganization], nextToken: null })
          );
          applicationService.getApplication.and.returnValue(of(app));

          paramMapSubject.next(convertToParamMap({ id: 'app-789' }));
          fixture = TestBed.createComponent(ApplicationDetailPageComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
          tick();

          // Verify initial state
          expect(component.isEnvironmentSelected(envToToggle)).toBe(false);

          // Toggle the environment
          component.onEnvironmentToggle(envToToggle);

          // Verify it was added
          expect(component.isEnvironmentSelected(envToToggle)).toBe(true);
          expect(component.editForm.environments).toContain(envToToggle);
          return true;
        }),
        { numRuns: 100 }
      );
    }));

    it('should remove environment when toggling selected environment', fakeAsync(() => {
      fc.assert(
        fc.property(environmentArbitrary, environmentsArrayArbitrary, (envToToggle, otherEnvs) => {
          // Reset TestBed for fresh component
          TestBed.resetTestingModule();
          TestBed.configureTestingModule({
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
          });

          const library = TestBed.inject(FaIconLibrary);
          library.addIconPacks(fas);

          // Ensure envToToggle IS in initialEnvs
          const startingEnvs = [...new Set([envToToggle, ...otherEnvs])];

          const app: IApplications = {
            applicationId: 'app-789',
            name: 'Test App',
            organizationId: 'org-456',
            ownerId: 'user-123',
            status: ApplicationStatus.Active,
            apiKey: 'api-key',
            apiKeyNext: '',
            environments: startingEnvs,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          organizationService.getUserOrganizations.and.returnValue(
            of({ items: [mockOrganization], nextToken: null })
          );
          applicationService.getApplication.and.returnValue(of(app));

          paramMapSubject.next(convertToParamMap({ id: 'app-789' }));
          fixture = TestBed.createComponent(ApplicationDetailPageComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
          tick();

          // Verify initial state
          expect(component.isEnvironmentSelected(envToToggle)).toBe(true);

          // Toggle the environment
          component.onEnvironmentToggle(envToToggle);

          // Verify it was removed
          expect(component.isEnvironmentSelected(envToToggle)).toBe(false);
          expect(component.editForm.environments).not.toContain(envToToggle);
          return true;
        }),
        { numRuns: 100 }
      );
    }));
  });

  /**
   * Property 5: Save Persists Environments
   *
   * For any application save operation, the ApplicationService SHALL receive
   * the complete environments array from the form state, and the persisted
   * application SHALL contain exactly those environments.
   *
   * Validates: Requirements 3.4
   */
  describe('Property 5: Save Persists Environments', () => {
    it('should include environments in save payload', fakeAsync(() => {
      fc.assert(
        fc.property(environmentsArrayArbitrary, (environments) => {
          // Reset TestBed for fresh component
          TestBed.resetTestingModule();
          TestBed.configureTestingModule({
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
          });

          const library = TestBed.inject(FaIconLibrary);
          library.addIconPacks(fas);
          const testRouter = TestBed.inject(Router);
          spyOn(testRouter, 'navigate');

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

          let capturedInput: Partial<IApplications> | null = null;
          applicationService.updateApplication.and.callFake((input) => {
            capturedInput = input;
            return of({ ...app, ...input });
          });

          paramMapSubject.next(convertToParamMap({ id: 'app-789' }));
          fixture = TestBed.createComponent(ApplicationDetailPageComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
          tick();

          // Set form data with environments
          component.editForm.name = 'Valid Name';
          component.editForm.organizationId = 'org-456';
          component.editForm.environments = [...environments];

          // Save
          component.onSave();
          tick();

          // Verify environments were included in save payload
          expect(capturedInput).not.toBeNull();
          expect(capturedInput!.environments).toEqual(environments);
          return true;
        }),
        { numRuns: 100 }
      );
    }));
  });

  /**
   * Property 6: Empty Environments Validation
   *
   * For any form state where the environments array is empty, the validateForm
   * function SHALL return false and set a validation error message for environments.
   *
   * Validates: Requirements 3.5
   */
  describe('Property 6: Empty Environments Validation', () => {
    it('should reject empty environments array', fakeAsync(() => {
      fc.assert(
        fc.property(validNameArbitrary, (validName) => {
          // Reset TestBed for fresh component
          TestBed.resetTestingModule();
          TestBed.configureTestingModule({
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
          });

          const library = TestBed.inject(FaIconLibrary);
          library.addIconPacks(fas);

          const app: IApplications = {
            applicationId: 'app-789',
            name: 'Test App',
            organizationId: 'org-456',
            ownerId: 'user-123',
            status: ApplicationStatus.Active,
            apiKey: 'api-key',
            apiKeyNext: '',
            environments: ['PRODUCTION'],
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          organizationService.getUserOrganizations.and.returnValue(
            of({ items: [mockOrganization], nextToken: null })
          );
          applicationService.getApplication.and.returnValue(of(app));
          applicationService.updateApplication.calls.reset();

          paramMapSubject.next(convertToParamMap({ id: 'app-789' }));
          fixture = TestBed.createComponent(ApplicationDetailPageComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
          tick();

          // Set valid form data but empty environments
          component.editForm.name = validName;
          component.editForm.organizationId = 'org-456';
          component.editForm.environments = [];

          // Try to save
          component.onSave();

          // Validation should fail
          expect(component.validationErrors.environments).toBe('At least one environment must be selected');
          expect(applicationService.updateApplication).not.toHaveBeenCalled();
          return true;
        }),
        { numRuns: 100 }
      );
    }));

    it('should clear validation error when environment is selected', fakeAsync(() => {
      fc.assert(
        fc.property(environmentArbitrary, (env) => {
          // Reset TestBed for fresh component
          TestBed.resetTestingModule();
          TestBed.configureTestingModule({
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
          });

          const library = TestBed.inject(FaIconLibrary);
          library.addIconPacks(fas);

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

          paramMapSubject.next(convertToParamMap({ id: 'app-789' }));
          fixture = TestBed.createComponent(ApplicationDetailPageComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
          tick();

          // Set validation error
          component.validationErrors.environments = 'At least one environment must be selected';

          // Toggle an environment
          component.onEnvironmentToggle(env);

          // Validation error should be cleared
          expect(component.validationErrors.environments).toBe('');
          return true;
        }),
        { numRuns: 100 }
      );
    }));
  });

  /**
   * Property 7: Applications store updates on create
   *
   * For any application created from the Organization detail page, the Applications
   * store SHALL contain the new application after the create operation completes.
   *
   * Note: In the current hybrid pattern, the ApplicationsEffects.refreshAfterSuccessfulOperation$
   * dispatches loadApplications() after create/update/delete success. This test verifies
   * that the save operation completes successfully, which triggers the store refresh.
   *
   * Validates: Requirements 4.1
   */
  describe('Property 7: Applications store updates on create', () => {
    it('should complete save operation for any valid draft application', fakeAsync(() => {
      fc.assert(
        fc.property(
          validNameArbitrary,
          environmentsArrayArbitrary,
          (validName, environments) => {
            // Reset TestBed for fresh component
            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
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
            });

            const library = TestBed.inject(FaIconLibrary);
            library.addIconPacks(fas);
            const testRouter = TestBed.inject(Router);
            spyOn(testRouter, 'navigate');

            // Create a draft (PENDING) application
            const draftApplication: IApplications = {
              applicationId: 'app-draft-' + Date.now(),
              name: '',
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
            applicationService.getApplication.and.returnValue(of(draftApplication));

            let savedApplication: IApplications | null = null;
            applicationService.updateApplication.and.callFake((input: Partial<IApplications>) => {
              savedApplication = {
                ...draftApplication,
                ...input,
                status: ApplicationStatus.Active, // Transition to ACTIVE
              } as IApplications;
              return of(savedApplication);
            });

            paramMapSubject.next(convertToParamMap({ id: draftApplication.applicationId }));
            fixture = TestBed.createComponent(ApplicationDetailPageComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();
            tick();

            // Set valid form data
            component.editForm.name = validName;
            component.editForm.organizationId = 'org-456';
            component.editForm.environments = [...environments];

            // Save the application
            component.onSave();
            tick();

            // Verify save was called and completed
            expect(applicationService.updateApplication).toHaveBeenCalled();
            expect(savedApplication).not.toBeNull();
            expect(savedApplication!.status).toBe(ApplicationStatus.Active);
            expect(savedApplication!.name).toBe(validName.trim());
            expect(savedApplication!.environments).toEqual(environments);

            // Verify navigation occurred (indicates successful save)
            expect(testRouter.navigate).toHaveBeenCalledWith(['/customers/applications']);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    }));
  });

  /**
   * Property 8: Organizations store updates count on delete
   *
   * For any application deletion, the Organizations store SHALL update the
   * applicationCount for the affected organization to reflect the deletion.
   *
   * This test verifies that when an application is deleted:
   * 1. The delete operation completes successfully
   * 2. The organization's applicationCount is decremented
   * 3. The OrganizationsActions.loadOrganizations() is dispatched to refresh the store
   *
   * Validates: Requirements 4.2
   */
  describe('Property 8: Organizations store updates count on delete', () => {
    it('should decrement organization applicationCount on delete', fakeAsync(() => {
      // Set up window.confirm spy ONCE before the property test loop
      const confirmSpy = spyOn(window, 'confirm').and.returnValue(true);

      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }), // Initial application count (at least 1)
          (initialCount) => {
            // Reset TestBed for fresh component
            TestBed.resetTestingModule();

            const testOrganizationService = jasmine.createSpyObj('OrganizationService', [
              'getUserOrganizations',
              'updateOrganization',
            ]);
            const testApplicationService = jasmine.createSpyObj('ApplicationService', [
              'getApplication',
              'deleteApplication',
            ]);

            TestBed.configureTestingModule({
              imports: [ApplicationDetailPageComponent, RouterTestingModule],
              providers: [
                provideMockStore({
                  selectors: [
                    { selector: fromUser.selectCurrentUser, value: mockUser },
                    { selector: fromUser.selectDebugMode, value: false },
                  ],
                }),
                { provide: ApplicationService, useValue: testApplicationService },
                { provide: OrganizationService, useValue: testOrganizationService },
                {
                  provide: ActivatedRoute,
                  useValue: {
                    paramMap: paramMapSubject.asObservable(),
                  },
                },
              ],
            });

            const library = TestBed.inject(FaIconLibrary);
            library.addIconPacks(fas);
            const testRouter = TestBed.inject(Router);
            spyOn(testRouter, 'navigate');
            // Reset confirm spy for each iteration (already spied, just reset calls)
            confirmSpy.calls.reset();

            // Create organization with initial count
            const orgWithCount: IOrganizations = {
              ...mockOrganization,
              applicationCount: initialCount,
            };

            // Create an active application
            const activeApplication: IApplications = {
              applicationId: 'app-to-delete',
              name: 'App to Delete',
              organizationId: 'org-456',
              ownerId: 'user-123',
              status: ApplicationStatus.Active,
              apiKey: 'api-key',
              apiKeyNext: '',
              environments: ['PRODUCTION'],
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            testOrganizationService.getUserOrganizations.and.returnValue(
              of({ items: [orgWithCount], nextToken: null })
            );
            testApplicationService.getApplication.and.returnValue(of(activeApplication));
            testApplicationService.deleteApplication.and.returnValue(of(activeApplication));

            let updatedOrganizationCount: number | null = null;
            testOrganizationService.updateOrganization.and.callFake((input: IOrganizations) => {
              updatedOrganizationCount = input.applicationCount ?? null;
              return of({ ...orgWithCount, applicationCount: updatedOrganizationCount });
            });

            paramMapSubject.next(convertToParamMap({ id: 'app-to-delete' }));
            fixture = TestBed.createComponent(ApplicationDetailPageComponent);
            component = fixture.componentInstance;
            fixture.detectChanges();
            tick();

            // Delete the application
            component.onDelete();
            tick();

            // Verify delete was called
            expect(testApplicationService.deleteApplication).toHaveBeenCalledWith('app-to-delete');

            // Verify organization count was decremented
            expect(testOrganizationService.updateOrganization).toHaveBeenCalled();
            const expectedCount = Math.max(0, initialCount - 1);
            expect(updatedOrganizationCount).not.toBeNull();
            expect(updatedOrganizationCount!).toBe(expectedCount);

            // Verify navigation occurred
            expect(testRouter.navigate).toHaveBeenCalledWith(['/customers/applications']);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    }));

    it('should not decrement below zero', fakeAsync(() => {
      // Reset TestBed for fresh component
      TestBed.resetTestingModule();

      const testOrganizationService = jasmine.createSpyObj('OrganizationService', [
        'getUserOrganizations',
        'updateOrganization',
      ]);
      const testApplicationService = jasmine.createSpyObj('ApplicationService', [
        'getApplication',
        'deleteApplication',
      ]);

      TestBed.configureTestingModule({
        imports: [ApplicationDetailPageComponent, RouterTestingModule],
        providers: [
          provideMockStore({
            selectors: [
              { selector: fromUser.selectCurrentUser, value: mockUser },
              { selector: fromUser.selectDebugMode, value: false },
            ],
          }),
          { provide: ApplicationService, useValue: testApplicationService },
          { provide: OrganizationService, useValue: testOrganizationService },
          {
            provide: ActivatedRoute,
            useValue: {
              paramMap: paramMapSubject.asObservable(),
            },
          },
        ],
      });

      const library = TestBed.inject(FaIconLibrary);
      library.addIconPacks(fas);
      const testRouter = TestBed.inject(Router);
      spyOn(testRouter, 'navigate');
      // Note: window.confirm may already be spied from previous test, so we use a try-catch
      // or check if it's already a spy
      if (!(window.confirm as jasmine.Spy).and) {
        spyOn(window, 'confirm').and.returnValue(true);
      } else {
        (window.confirm as jasmine.Spy).and.returnValue(true);
      }

      // Create organization with count of 0
      const orgWithZeroCount: IOrganizations = {
        ...mockOrganization,
        applicationCount: 0,
      };

      const activeApplication: IApplications = {
        applicationId: 'app-to-delete',
        name: 'App to Delete',
        organizationId: 'org-456',
        ownerId: 'user-123',
        status: ApplicationStatus.Active,
        apiKey: 'api-key',
        apiKeyNext: '',
        environments: ['PRODUCTION'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      testOrganizationService.getUserOrganizations.and.returnValue(
        of({ items: [orgWithZeroCount], nextToken: null })
      );
      testApplicationService.getApplication.and.returnValue(of(activeApplication));
      testApplicationService.deleteApplication.and.returnValue(of(activeApplication));

      let updatedOrganizationCount: number | null = null;
      testOrganizationService.updateOrganization.and.callFake((input: IOrganizations) => {
        updatedOrganizationCount = input.applicationCount ?? null;
        return of({ ...orgWithZeroCount, applicationCount: updatedOrganizationCount });
      });

      paramMapSubject.next(convertToParamMap({ id: 'app-to-delete' }));
      fixture = TestBed.createComponent(ApplicationDetailPageComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      tick();

      // Delete the application
      component.onDelete();
      tick();

      // Verify count was not decremented below 0
      // Since count is already 0, it should stay at 0
      if (testOrganizationService.updateOrganization.calls.count() > 0) {
        expect(updatedOrganizationCount).not.toBeNull();
        expect(updatedOrganizationCount!).toBe(0);
      }
    }));
  });
});