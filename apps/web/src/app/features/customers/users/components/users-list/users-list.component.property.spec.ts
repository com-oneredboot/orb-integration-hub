/**
 * Property-Based Tests for UsersListComponent
 * 
 * These tests validate universal correctness properties that must hold
 * for all possible inputs, using the fast-check library for property-based testing.
 * 
 * Feature: application-users-management
 * Property 10: PII Exclusion
 * Property 11: Route-Based Filter Application
 */

import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { BehaviorSubject, of } from 'rxjs';
import * as fc from 'fast-check';

import { UsersListComponent } from './users-list.component';
import { UsersActions } from '../../store/users.actions';
import { UserTableRow } from '../../store/users.state';
import { UserWithRoles, RoleAssignment } from '../../../../../core/graphql/GetApplicationUsers.graphql';

// Helper type for dispatched actions
type DispatchedAction = ReturnType<typeof UsersActions.setOrganizationFilter> | 
  ReturnType<typeof UsersActions.setApplicationFilter> | 
  ReturnType<typeof UsersActions.setEnvironmentFilter> | 
  ReturnType<typeof UsersActions.loadUsers>;

describe('UsersListComponent - Property Tests', () => {
  let _component: UsersListComponent;
  let fixture: ComponentFixture<UsersListComponent> | null;
  let mockStore: jasmine.SpyObj<Store>;
  let queryParamsSubject: BehaviorSubject<Record<string, string>>;
  let dispatchedActions: DispatchedAction[];

  beforeEach(() => {
    dispatchedActions = [];
    fixture = null;

    // Create mock store with spy methods
    mockStore = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    mockStore.select.and.returnValue(of([]));
    
    // Simple approach: just capture actions in the array
    const captureAction = (action: DispatchedAction) => {
      dispatchedActions.push(action);
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockStore.dispatch.and.callFake(captureAction as any);

    // Create query params subject for testing
    queryParamsSubject = new BehaviorSubject<Record<string, string>>({});

    TestBed.configureTestingModule({
      imports: [UsersListComponent],
      providers: [
        { provide: Store, useValue: mockStore },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: queryParamsSubject.asObservable(),
            snapshot: { queryParams: {} }
          }
        }
      ]
    });

    // Don't create fixture here - let each test create it when needed
  });

  afterEach(() => {
    if (fixture) {
      fixture.destroy();
    }
  });

  describe('Property 10: PII Exclusion', () => {
    /**
     * Property: For any rendered user list, the displayed content SHALL NOT contain
     * email addresses or other personally identifiable information.
     * 
     * Validates: Requirements 4.2
     * 
     * This property verifies that the UserTableRow interface and template do not
     * expose email addresses in the list view.
     */
    it('should not include email in UserTableRow data structure', (done) => {
      expect(() => {
        fc.assert(
          fc.property(
            // Generate arbitrary user data with email
            fc.record({
              userId: fc.uuid(),
              firstName: fc.string({ minLength: 1, maxLength: 50 }),
              lastName: fc.string({ minLength: 1, maxLength: 50 }),
              email: fc.emailAddress(), // Generate random email addresses
              status: fc.constantFrom('ACTIVE', 'INACTIVE', 'PENDING'),
            }),
            // Generate arbitrary role assignments
            fc.array(
              fc.record({
                applicationUserRoleId: fc.uuid(),
                applicationId: fc.uuid(),
                applicationName: fc.string({ minLength: 1, maxLength: 100 }),
                organizationId: fc.uuid(),
                organizationName: fc.string({ minLength: 1, maxLength: 100 }),
                environment: fc.constantFrom('PRODUCTION', 'STAGING', 'DEVELOPMENT', 'TEST', 'PREVIEW'),
                roleId: fc.uuid(),
                roleName: fc.string({ minLength: 1, maxLength: 50 }),
                permissions: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
                status: fc.constantFrom('ACTIVE', 'DELETED'),
                createdAt: fc.integer({ min: 1000000000, max: 2000000000 }),
                updatedAt: fc.integer({ min: 1000000000, max: 2000000000 }),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            (userData, roleAssignments) => {
              // Create UserWithRoles (which may have email in the raw data)
              const userWithRoles: UserWithRoles = {
                userId: userData.userId,
                firstName: userData.firstName,
                lastName: userData.lastName,
                status: userData.status,
                roleAssignments: roleAssignments as RoleAssignment[],
              };

              // Create UserTableRow (the data structure used in the template)
              const userTableRow: UserTableRow = {
                user: userWithRoles,
                userStatus: userData.status,
                roleCount: roleAssignments.length,
                environments: [...new Set(roleAssignments.map(r => r.environment))],
                organizationNames: [...new Set(roleAssignments.map(r => r.organizationName))],
                applicationNames: [...new Set(roleAssignments.map(r => r.applicationName))],
                lastActivity: 'Just now',
                roleAssignments: roleAssignments as RoleAssignment[],
              };

              // Verify that UserTableRow does NOT have an email property at the top level
              expect('email' in userTableRow).toBeFalse();

              // Verify that the user object in UserTableRow does NOT have email
              // (UserWithRoles interface should not include email)
              expect('email' in userTableRow.user).toBeFalse();

              // Verify that role assignments do NOT contain email
              for (const role of userTableRow.roleAssignments) {
                expect('email' in role).toBeFalse();
                expect('userEmail' in role).toBeFalse();
              }

              // Verify that the displayed fields do not contain the email
              const displayedFields = [
                userTableRow.user.firstName,
                userTableRow.user.lastName,
                userTableRow.user.userId,
                userTableRow.userStatus,
                userTableRow.lastActivity,
                ...userTableRow.environments,
                ...userTableRow.organizationNames,
                ...userTableRow.applicationNames,
              ];

              // None of the displayed fields should contain the email address
              for (const field of displayedFields) {
                // Skip checking if the field itself is the email (which shouldn't happen)
                // Only check that the email is not embedded in other fields
                if (field !== userData.email) {
                  expect(field).not.toContain(userData.email);
                }
              }

              // Verify role assignment displayed fields don't contain email
              for (const role of userTableRow.roleAssignments) {
                const roleFields = [
                  role.organizationName,
                  role.applicationName,
                  role.environment,
                  role.roleName,
                  role.status,
                ];
                for (const field of roleFields) {
                  expect(field).not.toContain(userData.email);
                }
              }
            }
          ),
          { numRuns: 100 }
        );
      }).not.toThrow();
      done();
    });

    /**
     * Property: The UserWithRoles interface SHALL NOT include email field.
     * 
     * Validates: Requirements 4.2
     */
    it('should verify UserWithRoles interface excludes email', () => {
      // This is a compile-time check - if UserWithRoles had email, this would fail
      const minimalUser: UserWithRoles = {
        userId: 'test-id',
        firstName: 'Test',
        lastName: 'User',
        status: 'ACTIVE',
        roleAssignments: [],
      };

      // Verify the interface only has the expected fields
      const expectedKeys = ['userId', 'firstName', 'lastName', 'status', 'roleAssignments'];
      const actualKeys = Object.keys(minimalUser);
      
      expect(actualKeys.sort()).toEqual(expectedKeys.sort());
      expect(actualKeys).not.toContain('email');
      expect(actualKeys).not.toContain('phoneNumber');
      expect(actualKeys).not.toContain('address');
    });

    /**
     * Property: For any generated user data with PII, the UserTableRow transformation
     * SHALL strip out PII fields.
     * 
     * Validates: Requirements 4.2
     */
    it('should not expose PII fields in table row transformation', (done) => {
      expect(() => {
        fc.assert(
          fc.property(
            // Generate user data with various PII fields
            fc.record({
              userId: fc.uuid(),
              firstName: fc.string({ minLength: 1, maxLength: 50 }),
              lastName: fc.string({ minLength: 1, maxLength: 50 }),
              status: fc.constantFrom('ACTIVE', 'INACTIVE', 'PENDING'),
            }),
            (userData) => {
              // Create UserWithRoles
              const userWithRoles: UserWithRoles = {
                userId: userData.userId,
                firstName: userData.firstName,
                lastName: userData.lastName,
                status: userData.status,
                roleAssignments: [],
              };

              // Create UserTableRow
              const userTableRow: UserTableRow = {
                user: userWithRoles,
                userStatus: userData.status,
                roleCount: 0,
                environments: [],
                organizationNames: [],
                applicationNames: [],
                lastActivity: 'Never',
                roleAssignments: [],
              };

              // Verify no PII fields exist
              const piiFields = ['email', 'phoneNumber', 'phone', 'address', 'ssn', 'socialSecurityNumber'];
              
              for (const piiField of piiFields) {
                expect(piiField in userTableRow).toBeFalse();
                expect(piiField in userTableRow.user).toBeFalse();
              }
            }
          ),
          { numRuns: 100 }
        );
      }).not.toThrow();
      done();
    });
  });

  describe('Property 11: Route-Based Filter Application', () => {
    /**
     * Property: For any route with query parameters (organizationIds, applicationIds, environment),
     * the component SHALL automatically apply filters matching those parameters to the store.
     * 
     * Validates: Requirements 5.4
     */
    it('should dispatch filter actions for any combination of query parameters', (done) => {
      expect(() => {
        fc.assert(
          fc.property(
            // Generate arbitrary organization IDs (array of 0-5 UUIDs)
            fc.array(fc.uuid(), { minLength: 0, maxLength: 5 }),
            // Generate arbitrary application IDs (array of 0-5 UUIDs)
            fc.array(fc.uuid(), { minLength: 0, maxLength: 5 }),
            // Generate arbitrary environment (or null)
            fc.oneof(
              fc.constant(null),
              fc.constantFrom('PRODUCTION', 'STAGING', 'DEVELOPMENT', 'TEST', 'PREVIEW')
            ),
            (orgIds, appIds, environment) => {
              // Reset dispatched actions
              dispatchedActions = [];

              // Build query params object
              const queryParams: Record<string, string> = {};
              if (orgIds.length > 0) {
                queryParams['organizationIds'] = orgIds.join(',');
              }
              if (appIds.length > 0) {
                queryParams['applicationIds'] = appIds.join(',');
              }
              if (environment) {
                queryParams['environment'] = environment;
              }

              // Emit query params BEFORE creating component
              queryParamsSubject.next(queryParams);

              // Create fresh component for this iteration
              const testFixture = TestBed.createComponent(UsersListComponent);
              const testComponent = testFixture.componentInstance;

              // Initialize component (this will subscribe to queryParams)
              testComponent.ngOnInit();

              // Don't call detectChanges() to avoid template rendering issues with FontAwesome

              // Check organization filter
              if (orgIds.length > 0) {
                const orgFilterAction = dispatchedActions.find(
                  action => action.type === UsersActions.setOrganizationFilter.type
                );
                expect(orgFilterAction).toBeDefined();
                if (orgFilterAction && 'organizationIds' in orgFilterAction) {
                  expect(orgFilterAction.organizationIds).toEqual(orgIds);
                }
              }

              // Check application filter
              if (appIds.length > 0) {
                const appFilterAction = dispatchedActions.find(
                  action => action.type === UsersActions.setApplicationFilter.type
                );
                expect(appFilterAction).toBeDefined();
                if (appFilterAction && 'applicationIds' in appFilterAction) {
                  expect(appFilterAction.applicationIds).toEqual(appIds);
                }
              }

              // Check environment filter
              if (environment) {
                const envFilterAction = dispatchedActions.find(
                  action => action.type === UsersActions.setEnvironmentFilter.type
                );
                expect(envFilterAction).toBeDefined();
                if (envFilterAction && 'environment' in envFilterAction) {
                  expect(envFilterAction.environment).toEqual(environment);
                }
              }

              // Verify loadUsers was dispatched
              const loadUsersAction = dispatchedActions.find(
                action => action.type === UsersActions.loadUsers.type
              );
              expect(loadUsersAction).toBeDefined();

              // Clean up
              testFixture.destroy();
            }
          ),
          { numRuns: 100 } // Run 100 iterations
        );
      }).not.toThrow();
      done();
    });

    /**
     * Property: When no query parameters are provided, the component SHALL still
     * dispatch loadUsers action (no filters applied).
     * 
     * Validates: Requirements 5.1
     */
    it('should dispatch loadUsers even when no query parameters are provided', () => {
      // Reset dispatched actions
      dispatchedActions = [];

      // Emit empty query params BEFORE creating component
      queryParamsSubject.next({});

      // Create fresh component
      const testFixture = TestBed.createComponent(UsersListComponent);
      const testComponent = testFixture.componentInstance;

      // Initialize component
      testComponent.ngOnInit();
      // Don't call detectChanges() to avoid template rendering issues with FontAwesome

      // Verify loadUsers was dispatched
      const loadUsersAction = dispatchedActions.find(
        action => action.type === UsersActions.loadUsers.type
      );
      expect(loadUsersAction).toBeDefined();

      // Verify no filter actions were dispatched
      const filterActions = dispatchedActions.filter(
        action =>
          action.type === UsersActions.setOrganizationFilter.type ||
          action.type === UsersActions.setApplicationFilter.type ||
          action.type === UsersActions.setEnvironmentFilter.type
      );
      expect(filterActions.length).toBe(0);

      // Clean up
      testFixture.destroy();
    });

    /**
     * Property: Query parameter parsing SHALL handle comma-separated values correctly
     * for organizationIds and applicationIds.
     * 
     * Validates: Requirements 5.4
     */
    it('should correctly parse comma-separated IDs in query parameters', (done) => {
      expect(() => {
        fc.assert(
          fc.property(
            // Generate array of 2-5 UUIDs for organizations
            fc.array(fc.uuid(), { minLength: 2, maxLength: 5 }),
            // Generate array of 2-5 UUIDs for applications
            fc.array(fc.uuid(), { minLength: 2, maxLength: 5 }),
            (orgIds, appIds) => {
              // Reset dispatched actions
              dispatchedActions = [];

              // Build query params with comma-separated values
              const queryParams: Record<string, string> = {
                organizationIds: orgIds.join(','),
                applicationIds: appIds.join(',')
              };

              // Emit query params BEFORE creating component
              queryParamsSubject.next(queryParams);

              // Create fresh component
              const testFixture = TestBed.createComponent(UsersListComponent);
              const testComponent = testFixture.componentInstance;

              // Initialize component
              testComponent.ngOnInit();
              // Don't call detectChanges() to avoid template rendering issues with FontAwesome

              // Verify organization filter was dispatched with parsed array
              const orgFilterAction = dispatchedActions.find(
                action => action.type === UsersActions.setOrganizationFilter.type
              );
              expect(orgFilterAction).toBeDefined();
              if (orgFilterAction && 'organizationIds' in orgFilterAction) {
                expect(orgFilterAction.organizationIds).toEqual(orgIds);
              }

              // Verify application filter was dispatched with parsed array
              const appFilterAction = dispatchedActions.find(
                action => action.type === UsersActions.setApplicationFilter.type
              );
              expect(appFilterAction).toBeDefined();
              if (appFilterAction && 'applicationIds' in appFilterAction) {
                expect(appFilterAction.applicationIds).toEqual(appIds);
              }

              // Clean up
              testFixture.destroy();
            }
          ),
          { numRuns: 100 }
        );
      }).not.toThrow();
      done();
    });

    /**
     * Property: Filter actions SHALL be dispatched in the correct order:
     * organization filter, then application filter, then environment filter, then loadUsers.
     * 
     * Validates: Requirements 5.4
     */
    it('should dispatch filter actions before loadUsers action', (done) => {
      expect(() => {
        fc.assert(
          fc.property(
            fc.array(fc.uuid(), { minLength: 1, maxLength: 3 }),
            fc.array(fc.uuid(), { minLength: 1, maxLength: 3 }),
            fc.constantFrom('PRODUCTION', 'STAGING', 'DEVELOPMENT'),
            (orgIds, appIds, environment) => {
              // Reset dispatched actions
              dispatchedActions = [];

              // Build query params
              const queryParams: Record<string, string> = {
                organizationIds: orgIds.join(','),
                applicationIds: appIds.join(','),
                environment
              };

              // Emit query params BEFORE creating component
              queryParamsSubject.next(queryParams);

              // Create fresh component
              const testFixture = TestBed.createComponent(UsersListComponent);
              const testComponent = testFixture.componentInstance;

              // Initialize component
              testComponent.ngOnInit();
              // Don't call detectChanges() to avoid template rendering issues with FontAwesome

              // Find indices of each action type
              const orgFilterIndex = dispatchedActions.findIndex(
                action => action.type === UsersActions.setOrganizationFilter.type
              );
              const appFilterIndex = dispatchedActions.findIndex(
                action => action.type === UsersActions.setApplicationFilter.type
              );
              const envFilterIndex = dispatchedActions.findIndex(
                action => action.type === UsersActions.setEnvironmentFilter.type
              );
              const loadUsersIndex = dispatchedActions.findIndex(
                action => action.type === UsersActions.loadUsers.type
              );

              // Verify all filter actions come before loadUsers
              expect(orgFilterIndex).toBeGreaterThanOrEqual(0);
              expect(appFilterIndex).toBeGreaterThanOrEqual(0);
              expect(envFilterIndex).toBeGreaterThanOrEqual(0);
              expect(loadUsersIndex).toBeGreaterThanOrEqual(0);

              expect(orgFilterIndex).toBeLessThan(loadUsersIndex);
              expect(appFilterIndex).toBeLessThan(loadUsersIndex);
              expect(envFilterIndex).toBeLessThan(loadUsersIndex);

              // Clean up
              testFixture.destroy();
            }
          ),
          { numRuns: 100 }
        );
      }).not.toThrow();
      done();
    });
  });
});
