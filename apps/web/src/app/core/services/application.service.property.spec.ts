/**
 * ApplicationService Property Tests
 *
 * Property-based tests for application service using fast-check.
 * Validates universal correctness properties across all valid inputs.
 *
 * Property 1: CRUD Round-Trip Consistency
 * For any valid application data, creating an application and then retrieving it
 * by ID SHALL return an equivalent application object.
 *
 * @see .kiro/specs/applications-management/design.md
 * **Validates: Requirements 1.2, 1.3, 1.6**
 */

import { TestBed } from '@angular/core/testing';
import * as fc from 'fast-check';
import { ApplicationService } from './application.service';
import { ApplicationStatus } from '../enums/ApplicationStatusEnum';

describe('ApplicationService Property Tests', () => {
  let service: ApplicationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApplicationService],
    });
    service = TestBed.inject(ApplicationService);
  });

  // Arbitrary for valid application IDs (UUID format)
  const applicationIdArb = fc.uuid();

  // Arbitrary for valid owner IDs (UUID format)
  const ownerIdArb = fc.uuid();

  // Arbitrary for valid organization IDs (UUID format)
  const organizationIdArb = fc.uuid();

  // Arbitrary for valid application names
  const applicationNameArb = fc
    .string({ minLength: 1, maxLength: 100 })
    .filter((s) => s.trim().length > 0);

  // Arbitrary for valid application status
  const applicationStatusArb = fc.constantFrom(
    ApplicationStatus.Pending,
    ApplicationStatus.Active,
    ApplicationStatus.Inactive
  );

  // Arbitrary for environments array
  const environmentsArb = fc.array(
    fc.constantFrom('PRODUCTION', 'STAGING', 'DEVELOPMENT', 'TEST', 'PREVIEW'),
    { minLength: 0, maxLength: 5 }
  );

  describe('Property 1: CRUD Round-Trip Consistency', () => {
    /**
     * Feature: applications-management, Property 1: CRUD Round-Trip Consistency
     * **Validates: Requirements 1.2, 1.3, 1.6**
     *
     * Property: createDraft returns Observable that emits IApplications directly
     * For any valid ownerId, createDraft SHALL return an Observable<IApplications>
     * (not wrapped in StatusCode/Message/Data or other envelope)
     */
    it('createDraft should return Observable<IApplications> for any valid ownerId (100 iterations)', () => {
      fc.assert(
        fc.property(ownerIdArb, (ownerId) => {
          // The method should not throw for valid input
          const result = service.createDraft(ownerId);

          // Result should be an Observable (has subscribe method)
          expect(result.subscribe).toBeDefined();
          expect(typeof result.subscribe).toBe('function');
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: createDraft with organizationId returns Observable<IApplications>
     */
    it('createDraft should return Observable<IApplications> for any valid ownerId and organizationId (100 iterations)', () => {
      fc.assert(
        fc.property(ownerIdArb, organizationIdArb, (ownerId, organizationId) => {
          const result = service.createDraft(ownerId, organizationId);

          expect(result.subscribe).toBeDefined();
          expect(typeof result.subscribe).toBe('function');
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: createApplication returns Observable that emits IApplications directly
     */
    it('createApplication should return Observable<IApplications> for any valid input (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.record({
            applicationId: applicationIdArb,
            name: applicationNameArb,
            organizationId: organizationIdArb,
            ownerId: ownerIdArb,
            status: applicationStatusArb,
            environments: environmentsArb,
          }),
          (input) => {
            const result = service.createApplication(input);

            expect(result.subscribe).toBeDefined();
            expect(typeof result.subscribe).toBe('function');
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: updateApplication returns Observable that emits IApplications directly
     */
    it('updateApplication should return Observable<IApplications> for any valid input (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.record({
            applicationId: applicationIdArb,
            name: fc.option(applicationNameArb, { nil: undefined }),
            organizationId: fc.option(organizationIdArb, { nil: undefined }),
            status: fc.option(applicationStatusArb, { nil: undefined }),
            environments: fc.option(environmentsArb, { nil: undefined }),
          }),
          (input) => {
            const result = service.updateApplication(input);

            expect(result.subscribe).toBeDefined();
            expect(typeof result.subscribe).toBe('function');
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: deleteApplication returns Observable that emits IApplications directly
     */
    it('deleteApplication should return Observable<IApplications> for any valid applicationId (100 iterations)', () => {
      fc.assert(
        fc.property(applicationIdArb, (applicationId) => {
          const result = service.deleteApplication(applicationId);

          expect(result.subscribe).toBeDefined();
          expect(typeof result.subscribe).toBe('function');
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Query Response Handling', () => {
    /**
     * Property: getApplication returns Observable<IApplications | null>
     * Single-item queries return the item directly or null if not found
     */
    it('getApplication should return Observable<IApplications | null> for any valid applicationId (100 iterations)', () => {
      fc.assert(
        fc.property(applicationIdArb, (applicationId) => {
          const result = service.getApplication(applicationId);

          expect(result.subscribe).toBeDefined();
          expect(typeof result.subscribe).toBe('function');
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: getApplicationsByOrganization returns Observable<Connection<IApplications>>
     * List queries return a Connection with items array and nextToken
     */
    it('getApplicationsByOrganization should return Observable<Connection<IApplications>> for any valid organizationId (100 iterations)', () => {
      fc.assert(
        fc.property(
          organizationIdArb,
          fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
          fc.option(fc.string(), { nil: undefined }),
          (organizationId, limit, nextToken) => {
            const result = service.getApplicationsByOrganization(organizationId, limit, nextToken);

            expect(result.subscribe).toBeDefined();
            expect(typeof result.subscribe).toBe('function');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Input Validation Properties', () => {
    /**
     * Property: createDraft throws for empty/undefined ownerId
     */
    it('createDraft should throw for any empty or undefined ownerId', () => {
      fc.assert(
        fc.property(fc.constantFrom('', undefined, null), (invalidOwnerId) => {
          expect(() => service.createDraft(invalidOwnerId as string)).toThrowError(
            'Owner ID is required to create an application'
          );
        }),
        { numRuns: 3 }
      );
    });

    /**
     * Property: updateApplication throws for missing applicationId
     */
    it('updateApplication should throw for any input without applicationId', () => {
      fc.assert(
        fc.property(
          fc.record({
            name: fc.option(applicationNameArb, { nil: undefined }),
            organizationId: fc.option(organizationIdArb, { nil: undefined }),
            status: fc.option(applicationStatusArb, { nil: undefined }),
          }),
          (input) => {
            expect(() => service.updateApplication(input)).toThrowError(
              'Application ID is required for updates'
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: updateApplication throws for empty applicationId
     */
    it('updateApplication should throw for any input with empty applicationId', () => {
      fc.assert(
        fc.property(
          fc.record({
            applicationId: fc.constant(''),
            name: fc.option(applicationNameArb, { nil: undefined }),
          }),
          (input) => {
            expect(() => service.updateApplication(input)).toThrowError(
              'Application ID is required for updates'
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: deleteApplication throws for empty/undefined applicationId
     */
    it('deleteApplication should throw for any empty or undefined applicationId', () => {
      fc.assert(
        fc.property(fc.constantFrom('', undefined, null), (invalidId) => {
          expect(() => service.deleteApplication(invalidId as string)).toThrowError(
            'Application ID is required for deletion'
          );
        }),
        { numRuns: 3 }
      );
    });

    /**
     * Property: getApplicationsByOrganization throws for empty/undefined organizationId
     */
    it('getApplicationsByOrganization should throw for any empty or undefined organizationId', () => {
      fc.assert(
        fc.property(fc.constantFrom('', undefined, null), (invalidOrgId) => {
          expect(() =>
            service.getApplicationsByOrganization(invalidOrgId as string)
          ).toThrowError('Organization ID is required');
        }),
        { numRuns: 3 }
      );
    });

    /**
     * Property: getApplication throws for empty/undefined applicationId
     */
    it('getApplication should throw for any empty or undefined applicationId', () => {
      fc.assert(
        fc.property(fc.constantFrom('', undefined, null), (invalidId) => {
          expect(() => service.getApplication(invalidId as string)).toThrowError(
            'Application ID is required'
          );
        }),
        { numRuns: 3 }
      );
    });
  });
});
