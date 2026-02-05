/**
 * ApplicationDetailPageComponent Property-Based Tests
 *
 * Property tests for application detail page using NgRx store-first pattern.
 *
 * @see .kiro/specs/store-centric-refactoring/design.md
 * @see .kiro/specs/application-security-tab/design.md
 * _Requirements: 3.1-3.5, 7.2_
 */

import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { BehaviorSubject, ReplaySubject } from 'rxjs';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { Action } from '@ngrx/store';
import * as fc from 'fast-check';

import { ApplicationDetailPageComponent, ApplicationDetailTab } from './application-detail-page.component';
import { IApplications } from '../../../../../core/models/ApplicationsModel';
import { IOrganizations } from '../../../../../core/models/OrganizationsModel';
import { IApplicationApiKeys } from '../../../../../core/models/ApplicationApiKeysModel';
import { ApplicationStatus } from '../../../../../core/enums/ApplicationStatusEnum';
import { OrganizationStatus } from '../../../../../core/enums/OrganizationStatusEnum';
import { ApplicationApiKeyStatus } from '../../../../../core/enums/ApplicationApiKeyStatusEnum';
import { ApplicationApiKeyType } from '../../../../../core/enums/ApplicationApiKeyTypeEnum';
import { Environment } from '../../../../../core/enums/EnvironmentEnum';
import * as fromApplications from '../../store/applications.selectors';
import * as fromOrganizations from '../../../organizations/store/organizations.selectors';
import * as fromUser from '../../../../user/store/user.selectors';
import * as fromEnvironments from '../../store/environments/environments.selectors';

