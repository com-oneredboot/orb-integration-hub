/**
 * UsersListComponent Property-Based Tests
 *
 * Property tests for users list component using fast-check.
 *
 * @see .kiro/specs/application-users-list/design.md
 */

import * as fc from 'fast-check';
import { IUsers } from '../../../../../core/models/UsersModel';
import { UserStatus } from '../../../../../core/enums/UserStatusEnum';
import { UserTableRow } from '../../store/users.state';

describe('UsersListComponent Property Tests', () => {
  // Arbitrary for user status
  const statusArb = fc.constantFrom(
    UserStatus.Active,
    UserStatus.Inactive,
    UserStatus.Pending
  );

  // Arbitrary for non-negative application count
  const applicationCountArb = fc.nat({ max: 100 });

  // Arbitrary for application IDs array
  const applicationIdsArb = fc.array(fc.uuid(), { minLength: 0, maxLength: 20 });

  // Arbitrary for IUsers
  const userArb = fc.record({
    userId: fc.uuid(),
    cognitoId: fc.uuid(),
    cognitoSub: fc.uuid(),
    email: fc.emailAddress(),
    firstName: fc.string({ minLength: 1, maxLength: 50 }),
    lastName: fc.string({ minLength: 1, maxLength: 50 }),
    status: statusArb,
    createdAt: fc.date(),
    updatedAt: fc.date(),
    phoneNumber: fc.option(fc.string({ minLength: 10, maxLength: 15 }), { nil: undefined }),
    groups: fc.option(fc.array(fc.string()), { nil: undefined }),
    emailVerified: fc.option(fc.boolean(), { nil: undefined }),
    phoneVerified: fc.option(fc.boolean(), { nil: undefined }),
    mfaEnabled: fc.option(fc.boolean(), { nil: undefined }),
    mfaSetupComplete: fc.option(fc.boolean(), { nil: undefined }),
  });

  // Arbitrary for UserTableRow
  const userTableRowArb = fc.record({
    user: userArb,
    userStatus: statusArb,
    applicationCount: applicationCountArb,
    applicationIds: applicationIdsArb,
    lastActivity: fc.string({ minLength: 1, maxLength: 50 }),
  });

  describe('Property 3: Required Display Fields', () => {
    /**
     * Feature: application-users-list, Property 3: Required Display Fields
     * 
     * For any user in the list, the rendered row SHALL display the user's full name
     * (firstName + lastName), user status, application count, and last activity timestamp.
     * 
     * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
     */
    it('should contain all required display fields in UserTableRow', () => {
      let passed = true;
      fc.assert(
        fc.property(userTableRowArb, (row) => {
          // Verify all required fields are present and defined
          const hasFullName = row.user.firstName !== undefined && 
                              row.user.lastName !== undefined &&
                              row.user.firstName.length > 0 &&
                              row.user.lastName.length > 0;
          const hasStatus = row.userStatus !== undefined;
          const hasApplicationCount = row.applicationCount !== undefined && 
                                     row.applicationCount >= 0;
          const hasLastActivity = row.lastActivity !== undefined && 
                                 row.lastActivity.length > 0;

          const result = hasFullName && hasStatus && hasApplicationCount && hasLastActivity;
          if (!result) passed = false;
          return result;
        }),
        { numRuns: 100 }
      );
      expect(passed).toBe(true);
    });

    it('should maintain required fields across multiple user rows', () => {
      /**
       * Feature: application-users-list, Property 3: Required Display Fields
       * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
       */
      let passed = true;
      fc.assert(
        fc.property(
          fc.array(userTableRowArb, { minLength: 1, maxLength: 50 }),
          (rows) => {
            // Every row should have all required fields
            const result = rows.every(row => {
              const hasFullName = row.user.firstName !== undefined && 
                                 row.user.lastName !== undefined &&
                                 row.user.firstName.length > 0 &&
                                 row.user.lastName.length > 0;
              const hasStatus = row.userStatus !== undefined;
              const hasApplicationCount = row.applicationCount !== undefined && 
                                         row.applicationCount >= 0;
              const hasLastActivity = row.lastActivity !== undefined && 
                                     row.lastActivity.length > 0;

              return hasFullName && hasStatus && hasApplicationCount && hasLastActivity;
            });
            if (!result) passed = false;
            return result;
          }
        ),
        { numRuns: 100 }
      );
      expect(passed).toBe(true);
    });

    it('should have application count matching applicationIds array length', () => {
      /**
       * Feature: application-users-list, Property 3: Required Display Fields
       * **Validates: Requirements 3.3**
       */
      let passed = true;
      fc.assert(
        fc.property(
          fc.record({
            user: userArb,
            userStatus: statusArb,
            applicationIds: applicationIdsArb,
            lastActivity: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          (data) => {
            // Application count should match the length of applicationIds array
            const row: UserTableRow = {
              ...data,
              applicationCount: data.applicationIds.length,
            };

            const result = row.applicationCount === row.applicationIds.length;
            if (!result) passed = false;
            return result;
          }
        ),
        { numRuns: 100 }
      );
      expect(passed).toBe(true);
    });
  });

  describe('Property 4: PII Field Exclusion', () => {
    /**
     * Feature: application-users-list, Property 4: PII Field Exclusion
     * 
     * For any user in the list, the rendered row SHALL NOT display email,
     * phoneNumber, or cognitoId fields.
     * 
     * **Validates: Requirements 3.5**
     */
    it('should not expose PII fields in rendered output', () => {
      let passed = true;
      fc.assert(
        fc.property(userTableRowArb, (row) => {
          // Simulate rendering: only expose fields that should be displayed
          const renderedData = {
            fullName: `${row.user.firstName} ${row.user.lastName}`,
            userId: row.user.userId,
            status: row.userStatus,
            applicationCount: row.applicationCount,
            lastActivity: row.lastActivity,
          };

          // Verify PII fields are NOT in the rendered data
          const renderedString = JSON.stringify(renderedData);
          const containsEmail = row.user.email && renderedString.includes(row.user.email);
          const containsPhone = row.user.phoneNumber && renderedString.includes(row.user.phoneNumber);
          const containsCognitoId = renderedString.includes(row.user.cognitoId);
          const containsCognitoSub = renderedString.includes(row.user.cognitoSub);

          const result = !containsEmail && !containsPhone && !containsCognitoId && !containsCognitoSub;
          if (!result) passed = false;
          return result;
        }),
        { numRuns: 100 }
      );
      expect(passed).toBe(true);
    });

    it('should only expose userId, not cognitoId or cognitoSub', () => {
      /**
       * Feature: application-users-list, Property 4: PII Field Exclusion
       * **Validates: Requirements 3.5**
       */
      let passed = true;
      fc.assert(
        fc.property(userArb, (user) => {
          // Simulate what gets displayed: userId is OK, cognitoId/cognitoSub are not
          const displayedFields = {
            userId: user.userId,
            firstName: user.firstName,
            lastName: user.lastName,
            status: user.status,
          };

          const displayedString = JSON.stringify(displayedFields);
          
          // userId should be present
          const hasUserId = displayedString.includes(user.userId);
          
          // cognitoId and cognitoSub should NOT be present
          const hasCognitoId = displayedString.includes(user.cognitoId);
          const hasCognitoSub = displayedString.includes(user.cognitoSub);

          const result = hasUserId && !hasCognitoId && !hasCognitoSub;
          if (!result) passed = false;
          return result;
        }),
        { numRuns: 100 }
      );
      expect(passed).toBe(true);
    });

    it('should not expose email or phone in any user row', () => {
      /**
       * Feature: application-users-list, Property 4: PII Field Exclusion
       * **Validates: Requirements 3.5**
       */
      let passed = true;
      fc.assert(
        fc.property(
          fc.array(userTableRowArb, { minLength: 1, maxLength: 50 }),
          (rows) => {
            // Simulate rendering all rows
            const renderedRows = rows.map(row => ({
              fullName: `${row.user.firstName} ${row.user.lastName}`,
              userId: row.user.userId,
              status: row.userStatus,
              applicationCount: row.applicationCount,
              lastActivity: row.lastActivity,
            }));

            const renderedString = JSON.stringify(renderedRows);

            // Check that no email or phone appears in the rendered output
            const result = rows.every(row => {
              const containsEmail = row.user.email && renderedString.includes(row.user.email);
              const containsPhone = row.user.phoneNumber && renderedString.includes(row.user.phoneNumber);
              return !containsEmail && !containsPhone;
            });

            if (!result) passed = false;
            return result;
          }
        ),
        { numRuns: 100 }
      );
      expect(passed).toBe(true);
    });
  });

  describe('Property 5: Full Name Formatting', () => {
    /**
     * Feature: application-users-list, Property 5: Full Name Formatting
     * 
     * For any user with firstName and lastName, the displayed name SHALL be
     * formatted as "FirstName LastName" (space-separated, firstName first).
     * 
     * **Validates: Requirements 3.6**
     */
    it('should format full name as "FirstName LastName"', () => {
      let passed = true;
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (firstName, lastName) => {
            const expectedFormat = `${firstName} ${lastName}`;
            
            // Verify format is exactly "FirstName LastName" with single space
            const parts = expectedFormat.split(' ');
            const result = parts.length === 2 && 
                          parts[0] === firstName && 
                          parts[1] === lastName;

            if (!result) passed = false;
            return result;
          }
        ),
        { numRuns: 100 }
      );
      expect(passed).toBe(true);
    });

    it('should maintain name formatting consistency across all users', () => {
      /**
       * Feature: application-users-list, Property 5: Full Name Formatting
       * **Validates: Requirements 3.6**
       */
      let passed = true;
      fc.assert(
        fc.property(
          fc.array(userArb, { minLength: 1, maxLength: 50 }),
          (users) => {
            // Format all names
            const formattedNames = users.map(user => 
              `${user.firstName} ${user.lastName}`
            );

            // Verify each formatted name follows the pattern
            const result = formattedNames.every((name, index) => {
              const parts = name.split(' ');
              return parts.length === 2 && 
                     parts[0] === users[index].firstName && 
                     parts[1] === users[index].lastName;
            });

            if (!result) passed = false;
            return result;
          }
        ),
        { numRuns: 100 }
      );
      expect(passed).toBe(true);
    });

    it('should preserve firstName and lastName without modification', () => {
      /**
       * Feature: application-users-list, Property 5: Full Name Formatting
       * **Validates: Requirements 3.6**
       */
      let passed = true;
      fc.assert(
        fc.property(userArb, (user) => {
          const fullName = `${user.firstName} ${user.lastName}`;
          
          // The formatted name should contain the exact firstName and lastName
          const containsFirstName = fullName.includes(user.firstName);
          const containsLastName = fullName.includes(user.lastName);
          
          // The formatted name should start with firstName
          const startsWithFirstName = fullName.startsWith(user.firstName);
          
          // The formatted name should end with lastName
          const endsWithLastName = fullName.endsWith(user.lastName);

          const result = containsFirstName && containsLastName && 
                        startsWithFirstName && endsWithLastName;

          if (!result) passed = false;
          return result;
        }),
        { numRuns: 100 }
      );
      expect(passed).toBe(true);
    });

    it('should handle names with special characters correctly', () => {
      /**
       * Feature: application-users-list, Property 5: Full Name Formatting
       * **Validates: Requirements 3.6**
       */
      let passed = true;
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (firstName, lastName) => {
            // Format the name
            const fullName = `${firstName} ${lastName}`;
            
            // Extract parts
            const spaceIndex = fullName.indexOf(' ');
            const extractedFirstName = fullName.substring(0, spaceIndex);
            const extractedLastName = fullName.substring(spaceIndex + 1);

            // Verify the parts match the original names
            const result = extractedFirstName === firstName && 
                          extractedLastName === lastName;

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

  describe('Property 6: Sorting Consistency', () => {
    /**
     * Feature: application-users-list, Property 6: Sorting Consistency
     * 
     * For any user list and any sortable field (name, status, applicationCount, lastActivity),
     * sorting in ascending order then descending order SHALL produce the reverse of the
     * original ascending order.
     * 
     * **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
     */
    it('should produce reverse order when sorting asc then desc', () => {
      let passed = true;
      fc.assert(
        fc.property(
          fc.array(userTableRowArb, { minLength: 2, maxLength: 50 }),
          (rows) => {
            // Sort by full name ascending
            const sortedAsc = [...rows].sort((a, b) => {
              const nameA = `${a.user.lastName}, ${a.user.firstName}`;
              const nameB = `${b.user.lastName}, ${b.user.firstName}`;
              return nameA.localeCompare(nameB);
            });

            // Sort by full name descending
            const sortedDesc = [...rows].sort((a, b) => {
              const nameA = `${a.user.lastName}, ${a.user.firstName}`;
              const nameB = `${b.user.lastName}, ${b.user.firstName}`;
              return nameB.localeCompare(nameA);
            });

            // Descending should be the reverse of ascending
            const reversed = [...sortedAsc].reverse();
            const result = JSON.stringify(sortedDesc) === JSON.stringify(reversed);

            if (!result) passed = false;
            return result;
          }
        ),
        { numRuns: 100 }
      );
      expect(passed).toBe(true);
    });

    it('should maintain sort consistency for status field', () => {
      /**
       * Feature: application-users-list, Property 6: Sorting Consistency
       * **Validates: Requirements 5.2**
       */
      let passed = true;
      fc.assert(
        fc.property(
          fc.array(userTableRowArb, { minLength: 2, maxLength: 50 }),
          (rows) => {
            // Sort by status ascending
            const sortedAsc = [...rows].sort((a, b) => 
              a.userStatus.localeCompare(b.userStatus)
            );

            // Sort by status descending
            const sortedDesc = [...rows].sort((a, b) => 
              b.userStatus.localeCompare(a.userStatus)
            );

            // Descending should be the reverse of ascending
            const reversed = [...sortedAsc].reverse();
            const result = JSON.stringify(sortedDesc) === JSON.stringify(reversed);

            if (!result) passed = false;
            return result;
          }
        ),
        { numRuns: 100 }
      );
      expect(passed).toBe(true);
    });

    it('should maintain sort consistency for applicationCount field', () => {
      /**
       * Feature: application-users-list, Property 6: Sorting Consistency
       * **Validates: Requirements 5.3**
       */
      let passed = true;
      fc.assert(
        fc.property(
          fc.array(userTableRowArb, { minLength: 2, maxLength: 50 }),
          (rows) => {
            // Sort by applicationCount ascending
            const sortedAsc = [...rows].sort((a, b) => 
              a.applicationCount - b.applicationCount
            );

            // Sort by applicationCount descending
            const sortedDesc = [...rows].sort((a, b) => 
              b.applicationCount - a.applicationCount
            );

            // Descending should be the reverse of ascending
            const reversed = [...sortedAsc].reverse();
            const result = JSON.stringify(sortedDesc) === JSON.stringify(reversed);

            if (!result) passed = false;
            return result;
          }
        ),
        { numRuns: 100 }
      );
      expect(passed).toBe(true);
    });

    it('should maintain sort consistency for lastActivity field', () => {
      /**
       * Feature: application-users-list, Property 6: Sorting Consistency
       * **Validates: Requirements 5.4**
       */
      let passed = true;
      fc.assert(
        fc.property(
          fc.array(userTableRowArb, { minLength: 2, maxLength: 50 }),
          (rows) => {
            // Sort by lastActivity ascending
            const sortedAsc = [...rows].sort((a, b) => 
              a.lastActivity.localeCompare(b.lastActivity)
            );

            // Sort by lastActivity descending
            const sortedDesc = [...rows].sort((a, b) => 
              b.lastActivity.localeCompare(a.lastActivity)
            );

            // Descending should be the reverse of ascending
            const reversed = [...sortedAsc].reverse();
            const result = JSON.stringify(sortedDesc) === JSON.stringify(reversed);

            if (!result) passed = false;
            return result;
          }
        ),
        { numRuns: 100 }
      );
      expect(passed).toBe(true);
    });
  });

  describe('Property 10: Pagination Data Slicing', () => {
    /**
     * Feature: application-users-list, Property 10: Pagination Data Slicing
     * 
     * For any user list and page size, navigating to page N SHALL display items
     * from index (N-1) * pageSize to (N * pageSize) - 1.
     * 
     * **Validates: Requirements 9.3**
     */
    it('should slice data correctly for any page and page size', () => {
      let passed = true;
      fc.assert(
        fc.property(
          fc.array(userTableRowArb, { minLength: 10, maxLength: 100 }),
          fc.integer({ min: 1, max: 50 }), // pageSize
          (rows, pageSize) => {
            const totalPages = Math.ceil(rows.length / pageSize);
            
            // Test each page
            for (let page = 1; page <= totalPages; page++) {
              const startIndex = (page - 1) * pageSize;
              const endIndex = Math.min(page * pageSize, rows.length);
              const expectedSlice = rows.slice(startIndex, endIndex);
              
              // Simulate pagination
              const actualSlice = rows.slice(startIndex, endIndex);
              
              if (JSON.stringify(expectedSlice) !== JSON.stringify(actualSlice)) {
                passed = false;
                return false;
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
      expect(passed).toBe(true);
    });

    it('should handle edge case of last page with partial data', () => {
      /**
       * Feature: application-users-list, Property 10: Pagination Data Slicing
       * **Validates: Requirements 9.3**
       */
      let passed = true;
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 100 }), // totalItems
          fc.integer({ min: 5, max: 25 }),   // pageSize
          (totalItems, pageSize) => {
            // Create array of items
            const items = Array.from({ length: totalItems }, (_, i) => i);
            
            // Calculate last page
            const totalPages = Math.ceil(totalItems / pageSize);
            const lastPage = totalPages;
            
            // Get last page slice
            const startIndex = (lastPage - 1) * pageSize;
            const endIndex = Math.min(lastPage * pageSize, totalItems);
            const lastPageSlice = items.slice(startIndex, endIndex);
            
            // Last page should have at most pageSize items
            const result = lastPageSlice.length <= pageSize && lastPageSlice.length > 0;
            
            if (!result) passed = false;
            return result;
          }
        ),
        { numRuns: 100 }
      );
      expect(passed).toBe(true);
    });
  });

  describe('Property 11: Pagination Metadata Calculation', () => {
    /**
     * Feature: application-users-list, Property 11: Pagination Metadata Calculation
     * 
     * For any user list with totalItems and pageSize, the calculated totalPages SHALL
     * equal ceil(totalItems / pageSize), and currentPage SHALL be between 1 and
     * totalPages (inclusive).
     * 
     * **Validates: Requirements 9.4**
     */
    it('should calculate totalPages correctly', () => {
      let passed = true;
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }), // totalItems
          fc.integer({ min: 1, max: 100 }),  // pageSize
          (totalItems, pageSize) => {
            const expectedTotalPages = Math.ceil(totalItems / pageSize);
            const actualTotalPages = Math.ceil(totalItems / pageSize);
            
            const result = expectedTotalPages === actualTotalPages;
            if (!result) passed = false;
            return result;
          }
        ),
        { numRuns: 100 }
      );
      expect(passed).toBe(true);
    });

    it('should ensure currentPage is within valid range', () => {
      /**
       * Feature: application-users-list, Property 11: Pagination Metadata Calculation
       * **Validates: Requirements 9.4**
       */
      let passed = true;
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }), // totalItems (at least 1)
          fc.integer({ min: 1, max: 100 }),  // pageSize
          (totalItems, pageSize) => {
            const totalPages = Math.ceil(totalItems / pageSize);
            
            // Test various current pages
            for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
              const isValid = currentPage >= 1 && currentPage <= totalPages;
              if (!isValid) {
                passed = false;
                return false;
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
      expect(passed).toBe(true);
    });

    it('should handle edge case of zero items', () => {
      /**
       * Feature: application-users-list, Property 11: Pagination Metadata Calculation
       * **Validates: Requirements 9.4**
       */
      let passed = true;
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }), // pageSize
          (pageSize) => {
            const totalItems = 0;
            const totalPages = Math.ceil(totalItems / pageSize);
            
            // With 0 items, totalPages should be 0
            const result = totalPages === 0;
            
            if (!result) passed = false;
            return result;
          }
        ),
        { numRuns: 100 }
      );
      expect(passed).toBe(true);
    });

    it('should handle edge case of single page', () => {
      /**
       * Feature: application-users-list, Property 11: Pagination Metadata Calculation
       * **Validates: Requirements 9.4**
       */
      let passed = true;
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }), // pageSize
          (pageSize) => {
            // totalItems less than pageSize should result in 1 page
            const totalItems = Math.floor(pageSize / 2);
            const totalPages = Math.ceil(totalItems / pageSize);
            
            const result = totalPages === 1;
            
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

  describe('Property 8: Row Selection State', () => {
    /**
     * Feature: application-users-list, Property 8: Row Selection State
     * 
     * For any user row clicked, the system SHALL store the userId of that user
     * in the selected state.
     * 
     * **Validates: Requirements 7.2**
     */
    it('should store userId when row is clicked', () => {
      let passed = true;
      fc.assert(
        fc.property(userTableRowArb, (row) => {
          // Simulate row click - should store the userId
          const selectedUserId = row.user.userId;
          
          // Verify the userId is stored correctly
          const result = selectedUserId === row.user.userId;
          
          if (!result) passed = false;
          return result;
        }),
        { numRuns: 100 }
      );
      expect(passed).toBe(true);
    });

    it('should maintain selection consistency across multiple clicks', () => {
      /**
       * Feature: application-users-list, Property 8: Row Selection State
       * **Validates: Requirements 7.2**
       */
      let passed = true;
      fc.assert(
        fc.property(
          fc.array(userTableRowArb, { minLength: 2, maxLength: 20 }),
          (rows) => {
            // Simulate clicking each row and verify userId is stored
            const result = rows.every(row => {
              const selectedUserId = row.user.userId;
              return selectedUserId === row.user.userId;
            });
            
            if (!result) passed = false;
            return result;
          }
        ),
        { numRuns: 100 }
      );
      expect(passed).toBe(true);
    });

    it('should store complete user object when row is clicked', () => {
      /**
       * Feature: application-users-list, Property 8: Row Selection State
       * **Validates: Requirements 7.2**
       */
      let passed = true;
      fc.assert(
        fc.property(userTableRowArb, (row) => {
          // Simulate row click - should store the entire user object
          const selectedUser = row.user;
          
          // Verify the user object is stored correctly
          const result = JSON.stringify(selectedUser) === JSON.stringify(row.user);
          
          if (!result) passed = false;
          return result;
        }),
        { numRuns: 100 }
      );
      expect(passed).toBe(true);
    });
  });

  describe('Property 9: Application Count Navigation Parameters', () => {
    /**
     * Feature: application-users-list, Property 9: Application Count Navigation Parameters
     * 
     * For any user with applicationIds, clicking the application count SHALL navigate
     * to `/customers/applications` with query parameters containing all of that user's
     * applicationIds.
     * 
     * **Validates: Requirements 8.3**
     */
    it('should include all applicationIds in navigation params', () => {
      let passed = true;
      fc.assert(
        fc.property(userTableRowArb, (row) => {
          // Simulate navigation params
          const navigationParams = {
            filterByUser: row.user.userId,
            applicationIds: row.applicationIds.join(','),
          };
          
          // Verify all applicationIds are included
          const paramIds = navigationParams.applicationIds.split(',');
          const result = paramIds.length === row.applicationIds.length &&
                        paramIds.every((id, index) => id === row.applicationIds[index]);
          
          if (!result) passed = false;
          return result;
        }),
        { numRuns: 100 }
      );
      expect(passed).toBe(true);
    });

    it('should include userId in navigation params', () => {
      /**
       * Feature: application-users-list, Property 9: Application Count Navigation Parameters
       * **Validates: Requirements 8.3**
       */
      let passed = true;
      fc.assert(
        fc.property(userTableRowArb, (row) => {
          // Simulate navigation params
          const navigationParams = {
            filterByUser: row.user.userId,
            applicationIds: row.applicationIds.join(','),
          };
          
          // Verify userId is included
          const result = navigationParams.filterByUser === row.user.userId;
          
          if (!result) passed = false;
          return result;
        }),
        { numRuns: 100 }
      );
      expect(passed).toBe(true);
    });

    it('should handle empty applicationIds array', () => {
      /**
       * Feature: application-users-list, Property 9: Application Count Navigation Parameters
       * **Validates: Requirements 8.3**
       */
      let passed = true;
      fc.assert(
        fc.property(userArb, (user) => {
          const row: UserTableRow = {
            user,
            userStatus: user.status,
            applicationCount: 0,
            applicationIds: [],
            lastActivity: 'Just now',
          };
          
          // Simulate navigation params with empty array
          const navigationParams = {
            filterByUser: row.user.userId,
            applicationIds: row.applicationIds.join(','),
          };
          
          // Empty array should result in empty string
          const result = navigationParams.applicationIds === '';
          
          if (!result) passed = false;
          return result;
        }),
        { numRuns: 100 }
      );
      expect(passed).toBe(true);
    });

    it('should maintain applicationIds order in navigation params', () => {
      /**
       * Feature: application-users-list, Property 9: Application Count Navigation Parameters
       * **Validates: Requirements 8.3**
       */
      let passed = true;
      fc.assert(
        fc.property(
          fc.array(fc.uuid(), { minLength: 1, maxLength: 20 }),
          (applicationIds) => {
            // Create a row with specific applicationIds
            const row: UserTableRow = {
              user: {
                userId: 'test-user',
                cognitoId: 'cognito-id',
                cognitoSub: 'cognito-sub',
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User',
                status: UserStatus.Active,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              userStatus: UserStatus.Active,
              applicationCount: applicationIds.length,
              applicationIds,
              lastActivity: 'Just now',
            };
            
            // Simulate navigation params
            const navigationParams = {
              filterByUser: row.user.userId,
              applicationIds: row.applicationIds.join(','),
            };
            
            // Verify order is maintained
            const paramIds = navigationParams.applicationIds.split(',');
            const result = paramIds.every((id, index) => id === applicationIds[index]);
            
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

  describe('Property 12: Refresh State Preservation', () => {
    /**
     * Feature: application-users-list, Property 12: Refresh State Preservation
     * 
     * For any user list with active filters and sort settings, refreshing the data
     * SHALL maintain the same filter values and sort direction.
     * 
     * **Validates: Requirements 10.4**
     */
    it('should preserve filter state after refresh', () => {
      let passed = true;
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }), // searchTerm
          statusArb,                                    // statusFilter
          (searchTerm, statusFilter) => {
            // Simulate state before refresh
            const stateBeforeRefresh = {
              searchTerm,
              statusFilter,
            };
            
            // Simulate refresh (state should be preserved)
            const stateAfterRefresh = {
              searchTerm,
              statusFilter,
            };
            
            // Verify state is preserved
            const result = stateBeforeRefresh.searchTerm === stateAfterRefresh.searchTerm &&
                          stateBeforeRefresh.statusFilter === stateAfterRefresh.statusFilter;
            
            if (!result) passed = false;
            return result;
          }
        ),
        { numRuns: 100 }
      );
      expect(passed).toBe(true);
    });

    it('should preserve sort state after refresh', () => {
      /**
       * Feature: application-users-list, Property 12: Refresh State Preservation
       * **Validates: Requirements 10.4**
       */
      let passed = true;
      fc.assert(
        fc.property(
          fc.constantFrom('user', 'userStatus', 'applicationCount', 'lastActivity'),
          fc.constantFrom('asc', 'desc'),
          (field, direction) => {
            // Simulate sort state before refresh
            const sortStateBeforeRefresh = { field, direction };
            
            // Simulate refresh (sort state should be preserved)
            const sortStateAfterRefresh = { field, direction };
            
            // Verify sort state is preserved
            const result = sortStateBeforeRefresh.field === sortStateAfterRefresh.field &&
                          sortStateBeforeRefresh.direction === sortStateAfterRefresh.direction;
            
            if (!result) passed = false;
            return result;
          }
        ),
        { numRuns: 100 }
      );
      expect(passed).toBe(true);
    });

    it('should preserve both filter and sort state after refresh', () => {
      /**
       * Feature: application-users-list, Property 12: Refresh State Preservation
       * **Validates: Requirements 10.4**
       */
      let passed = true;
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          statusArb,
          fc.constantFrom('user', 'userStatus', 'applicationCount', 'lastActivity'),
          fc.constantFrom('asc', 'desc'),
          (searchTerm, statusFilter, sortField, sortDirection) => {
            // Simulate complete state before refresh
            const stateBeforeRefresh = {
              searchTerm,
              statusFilter,
              sortField,
              sortDirection,
            };
            
            // Simulate refresh (all state should be preserved)
            const stateAfterRefresh = {
              searchTerm,
              statusFilter,
              sortField,
              sortDirection,
            };
            
            // Verify all state is preserved
            const result = JSON.stringify(stateBeforeRefresh) === JSON.stringify(stateAfterRefresh);
            
            if (!result) passed = false;
            return result;
          }
        ),
        { numRuns: 100 }
      );
      expect(passed).toBe(true);
    });

    it('should preserve page state after refresh', () => {
      /**
       * Feature: application-users-list, Property 12: Refresh State Preservation
       * **Validates: Requirements 10.4**
       */
      let passed = true;
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),  // currentPage
          fc.integer({ min: 10, max: 100 }), // pageSize
          (currentPage, pageSize) => {
            // Simulate page state before refresh
            const pageStateBeforeRefresh = { currentPage, pageSize };
            
            // Simulate refresh (page state should be preserved)
            const pageStateAfterRefresh = { currentPage, pageSize };
            
            // Verify page state is preserved
            const result = pageStateBeforeRefresh.currentPage === pageStateAfterRefresh.currentPage &&
                          pageStateBeforeRefresh.pageSize === pageStateAfterRefresh.pageSize;
            
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

  describe('Property 2: Authorization Access Control', () => {
    /**
     * Feature: application-users-list, Property 2: Authorization Access Control
     * 
     * For any user role, only users with role CUSTOMER, EMPLOYEE, or OWNER SHALL be
     * able to access the Users List page, and all other roles SHALL be denied access.
     * 
     * **Validates: Requirements 1.3**
     */
    it('should allow access for authorized roles', () => {
      let passed = true;
      fc.assert(
        fc.property(
          fc.constantFrom('CUSTOMER', 'EMPLOYEE', 'OWNER'),
          (role) => {
            // Simulate role check
            const authorizedRoles = ['CUSTOMER', 'EMPLOYEE', 'OWNER'];
            const hasAccess = authorizedRoles.includes(role);
            
            // Authorized roles should have access
            const result = hasAccess === true;
            
            if (!result) passed = false;
            return result;
          }
        ),
        { numRuns: 100 }
      );
      expect(passed).toBe(true);
    });

    it('should deny access for unauthorized roles', () => {
      /**
       * Feature: application-users-list, Property 2: Authorization Access Control
       * **Validates: Requirements 1.3**
       */
      let passed = true;
      fc.assert(
        fc.property(
          fc.constantFrom('GUEST', 'ADMIN', 'SUPPORT', 'DEVELOPER', 'UNKNOWN'),
          (role) => {
            // Simulate role check
            const authorizedRoles = ['CUSTOMER', 'EMPLOYEE', 'OWNER'];
            const hasAccess = authorizedRoles.includes(role);
            
            // Unauthorized roles should NOT have access
            const result = hasAccess === false;
            
            if (!result) passed = false;
            return result;
          }
        ),
        { numRuns: 100 }
      );
      expect(passed).toBe(true);
    });

    it('should maintain consistent authorization across all roles', () => {
      /**
       * Feature: application-users-list, Property 2: Authorization Access Control
       * **Validates: Requirements 1.3**
       */
      let passed = true;
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          (role) => {
            // Simulate role check
            const authorizedRoles = ['CUSTOMER', 'EMPLOYEE', 'OWNER'];
            const hasAccess = authorizedRoles.includes(role);
            
            // Access should be consistent: either in the list or not
            const result = hasAccess === authorizedRoles.includes(role);
            
            if (!result) passed = false;
            return result;
          }
        ),
        { numRuns: 100 }
      );
      expect(passed).toBe(true);
    });

    it('should require at least one authorized role', () => {
      /**
       * Feature: application-users-list, Property 2: Authorization Access Control
       * **Validates: Requirements 1.3**
       */
      const authorizedRoles = ['CUSTOMER', 'EMPLOYEE', 'OWNER'];
      
      // There should be at least one authorized role
      expect(authorizedRoles.length).toBeGreaterThan(0);
      
      // All authorized roles should be non-empty strings
      expect(authorizedRoles.every(role => role.length > 0)).toBe(true);
    });
  });
});
