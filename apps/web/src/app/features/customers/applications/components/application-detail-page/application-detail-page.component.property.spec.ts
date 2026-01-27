/**
 * ApplicationDetailPageComponent Property-Based Tests
 *
 * Property tests for application detail page using NgRx store-first pattern.
 *
 * @see .kiro/specs/store-centric-refactoring/design.md
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

import { ApplicationDetailPageComponent } from './application-detail-page.component';
import { IApplications } from '../../../../../core/models/ApplicationsModel';
import { IOrganizations } from '../../../../../core/models/OrganizationsModel';
import { ApplicationStatus } from '../../../../../core/enums/ApplicationStatusEnum';
import { OrganizationStatus } from '../../../../../core/enums/OrganizationStatusEnum';
import * as fromApplications from '../../store/applications.selectors';
import * as fromOrganizations from '../../../organizations/store/organizations.selectors';
import * as fromUser from '../../../../user/store/user.selectors';

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
});