describe('ApplicationDetailPageComponent Property Tests', () => {
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

  /**
   * Property 1: Environment Toggle Updates Form State
   */
  describe('Property 1: Environment Toggle Updates Form State', () => {
    it('should add environment when toggling unselected environment', fakeAsync(() => {
      fc.assert(
        fc.property(environmentArbitrary, environmentsArrayArbitrary, (envToToggle, initialEnvs) => {
          const actions$ = new ReplaySubject<Action>(1);
          const paramMapSubject = new BehaviorSubject(convertToParamMap({ id: 'app-789' }));

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

          TestBed.resetTestingModule();
          TestBed.configureTestingModule({
            imports: [ApplicationDetailPageComponent, RouterTestingModule],
            providers: [
              provideMockStore({
                selectors: [
                  { selector: fromApplications.selectSelectedApplication, value: app },
                  { selector: fromApplications.selectIsLoading, value: false },
                  { selector: fromApplications.selectIsSaving, value: false },
                  { selector: fromApplications.selectError, value: null },
                  { selector: fromApplications.selectSaveError, value: null },
                  { selector: fromOrganizations.selectOrganizations, value: [mockOrganization] },
                  { selector: fromUser.selectCurrentUser, value: mockUser },
                  { selector: fromUser.selectDebugMode, value: false },
                ],
              }),
              provideMockActions(() => actions$),
              {
                provide: ActivatedRoute,
                useValue: { paramMap: paramMapSubject.asObservable() },
              },
            ],
          });

          const library = TestBed.inject(FaIconLibrary);
          library.addIconPacks(fas);

          const fixture = TestBed.createComponent(ApplicationDetailPageComponent);
          const component = fixture.componentInstance;
          fixture.detectChanges();
          tick();

          // Verify initial state
          expect(component.isEnvironmentSelected(envToToggle)).toBe(false);

          // Toggle the environment
          component.onEnvironmentToggle(envToToggle);

          // Verify it was added
          expect(component.isEnvironmentSelected(envToToggle)).toBe(true);
          expect(component.editForm.environments).toContain(envToToggle);

          fixture.destroy();
          TestBed.inject(MockStore).resetSelectors();
          return true;
        }),
        { numRuns: 50 }
      );
    }));

    it('should remove environment when toggling selected environment', fakeAsync(() => {
      fc.assert(
        fc.property(environmentArbitrary, environmentsArrayArbitrary, (envToToggle, otherEnvs) => {
          const actions$ = new ReplaySubject<Action>(1);
          const paramMapSubject = new BehaviorSubject(convertToParamMap({ id: 'app-789' }));

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

          TestBed.resetTestingModule();
          TestBed.configureTestingModule({
            imports: [ApplicationDetailPageComponent, RouterTestingModule],
            providers: [
              provideMockStore({
                selectors: [
                  { selector: fromApplications.selectSelectedApplication, value: app },
                  { selector: fromApplications.selectIsLoading, value: false },
                  { selector: fromApplications.selectIsSaving, value: false },
                  { selector: fromApplications.selectError, value: null },
                  { selector: fromApplications.selectSaveError, value: null },
                  { selector: fromOrganizations.selectOrganizations, value: [mockOrganization] },
                  { selector: fromUser.selectCurrentUser, value: mockUser },
                  { selector: fromUser.selectDebugMode, value: false },
                ],
              }),
              provideMockActions(() => actions$),
              {
                provide: ActivatedRoute,
                useValue: { paramMap: paramMapSubject.asObservable() },
              },
            ],
          });

          const library = TestBed.inject(FaIconLibrary);
          library.addIconPacks(fas);

          const fixture = TestBed.createComponent(ApplicationDetailPageComponent);
          const component = fixture.componentInstance;
          fixture.detectChanges();
          tick();

          // Verify initial state
          expect(component.isEnvironmentSelected(envToToggle)).toBe(true);

          // Toggle the environment
          component.onEnvironmentToggle(envToToggle);

          // Verify it was removed
          expect(component.isEnvironmentSelected(envToToggle)).toBe(false);
          expect(component.editForm.environments).not.toContain(envToToggle);

          fixture.destroy();
          TestBed.inject(MockStore).resetSelectors();
          return true;
        }),
        { numRuns: 50 }
      );
    }));
  });

  /**
   * Property 2: Validation Rejects Invalid Input
   */
  describe('Property 2: Validation Rejects Invalid Input', () => {
    it('should reject empty or too-short names', fakeAsync(() => {
      fc.assert(
        fc.property(invalidNameArbitrary, (invalidName) => {
          const actions$ = new ReplaySubject<Action>(1);
          const paramMapSubject = new BehaviorSubject(convertToParamMap({ id: 'app-789' }));

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

          TestBed.resetTestingModule();
          TestBed.configureTestingModule({
            imports: [ApplicationDetailPageComponent, RouterTestingModule],
            providers: [
              provideMockStore({
                selectors: [
                  { selector: fromApplications.selectSelectedApplication, value: app },
                  { selector: fromApplications.selectIsLoading, value: false },
                  { selector: fromApplications.selectIsSaving, value: false },
                  { selector: fromApplications.selectError, value: null },
                  { selector: fromApplications.selectSaveError, value: null },
                  { selector: fromOrganizations.selectOrganizations, value: [mockOrganization] },
                  { selector: fromUser.selectCurrentUser, value: mockUser },
                  { selector: fromUser.selectDebugMode, value: false },
                ],
              }),
              provideMockActions(() => actions$),
              {
                provide: ActivatedRoute,
                useValue: { paramMap: paramMapSubject.asObservable() },
              },
            ],
          });

          const library = TestBed.inject(FaIconLibrary);
          library.addIconPacks(fas);
          const store = TestBed.inject(MockStore);
          spyOn(store, 'dispatch');

          const fixture = TestBed.createComponent(ApplicationDetailPageComponent);
          const component = fixture.componentInstance;
          fixture.detectChanges();
          tick();

          component.editForm.name = invalidName;
          component.editForm.organizationId = 'org-456';
          component.editForm.environments = ['PRODUCTION'];

          component.onSave();

          // Validation should fail
          expect(component.validationErrors.name).not.toBe('');

          fixture.destroy();
          store.resetSelectors();
          return true;
        }),
        { numRuns: 50 }
      );
    }));

    it('should reject descriptions over 500 characters', fakeAsync(() => {
      fc.assert(
        fc.property(invalidDescriptionArbitrary, (longDescription) => {
          const actions$ = new ReplaySubject<Action>(1);
          const paramMapSubject = new BehaviorSubject(convertToParamMap({ id: 'app-789' }));

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

          TestBed.resetTestingModule();
          TestBed.configureTestingModule({
            imports: [ApplicationDetailPageComponent, RouterTestingModule],
            providers: [
              provideMockStore({
                selectors: [
                  { selector: fromApplications.selectSelectedApplication, value: app },
                  { selector: fromApplications.selectIsLoading, value: false },
                  { selector: fromApplications.selectIsSaving, value: false },
                  { selector: fromApplications.selectError, value: null },
                  { selector: fromApplications.selectSaveError, value: null },
                  { selector: fromOrganizations.selectOrganizations, value: [mockOrganization] },
                  { selector: fromUser.selectCurrentUser, value: mockUser },
                  { selector: fromUser.selectDebugMode, value: false },
                ],
              }),
              provideMockActions(() => actions$),
              {
                provide: ActivatedRoute,
                useValue: { paramMap: paramMapSubject.asObservable() },
              },
            ],
          });

          const library = TestBed.inject(FaIconLibrary);
          library.addIconPacks(fas);
          const store = TestBed.inject(MockStore);
          spyOn(store, 'dispatch');

          const fixture = TestBed.createComponent(ApplicationDetailPageComponent);
          const component = fixture.componentInstance;
          fixture.detectChanges();
          tick();

          component.editForm.name = 'Valid Name';
          component.editForm.organizationId = 'org-456';
          component.editForm.description = longDescription;
          component.editForm.environments = ['PRODUCTION'];

          component.onSave();

          // Validation should fail
          expect(component.validationErrors.description).toBe('Description cannot exceed 500 characters');

          fixture.destroy();
          store.resetSelectors();
          return true;
        }),
        { numRuns: 50 }
      );
    }));

    it('should reject empty environments array', fakeAsync(() => {
      fc.assert(
        fc.property(validNameArbitrary, (validName) => {
          const actions$ = new ReplaySubject<Action>(1);
          const paramMapSubject = new BehaviorSubject(convertToParamMap({ id: 'app-789' }));

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

          TestBed.resetTestingModule();
          TestBed.configureTestingModule({
            imports: [ApplicationDetailPageComponent, RouterTestingModule],
            providers: [
              provideMockStore({
                selectors: [
                  { selector: fromApplications.selectSelectedApplication, value: app },
                  { selector: fromApplications.selectIsLoading, value: false },
                  { selector: fromApplications.selectIsSaving, value: false },
                  { selector: fromApplications.selectError, value: null },
                  { selector: fromApplications.selectSaveError, value: null },
                  { selector: fromOrganizations.selectOrganizations, value: [mockOrganization] },
                  { selector: fromUser.selectCurrentUser, value: mockUser },
                  { selector: fromUser.selectDebugMode, value: false },
                ],
              }),
              provideMockActions(() => actions$),
              {
                provide: ActivatedRoute,
                useValue: { paramMap: paramMapSubject.asObservable() },
              },
            ],
          });

          const library = TestBed.inject(FaIconLibrary);
          library.addIconPacks(fas);
          const store = TestBed.inject(MockStore);
          spyOn(store, 'dispatch');

          const fixture = TestBed.createComponent(ApplicationDetailPageComponent);
          const component = fixture.componentInstance;
          fixture.detectChanges();
          tick();

          component.editForm.name = validName;
          component.editForm.organizationId = 'org-456';
          component.editForm.environments = [];

          component.onSave();

          // Validation should fail
          expect(component.validationErrors.environments).toBe('At least one environment must be selected');

          fixture.destroy();
          store.resetSelectors();
          return true;
        }),
        { numRuns: 50 }
      );
    }));
  });

  /**
   * Property 3: Valid Input Dispatches Action
   */
  describe('Property 3: Valid Input Dispatches Action', () => {
    it('should dispatch updateApplication for valid input', fakeAsync(() => {
      fc.assert(
        fc.property(validNameArbitrary, validDescriptionArbitrary, environmentsArrayArbitrary, (validName, validDesc, environments) => {
          const actions$ = new ReplaySubject<Action>(1);
          const paramMapSubject = new BehaviorSubject(convertToParamMap({ id: 'app-789' }));

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

          TestBed.resetTestingModule();
          TestBed.configureTestingModule({
            imports: [ApplicationDetailPageComponent, RouterTestingModule],
            providers: [
              provideMockStore({
                selectors: [
                  { selector: fromApplications.selectSelectedApplication, value: app },
                  { selector: fromApplications.selectIsLoading, value: false },
                  { selector: fromApplications.selectIsSaving, value: false },
                  { selector: fromApplications.selectError, value: null },
                  { selector: fromApplications.selectSaveError, value: null },
                  { selector: fromOrganizations.selectOrganizations, value: [mockOrganization] },
                  { selector: fromUser.selectCurrentUser, value: mockUser },
                  { selector: fromUser.selectDebugMode, value: false },
                ],
              }),
              provideMockActions(() => actions$),
              {
                provide: ActivatedRoute,
                useValue: { paramMap: paramMapSubject.asObservable() },
              },
            ],
          });

          const library = TestBed.inject(FaIconLibrary);
          library.addIconPacks(fas);
          const store = TestBed.inject(MockStore);
          spyOn(store, 'dispatch');

          const fixture = TestBed.createComponent(ApplicationDetailPageComponent);
          const component = fixture.componentInstance;
          fixture.detectChanges();
          tick();

          component.editForm.name = validName;
          component.editForm.organizationId = 'org-456';
          component.editForm.description = validDesc;
          component.editForm.environments = environments;

          component.onSave();

          // Validation should pass and dispatch should be called
          expect(component.validationErrors.name).toBe('');
          expect(component.validationErrors.organizationId).toBe('');
          expect(component.validationErrors.description).toBe('');
          expect(component.validationErrors.environments).toBe('');
          expect(store.dispatch).toHaveBeenCalledWith(
            jasmine.objectContaining({ type: '[Applications] Update Application' })
          );

          fixture.destroy();
          store.resetSelectors();
          return true;
        }),
        { numRuns: 50 }
      );
    }));
  });

  /**
   * Security Tab Property Tests
   *
   * Property-based tests for the Security tab functionality.
   * @see .kiro/specs/application-security-tab/design.md
   */

  // Helper to create mock API key
  const createMockApiKey = (
    environment: string,
    status: ApplicationApiKeyStatus = ApplicationApiKeyStatus.Active
  ): IApplicationApiKeys => ({
    applicationApiKeyId: `key-${environment}-${Date.now()}`,
    applicationId: 'app-789',
    organizationId: 'org-456',
    environment: environment as Environment,
    keyPrefix: `pk_${environment.toLowerCase().substring(0, 2)}_abc`,
    keyType: ApplicationApiKeyType.Publishable,
    keyHash: 'mock-hash-value',
    status,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Arbitrary for API key status
  const apiKeyStatusArbitrary = fc.constantFrom(
    ApplicationApiKeyStatus.Active,
    ApplicationApiKeyStatus.Rotating,
    ApplicationApiKeyStatus.Revoked,
    ApplicationApiKeyStatus.Expired
  );

  /**
   * Feature: application-security-tab, Property 1: Environment Row Count Matches Selected Environments
   * Validates: Requirements 2.2
   *
   * For any application with N selected environments, the Security tab SHALL display exactly N environment key rows.
   */
  describe('Security Tab Property 1: Environment Row Count Matches Selected Environments', () => {
    it('should display exactly N environment key rows for N selected environments', fakeAsync(() => {
      fc.assert(
        fc.property(environmentsArrayArbitrary, (environments) => {
          const actions$ = new ReplaySubject<Action>(1);
          const paramMapSubject = new BehaviorSubject(convertToParamMap({ id: 'app-789' }));

          const app: IApplications = {
            applicationId: 'app-789',
            name: 'Test App',
            organizationId: 'org-456',
            ownerId: 'user-123',
            status: ApplicationStatus.Active,
            apiKey: 'api-key',
            apiKeyNext: '',
            environments: environments,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          TestBed.resetTestingModule();
          TestBed.configureTestingModule({
            imports: [ApplicationDetailPageComponent, RouterTestingModule],
            providers: [
              provideMockStore({
                selectors: [
                  { selector: fromApplications.selectSelectedApplication, value: app },
                  { selector: fromApplications.selectIsLoading, value: false },
                  { selector: fromApplications.selectIsSaving, value: false },
                  { selector: fromApplications.selectError, value: null },
                  { selector: fromApplications.selectSaveError, value: null },
                  { selector: fromOrganizations.selectOrganizations, value: [mockOrganization] },
                  { selector: fromUser.selectCurrentUser, value: mockUser },
                  { selector: fromUser.selectDebugMode, value: false },
                  { selector: fromEnvironments.selectApiKeys, value: [] },
                  { selector: fromEnvironments.selectIsGenerating, value: false },
                  { selector: fromEnvironments.selectIsRotating, value: false },
                  { selector: fromEnvironments.selectIsRevoking, value: false },
                  { selector: fromEnvironments.selectGeneratedKey, value: null },
                ],
              }),
              provideMockActions(() => actions$),
              {
                provide: ActivatedRoute,
                useValue: { paramMap: paramMapSubject.asObservable() },
              },
            ],
          });

          const library = TestBed.inject(FaIconLibrary);
          library.addIconPacks(fas);

          const fixture = TestBed.createComponent(ApplicationDetailPageComponent);
          const component = fixture.componentInstance;
          fixture.detectChanges();
          tick();

          // Switch to Security tab
          component.setActiveTab(ApplicationDetailTab.Environments);
          fixture.detectChanges();

          // Property: row count equals environment count
          expect(component.environmentKeyRows.length).toBe(environments.length);

          // Each environment should have a corresponding row
          environments.forEach(env => {
            const row = component.environmentKeyRows.find(r => r.environment === env);
            expect(row).toBeTruthy();
          });

          fixture.destroy();
          TestBed.inject(MockStore).resetSelectors();
          return true;
        }),
        { numRuns: 100 }
      );
    }));
  });

  /**
   * Feature: application-security-tab, Property 2: Environment Row Content Correctness
   * Validates: Requirements 2.3, 2.4, 4.1, 4.2
   *
   * For any environment key row:
   * - If the environment has an active API key, the row SHALL display the key prefix, status badge, and action buttons (Rotate, Revoke)
   * - If the environment has no API key (or only revoked keys), the row SHALL display "No API key" and a "Generate Key" CTA
   */
  describe('Security Tab Property 2: Environment Row Content Correctness', () => {
    it('should show key info and action buttons when environment has active key', fakeAsync(() => {
      fc.assert(
        fc.property(environmentArbitrary, (environment) => {
          const actions$ = new ReplaySubject<Action>(1);
          const paramMapSubject = new BehaviorSubject(convertToParamMap({ id: 'app-789' }));

          const app: IApplications = {
            applicationId: 'app-789',
            name: 'Test App',
            organizationId: 'org-456',
            ownerId: 'user-123',
            status: ApplicationStatus.Active,
            apiKey: 'api-key',
            apiKeyNext: '',
            environments: [environment],
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const mockApiKey = createMockApiKey(environment, ApplicationApiKeyStatus.Active);

          TestBed.resetTestingModule();
          TestBed.configureTestingModule({
            imports: [ApplicationDetailPageComponent, RouterTestingModule],
            providers: [
              provideMockStore({
                selectors: [
                  { selector: fromApplications.selectSelectedApplication, value: app },
                  { selector: fromApplications.selectIsLoading, value: false },
                  { selector: fromApplications.selectIsSaving, value: false },
                  { selector: fromApplications.selectError, value: null },
                  { selector: fromApplications.selectSaveError, value: null },
                  { selector: fromOrganizations.selectOrganizations, value: [mockOrganization] },
                  { selector: fromUser.selectCurrentUser, value: mockUser },
                  { selector: fromUser.selectDebugMode, value: false },
                  { selector: fromEnvironments.selectApiKeys, value: [mockApiKey] },
                  { selector: fromEnvironments.selectIsGenerating, value: false },
                  { selector: fromEnvironments.selectIsRotating, value: false },
                  { selector: fromEnvironments.selectIsRevoking, value: false },
                  { selector: fromEnvironments.selectGeneratedKey, value: null },
                ],
              }),
              provideMockActions(() => actions$),
              {
                provide: ActivatedRoute,
                useValue: { paramMap: paramMapSubject.asObservable() },
              },
            ],
          });

          const library = TestBed.inject(FaIconLibrary);
          library.addIconPacks(fas);

          const fixture = TestBed.createComponent(ApplicationDetailPageComponent);
          const component = fixture.componentInstance;
          fixture.detectChanges();
          tick();

          component.setActiveTab(ApplicationDetailTab.Environments);
          fixture.detectChanges();

          const row = component.environmentKeyRows.find(r => r.environment === environment);
          expect(row).toBeTruthy();

          // Property: row with active key should have correct state
          expect(row!.hasKey).toBe(true);
          expect(row!.apiKey).toBeTruthy();
          expect(row!.apiKey!.keyPrefix).toBeTruthy();
          expect(row!.canRotate).toBe(true);
          expect(row!.canRevoke).toBe(true);
          expect(row!.canGenerate).toBe(false);

          fixture.destroy();
          TestBed.inject(MockStore).resetSelectors();
          return true;
        }),
        { numRuns: 100 }
      );
    }));

    it('should show Generate Key CTA when environment has no key', fakeAsync(() => {
      fc.assert(
        fc.property(environmentArbitrary, (environment) => {
          const actions$ = new ReplaySubject<Action>(1);
          const paramMapSubject = new BehaviorSubject(convertToParamMap({ id: 'app-789' }));

          const app: IApplications = {
            applicationId: 'app-789',
            name: 'Test App',
            organizationId: 'org-456',
            ownerId: 'user-123',
            status: ApplicationStatus.Active,
            apiKey: 'api-key',
            apiKeyNext: '',
            environments: [environment],
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          TestBed.resetTestingModule();
          TestBed.configureTestingModule({
            imports: [ApplicationDetailPageComponent, RouterTestingModule],
            providers: [
              provideMockStore({
                selectors: [
                  { selector: fromApplications.selectSelectedApplication, value: app },
                  { selector: fromApplications.selectIsLoading, value: false },
                  { selector: fromApplications.selectIsSaving, value: false },
                  { selector: fromApplications.selectError, value: null },
                  { selector: fromApplications.selectSaveError, value: null },
                  { selector: fromOrganizations.selectOrganizations, value: [mockOrganization] },
                  { selector: fromUser.selectCurrentUser, value: mockUser },
                  { selector: fromUser.selectDebugMode, value: false },
                  { selector: fromEnvironments.selectApiKeys, value: [] }, // No keys
                  { selector: fromEnvironments.selectIsGenerating, value: false },
                  { selector: fromEnvironments.selectIsRotating, value: false },
                  { selector: fromEnvironments.selectIsRevoking, value: false },
                  { selector: fromEnvironments.selectGeneratedKey, value: null },
                ],
              }),
              provideMockActions(() => actions$),
              {
                provide: ActivatedRoute,
                useValue: { paramMap: paramMapSubject.asObservable() },
              },
            ],
          });

          const library = TestBed.inject(FaIconLibrary);
          library.addIconPacks(fas);

          const fixture = TestBed.createComponent(ApplicationDetailPageComponent);
          const component = fixture.componentInstance;
          fixture.detectChanges();
          tick();

          component.setActiveTab(ApplicationDetailTab.Environments);
          fixture.detectChanges();

          const row = component.environmentKeyRows.find(r => r.environment === environment);
          expect(row).toBeTruthy();

          // Property: row without key should show Generate CTA
          expect(row!.hasKey).toBe(false);
          expect(row!.apiKey).toBeNull();
          expect(row!.canGenerate).toBe(true);
          expect(row!.canRotate).toBe(false);
          expect(row!.canRevoke).toBe(false);

          fixture.destroy();
          TestBed.inject(MockStore).resetSelectors();
          return true;
        }),
        { numRuns: 100 }
      );
    }));

    it('should show Generate Key CTA when environment only has revoked keys', fakeAsync(() => {
      fc.assert(
        fc.property(environmentArbitrary, (environment) => {
          const actions$ = new ReplaySubject<Action>(1);
          const paramMapSubject = new BehaviorSubject(convertToParamMap({ id: 'app-789' }));

          const app: IApplications = {
            applicationId: 'app-789',
            name: 'Test App',
            organizationId: 'org-456',
            ownerId: 'user-123',
            status: ApplicationStatus.Active,
            apiKey: 'api-key',
            apiKeyNext: '',
            environments: [environment],
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // Only revoked key exists
          const revokedKey = createMockApiKey(environment, ApplicationApiKeyStatus.Revoked);

          TestBed.resetTestingModule();
          TestBed.configureTestingModule({
            imports: [ApplicationDetailPageComponent, RouterTestingModule],
            providers: [
              provideMockStore({
                selectors: [
                  { selector: fromApplications.selectSelectedApplication, value: app },
                  { selector: fromApplications.selectIsLoading, value: false },
                  { selector: fromApplications.selectIsSaving, value: false },
                  { selector: fromApplications.selectError, value: null },
                  { selector: fromApplications.selectSaveError, value: null },
                  { selector: fromOrganizations.selectOrganizations, value: [mockOrganization] },
                  { selector: fromUser.selectCurrentUser, value: mockUser },
                  { selector: fromUser.selectDebugMode, value: false },
                  { selector: fromEnvironments.selectApiKeys, value: [revokedKey] },
                  { selector: fromEnvironments.selectIsGenerating, value: false },
                  { selector: fromEnvironments.selectIsRotating, value: false },
                  { selector: fromEnvironments.selectIsRevoking, value: false },
                  { selector: fromEnvironments.selectGeneratedKey, value: null },
                ],
              }),
              provideMockActions(() => actions$),
              {
                provide: ActivatedRoute,
                useValue: { paramMap: paramMapSubject.asObservable() },
              },
            ],
          });

          const library = TestBed.inject(FaIconLibrary);
          library.addIconPacks(fas);

          const fixture = TestBed.createComponent(ApplicationDetailPageComponent);
          const component = fixture.componentInstance;
          fixture.detectChanges();
          tick();

          component.setActiveTab(ApplicationDetailTab.Environments);
          fixture.detectChanges();

          const row = component.environmentKeyRows.find(r => r.environment === environment);
          expect(row).toBeTruthy();

          // Property: row with only revoked key should show Generate CTA
          expect(row!.hasKey).toBe(false);
          expect(row!.canGenerate).toBe(true);
          expect(row!.canRotate).toBe(false);
          expect(row!.canRevoke).toBe(false);

          fixture.destroy();
          TestBed.inject(MockStore).resetSelectors();
          return true;
        }),
        { numRuns: 100 }
      );
    }));
  });

  /**
   * Feature: application-security-tab, Property 3: Action Button Visibility Based on Key Status
   * Validates: Requirements 4.1, 4.2, 4.5
   *
   * For any API key with a given status:
   * - ACTIVE status → Rotate and Revoke buttons visible, Generate hidden
   * - ROTATING status → Rotate and Revoke buttons visible, Generate hidden
   * - REVOKED status → Generate button visible, Rotate and Revoke hidden
   * - No key → Generate button visible, Rotate and Revoke hidden
   */
  describe('Security Tab Property 3: Action Button Visibility Based on Key Status', () => {
    it('should show correct buttons based on API key status', fakeAsync(() => {
      fc.assert(
        fc.property(environmentArbitrary, apiKeyStatusArbitrary, (environment, status) => {
          const actions$ = new ReplaySubject<Action>(1);
          const paramMapSubject = new BehaviorSubject(convertToParamMap({ id: 'app-789' }));

          const app: IApplications = {
            applicationId: 'app-789',
            name: 'Test App',
            organizationId: 'org-456',
            ownerId: 'user-123',
            status: ApplicationStatus.Active,
            apiKey: 'api-key',
            apiKeyNext: '',
            environments: [environment],
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const mockApiKey = createMockApiKey(environment, status);

          TestBed.resetTestingModule();
          TestBed.configureTestingModule({
            imports: [ApplicationDetailPageComponent, RouterTestingModule],
            providers: [
              provideMockStore({
                selectors: [
                  { selector: fromApplications.selectSelectedApplication, value: app },
                  { selector: fromApplications.selectIsLoading, value: false },
                  { selector: fromApplications.selectIsSaving, value: false },
                  { selector: fromApplications.selectError, value: null },
                  { selector: fromApplications.selectSaveError, value: null },
                  { selector: fromOrganizations.selectOrganizations, value: [mockOrganization] },
                  { selector: fromUser.selectCurrentUser, value: mockUser },
                  { selector: fromUser.selectDebugMode, value: false },
                  { selector: fromEnvironments.selectApiKeys, value: [mockApiKey] },
                  { selector: fromEnvironments.selectIsGenerating, value: false },
                  { selector: fromEnvironments.selectIsRotating, value: false },
                  { selector: fromEnvironments.selectIsRevoking, value: false },
                  { selector: fromEnvironments.selectGeneratedKey, value: null },
                ],
              }),
              provideMockActions(() => actions$),
              {
                provide: ActivatedRoute,
                useValue: { paramMap: paramMapSubject.asObservable() },
              },
            ],
          });

          const library = TestBed.inject(FaIconLibrary);
          library.addIconPacks(fas);

          const fixture = TestBed.createComponent(ApplicationDetailPageComponent);
          const component = fixture.componentInstance;
          fixture.detectChanges();
          tick();

          component.setActiveTab(ApplicationDetailTab.Environments);
          fixture.detectChanges();

          const row = component.environmentKeyRows.find(r => r.environment === environment);
          expect(row).toBeTruthy();

          // Property: button visibility based on status
          switch (status) {
            case ApplicationApiKeyStatus.Active:
              // ACTIVE → Rotate and Revoke visible, Generate hidden
              expect(row!.canRotate).toBe(true);
              expect(row!.canRevoke).toBe(true);
              expect(row!.canGenerate).toBe(false);
              break;

            case ApplicationApiKeyStatus.Rotating:
              // ROTATING → Rotate and Revoke visible, Generate hidden
              expect(row!.canRotate).toBe(true);
              expect(row!.canRevoke).toBe(true);
              expect(row!.canGenerate).toBe(false);
              break;

            case ApplicationApiKeyStatus.Revoked:
              // REVOKED → Generate visible, Rotate and Revoke hidden
              expect(row!.canGenerate).toBe(true);
              expect(row!.canRotate).toBe(false);
              expect(row!.canRevoke).toBe(false);
              break;

            case ApplicationApiKeyStatus.Expired:
              // EXPIRED → Generate visible, Rotate and Revoke hidden
              expect(row!.canGenerate).toBe(true);
              expect(row!.canRotate).toBe(false);
              expect(row!.canRevoke).toBe(false);
              break;
          }

          fixture.destroy();
          TestBed.inject(MockStore).resetSelectors();
          return true;
        }),
        { numRuns: 100 }
      );
    }));

    it('should show Generate button when no key exists for environment', fakeAsync(() => {
      fc.assert(
        fc.property(environmentsArrayArbitrary, (environments) => {
          const actions$ = new ReplaySubject<Action>(1);
          const paramMapSubject = new BehaviorSubject(convertToParamMap({ id: 'app-789' }));

          const app: IApplications = {
            applicationId: 'app-789',
            name: 'Test App',
            organizationId: 'org-456',
            ownerId: 'user-123',
            status: ApplicationStatus.Active,
            apiKey: 'api-key',
            apiKeyNext: '',
            environments: environments,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          TestBed.resetTestingModule();
          TestBed.configureTestingModule({
            imports: [ApplicationDetailPageComponent, RouterTestingModule],
            providers: [
              provideMockStore({
                selectors: [
                  { selector: fromApplications.selectSelectedApplication, value: app },
                  { selector: fromApplications.selectIsLoading, value: false },
                  { selector: fromApplications.selectIsSaving, value: false },
                  { selector: fromApplications.selectError, value: null },
                  { selector: fromApplications.selectSaveError, value: null },
                  { selector: fromOrganizations.selectOrganizations, value: [mockOrganization] },
                  { selector: fromUser.selectCurrentUser, value: mockUser },
                  { selector: fromUser.selectDebugMode, value: false },
                  { selector: fromEnvironments.selectApiKeys, value: [] }, // No keys
                  { selector: fromEnvironments.selectIsGenerating, value: false },
                  { selector: fromEnvironments.selectIsRotating, value: false },
                  { selector: fromEnvironments.selectIsRevoking, value: false },
                  { selector: fromEnvironments.selectGeneratedKey, value: null },
                ],
              }),
              provideMockActions(() => actions$),
              {
                provide: ActivatedRoute,
                useValue: { paramMap: paramMapSubject.asObservable() },
              },
            ],
          });

          const library = TestBed.inject(FaIconLibrary);
          library.addIconPacks(fas);

          const fixture = TestBed.createComponent(ApplicationDetailPageComponent);
          const component = fixture.componentInstance;
          fixture.detectChanges();
          tick();

          component.setActiveTab(ApplicationDetailTab.Environments);
          fixture.detectChanges();

          // Property: all rows without keys should show Generate button
          component.environmentKeyRows.forEach(row => {
            expect(row.canGenerate).toBe(true);
            expect(row.canRotate).toBe(false);
            expect(row.canRevoke).toBe(false);
          });

          fixture.destroy();
          TestBed.inject(MockStore).resetSelectors();
          return true;
        }),
        { numRuns: 100 }
      );
    }));
  });
});
