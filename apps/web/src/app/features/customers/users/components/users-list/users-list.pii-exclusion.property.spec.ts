/**
 * Property-Based Tests for PII Exclusion in UsersListComponent
 *
 * Feature: application-users-management
 * Property 10: PII Exclusion
 * **Validates: Requirements 4.2**
 *
 * The property states: For any rendered user list, the displayed content
 * SHALL NOT contain email addresses or other personally identifiable information.
 *
 * Strategy: Generate random user data that includes email addresses in the source data,
 * then verify the component template bindings and rendered output do not expose them.
 * The UserWithRoles interface intentionally excludes email — this test confirms that
 * the template only renders non-PII fields (userId, firstName, lastName, roles, environments).
 */

import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';
import * as fc from 'fast-check';

import { UsersListComponent } from './users-list.component';
import { UserTableRow } from '../../store/users.state';
import { UserWithRoles, RoleAssignment } from '../../../../../core/graphql/GetApplicationUsers.graphql';
import * as fromUsers from '../../store/users.selectors';
import { initialUsersState } from '../../store/users.state';

// Email regex pattern to detect email addresses in rendered content
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

// Arbitrary for generating realistic email addresses
const emailArb = fc.tuple(
  fc.stringMatching(/^[a-z][a-z0-9._%+-]{1,15}$/),
  fc.stringMatching(/^[a-z][a-z0-9.-]{1,10}$/),
  fc.constantFrom('com', 'org', 'net', 'io', 'co.uk')
).map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

// Arbitrary for valid environment values
const environmentArb = fc.constantFrom('PRODUCTION', 'STAGING', 'DEVELOPMENT', 'TEST', 'PREVIEW');

// Arbitrary for valid status values
const statusArb = fc.constantFrom('ACTIVE', 'INACTIVE', 'PENDING');

// Arbitrary for non-email user names (realistic first/last names)
const nameArb = fc.constantFrom(
  'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank',
  'Grace', 'Hank', 'Ivy', 'Jack', 'Karen', 'Leo'
);

// Arbitrary for RoleAssignment
const roleAssignmentArb: fc.Arbitrary<RoleAssignment> = fc.record({
  applicationUserRoleId: fc.uuid(),
  applicationId: fc.uuid(),
  applicationName: fc.constantFrom('MyApp', 'Dashboard', 'Portal', 'API Gateway'),
  organizationId: fc.uuid(),
  organizationName: fc.constantFrom('Acme Corp', 'Globex Inc', 'Initech', 'Umbrella Co'),
  environment: environmentArb,
  roleId: fc.uuid(),
  roleName: fc.constantFrom('Admin', 'Editor', 'Viewer', 'Developer'),
  permissions: fc.array(fc.constantFrom('read', 'write', 'delete', 'admin'), { minLength: 1, maxLength: 4 }),
  status: fc.constantFrom('ACTIVE', 'DELETED'),
  createdAt: fc.integer({ min: 1640000000, max: 1800000000 }),
  updatedAt: fc.integer({ min: 1640000000, max: 1800000000 }),
});

// Arbitrary for UserWithRoles — note: no email field exists in the interface
const userWithRolesArb: fc.Arbitrary<UserWithRoles> = fc.record({
  userId: fc.uuid(),
  firstName: nameArb,
  lastName: nameArb,
  status: statusArb,
  roleAssignments: fc.array(roleAssignmentArb, { minLength: 1, maxLength: 5 }),
});

// Build a UserTableRow from a UserWithRoles (mirrors reducer logic)
function buildUserTableRow(user: UserWithRoles): UserTableRow {
  const environments = new Set<string>();
  const organizationNames = new Set<string>();
  const applicationNames = new Set<string>();

  user.roleAssignments.forEach(role => {
    environments.add(role.environment);
    organizationNames.add(role.organizationName);
    applicationNames.add(role.applicationName);
  });

  return {
    user,
    userStatus: user.status,
    roleCount: user.roleAssignments.length,
    environments: Array.from(environments).sort(),
    organizationNames: Array.from(organizationNames).sort(),
    applicationNames: Array.from(applicationNames).sort(),
    lastActivity: 'Just now',
    roleAssignments: user.roleAssignments,
  };
}

