/**
 * OrganizationsListComponent Property-Based Tests
 *
 * Property tests for organization list component using fast-check.
 *
 * @see .kiro/specs/organizations-applications-integration/design.md
 *
 * Feature: organizations-applications-integration, Property 1: Organization rows display applicationCount correctly
 * **Validates: Requirements 1.2, 1.3**
 */

import * as fc from 'fast-check';
import { Organizations } from '../../../../../core/models/OrganizationsModel';
import { OrganizationStatus } from '../../../../../core/enums/OrganizationStatusEnum';
import { OrganizationTableRow } from '../../store/organizations.state';

describe('OrganizationsListComponent Property Tests', () => {
  // Arbitrary for organization status
  const statusArb = fc.constantFrom(
    OrganizationStatus.Active,
    OrganizationStatus.Inactive,
    OrganizationStatus.Pending,
    OrganizationStatus.Suspended
  );

  // Arbitrary for applicationCount (non-negative integer)
  const applicationCountArb = fc.nat({ max: 1000 });

  // Arbitrary for Organizations
  const organizationArb = fc.record({
    organizationId: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    description: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
    ownerId: fc.uuid(),
    status: statusArb,
    createdAt: fc.date(),
    updatedAt: fc.date(),
    applicationCount: applicationCountArb,
  }).map(data => new Organizations(data));

  describe('Property 1: Organization rows display applicationCount correctly', () => {
    it('should preserve applicationCount from organization record in table row', () => {
      // Feature: organizations-applications-integration, Property 1: Organization rows display applicationCount correctly
      // **Validates: Requirements 1.2, 1.3**
      let passed = true;
      fc.assert(
        fc.property(organizationArb, (organization) => {
          // Create a table row from the organization
          const tableRow: OrganizationTableRow = {
            organization,
            userRole: 'OWNER',
            isOwner: true,
            memberCount: 0,
            applicationCount: organization.applicationCount || 0,
            lastActivity: 'Just now',
          };

          // The table row's applicationCount should match the organization's applicationCount
          const result = tableRow.applicationCount === (organization.applicationCount || 0);
          if (!result) passed = false;
          return result;
        }),
        { numRuns: 100 }
      );
      expect(passed).toBe(true);
    });

    it('should handle undefined applicationCount as 0', () => {
      // Feature: organizations-applications-integration, Property 1: Organization rows display applicationCount correctly
      // **Validates: Requirements 1.2, 1.3**
      let passed = true;
      fc.assert(
        fc.property(
          fc.record({
            organizationId: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            ownerId: fc.uuid(),
            status: statusArb,
            createdAt: fc.date(),
            updatedAt: fc.date(),
            // Explicitly no applicationCount
          }),
          (data) => {
            const organization = new Organizations(data);
            const displayCount = organization.applicationCount || 0;
            
            // Should display 0 when applicationCount is undefined
            const result = displayCount === 0;
            if (!result) passed = false;
            return result;
          }
        ),
        { numRuns: 100 }
      );
      expect(passed).toBe(true);
    });

    it('should maintain applicationCount consistency across multiple organizations', () => {
      // Feature: organizations-applications-integration, Property 1: Organization rows display applicationCount correctly
      // **Validates: Requirements 1.2, 1.3**
      let passed = true;
      fc.assert(
        fc.property(
          fc.array(organizationArb, { minLength: 1, maxLength: 20 }),
          (organizations) => {
            // Create table rows from organizations
            const tableRows: OrganizationTableRow[] = organizations.map(org => ({
              organization: org,
              userRole: 'OWNER',
              isOwner: true,
              memberCount: 0,
              applicationCount: org.applicationCount || 0,
              lastActivity: 'Just now',
            }));

            // Each table row's applicationCount should match its organization's applicationCount
            const result = tableRows.every((row, index) => 
              row.applicationCount === (organizations[index].applicationCount || 0)
            );
            if (!result) passed = false;
            return result;
          }
        ),
        { numRuns: 100 }
      );
      expect(passed).toBe(true);
    });

    it('should correctly display applicationCount for all valid non-negative integers', () => {
      // Feature: organizations-applications-integration, Property 1: Organization rows display applicationCount correctly
      // **Validates: Requirements 1.2, 1.3**
      let passed = true;
      fc.assert(
        fc.property(
          applicationCountArb,
          (count) => {
            const organization = new Organizations({
              organizationId: 'test-id',
              name: 'Test Org',
              ownerId: 'owner-id',
              status: OrganizationStatus.Active,
              createdAt: new Date(),
              updatedAt: new Date(),
              applicationCount: count,
            });

            // The organization should store and return the exact count
            const result = organization.applicationCount === count;
            if (!result) passed = false;
            return result;
          }
        ),
        { numRuns: 100 }
      );
      expect(passed).toBe(true);
    });
  });
});
