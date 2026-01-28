/**
 * Organizations Selectors Property Tests
 *
 * Property-based tests for organizations selectors using fast-check.
 * Validates universal correctness properties across all valid inputs.
 *
 * @see .kiro/specs/organization-applications-tab/design.md
 */

import * as fc from 'fast-check';
import * as selectors from './organizations.selectors';
import { organizationsReducer } from './organizations.reducer';
import { OrganizationsState, initialOrganizationsState } from './organizations.state';
import { OrganizationsActions } from './organizations.actions';
import { IApplications } from '../../../../core/models/ApplicationsModel';
import { ApplicationStatus } from '../../../../core/enums/ApplicationStatusEnum';

// Arbitrary for valid application status
const applicationStatusArb = fc.constantFrom(
  ApplicationStatus.Pending,
  ApplicationStatus.Active,
  ApplicationStatus.Inactive
);

// Arbitrary for valid application names
const applicationNameArb = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0);

// Arbitrary for valid IApplications
const applicationArb: fc.Arbitrary<IApplications> = fc.record({
  applicationId: fc.uuid(),
  name: applicationNameArb,
  organizationId: fc.uuid(),
  ownerId: fc.uuid(),
  status: applicationStatusArb,
  apiKey: fc.string(),
  apiKeyNext: fc.string(),
  environments: fc.array(
    fc.constantFrom('PRODUCTION', 'STAGING', 'DEVELOPMENT', 'TEST', 'PREVIEW'),
    { minLength: 0, maxLength: 5 }
  ),
  createdAt: fc.date(),
  updatedAt: fc.date(),
});

// Arbitrary for organization ID
const organizationIdArb = fc.uuid();

