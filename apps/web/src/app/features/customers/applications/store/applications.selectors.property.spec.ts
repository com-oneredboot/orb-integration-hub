/**
 * Applications Selectors Property Tests
 *
 * Property-based tests for applications selectors using fast-check.
 * Validates universal correctness properties across all valid inputs.
 *
 * NOTE: With the Organizations pattern, filtering is done in the REDUCER,
 * not in selectors. These tests validate the reducer's filtering logic
 * by testing the applyFilters behavior through reducer state transitions.
 *
 * @see .kiro/specs/applications-management/design.md
 */

import * as fc from 'fast-check';
import * as selectors from './applications.selectors';
import { applicationsReducer } from './applications.reducer';
import { ApplicationTableRow, initialApplicationsState } from './applications.state';
import { IApplications } from '../../../../core/models/ApplicationsModel';
import { ApplicationStatus } from '../../../../core/enums/ApplicationStatusEnum';
import { ApplicationsActions } from './applications.actions';

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

// Arbitrary for ApplicationTableRow
const applicationRowArb: fc.Arbitrary<ApplicationTableRow> = fc.record({
  application: applicationArb,
  organizationId: fc.uuid(),
  organizationName: fc.string({ minLength: 1, maxLength: 50 }),
  environmentCount: fc.integer({ min: 0, max: 10 }),
  userRole: fc.constantFrom('OWNER', 'ADMINISTRATOR', 'DEVELOPER', 'VIEWER'),
  lastActivity: fc.string(),
});

/**
 * Helper to create a state with application rows and apply filters via reducer
 */
function createStateWithFilters(
  applicationRows: ApplicationTableRow[],
  searchTerm: string,
  organizationFilter: string,
  statusFilter: string
) {
  // Start with initial state and set application rows
  let state = {
    ...initialApplicationsState,
    applicationRows,
    filteredApplicationRows: applicationRows,
  };

  // Apply filters through reducer actions
  if (searchTerm) {
    state = applicationsReducer(
      state,
      ApplicationsActions.setSearchTerm({ searchTerm })
    );
  }
  if (organizationFilter) {
    state = applicationsReducer(
      state,
      ApplicationsActions.setOrganizationFilter({ organizationFilter })
    );
  }
  if (statusFilter) {
    state = applicationsReducer(
      state,
      ApplicationsActions.setStatusFilter({ statusFilter })
    );
  }

  return state;
}

