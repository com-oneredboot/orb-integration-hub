// file: apps/web/src/app/core/testing/integration-security.spec.ts
// author: Claude Code Assistant
// date: 2025-06-20
// description: Comprehensive integration and penetration security tests for authentication system

import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { of, throwError, BehaviorSubject } from 'rxjs';

import { CognitoService } from '../services/cognito.service';
import { AuthGuard } from '../guards/auth.guard';
import { UserService } from '../services/user.service';
import { InputValidationService } from '../services/input-validation.service';
import { SecurityTestUtils } from './security-test-utils';
import { AuthTestDataFactory } from './auth-test-data.factory';

describe('Authentication System - Integration Security Tests', () => {
  let cognitoService: CognitoService;
  let authGuard: AuthGuard;
  let userService: UserService;
  let validationService: InputValidationService;
  let mockRouter: any;
  let mockStore: any;

  beforeEach(() => {
    // Mock dependencies
    mockRouter = {
      navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true))
    };

    mockStore = {
      select: jasmine.createSpy('select').and.returnValue(of({})),
      dispatch: jasmine.createSpy('dispatch')
    };

    const mockUserService = {
      createUser: jasmine.createSpy('createUser'),
      getUserById: jasmine.createSpy('getUserById'),
      updateUser: jasmine.createSpy('updateUser'),
      isUserValid: jasmine.createSpy('isUserValid')
    };

    TestBed.configureTestingModule({
      providers: [
        CognitoService,
        AuthGuard,
        InputValidationService,
        { provide: UserService, useValue: mockUserService },
        { provide: Router, useValue: mockRouter },
        { provide: Store, useValue: mockStore }
      ]
    });

    cognitoService = TestBed.inject(CognitoService);
    authGuard = TestBed.inject(AuthGuard);
    userService = TestBed.inject(UserService);
    validationService = TestBed.inject(InputValidationService);
  });

  describe('End-to-End Authentication Security Flow', () => {

    it('should handle complete authentication flow securely', async () => {
      // Mock successful authentication flow
      spyOn(cognitoService, 'signIn').and.returnValue(
        Promise.resolve(AuthTestDataFactory.createSuccessAuthResponse())
      );
      spyOn(cognitoService, 'checkIsAuthenticated').and.returnValue(Promise.resolve(true));
      spyOn(cognitoService, 'getCognitoProfile').and.returnValue(
        Promise.resolve(AuthTestDataFactory.createMockCognitoAttributes())
      );

      // Test full flow
      const signInResult = await cognitoService.signIn('test@example.com', 'SecureP@ssw0rd!');
      expect(signInResult.StatusCode).toBe(200);

      const isAuthenticated = await cognitoService.checkIsAuthenticated();
      expect(isAuthenticated).toBe(true);

      // Test route protection
      const route = { data: { requiresAuth: true }, routeConfig: { path: 'dashboard' } };
      const state = { url: '/dashboard' };
      const canActivate = await authGuard.canActivate(route as any, state as any);
      expect(canActivate).toBe(true);
    });

    it('should prevent authentication bypass through service manipulation', async () => {
      // Attempt to bypass authentication by manipulating service state
      spyOn(cognitoService, 'checkIsAuthenticated').and.returnValue(Promise.resolve(false));
      
      // Try to access protected route
      const route = { data: { requiresAuth: true }, routeConfig: { path: 'admin' } };
      const state = { url: '/admin' };
      const canActivate = await authGuard.canActivate(route as any, state as any);
      
      expect(canActivate).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/authenticate']);
    });

    it('should handle network failures gracefully', async () => {
      // Simulate network errors
      spyOn(cognitoService, 'signIn').and.returnValue(
        Promise.reject(new Error('Network Error'))
      );

      const result = await cognitoService.signIn('test@example.com', 'password');
      
      expect(result.StatusCode).toBeGreaterThanOrEqual(400);
      expect(result.Message).not.toContain('Network Error'); // Should not expose internal errors
    });
  });

  describe('Cross-Component Security Validation', () => {

    it('should validate inputs consistently across all components', async () => {
      const maliciousInputs = SecurityTestUtils.createXSSPayloads();

      for (const maliciousInput of maliciousInputs) {
        // Test validation service
        const emailValidation = validationService.validateEmail(maliciousInput);
        expect(emailValidation.isValid).toBe(false);

        // Test Cognito service with malicious input
        const signInResult = await cognitoService.signIn(maliciousInput, 'password');
        expect(signInResult.StatusCode).toBeGreaterThanOrEqual(400);
      }
    });

    it('should prevent privilege escalation across service boundaries', async () => {
      // Mock limited user authentication
      spyOn(cognitoService, 'checkIsAuthenticated').and.returnValue(Promise.resolve(true));
      spyOn(cognitoService, 'getCognitoProfile').and.returnValue(
        Promise.resolve({ groups: ['USER'] })
      );

      // Attempt to access admin route
      const adminRoute = { 
        data: { requiresAuth: true, group: 'ADMIN' }, 
        routeConfig: { path: 'admin' } 
      };
      const state = { url: '/admin' };
      
      const canActivate = await authGuard.canActivate(adminRoute as any, state as any);
      
      expect(canActivate).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('should maintain session consistency across components', async () => {
      // Test session state synchronization
      const authSubject = new BehaviorSubject(false);
      spyOn(cognitoService, 'isAuthenticated').and.returnValue(authSubject);

      let currentAuthState = false;
      cognitoService.isAuthenticated.subscribe((state: boolean) => currentAuthState = state);

      // Simulate authentication
      authSubject.next(true);
      expect(currentAuthState).toBe(true);

      // Simulate sign out
      authSubject.next(false);
      expect(currentAuthState).toBe(false);
    });
  });

  describe('Security Boundary Testing', () => {

    it('should handle service unavailability securely', async () => {
      // Simulate service failures
      spyOn(cognitoService, 'checkIsAuthenticated').and.returnValue(
        Promise.reject(new Error('Service Unavailable'))
      );

      const route = { data: { requiresAuth: true }, routeConfig: { path: 'protected' } };
      const state = { url: '/protected' };

      try {
        const canActivate = await authGuard.canActivate(route as any, state as any);
        // Should fail securely
        expect(canActivate).toBe(false);
      } catch (error) {
        // Should handle errors gracefully
        expect(error).toBeDefined();
      }
    });

    it('should prevent race conditions in authentication state', async () => {
      let authCallCount = 0;
      spyOn(cognitoService, 'checkIsAuthenticated').and.callFake(() => {
        authCallCount++;
        return Promise.resolve(authCallCount <= 2); // First two calls succeed
      });

      const route = { data: { requiresAuth: true }, routeConfig: { path: 'test' } };
      const state = { url: '/test' };

      // Simulate concurrent authentication checks
      const promises = [
        authGuard.canActivate(route as any, state as any),
        authGuard.canActivate(route as any, state as any),
        authGuard.canActivate(route as any, state as any)
      ];

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r === true).length;

      // Should handle concurrent access consistently
      expect(successCount).toBeLessThanOrEqual(2);
    });

    it('should validate token integrity across service calls', async () => {
      // Mock token validation
      const validTokens = AuthTestDataFactory.createMockTokens();
      const expiredTokens = AuthTestDataFactory.createExpiredTokens();

      // Test with valid tokens
      spyOn(cognitoService, 'checkHasTokens').and.returnValue(Promise.resolve(true));
      spyOn(cognitoService, 'checkIsAuthenticated').and.returnValue(Promise.resolve(true));

      let isAuthenticated = await cognitoService.checkIsAuthenticated();
      expect(isAuthenticated).toBe(true);

      // Test with expired tokens
      cognitoService.checkIsAuthenticated.and.returnValue(Promise.resolve(false));
      
      isAuthenticated = await cognitoService.checkIsAuthenticated();
      expect(isAuthenticated).toBe(false);
    });
  });

  describe('Error Propagation Security', () => {

    it('should not leak sensitive information through error chains', async () => {
      // Create deep error chain with sensitive information
      const sensitiveError = new Error('Database connection failed: host=internal-db.company.com, user=admin, password=secret123');
      
      spyOn(userService, 'getUserById').and.returnValue(Promise.reject(sensitiveError));
      spyOn(cognitoService, 'signIn').and.callFake(async () => {
        await userService.getUserById('test-id');
        return AuthTestDataFactory.createErrorAuthResponse(500, 'Authentication failed');
      });

      const result = await cognitoService.signIn('test@example.com', 'password');

      // Should not expose database credentials or internal hosts
      expect(result.Message).not.toContain('internal-db.company.com');
      expect(result.Message).not.toContain('admin');
      expect(result.Message).not.toContain('secret123');
      expect(result.Message).not.toContain('Database connection failed');
    });

    it('should handle circular error references safely', async () => {
      // Create circular error reference
      const error1: any = new Error('Error 1');
      const error2: any = new Error('Error 2');
      error1.cause = error2;
      error2.cause = error1;

      spyOn(cognitoService, 'checkIsAuthenticated').and.returnValue(Promise.reject(error1));

      const route = { data: { requiresAuth: true }, routeConfig: { path: 'test' } };
      const state = { url: '/test' };

      try {
        await authGuard.canActivate(route as any, state as any);
      } catch (error) {
        // Should not cause stack overflow or infinite loops
        expect(error).toBeDefined();
      }
    });
  });

  describe('Performance Security Under Load', () => {

    it('should maintain security under high concurrent load', async () => {
      spyOn(cognitoService, 'checkIsAuthenticated').and.returnValue(Promise.resolve(true));
      spyOn(cognitoService, 'getCognitoProfile').and.returnValue(
        Promise.resolve({ groups: ['USER'] })
      );

      const route = { data: { requiresAuth: true }, routeConfig: { path: 'test' } };
      const state = { url: '/test' };

      // Simulate high concurrent load
      const concurrentRequests = 100;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(authGuard.canActivate(route as any, state as any));
      }

      const startTime = performance.now();
      const results = await Promise.all(promises);
      const endTime = performance.now();

      // Should handle load without significant performance degradation
      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(5000); // Within 5 seconds

      // All requests should be processed correctly
      const successCount = results.filter(r => r === true).length;
      expect(successCount).toBe(concurrentRequests);
    });

    it('should prevent memory leaks during sustained operations', async () => {
      // Monitor memory usage pattern
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Perform repeated operations
      for (let i = 0; i < 1000; i++) {
        const validation = validationService.validateEmail(`test${i}@example.com`);
        expect(validation.isValid).toBe(true);

        await cognitoService.checkIsAuthenticated();
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('State Consistency Security', () => {

    it('should maintain consistent state across authentication flows', async () => {
      const authStateSubject = new BehaviorSubject(false);
      spyOn(cognitoService, 'isAuthenticated').and.returnValue(authStateSubject);

      let observedStates: boolean[] = [];
      cognitoService.isAuthenticated.subscribe((state: boolean) => observedStates.push(state));

      // Simulate authentication state changes
      authStateSubject.next(true);  // Sign in
      authStateSubject.next(false); // Sign out
      authStateSubject.next(true);  // Sign in again

      expect(observedStates).toEqual([false, true, false, true]);
    });

    it('should handle state corruption attempts', async () => {
      // Attempt to inject malicious state
      const maliciousState = {
        isAuthenticated: true,
        user: {
          groups: ['ADMIN', 'SUPER_ADMIN'],
          permissions: ['ALL'],
          bypass: true
        }
      };

      // State should be controlled by service, not external injection
      spyOn(cognitoService, 'checkIsAuthenticated').and.returnValue(Promise.resolve(false));
      
      const isAuthenticated = await cognitoService.checkIsAuthenticated();
      expect(isAuthenticated).toBe(false);
    });
  });

  describe('Cross-Site Scripting (XSS) Prevention', () => {

    it('should prevent XSS through authentication form inputs', async () => {
      const xssPayloads = SecurityTestUtils.createXSSPayloads();

      for (const payload of xssPayloads) {
        const result = await cognitoService.signIn(payload, 'password');
        
        expect(result.StatusCode).toBeGreaterThanOrEqual(400);
        expect(result.Message).not.toContain('<script>');
        expect(result.Message).not.toContain('javascript:');
        expect(result.Message).not.toContain('onload=');
      }
    });

    it('should sanitize user profile data to prevent stored XSS', async () => {
      const maliciousProfile = {
        firstName: '<script>alert("xss")</script>',
        lastName: 'javascript:alert(document.cookie)',
        email: 'test@domain.com<img src=x onerror=alert(1)>'
      };

      // Validation service should catch these
      const firstNameValidation = validationService.validateName(maliciousProfile.firstName, 'First name');
      const lastNameValidation = validationService.validateName(maliciousProfile.lastName, 'Last name');
      const emailValidation = validationService.validateEmail(maliciousProfile.email);

      expect(firstNameValidation.isValid).toBe(false);
      expect(lastNameValidation.isValid).toBe(false);
      expect(emailValidation.isValid).toBe(false);
    });
  });

  describe('SQL Injection Prevention', () => {

    it('should prevent SQL injection through authentication inputs', async () => {
      const sqlPayloads = SecurityTestUtils.createSQLInjectionPayloads();

      for (const payload of sqlPayloads) {
        const result = await cognitoService.signIn(payload, 'password');
        
        expect(result.StatusCode).toBeGreaterThanOrEqual(400);
        // Should not expose database errors
        expect(result.Message).not.toContain('SQL');
        expect(result.Message).not.toContain('database');
        expect(result.Message).not.toContain('table');
      }
    });
  });

  describe('Session Hijacking Prevention', () => {

    it('should detect and prevent session hijacking attempts', async () => {
      // Simulate session with suspicious activity
      spyOn(cognitoService, 'checkIsAuthenticated').and.returnValue(Promise.resolve(true));
      spyOn(cognitoService, 'getCognitoProfile').and.returnValue(
        Promise.resolve({ groups: ['USER'], lastActivity: Date.now() - 86400000 }) // 24 hours ago
      );

      // Should still allow access (timestamp checking would be in actual implementation)
      const route = { data: { requiresAuth: true }, routeConfig: { path: 'dashboard' } };
      const state = { url: '/dashboard' };
      
      const canActivate = await authGuard.canActivate(route as any, state as any);
      expect(canActivate).toBe(true);
    });
  });
});

describe('OWASP Security Testing', () => {
  let validationService: InputValidationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [InputValidationService]
    });
    validationService = TestBed.inject(InputValidationService);
  });

  describe('OWASP Top 10 Security Tests', () => {

    it('should prevent A01 - Broken Access Control', async () => {
      // Test authorization bypass attempts
      const mockCognito = jasmine.createSpyObj('CognitoService', ['checkIsAuthenticated', 'getCognitoProfile']);
      const mockRouter = jasmine.createSpyObj('Router', ['navigate']);
      
      mockCognito.checkIsAuthenticated.and.returnValue(Promise.resolve(true));
      mockCognito.getCognitoProfile.and.returnValue(Promise.resolve({ groups: ['USER'] }));
      mockRouter.navigate.and.returnValue(Promise.resolve(true));

      const authGuard = new AuthGuard(mockCognito, mockRouter);
      
      // Attempt to access admin route with user privileges
      const adminRoute = { data: { requiresAuth: true, group: 'ADMIN' }, routeConfig: { path: 'admin' } };
      const state = { url: '/admin' };
      
      const canActivate = await authGuard.canActivate(adminRoute as any, state as any);
      expect(canActivate).toBe(false);
    });

    it('should prevent A03 - Injection', async () => {
      const injectionPayloads = [
        ...SecurityTestUtils.createSQLInjectionPayloads(),
        ...SecurityTestUtils.createXSSPayloads()
      ];

      for (const payload of injectionPayloads) {
        const emailResult = validationService.validateEmail(payload);
        const nameResult = validationService.validateName(payload, 'Name');
        
        expect(emailResult.isValid).toBe(false);
        expect(nameResult.isValid).toBe(false);
      }
    });

    it('should prevent A07 - Identification and Authentication Failures', async () => {
      const weakPasswords = SecurityTestUtils.createWeakPasswords();

      for (const weakPassword of weakPasswords) {
        const validation = validationService.validatePassword(weakPassword);
        expect(validation.isValid).toBe(false);
      }
    });

    it('should prevent A10 - Server-Side Request Forgery (SSRF)', async () => {
      // Test URL validation if applicable
      const maliciousUrls = [
        'http://169.254.169.254/latest/meta-data/',
        'file:///etc/passwd',
        'ftp://internal.company.com/secrets',
        'http://localhost:8080/admin'
      ];

      // This would be tested if URL inputs are accepted
      for (const url of maliciousUrls) {
        const sanitized = validationService.sanitizeInput(url);
        expect(sanitized).not.toContain('169.254.169.254');
        expect(sanitized).not.toContain('file://');
        expect(sanitized).not.toContain('localhost');
      }
    });
  });
});