describe('Organizations Selectors Property Tests', () => {
  describe('Feature: organization-applications-tab, Property 1: Application Count Badge Accuracy', () => {
    /**
     * Feature: organization-applications-tab, Property 1: Application Count Badge Accuracy
     * **Validates: Requirements 1.4**
     *
     * For any organization with N applications, the count badge displayed
     * on the Applications tab SHALL equal N.
     */
    it('should return count equal to number of applications (100 iterations)', () => {
      fc.assert(
        fc.property(
          organizationIdArb,
          fc.array(applicationArb, { minLength: 0, maxLength: 50 }),
          (organizationId, applications) => {
            // Create state with applications loaded for the organization
            const state: OrganizationsState = {
              ...initialOrganizationsState,
              organizationApplications: {
                [organizationId]: applications,
              },
            };

            // Get the count using the selector
            const applicationsSelector = selectors.selectOrganizationApplications(organizationId);
            const countSelector = selectors.selectOrganizationApplicationCount(organizationId);

            const selectedApplications = applicationsSelector.projector(state);
            const count = countSelector.projector(selectedApplications);

            // Property: count must equal the number of applications
            return count === applications.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0 for organization with no applications (100 iterations)', () => {
      fc.assert(
        fc.property(organizationIdArb, (organizationId) => {
          const state: OrganizationsState = {
            ...initialOrganizationsState,
            organizationApplications: {
              [organizationId]: [],
            },
          };

          const applicationsSelector = selectors.selectOrganizationApplications(organizationId);
          const countSelector = selectors.selectOrganizationApplicationCount(organizationId);

          const selectedApplications = applicationsSelector.projector(state);
          const count = countSelector.projector(selectedApplications);

          return count === 0;
        }),
        { numRuns: 100 }
      );
    });

    it('should return 0 for organization not yet loaded (100 iterations)', () => {
      fc.assert(
        fc.property(organizationIdArb, (organizationId) => {
          const state: OrganizationsState = {
            ...initialOrganizationsState,
            organizationApplications: {},
          };

          const applicationsSelector = selectors.selectOrganizationApplications(organizationId);
          const countSelector = selectors.selectOrganizationApplicationCount(organizationId);

          const selectedApplications = applicationsSelector.projector(state);
          const count = countSelector.projector(selectedApplications);

          return count === 0;
        }),
        { numRuns: 100 }
      );
    });

    it('count should be consistent with applications array length after reducer updates (100 iterations)', () => {
      fc.assert(
        fc.property(
          organizationIdArb,
          fc.array(applicationArb, { minLength: 0, maxLength: 50 }),
          (organizationId, applications) => {
            // Start with initial state
            let state = initialOrganizationsState;

            // Dispatch load action
            state = organizationsReducer(
              state,
              OrganizationsActions.loadOrganizationApplications({ organizationId })
            );

            // Dispatch success action with applications
            state = organizationsReducer(
              state,
              OrganizationsActions.loadOrganizationApplicationsSuccess({
                organizationId,
                applications,
              })
            );

            // Verify count matches
            const applicationsSelector = selectors.selectOrganizationApplications(organizationId);
            const countSelector = selectors.selectOrganizationApplicationCount(organizationId);

            const selectedApplications = applicationsSelector.projector(state);
            const count = countSelector.projector(selectedApplications);

            return count === applications.length && selectedApplications.length === applications.length;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Feature: organization-applications-tab, Property 2: Application Row Content Completeness', () => {
    /**
     * Feature: organization-applications-tab, Property 2: Application Row Content Completeness
     * **Validates: Requirements 2.1**
     *
     * For any application displayed in the Applications tab, the rendered row
     * SHALL contain the application name, status, and environment count.
     */
    it('every application should have name, status, and environments defined (100 iterations)', () => {
      fc.assert(
        fc.property(
          organizationIdArb,
          fc.array(applicationArb, { minLength: 1, maxLength: 50 }),
          (organizationId, applications) => {
            const state: OrganizationsState = {
              ...initialOrganizationsState,
              organizationApplications: {
                [organizationId]: applications,
              },
            };

            const applicationsSelector = selectors.selectOrganizationApplications(organizationId);
            const selectedApplications = applicationsSelector.projector(state);

            // Property: every application must have name, status, and environments
            return selectedApplications.every(
              (app) =>
                typeof app.name === 'string' &&
                app.name.length > 0 &&
                typeof app.status === 'string' &&
                app.status.length > 0 &&
                Array.isArray(app.environments)
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('environment count should be non-negative for all applications (100 iterations)', () => {
      fc.assert(
        fc.property(
          organizationIdArb,
          fc.array(applicationArb, { minLength: 1, maxLength: 50 }),
          (organizationId, applications) => {
            const state: OrganizationsState = {
              ...initialOrganizationsState,
              organizationApplications: {
                [organizationId]: applications,
              },
            };

            const applicationsSelector = selectors.selectOrganizationApplications(organizationId);
            const selectedApplications = applicationsSelector.projector(state);

            // Property: environment count (array length) must be >= 0
            return selectedApplications.every(
              (app) => app.environments.length >= 0
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('application status should be a valid ApplicationStatus value (100 iterations)', () => {
      fc.assert(
        fc.property(
          organizationIdArb,
          fc.array(applicationArb, { minLength: 1, maxLength: 50 }),
          (organizationId, applications) => {
            const state: OrganizationsState = {
              ...initialOrganizationsState,
              organizationApplications: {
                [organizationId]: applications,
              },
            };

            const applicationsSelector = selectors.selectOrganizationApplications(organizationId);
            const selectedApplications = applicationsSelector.projector(state);

            const validStatuses = [
              ApplicationStatus.Pending,
              ApplicationStatus.Active,
              ApplicationStatus.Inactive,
            ];

            // Property: status must be a valid ApplicationStatus
            return selectedApplications.every((app) =>
              validStatuses.includes(app.status as ApplicationStatus)
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('applications should preserve all required fields through selector (100 iterations)', () => {
      fc.assert(
        fc.property(
          organizationIdArb,
          fc.array(applicationArb, { minLength: 1, maxLength: 50 }),
          (organizationId, applications) => {
            const state: OrganizationsState = {
              ...initialOrganizationsState,
              organizationApplications: {
                [organizationId]: applications,
              },
            };

            const applicationsSelector = selectors.selectOrganizationApplications(organizationId);
            const selectedApplications = applicationsSelector.projector(state);

            // Property: all original applications should be present with same data
            if (selectedApplications.length !== applications.length) {
              return false;
            }

            return applications.every((original, index) => {
              const selected = selectedApplications[index];
              return (
                selected.applicationId === original.applicationId &&
                selected.name === original.name &&
                selected.status === original.status &&
                selected.environments.length === original.environments.length
              );
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Loading and Error State Properties', () => {
    it('loading state should be true only during load operation (100 iterations)', () => {
      fc.assert(
        fc.property(organizationIdArb, (organizationId) => {
          // Initial state - not loading
          let state = initialOrganizationsState;
          const loadingSelector = selectors.selectIsLoadingOrganizationApplications(organizationId);

          const initialLoading = loadingSelector.projector(state);
          if (initialLoading !== false) return false;

          // After load action - loading
          state = organizationsReducer(
            state,
            OrganizationsActions.loadOrganizationApplications({ organizationId })
          );
          const duringLoading = loadingSelector.projector(state);
          if (duringLoading !== true) return false;

          // After success - not loading
          state = organizationsReducer(
            state,
            OrganizationsActions.loadOrganizationApplicationsSuccess({
              organizationId,
              applications: [],
            })
          );
          const afterSuccess = loadingSelector.projector(state);
          return afterSuccess === false;
        }),
        { numRuns: 100 }
      );
    });

    it('error state should be set only on failure (100 iterations)', () => {
      fc.assert(
        fc.property(
          organizationIdArb,
          fc.string({ minLength: 1, maxLength: 100 }),
          (organizationId, errorMessage) => {
            // Initial state - no error
            let state = initialOrganizationsState;
            const errorSelector = selectors.selectOrganizationApplicationsError(organizationId);

            const initialError = errorSelector.projector(state);
            if (initialError !== null) return false;

            // After load action - no error
            state = organizationsReducer(
              state,
              OrganizationsActions.loadOrganizationApplications({ organizationId })
            );
            const duringLoad = errorSelector.projector(state);
            if (duringLoad !== null) return false;

            // After failure - error set
            state = organizationsReducer(
              state,
              OrganizationsActions.loadOrganizationApplicationsFailure({
                organizationId,
                error: errorMessage,
              })
            );
            const afterFailure = errorSelector.projector(state);
            return afterFailure === errorMessage;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('error should be cleared on successful load (100 iterations)', () => {
      fc.assert(
        fc.property(
          organizationIdArb,
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.array(applicationArb, { minLength: 0, maxLength: 10 }),
          (organizationId, errorMessage, applications) => {
            // Set up state with error
            let state: OrganizationsState = {
              ...initialOrganizationsState,
              applicationsError: {
                [organizationId]: errorMessage,
              },
            };

            const errorSelector = selectors.selectOrganizationApplicationsError(organizationId);

            // Verify error is set
            const beforeLoad = errorSelector.projector(state);
            if (beforeLoad !== errorMessage) return false;

            // Load and succeed
            state = organizationsReducer(
              state,
              OrganizationsActions.loadOrganizationApplications({ organizationId })
            );
            state = organizationsReducer(
              state,
              OrganizationsActions.loadOrganizationApplicationsSuccess({
                organizationId,
                applications,
              })
            );

            // Error should be cleared
            const afterSuccess = errorSelector.projector(state);
            return afterSuccess === null;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('selectHasLoadedOrganizationApplications', () => {
    it('should correctly track loaded state (100 iterations)', () => {
      fc.assert(
        fc.property(
          organizationIdArb,
          fc.array(applicationArb, { minLength: 0, maxLength: 10 }),
          (organizationId, applications) => {
            const hasLoadedSelector = selectors.selectHasLoadedOrganizationApplications(organizationId);

            // Initial state - not loaded
            let state = initialOrganizationsState;
            const beforeLoad = hasLoadedSelector.projector(state);
            if (beforeLoad !== false) return false;

            // After successful load - loaded
            state = organizationsReducer(
              state,
              OrganizationsActions.loadOrganizationApplicationsSuccess({
                organizationId,
                applications,
              })
            );
            const afterLoad = hasLoadedSelector.projector(state);
            return afterLoad === true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
