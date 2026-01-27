/**
 * OrganizationDetailPageComponent Property-Based Tests
 *
 * Property tests for organization detail page applications section.
 *
 * @see .kiro/specs/organizations-applications-integration/design.md
 * _Requirements: 2.2, 2.3, 2.9, 2.10, 2.11_
 */

import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of, BehaviorSubject } from 'rxjs';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';
import * as fc from 'fast-check';

import { OrganizationDetailPageComponent } from './organization-detail-page.component';
import { OrganizationService } from '../../../../../core/services/organization.service';
import { ApplicationService } from '../../../../../core/services/application.service';
import { Organizations } from '../../../../../core/models/OrganizationsModel';
import { IApplications } from '../../../../../core/models/ApplicationsModel';
import { OrganizationStatus } from '../../../../../core/enums/OrganizationStatusEnum';
import { ApplicationStatus } from '../../../../../core/enums/ApplicationStatusEnum';
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
   * Property 2: Application list renders with required fields
   * For any list of applications, each rendered row displays name, status, and environment count.
   * _Requirements: 2.2, 2.3_
   */
  it('Property 2: Application list renders with required fields', fakeAsync(() => {
    fc.assert(
      fc.property(
        fc.array(applicationArbitrary, { minLength: 1, maxLength: 10 }),
        (applications) => {
          // Setup fresh TestBed for each iteration
          const organizationService = jasmine.createSpyObj('OrganizationService', [
            'getOrganization',
            'updateOrganization',
            'deleteOrganization',
          ]);
          const applicationService = jasmine.createSpyObj('ApplicationService', [
            'getApplicationsByOrganization',
          ]);
          const paramMapSubject = new BehaviorSubject(convertToParamMap({ id: 'org-123' }));

          TestBed.resetTestingModule();
          TestBed.configureTestingModule({
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
          });

          const library = TestBed.inject(FaIconLibrary);
          library.addIconPacks(fas);

          const router = TestBed.inject(Router);
          spyOn(router, 'navigate');

          const mockOrg = new Organizations({
            organizationId: 'org-123',
            name: 'Test Org',
            ownerId: 'user-123',
            status: OrganizationStatus.Active,
            applicationCount: applications.length,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          organizationService.getOrganization.and.returnValue(of(mockOrg));
          applicationService.getApplicationsByOrganization.and.returnValue(
            of({ items: applications as IApplications[], nextToken: null })
          );

          const fixture = TestBed.createComponent(OrganizationDetailPageComponent);
          const component = fixture.componentInstance;

          // Act
          fixture.detectChanges();
          tick();

          // Assert: All applications are loaded
          expect(component.applications.length).toBe(applications.length);

          // Assert: Each application has required fields accessible
          for (const app of component.applications) {
            expect(app.name).toBeDefined();
            expect(app.status).toBeDefined();
            expect(component.getEnvironmentCount(app)).toBeGreaterThanOrEqual(0);
          }

          // Cleanup
          fixture.destroy();
          TestBed.inject(MockStore).resetSelectors();
        }
      ),
      { numRuns: 100 }
    );
  }));

  /**
   * Property 3: Application count synchronization
   * When actual application count differs from stored count, sync is triggered.
   * _Requirements: 2.9, 2.10, 2.11_
   */
  it('Property 3: Application count synchronization', fakeAsync(() => {
    fc.assert(
      fc.property(
        fc.array(applicationArbitrary, { minLength: 0, maxLength: 10 }),
        fc.integer({ min: 0, max: 20 }),
        (applications, storedCount) => {
          const actualCount = applications.length;
          const shouldSync = actualCount !== storedCount;

          // Setup fresh TestBed for each iteration
          const organizationService = jasmine.createSpyObj('OrganizationService', [
            'getOrganization',
            'updateOrganization',
            'deleteOrganization',
          ]);
          const applicationService = jasmine.createSpyObj('ApplicationService', [
            'getApplicationsByOrganization',
          ]);
          const paramMapSubject = new BehaviorSubject(convertToParamMap({ id: 'org-123' }));

          TestBed.resetTestingModule();
          TestBed.configureTestingModule({
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
          });

          const library = TestBed.inject(FaIconLibrary);
          library.addIconPacks(fas);

          const router = TestBed.inject(Router);
          spyOn(router, 'navigate');

          const mockOrg = new Organizations({
            organizationId: 'org-123',
            name: 'Test Org',
            ownerId: 'user-123',
            status: OrganizationStatus.Active,
            applicationCount: storedCount,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          organizationService.getOrganization.and.returnValue(of(mockOrg));
          applicationService.getApplicationsByOrganization.and.returnValue(
            of({ items: applications as IApplications[], nextToken: null })
          );
          organizationService.updateOrganization.and.returnValue(
            of(new Organizations({ ...mockOrg, applicationCount: actualCount }))
          );

          const fixture = TestBed.createComponent(OrganizationDetailPageComponent);

          // Act
          fixture.detectChanges();
          tick();

          // Assert: Sync is called only when counts differ
          if (shouldSync) {
            expect(organizationService.updateOrganization).toHaveBeenCalled();
            const updateCall = organizationService.updateOrganization.calls.mostRecent().args[0];
            expect(updateCall.applicationCount).toBe(actualCount);
          } else {
            expect(organizationService.updateOrganization).not.toHaveBeenCalled();
          }

          // Cleanup
          fixture.destroy();
          TestBed.inject(MockStore).resetSelectors();
        }
      ),
      { numRuns: 100 }
    );
  }));
});
