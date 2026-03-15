/**
 * Users Routing Configuration Unit Tests
 *
 * Tests that verify the routing configuration for the users feature:
 * - Each route resolves to the correct component (UsersListComponent)
 * - Route parameters (query params) are extracted correctly
 * - Routes are properly configured in the routing module
 *
 * _Requirements: 4.13, 5.1, 5.2, 5.3_
 */

import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Location } from '@angular/common';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';

import { usersRoutes } from './users.routes';
import { UsersListComponent } from './components/users-list/users-list.component';
import { CUSTOMER_ROUTES } from '../customers.routes';

describe('Users Routing Configuration', () => {
  describe('usersRoutes definition', () => {
    it('should define a route with empty path', () => {
      const rootRoute = usersRoutes.find(r => r.path === '');
      expect(rootRoute).toBeDefined();
    });

    it('should map empty path to UsersListComponent', () => {
      const rootRoute = usersRoutes.find(r => r.path === '');
      expect(rootRoute?.component).toBe(UsersListComponent);
    });

    it('should include route data with title', () => {
      const rootRoute = usersRoutes.find(r => r.path === '');
      expect(rootRoute?.data?.['title']).toBe('Users');
    });

    it('should include route data with description', () => {
      const rootRoute = usersRoutes.find(r => r.path === '');
      expect(rootRoute?.data?.['description']).toBe('View users assigned to applications');
    });
  });

  describe('CUSTOMER_ROUTES users entry', () => {
    it('should define a users path in customer routes', () => {
      const usersRoute = CUSTOMER_ROUTES.find(r => r.path === 'users');
      expect(usersRoute).toBeDefined();
    });

    it('should lazy-load users routes via loadChildren', () => {
      const usersRoute = CUSTOMER_ROUTES.find(r => r.path === 'users');
      expect(usersRoute?.loadChildren).toBeDefined();
      expect(typeof usersRoute?.loadChildren).toBe('function');
    });

    it('should include route data with title for users', () => {
      const usersRoute = CUSTOMER_ROUTES.find(r => r.path === 'users');
      expect(usersRoute?.data?.['title']).toBe('Users');
    });
  });

  describe('Route navigation and parameter extraction', () => {
    let _router: Router;
    let _location: Location;
    let harness: RouterTestingHarness;

    const initialState = {
      users: {
        usersWithRoles: [],
        userRows: [],
        filteredUserRows: [],
        selectedUser: null,
        selectedUserId: null,
        organizationIds: [],
        applicationIds: [],
        environment: null,
        searchTerm: '',
        statusFilter: '',
        nextToken: null,
        hasMore: false,
        isLoading: false,
        error: null,
        lastLoadedTimestamp: null,
      },
    };

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        providers: [
          provideRouter(usersRoutes),
          provideMockStore({ initialState }),
        ],
      }).compileComponents();

      const library = TestBed.inject(FaIconLibrary);
      library.addIconPacks(fas);

      _router = TestBed.inject(Router);
      _location = TestBed.inject(Location);
      harness = await RouterTestingHarness.create();
    });

    /**
     * Requirement 5.1: /customers/users displays all application users
     */
    it('should navigate to empty path and render UsersListComponent', async () => {
      const component = await harness.navigateByUrl('/', UsersListComponent);
      expect(component).toBeInstanceOf(UsersListComponent);
    });

    /**
     * Requirement 5.2: /customers/applications/:appId/users displays users filtered by app
     * The component reads applicationIds from query params.
     */
    it('should extract applicationIds query parameter', async () => {
      const component = await harness.navigateByUrl(
        '/?applicationIds=app-123',
        UsersListComponent
      );
      expect(component).toBeInstanceOf(UsersListComponent);

      const queryParams = component['route'].snapshot.queryParams;
      expect(queryParams['applicationIds']).toBe('app-123');
    });

    /**
     * Requirement 5.3: /customers/applications/:appId/environments/:env/users
     * displays users filtered by app + env. The component reads both from query params.
     */
    it('should extract applicationIds and environment query parameters', async () => {
      const component = await harness.navigateByUrl(
        '/?applicationIds=app-456&environment=PRODUCTION',
        UsersListComponent
      );
      expect(component).toBeInstanceOf(UsersListComponent);

      const queryParams = component['route'].snapshot.queryParams;
      expect(queryParams['applicationIds']).toBe('app-456');
      expect(queryParams['environment']).toBe('PRODUCTION');
    });

    it('should extract organizationIds query parameter', async () => {
      const component = await harness.navigateByUrl(
        '/?organizationIds=org-1,org-2',
        UsersListComponent
      );
      expect(component).toBeInstanceOf(UsersListComponent);

      const queryParams = component['route'].snapshot.queryParams;
      expect(queryParams['organizationIds']).toBe('org-1,org-2');
    });

    it('should extract all filter query parameters together', async () => {
      const component = await harness.navigateByUrl(
        '/?organizationIds=org-1&applicationIds=app-1&environment=STAGING',
        UsersListComponent
      );
      expect(component).toBeInstanceOf(UsersListComponent);

      const queryParams = component['route'].snapshot.queryParams;
      expect(queryParams['organizationIds']).toBe('org-1');
      expect(queryParams['applicationIds']).toBe('app-1');
      expect(queryParams['environment']).toBe('STAGING');
    });

    it('should render UsersListComponent with no query params', async () => {
      const component = await harness.navigateByUrl('/', UsersListComponent);
      expect(component).toBeInstanceOf(UsersListComponent);

      const queryParams = component['route'].snapshot.queryParams;
      expect(queryParams['applicationIds']).toBeUndefined();
      expect(queryParams['organizationIds']).toBeUndefined();
      expect(queryParams['environment']).toBeUndefined();
    });
  });
});
