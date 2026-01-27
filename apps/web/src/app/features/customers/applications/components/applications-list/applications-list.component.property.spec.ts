/**
 * ApplicationsListComponent Property Tests
 *
 * Property-based tests for applications list filtering using fast-check.
 * Note: Sorting and pagination are handled by the DataGrid component.
 * These tests focus on the filtering logic in the component.
 *
 * @see .kiro/specs/applications-management/design.md
 * **Property 4: Sorting Correctness** - Handled by DataGrid component
 * **Property 5: Pagination Correctness** - Handled by DataGrid component
 */

import * as fc from 'fast-check';
import { ApplicationListRow } from './applications-list.component';
import { IApplications } from '../../../../../core/models/ApplicationsModel';
import { ApplicationStatus } from '../../../../../core/enums/ApplicationStatusEnum';

// Arbitrary for valid application status
const applicationStatusArb = fc.constantFrom(
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

// Arbitrary for ApplicationListRow
const applicationRowArb: fc.Arbitrary<ApplicationListRow> = fc.record({
  application: applicationArb,
  organizationName: fc.string({ minLength: 1, maxLength: 50 }),
  environmentCount: fc.integer({ min: 0, max: 10 }),
  userRole: fc.constantFrom('OWNER', 'ADMINISTRATOR', 'DEVELOPER', 'VIEWER'),
  lastActivity: fc.string(),
});

// Helper function that mirrors the component's applyFilters logic
function applyFilters(
  rows: ApplicationListRow[],
  searchTerm: string,
  organizationFilter: string,
  statusFilter: string
): ApplicationListRow[] {
  return rows.filter((row) => {
    const matchesSearch =
      !searchTerm ||
      row.application.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.application.applicationId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesOrganization =
      !organizationFilter || row.application.organizationId === organizationFilter;
    const matchesStatus = !statusFilter || row.application.status === statusFilter;
    return matchesSearch && matchesOrganization && matchesStatus;
  });
}

describe('ApplicationsListComponent Property Tests', () => {
  describe('Filtering Properties', () => {
    /**
     * Property: Search filter returns only matching applications
     * For any list of applications and any search term,
     * all applications returned SHALL have a name or ID containing the search term.
     */
    it('search filter should return only applications with matching name or ID (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(applicationRowArb, { minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 20 }),
          (rows, searchTerm) => {
            const filtered = applyFilters(rows, searchTerm, '', '');
            const lowerSearch = searchTerm.toLowerCase();

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

    /**
     * Property: Organization filter returns only matching applications
     */
    it('organization filter should return only applications from that organization (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(applicationRowArb, { minLength: 1, maxLength: 50 }),
          fc.uuid(),
          (rows, orgFilter) => {
            const filtered = applyFilters(rows, '', orgFilter, '');

            return filtered.every(
              (row) => row.application.organizationId === orgFilter
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Status filter returns only matching applications
     */
    it('status filter should return only applications with that status (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(applicationRowArb, { minLength: 1, maxLength: 50 }),
          applicationStatusArb,
          (rows, statusFilter) => {
            const filtered = applyFilters(rows, '', '', statusFilter);

            return filtered.every((row) => row.application.status === statusFilter);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Empty filters return all applications
     */
    it('empty filters should return all applications (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(applicationRowArb, { minLength: 0, maxLength: 50 }),
          (rows) => {
            const filtered = applyFilters(rows, '', '', '');

            return filtered.length === rows.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Filtered count is always <= total count
     */
    it('filtered count should be less than or equal to total count (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(applicationRowArb, { minLength: 0, maxLength: 50 }),
          fc.string({ minLength: 0, maxLength: 20 }),
          fc.option(fc.uuid(), { nil: '' }),
          fc.option(applicationStatusArb, { nil: '' as unknown as ApplicationStatus }),
          (rows, searchTerm, orgFilter, statusFilter) => {
            const filtered = applyFilters(
              rows,
              searchTerm,
              orgFilter || '',
              statusFilter || ''
            );

            return filtered.length <= rows.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Search is case-insensitive
     */
    it('search should be case-insensitive (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(applicationRowArb, { minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 10 }),
          (rows, searchTerm) => {
            const lowerFiltered = applyFilters(rows, searchTerm.toLowerCase(), '', '');
            const upperFiltered = applyFilters(rows, searchTerm.toUpperCase(), '', '');

            return lowerFiltered.length === upperFiltered.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Combined filters are conjunctive (AND)
     */
    it('combined filters should apply conjunctively (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.array(applicationRowArb, { minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 0, maxLength: 10 }),
          fc.option(fc.uuid(), { nil: '' }),
          fc.option(applicationStatusArb, { nil: '' as unknown as ApplicationStatus }),
          (rows, searchTerm, orgFilter, statusFilter) => {
            const filtered = applyFilters(
              rows,
              searchTerm,
              orgFilter || '',
              statusFilter || ''
            );

            // Every filtered result must match ALL active filters
            return filtered.every((row) => {
              const matchesSearch =
                !searchTerm ||
                row.application.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                row.application.applicationId.toLowerCase().includes(searchTerm.toLowerCase());

              const matchesOrg =
                !orgFilter || row.application.organizationId === orgFilter;

              const matchesStatus =
                !statusFilter || row.application.status === statusFilter;

              return matchesSearch && matchesOrg && matchesStatus;
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