describe('Applications Selectors Property Tests', () => {
  describe('Property 2: Organization Filter Correctness', () => {
    /**
     * Feature: applications-management, Property 2: Organization Filter Correctness
     * **Validates: Requirements 2.3**
     *
     * For any list of applications and any organization filter value,
     * all applications returned by the filtered list SHALL have an
     * organizationId matching the filter value.
     */
    it('should return only applications matching organization filter (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(applicationRowArb, { minLength: 1, maxLength: 50 }),
          fc.uuid(),
          (applicationRows, filterOrgId) => {
            const state = createStateWithFilters(
              applicationRows,
              '', // no search term
              filterOrgId,
              '' // no status filter
            );

            const filtered = selectors.selectFilteredApplicationRows.projector(state);

            // All filtered results must match the organization filter
            return filtered.every((row) => row.organizationId === filterOrgId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return all applications when organization filter is empty (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(applicationRowArb, { minLength: 0, maxLength: 50 }),
          (applicationRows) => {
            const state = createStateWithFilters(
              applicationRows,
              '', // no search term
              '', // no organization filter
              '' // no status filter
            );

            const filtered = selectors.selectFilteredApplicationRows.projector(state);

            // Should return all applications when no filter
            return filtered.length === applicationRows.length;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: Search Filter Correctness', () => {
    /**
     * Feature: applications-management, Property 3: Search Filter Correctness
     * **Validates: Requirements 2.4**
     *
     * For any list of applications and any search term,
     * all applications returned by the search SHALL have a name
     * containing the search term (case-insensitive).
     */
    it('should return only applications with names containing search term (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(applicationRowArb, { minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 20 }),
          (applicationRows, searchTerm) => {
            const state = createStateWithFilters(
              applicationRows,
              searchTerm,
              '', // no organization filter
              '' // no status filter
            );

            const filtered = selectors.selectFilteredApplicationRows.projector(state);
            const lowerSearch = searchTerm.toLowerCase();

            // All filtered results must contain the search term (case-insensitive)
            // Note: reducer also searches applicationId, so we check both
            return filtered.every(
              (row) =>
                row.application.name.toLowerCase().includes(lowerSearch) ||
                row.application.applicationId.toLowerCase().includes(lowerSearch)
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be case-insensitive when searching (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(applicationRowArb, { minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 10 }),
          (applicationRows, searchTerm) => {
            const lowerState = createStateWithFilters(
              applicationRows,
              searchTerm.toLowerCase(),
              '',
              ''
            );

            const upperState = createStateWithFilters(
              applicationRows,
              searchTerm.toUpperCase(),
              '',
              ''
            );

            const lowerFiltered = selectors.selectFilteredApplicationRows.projector(lowerState);
            const upperFiltered = selectors.selectFilteredApplicationRows.projector(upperState);

            // Same results regardless of case
            return lowerFiltered.length === upperFiltered.length;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 9: Store Filter Consistency', () => {
    /**
     * Feature: applications-management, Property 9: Store Filter Consistency
     * **Validates: Requirements 5.4**
     *
     * For any applications state with filters applied,
     * the filtered applications selector SHALL return only applications
     * matching ALL active filter criteria.
     */
    it('should apply all filters together correctly (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(applicationRowArb, { minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 0, maxLength: 10 }),
          fc.option(fc.uuid(), { nil: '' }),
          fc.option(applicationStatusArb, { nil: '' as unknown as ApplicationStatus }),
          (applicationRows, searchTerm, orgFilter, statusFilter) => {
            const state = createStateWithFilters(
              applicationRows,
              searchTerm,
              orgFilter || '',
              statusFilter || ''
            );

            const filtered = selectors.selectFilteredApplicationRows.projector(state);

            // Every filtered result must match ALL active filters
            return filtered.every((row) => {
              const matchesSearch =
                !searchTerm ||
                row.application.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                row.application.applicationId.toLowerCase().includes(searchTerm.toLowerCase());

              const matchesOrg = !orgFilter || row.organizationId === orgFilter;

              const matchesStatus =
                !statusFilter || row.application.status === statusFilter;

              return matchesSearch && matchesOrg && matchesStatus;
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('filtered count should be less than or equal to total count (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(applicationRowArb, { minLength: 0, maxLength: 50 }),
          fc.string({ minLength: 0, maxLength: 10 }),
          fc.option(fc.uuid(), { nil: '' }),
          fc.option(applicationStatusArb, { nil: '' as unknown as ApplicationStatus }),
          (applicationRows, searchTerm, orgFilter, statusFilter) => {
            const state = createStateWithFilters(
              applicationRows,
              searchTerm,
              orgFilter || '',
              statusFilter || ''
            );

            const filtered = selectors.selectFilteredApplicationRows.projector(state);

            // Filtered count should never exceed total count
            return filtered.length <= applicationRows.length;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('selectHasFiltersApplied', () => {
    it('should return true if and only if at least one filter is non-empty (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.string(),
          fc.string(),
          (searchTerm, orgFilter, statusFilter) => {
            const result = selectors.selectHasFiltersApplied.projector(
              searchTerm,
              orgFilter,
              statusFilter
            );

            const expected = !!searchTerm || !!orgFilter || !!statusFilter;
            return result === expected;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('selectHasAnyError', () => {
    it('should return true if and only if at least one error is non-null (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.option(fc.string({ minLength: 1 }), { nil: null }),
          fc.option(fc.string({ minLength: 1 }), { nil: null }),
          fc.option(fc.string({ minLength: 1 }), { nil: null }),
          (error, saveError, deleteError) => {
            const result = selectors.selectHasAnyError.projector(
              error,
              saveError,
              deleteError
            );

            const expected = !!error || !!saveError || !!deleteError;
            return result === expected;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