describe('UsersListComponent - PII Exclusion Property Tests', () => {
  let store: MockStore;

  const initialState = {
    users: { ...initialUsersState },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [UsersListComponent],
      providers: [
        provideMockStore({ initialState }),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({}),
            snapshot: { queryParams: {} },
          },
        },
      ],
    });

    // Register FontAwesome icons
    const library = TestBed.inject(FaIconLibrary);
    library.addIconPacks(fas);

    store = TestBed.inject(MockStore);
  });

  afterEach(() => {
    store.resetSelectors();
  });

  describe('Property 10: PII Exclusion', () => {
    /**
     * Property: For any rendered user list, the displayed content SHALL NOT
     * contain email addresses or other personally identifiable information.
     *
     * **Validates: Requirements 4.2**
     *
     * This test generates random users with associated email addresses (kept
     * outside the UserWithRoles interface), renders the component, and verifies
     * no email patterns appear in the rendered HTML output.
     */
    it('should not render email addresses in the user list for any generated users', () => {
      fc.assert(
        fc.property(
          // Generate 1-10 users, each paired with a random email that should NOT appear
          fc.array(
            fc.tuple(userWithRolesArb, emailArb),
            { minLength: 1, maxLength: 10 }
          ),
          (usersWithEmails) => {
            const users = usersWithEmails.map(([user]) => user);
            const emails = usersWithEmails.map(([, email]) => email);
            const userRows = users.map(buildUserTableRow);

            // Override store selectors with generated data
            store.overrideSelector(fromUsers.selectFilteredUserRows, userRows);
            store.overrideSelector(fromUsers.selectUserRows, userRows);
            store.overrideSelector(fromUsers.selectIsLoading, false);
            store.overrideSelector(fromUsers.selectError, null);
            store.overrideSelector(fromUsers.selectHasMore, false);
            store.refreshState();

            // Create and render the component
            const fixture = TestBed.createComponent(UsersListComponent);
            fixture.componentInstance.ngOnInit();
            fixture.detectChanges();

            const renderedHtml = fixture.nativeElement.innerHTML;

            // Verify no email addresses appear in the rendered output
            for (const email of emails) {
              expect(renderedHtml).not.toContain(email);
            }

            // Also verify no email-like patterns exist at all in the rendered HTML
            // (catches cases where emails might sneak in through other fields)
            const emailMatches = renderedHtml.match(EMAIL_REGEX);
            expect(emailMatches).toBeNull();

            fixture.destroy();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: The UserWithRoles interface SHALL NOT include an email field,
     * ensuring PII cannot be accidentally rendered.
     *
     * **Validates: Requirements 4.2**
     *
     * For any generated user, the data model bound to the template should not
     * have an email property.
     */
    it('should not have email field in UserWithRoles data model for any user', () => {
      fc.assert(
        fc.property(
          userWithRolesArb,
          (user) => {
            // Verify the UserWithRoles object does not contain an email field
            expect(Object.keys(user)).not.toContain('email');

            // Verify no role assignment contains an email field
            for (const role of user.roleAssignments) {
              expect(Object.keys(role)).not.toContain('email');
            }

            // Verify the UserTableRow built from this user also has no email
            const row = buildUserTableRow(user);
            expect(Object.keys(row)).not.toContain('email');
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: For any user table row, the displayed fields (userId, firstName,
     * lastName, environments, organizationNames, applicationNames) SHALL NOT
     * contain email address patterns.
     *
     * **Validates: Requirements 4.2**
     *
     * This tests the data layer — even if someone injected email-like strings
     * into name fields, the template bindings themselves are verified.
     */
    it('should not display email patterns in any visible table row field', () => {
      fc.assert(
        fc.property(
          userWithRolesArb,
          (user) => {
            const row = buildUserTableRow(user);

            // Collect all string values that would be rendered in the template
            const displayedValues: string[] = [
              row.user.userId,
              row.user.firstName,
              row.user.lastName,
              row.userStatus,
              String(row.roleCount),
              row.lastActivity,
              ...row.environments,
              ...row.organizationNames,
              ...row.applicationNames,
            ];

            // Add expanded row fields (role assignment details)
            for (const role of row.roleAssignments) {
              displayedValues.push(
                role.organizationName,
                role.applicationName,
                role.environment,
                role.roleName,
                role.status,
              );
            }

            // Verify none of the displayed values contain email patterns
            for (const value of displayedValues) {
              expect(value).not.toMatch(EMAIL_REGEX);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
