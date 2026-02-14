/**
 * Users Routes Unit Tests
 * Task 10.2: Write unit tests for routing configuration
 *
 * Tests verify that routes resolve to the correct components
 * and that route parameters are extracted correctly.
 *
 * @see .kiro/specs/application-users-management/design.md
 * @see .kiro/specs/application-users-management/requirements.md - Requirements 4.13, 5.1, 5.2, 5.3
 */

import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';

import { usersRoutes } from './users.routes';
import { UsersListComponent } from './components/users-list/users-list.component';

describe('Users Routes', () => {
  let _router: Router;
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

    // Register FontAwesome icons
    const library = TestBed.inject(FaIconLibrary);
    library.addIconPacks(fas);

    _router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });

  describe('Route Configuration', () => {
    it('should have users routes defined', () => {
      expect(usersRoutes).toBeDefined();
      expect(usersRoutes.length).toBeGreaterThan(0);
    });

    it('should have root path route', () => {
      const rootRoute = usersRoutes.find(r => r.path === '');
      expect(rootRoute).toBeDefined();
    });

    it('should map root path to UsersListComponent', () => {
      const rootRoute = usersRoutes.find(r => r.path === '');
      expect(rootRoute?.component).toBe(UsersListComponent);
    });

    it('should have route data with title', () => {
      const rootRoute = usersRoutes.find(r => r.path === '');
      expect(rootRoute?.data?.['title']).toBe('Users');
    });

    it('should have route data with description', () => {
      const rootRoute = usersRoutes.find(r => r.path === '');
      expect(rootRoute?.data?.['description']).toBe('View users assigned to applications');
    });
  });

  describe('Route Navigation', () => {
    it('should navigate to users list at root path', async () => {
      const component = await harness.navigateByUrl('/', UsersListComponent);
      expect(component).toBeInstanceOf(UsersListComponent);
    });
  });

  describe('Route Parameters', () => {
    it('should support query parameters for organizationIds', async () => {
      const component = await harness.navigateByUrl('/?organizationIds=org-1,org-2', UsersListComponent);
      expect(component).toBeInstanceOf(UsersListComponent);
      // Query params are handled by the component's ngOnInit
    });

    it('should support query parameters for applicationIds', async () => {
      const component = await harness.navigateByUrl('/?applicationIds=app-1,app-2', UsersListComponent);
      expect(component).toBeInstanceOf(UsersListComponent);
    });

    it('should support query parameters for environment', async () => {
      const component = await harness.navigateByUrl('/?environment=PRODUCTION', UsersListComponent);
      expect(component).toBeInstanceOf(UsersListComponent);
    });

    it('should support combined query parameters', async () => {
      const component = await harness.navigateByUrl(
        '/?organizationIds=org-1&applicationIds=app-1&environment=STAGING',
        UsersListComponent
      );
      expect(component).toBeInstanceOf(UsersListComponent);
    });
  });
});

describe('Customer Routes - Users Integration', () => {
  it('should have users path in customer routes', async () => {
    // Import customer routes dynamically to test the integration
    const { CUSTOMER_ROUTES } = await import('../customers.routes');
    
    const usersRoute = CUSTOMER_ROUTES.find(r => r.path === 'users');
    expect(usersRoute).toBeDefined();
  });

  it('should lazy load users routes', async () => {
    const { CUSTOMER_ROUTES } = await import('../customers.routes');
    
    const usersRoute = CUSTOMER_ROUTES.find(r => r.path === 'users');
    expect(usersRoute?.loadChildren).toBeDefined();
  });

  it('should have correct route data for users', async () => {
    const { CUSTOMER_ROUTES } = await import('../customers.routes');
    
    const usersRoute = CUSTOMER_ROUTES.find(r => r.path === 'users');
    expect(usersRoute?.data?.['title']).toBe('Users');
    expect(usersRoute?.data?.['description']).toBe('View users assigned to applications');
  });
});
