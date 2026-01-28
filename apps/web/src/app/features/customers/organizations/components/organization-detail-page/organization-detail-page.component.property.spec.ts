/**
 * OrganizationDetailPageComponent Property-Based Tests
 *
 * Property tests for organization detail page using NgRx store-first pattern.
 * Updated for tabbed interface with Applications tab.
 *
 * @see .kiro/specs/organization-applications-tab/design.md
 * _Requirements: 4.1-4.4, 7.2_
 */

import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { BehaviorSubject, ReplaySubject } from 'rxjs';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { Action } from '@ngrx/store';
import * as fc from 'fast-check';

import { OrganizationDetailPageComponent } from './organization-detail-page.component';
import { Organizations } from '../../../../../core/models/OrganizationsModel';
import { IApplications } from '../../../../../core/models/ApplicationsModel';
import { OrganizationStatus } from '../../../../../core/enums/OrganizationStatusEnum';
import { ApplicationStatus } from '../../../../../core/enums/ApplicationStatusEnum';
import * as fromOrganizations from '../../store/organizations.selectors';
import * as fromUser from '../../../../user/store/user.selectors';

describe('OrganizationDetailPageComponent Property Tests', () => {
  // Arbitrary for generating valid application data
  const applicationArbitrary = fc.record({
    applicationId: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    organizationId: fc.constant('org-123'),
    ownerId: fc.uuid(),
    status: fc.constantFrom(ApplicationStatus.Active, ApplicationStatus.Inactive),
    apiKey: fc.string(),
    apiKeyNext: fc.string(),
    environments: fc.array(
      fc.constantFrom('PRODUCTION', 'STAGING', 'DEVELOPMENT', 'QA'),
      { minLength: 0, maxLength: 4 }
    ),
    createdAt: fc.date(),
    updatedAt: fc.date(),
  });

  /**
   * Property 3: Environment count calculation
   * For any application, getEnvironmentCount returns the correct count.
   * _Requirements: 4.4_
   */
  it('Property 3: Environment count calculation', () => {
    fc.assert(
      fc.property(
        applicationArbitrary,
        (application) => {
          // Setup minimal TestBed
          const actions$ = new ReplaySubject<Action>(1);
          const paramMapSubject = new BehaviorSubject(convertToParamMap({ id: 'org-123' }));

          TestBed.resetTestingModule();
          TestBed.configureTestingModule({
            imports: [OrganizationDetailPageComponent],
            providers: [
              provideMockStore({
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
          });

          const library = TestBed.inject(FaIconLibrary);
          library.addIconPacks(fas);

          const fixture = TestBed.createComponent(OrganizationDetailPageComponent);
          const component = fixture.componentInstance;

          // Act & Assert
          const expectedCount = application.environments?.length || 0;
          expect(component.getEnvironmentCount(application as IApplications)).toBe(expectedCount);

          // Cleanup
          fixture.destroy();
          TestBed.inject(MockStore).resetSelectors();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4: Form validation rules
   * Name validation follows consistent rules regardless of input.
   * _Requirements: 4.2_
   */
  it('Property 4: Form validation rules', fakeAsync(() => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 150 }),
        (name) => {
          // Setup minimal TestBed
          const actions$ = new ReplaySubject<Action>(1);
          const paramMapSubject = new BehaviorSubject(convertToParamMap({ id: 'org-123' }));

          const mockOrg = new Organizations({
            organizationId: 'org-123',
            name: 'Test Org',
            ownerId: 'user-123',
            status: OrganizationStatus.Active,
            applicationCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          TestBed.resetTestingModule();
          TestBed.configureTestingModule({
            imports: [OrganizationDetailPageComponent],
            providers: [
              provideMockStore({
                selectors: [
                  { selector: fromOrganizations.selectSelectedOrganization, value: mockOrg },
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
          });

          const library = TestBed.inject(FaIconLibrary);
          library.addIconPacks(fas);

          const store = TestBed.inject(MockStore);
          spyOn(store, 'dispatch');

          const fixture = TestBed.createComponent(OrganizationDetailPageComponent);
          const component = fixture.componentInstance;

          fixture.detectChanges();
          tick();

          // Set the name and try to save
          component.editForm.name = name;
          component.onSave();

          const trimmedName = name.trim();

          // Validation rules:
          // 1. Empty name -> error
          // 2. Name < 2 chars -> error
          // 3. Name > 100 chars -> error
          // 4. Invalid characters -> error
          // 5. Valid name -> dispatch called

          if (!trimmedName) {
            expect(component.validationErrors.name).toBe('Organization name is required');
          } else if (trimmedName.length < 2) {
            expect(component.validationErrors.name).toBe('Organization name must be at least 2 characters');
          } else if (trimmedName.length > 100) {
            expect(component.validationErrors.name).toBe('Organization name cannot exceed 100 characters');
          } else if (!/^[a-zA-Z0-9\s\-'.]+$/.test(trimmedName)) {
            expect(component.validationErrors.name).toBe('Organization name contains invalid characters');
          } else {
            // Valid name - dispatch should have been called
            expect(store.dispatch).toHaveBeenCalled();
          }

          // Cleanup
          fixture.destroy();
          store.resetSelectors();
        }
      ),
      { numRuns: 100 }
    );
  }));
});
