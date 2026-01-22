// file: apps/web/src/app/core/guards/redirect-authenticated.guard.spec.ts
// author: Kiro Security Fixes
// date: 2025-01-21
// description: Tests for redirect-if-authenticated behavior on /authenticate route

import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthGuard } from './auth.guard';
import { CognitoService } from '../services/cognito.service';

describe('AuthGuard - Redirect Authenticated Users', () => {
  let guard: AuthGuard;
  let mockCognitoService: jasmine.SpyObj<CognitoService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    mockCognitoService = jasmine.createSpyObj('CognitoService', [
      'checkIsAuthenticated',
      'checkHasTokens',
      'signOut',
      'getCognitoProfile'
    ]);

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: CognitoService, useValue: mockCognitoService },
        { provide: Router, useValue: mockRouter }
      ]
    });

    guard = TestBed.inject(AuthGuard);
  });

  describe('SEC-FINDING-004: Authenticated users on /authenticate route', () => {
    it('should redirect authenticated users away from /authenticate to /dashboard', async () => {
      // Setup: User is authenticated
      mockCognitoService.checkIsAuthenticated.and.returnValue(Promise.resolve(true));
      mockRouter.navigate.and.returnValue(Promise.resolve(true));

      // Route configuration for /authenticate with requiresAuth: false
      const route = {
        data: { requiresAuth: false },
        routeConfig: { path: 'authenticate' }
      } as unknown as ActivatedRouteSnapshot;
      const state = { url: '/authenticate' } as unknown as RouterStateSnapshot;

      // Act
      const result = await guard.canActivate(route, state);

      // Assert
      expect(result).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('should allow unauthenticated users to access /authenticate', async () => {
      // Setup: User is NOT authenticated
      mockCognitoService.checkIsAuthenticated.and.returnValue(Promise.resolve(false));
      mockCognitoService.checkHasTokens.and.returnValue(Promise.resolve(false));

      // Route configuration for /authenticate with requiresAuth: false
      const route = {
        data: { requiresAuth: false },
        routeConfig: { path: 'authenticate' }
      } as unknown as ActivatedRouteSnapshot;
      const state = { url: '/authenticate' } as unknown as RouterStateSnapshot;

      // Act
      const result = await guard.canActivate(route, state);

      // Assert
      expect(result).toBe(true);
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should handle stale tokens and allow access to /authenticate', async () => {
      // Setup: User has stale tokens but is not authenticated
      mockCognitoService.checkIsAuthenticated.and.returnValue(Promise.resolve(false));
      mockCognitoService.checkHasTokens.and.returnValue(Promise.resolve(true));
      mockCognitoService.signOut.and.returnValue(Promise.resolve());

      // Route configuration for /authenticate with requiresAuth: false
      const route = {
        data: { requiresAuth: false },
        routeConfig: { path: 'authenticate' }
      } as unknown as ActivatedRouteSnapshot;
      const state = { url: '/authenticate' } as unknown as RouterStateSnapshot;

      // Act
      const result = await guard.canActivate(route, state);

      // Assert
      expect(result).toBe(true);
      expect(mockCognitoService.signOut).toHaveBeenCalled(); // Stale tokens cleaned up
    });
  });

  describe('Protected routes still work correctly', () => {
    it('should allow authenticated users to access protected routes', async () => {
      // Setup: User is authenticated
      mockCognitoService.checkIsAuthenticated.and.returnValue(Promise.resolve(true));
      mockCognitoService.getCognitoProfile.and.returnValue(Promise.resolve({
        username: 'testuser',
        sub: 'test-sub-123',
        groups: ['USER']
      }));

      // Route configuration for /dashboard with requiresAuth: true
      const route = {
        data: { requiresAuth: true },
        routeConfig: { path: 'dashboard' }
      } as unknown as ActivatedRouteSnapshot;
      const state = { url: '/dashboard' } as unknown as RouterStateSnapshot;

      // Act
      const result = await guard.canActivate(route, state);

      // Assert
      expect(result).toBe(true);
    });

    it('should redirect unauthenticated users from protected routes to /authenticate', async () => {
      // Setup: User is NOT authenticated
      mockCognitoService.checkIsAuthenticated.and.returnValue(Promise.resolve(false));
      mockCognitoService.checkHasTokens.and.returnValue(Promise.resolve(false));
      mockRouter.navigate.and.returnValue(Promise.resolve(true));

      // Route configuration for /dashboard with requiresAuth: true
      const route = {
        data: { requiresAuth: true },
        routeConfig: { path: 'dashboard' }
      } as unknown as ActivatedRouteSnapshot;
      const state = { url: '/dashboard' } as unknown as RouterStateSnapshot;

      // Act
      const result = await guard.canActivate(route, state);

      // Assert
      expect(result).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/authenticate']);
    });
  });
});
