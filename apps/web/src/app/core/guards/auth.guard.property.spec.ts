// file: apps/web/src/app/core/guards/auth.guard.property.spec.ts
// author: Security Audit
// date: 2025-01-21
// description: Property-based tests for route guard coverage
// **Feature: auth-workflow-review, Property 6: Route Guard Coverage**
// **Validates: Requirements 5.4**

import { TestBed } from '@angular/core/testing';
import { Router, Routes, ActivatedRouteSnapshot, RouterStateSnapshot, provideRouter } from '@angular/router';
import * as fc from 'fast-check';
import { AuthGuard } from './auth.guard';
import { CognitoService } from '../services/cognito.service';
import { routes } from '../../app.routes';

describe('AuthGuard Route Coverage Property Tests', () => {
  let authGuard: AuthGuard;
  let mockCognitoService: jasmine.SpyObj<CognitoService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const cognitoSpy = jasmine.createSpyObj('CognitoService', [
      'checkIsAuthenticated',
      'checkHasTokens',
      'signOut',
      'getCognitoProfile'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        AuthGuard,
        { provide: CognitoService, useValue: cognitoSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    authGuard = TestBed.inject(AuthGuard);
    mockCognitoService = TestBed.inject(CognitoService) as jasmine.SpyObj<CognitoService>;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  /**
   * Property 6: Route Guard Coverage
   * *For any* Angular route that requires authentication, an auth guard SHALL be configured
   * to protect access.
   * 
   * This property test verifies that all routes marked with requiresAuth: true have
   * the AuthGuard configured.
   */
  describe('Property 6: Route Guard Coverage', () => {
    
    /**
     * Helper function to recursively extract all routes with their full paths
     */
    function extractAllRoutes(routeConfig: Routes, parentPath: string = ''): Array<{
      path: string;
      requiresAuth: boolean | undefined;
      hasAuthGuard: boolean;
      requiresCustomer: boolean | undefined;
      requiredGroup: string | undefined;
    }> {
      const result: Array<{
        path: string;
        requiresAuth: boolean | undefined;
        hasAuthGuard: boolean;
        requiresCustomer: boolean | undefined;
        requiredGroup: string | undefined;
      }> = [];

      for (const route of routeConfig) {
        const fullPath = parentPath ? `${parentPath}/${route.path}` : route.path || '';
        
        // Check if this route has AuthGuard
        const hasAuthGuard = route.canActivate?.includes(AuthGuard) ?? false;
        
        // Get route data
        const requiresAuth = route.data?.['requiresAuth'];
        const requiresCustomer = route.data?.['requiresCustomer'];
        const requiredGroup = route.data?.['group'];

        result.push({
          path: fullPath,
          requiresAuth,
          hasAuthGuard,
          requiresCustomer,
          requiredGroup
        });

        // Recursively process children
        if (route.children) {
          result.push(...extractAllRoutes(route.children, fullPath));
        }
      }

      return result;
    }

    it('should have AuthGuard on all routes that require authentication', () => {
      const allRoutes = extractAllRoutes(routes);
      
      // Filter routes that require authentication
      const protectedRoutes = allRoutes.filter(r => r.requiresAuth === true);
      
      // Verify each protected route has AuthGuard
      for (const route of protectedRoutes) {
        expect(route.hasAuthGuard)
          .withContext(`Route '${route.path}' requires auth but has no AuthGuard`)
          .toBe(true);
      }
    });

    it('should have consistent requiresAuth and canActivate configuration', () => {
      const allRoutes = extractAllRoutes(routes);
      
      // Property: If a route has requiresAuth: true, it MUST have AuthGuard
      // Property: If a route has AuthGuard, it SHOULD have requiresAuth defined
      for (const route of allRoutes) {
        if (route.requiresAuth === true) {
          expect(route.hasAuthGuard)
            .withContext(`Route '${route.path}' has requiresAuth: true but no AuthGuard`)
            .toBe(true);
        }
      }
    });

    it('should protect all dashboard and profile routes', () => {
      const allRoutes = extractAllRoutes(routes);
      
      // These top-level paths should always be protected directly
      const mustBeProtectedDirectly = ['dashboard', 'profile', 'customers'];
      
      for (const protectedPath of mustBeProtectedDirectly) {
        // Find the exact route (not child routes)
        const exactRoute = allRoutes.find(r => r.path === protectedPath);
        
        if (exactRoute) {
          expect(exactRoute.hasAuthGuard || exactRoute.requiresAuth === true)
            .withContext(`Route '${exactRoute.path}' should be protected`)
            .toBe(true);
        }
      }
      
      // Verify child routes under 'customers' inherit protection from parent
      // (they don't need their own guards since parent has canActivate)
      const customersRoute = allRoutes.find(r => r.path === 'customers');
      expect(customersRoute?.hasAuthGuard)
        .withContext('customers route should have AuthGuard')
        .toBe(true);
    });

    it('should not have AuthGuard on public routes', () => {
      const allRoutes = extractAllRoutes(routes);
      
      // These paths should be public (no auth required)
      const publicPaths = ['platform', 'authenticate'];
      
      let hasExpectations = false;
      for (const route of allRoutes) {
        if (publicPaths.includes(route.path)) {
          hasExpectations = true;
          // Public routes should either have no guard or requiresAuth: false
          if (route.requiresAuth !== undefined) {
            expect(route.requiresAuth)
              .withContext(`Public route '${route.path}' should not require auth`)
              .toBe(false);
          } else {
            // No requiresAuth defined is acceptable for public routes
            expect(route.hasAuthGuard)
              .withContext(`Public route '${route.path}' should not have AuthGuard`)
              .toBe(false);
          }
        }
      }
      
      // Ensure we actually tested something
      expect(hasExpectations)
        .withContext('Should have found public routes to test')
        .toBe(true);
    });
  });

  describe('AuthGuard Behavior Property Tests', () => {
    
    it('should redirect unauthenticated users to /authenticate for protected routes (100 iterations)', async () => {
      // Setup: User is not authenticated
      mockCognitoService.checkIsAuthenticated.and.returnValue(Promise.resolve(false));
      mockCognitoService.checkHasTokens.and.returnValue(Promise.resolve(false));

      // Generator for protected route paths
      const protectedPathArbitrary = fc.constantFrom(
        'dashboard',
        'profile',
        'customers',
        'customers/applications'
      );

      await fc.assert(
        fc.asyncProperty(protectedPathArbitrary, async (path) => {
          const mockRoute = {
            routeConfig: { path },
            data: { requiresAuth: true }
          } as unknown as ActivatedRouteSnapshot;
          
          const mockState = {
            url: `/${path}`
          } as RouterStateSnapshot;

          const result = await authGuard.canActivate(mockRoute, mockState);
          
          // Unauthenticated users should be denied access
          expect(result).toBe(false);
          // And redirected to authenticate
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/authenticate']);
          
          // Reset for next iteration
          mockRouter.navigate.calls.reset();
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should allow authenticated users to access protected routes (100 iterations)', async () => {
      // Setup: User is authenticated with proper groups
      mockCognitoService.checkIsAuthenticated.and.returnValue(Promise.resolve(true));
      mockCognitoService.getCognitoProfile.and.returnValue(Promise.resolve({
        username: 'testuser',
        sub: 'test-sub-123',
        groups: ['USER', 'OWNER']
      }));

      // Generator for protected route paths
      const protectedPathArbitrary = fc.constantFrom(
        'dashboard',
        'profile'
      );

      await fc.assert(
        fc.asyncProperty(protectedPathArbitrary, async (path) => {
          const mockRoute = {
            routeConfig: { path },
            data: { requiresAuth: true }
          } as unknown as ActivatedRouteSnapshot;
          
          const mockState = {
            url: `/${path}`
          } as RouterStateSnapshot;

          const result = await authGuard.canActivate(mockRoute, mockState);
          
          // Authenticated users should be allowed access
          expect(result).toBe(true);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should redirect authenticated users away from auth pages', async () => {
      // Setup: User is authenticated
      mockCognitoService.checkIsAuthenticated.and.returnValue(Promise.resolve(true));

      const mockRoute = {
        routeConfig: { path: 'authenticate' },
        data: { requiresAuth: false }
      } as unknown as ActivatedRouteSnapshot;
      
      const mockState = {
        url: '/authenticate'
      } as RouterStateSnapshot;

      const result = await authGuard.canActivate(mockRoute, mockState);
      
      // Authenticated users should be redirected away from auth pages
      expect(result).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('should clean up stale tokens when authentication fails', async () => {
      // Setup: User has tokens but authentication check fails
      mockCognitoService.checkIsAuthenticated.and.returnValue(Promise.resolve(false));
      mockCognitoService.checkHasTokens.and.returnValue(Promise.resolve(true));
      mockCognitoService.signOut.and.returnValue(Promise.resolve());

      const mockRoute = {
        routeConfig: { path: 'dashboard' },
        data: { requiresAuth: true }
      } as unknown as ActivatedRouteSnapshot;
      
      const mockState = {
        url: '/dashboard'
      } as RouterStateSnapshot;

      await authGuard.canActivate(mockRoute, mockState);
      
      // Should have called signOut to clean up stale tokens
      expect(mockCognitoService.signOut).toHaveBeenCalled();
    });
  });
});
