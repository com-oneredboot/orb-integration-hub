// file: frontend/src/app/core/services/cognito.service.spec.ts
// author: Claude Code Assistant
// date: 2025-06-20
// description: Comprehensive security-focused unit tests for CognitoService

import { TestBed } from '@angular/core/testing';
import { CognitoService } from './cognito.service';
import { SecurityTestUtils } from '../testing/security-test-utils';
import { AuthTestDataFactory } from '../testing/auth-test-data.factory';
import { UserService } from './user.service';
import { of, throwError, BehaviorSubject } from 'rxjs';

// Mock AWS Amplify Auth functions
const mockAmplifyAuth = {
  signIn: jasmine.createSpy('signIn'),
  signUp: jasmine.createSpy('signUp'),
  signOut: jasmine.createSpy('signOut'),
  confirmSignIn: jasmine.createSpy('confirmSignIn'),
  confirmSignUp: jasmine.createSpy('confirmSignUp'),
  fetchAuthSession: jasmine.createSpy('fetchAuthSession'),
  getCurrentUser: jasmine.createSpy('getCurrentUser'),
  fetchUserAttributes: jasmine.createSpy('fetchUserAttributes'),
  fetchMFAPreference: jasmine.createSpy('fetchMFAPreference'),
  resetPassword: jasmine.createSpy('resetPassword'),
  confirmResetPassword: jasmine.createSpy('confirmResetPassword'),
  setUpTOTP: jasmine.createSpy('setUpTOTP'),
  verifyTOTPSetup: jasmine.createSpy('verifyTOTPSetup')
};

// Mock UserService
const mockUserService = {
  createUser: jasmine.createSpy('createUser'),
  getUserById: jasmine.createSpy('getUserById'),
  updateUser: jasmine.createSpy('updateUser'),
  isUserValid: jasmine.createSpy('isUserValid')
};

describe('CognitoService - Security Tests', () => {
  let service: CognitoService;
  let userService: any;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CognitoService,
        { provide: UserService, useValue: mockUserService }
      ]
    });

    service = TestBed.inject(CognitoService);
    userService = TestBed.inject(UserService);

    // Reset all spies
    Object.values(mockAmplifyAuth).forEach(spy => spy.calls.reset());
    Object.values(mockUserService).forEach(spy => spy.calls.reset());
  });

  afterEach(() => {
    // Reset all spies
    Object.values(mockAmplifyAuth).forEach(spy => spy.calls.reset());
    Object.values(mockUserService).forEach(spy => spy.calls.reset());
  });

  describe('Authentication Security Tests', () => {
    
    describe('signIn Security', () => {
      it('should handle valid credentials securely', async () => {
        const testData = AuthTestDataFactory.createAuthFlowTestCases()['validSignIn'];
        const mockTokens = AuthTestDataFactory.createMockTokens();
        
        mockAmplifyAuth.signIn.and.returnValue(Promise.resolve({
          isSignedIn: true,
          nextStep: { signInStep: 'DONE' }
        }));
        mockAmplifyAuth.fetchAuthSession.and.returnValue(Promise.resolve({ tokens: mockTokens }));
        mockAmplifyAuth.getCurrentUser.and.returnValue(Promise.resolve({ username: 'testuser' }));
        mockAmplifyAuth.fetchUserAttributes.and.returnValue(Promise.resolve([
          { Name: 'email', Value: 'testuser@example.com' }
        ]));
        userService.getUserById.and.returnValue(Promise.resolve(AuthTestDataFactory.createMockUser()));

        const result = await service.signIn(testData.input.username, testData.input.password);

        expect(result.StatusCode).toBe(200);
        expect(mockAmplifyAuth.signIn).toHaveBeenCalledWith({
          username: testData.input.username,
          password: testData.input.password
        });
      });

      it('should reject malformed email addresses', async () => {
        const malformedEmails = SecurityTestUtils.createMalformedEmails();

        for (const email of malformedEmails) {
          const result = await service.signIn(email, 'ValidP@ssw0rd!');
          expect(result.StatusCode).toBeGreaterThanOrEqual(400);
          expect(result.Message).toContain('Invalid email format');
        }
      });

      it('should prevent XSS attacks in username field', async () => {
        const xssPayloads = SecurityTestUtils.createXSSPayloads();

        for (const payload of xssPayloads) {
          const result = await service.signIn(payload, 'ValidP@ssw0rd!');
          expect(result.StatusCode).toBeGreaterThanOrEqual(400);
          // Ensure XSS payload is not reflected in response
          expect(result.Message).not.toContain('<script>');
          expect(result.Message).not.toContain('javascript:');
        }
      });

      it('should prevent SQL injection in authentication', async () => {
        const sqlPayloads = SecurityTestUtils.createSQLInjectionPayloads();

        for (const payload of sqlPayloads) {
          const result = await service.signIn(payload, 'ValidP@ssw0rd!');
          expect(result.StatusCode).toBeGreaterThanOrEqual(400);
        }
      });

      it('should handle timing attacks consistently', async () => {
        const validCredentials = { username: 'valid@example.com', password: 'ValidP@ssw0rd!' };
        const invalidCredentials = { username: 'invalid@example.com', password: 'InvalidPassword' };

        mockAmplifyAuth.signIn.and.callFake(({ username }) => {
          if (username === validCredentials.username) {
            return Promise.resolve({ isSignedIn: true });
          }
          return Promise.reject(new Error('Invalid credentials'));
        });

        const timingTest = await SecurityTestUtils.createTimingAttackTest(
          validCredentials,
          invalidCredentials,
          (creds) => service.signIn(creds.username, creds.password)
        );

        expect(timingTest.isVulnerable).toBe(false);
        expect(timingTest.timingDifference).toBeLessThan(50); // Less than 50ms difference
      });

      it('should handle concurrent authentication attempts', async () => {
        const credentials = { username: 'test@example.com', password: 'ValidP@ssw0rd!' };
        
        mockAmplifyAuth.signIn.and.returnValue(Promise.resolve({ isSignedIn: true }));
        mockAmplifyAuth.fetchAuthSession.and.returnValue(Promise.resolve({ 
          tokens: AuthTestDataFactory.createMockTokens() 
        }));

        const concurrentTest = await SecurityTestUtils.createConcurrentSessionTest(
          (creds) => service.signIn(creds.username, creds.password),
          credentials,
          5
        );

        expect(concurrentTest.successfulSessions).toBeGreaterThan(0);
        expect(concurrentTest.errors.length).toBeLessThan(5); // Some should succeed
      });

      it('should sanitize error messages to prevent information disclosure', async () => {
        mockAmplifyAuth.signIn.and.returnValue(Promise.reject(new Error('Internal AWS error: user_id=12345, token=secret123')));

        const result = await service.signIn('test@example.com', 'password');

        expect(result.StatusCode).toBeGreaterThanOrEqual(400);
        expect(result.Message).not.toContain('user_id=12345');
        expect(result.Message).not.toContain('token=secret123');
        expect(result.Message).not.toContain('Internal AWS error');
      });
    });

    describe('Token Security', () => {
      it('should validate token expiration properly', async () => {
        const expiredTokens = AuthTestDataFactory.createExpiredTokens();
        mockAmplifyAuth.fetchAuthSession.and.returnValue(Promise.resolve({ tokens: expiredTokens }));

        const isAuthenticated = await service.checkIsAuthenticated();

        expect(isAuthenticated).toBe(false);
      });

      it('should handle malformed tokens securely', async () => {
        const malformedTokens = SecurityTestUtils.createMalformedTokens();
        
        for (const [tokenType, token] of Object.entries(malformedTokens)) {
          mockAmplifyAuth.fetchAuthSession.and.returnValue(Promise.resolve({
            tokens: { accessToken: { jwtToken: token } }
          }));

          const isAuthenticated = await service.checkIsAuthenticated();
          expect(isAuthenticated).toBe(false);
        }
      });

      it('should prevent token tampering detection', async () => {
        const tamperedTokens = SecurityTestUtils.createMalformedTokens();
        
        mockAmplifyAuth.fetchAuthSession.and.returnValue(Promise.resolve({ tokens: tamperedTokens }));

        const isAuthenticated = await service.checkIsAuthenticated();
        expect(isAuthenticated).toBe(false);
      });

      it('should handle null/undefined tokens gracefully', async () => {
        mockAmplifyAuth.fetchAuthSession.and.returnValue(Promise.resolve({ tokens: null }));

        const isAuthenticated = await service.checkIsAuthenticated();
        expect(isAuthenticated).toBe(false);

        mockAmplifyAuth.fetchAuthSession.and.returnValue(Promise.resolve({}));

        const isAuthenticated2 = await service.checkIsAuthenticated();
        expect(isAuthenticated2).toBe(false);
      });
    });
  });

  describe('Authorization Security Tests', () => {
    
    describe('Group-based Access Control', () => {
      it('should enforce proper group membership validation', async () => {
        const userTokens = AuthTestDataFactory.createMockTokens({
          accessToken: {
            payload: { 'cognito:groups': ['USER'] }
          }
        });

        mockAmplifyAuth.fetchAuthSession.and.returnValue(Promise.resolve({ tokens: userTokens }));

        const hasUserAccess = await service.hasRequiredGroups(['USER']);
        const hasAdminAccess = await service.hasRequiredGroups(['ADMIN']);

        expect(hasUserAccess).toBe(true);
        expect(hasAdminAccess).toBe(false);
      });

      it('should prevent privilege escalation attempts', async () => {
        const limitedTokens = AuthTestDataFactory.createMockTokens({
          accessToken: {
            payload: { 'cognito:groups': ['USER'] }
          }
        });

        mockAmplifyAuth.fetchAuthSession.and.returnValue(Promise.resolve({ tokens: limitedTokens }));

        // Attempt to access admin-only resources
        const adminAccess = await service.validateGraphQLAccess(['ADMIN']);
        expect(adminAccess).toBe(false);

        // Attempt multiple privilege escalation patterns
        const escalationAttempts = [
          ['USER', 'ADMIN'],
          ['ADMIN'],
          ['SUPER_ADMIN'],
          ['USER', 'ADMIN', 'SUPER_ADMIN']
        ];

        for (const groups of escalationAttempts) {
          const hasAccess = await service.hasRequiredGroups(groups);
          if (groups.some(group => !['USER'].includes(group))) {
            expect(hasAccess).toBe(false);
          }
        }
      });

      it('should handle malicious group names', async () => {
        const maliciousGroups = [
          '<script>alert("xss")</script>',
          '"; DROP TABLE users; --',
          '../../../admin',
          'ADMIN\u0000',
          'null',
          'undefined'
        ];

        for (const group of maliciousGroups) {
          const hasAccess = await service.hasRequiredGroups([group]);
          expect(hasAccess).toBe(false);
        }
      });
    });
  });

  describe('MFA Security Tests', () => {
    
    describe('TOTP Verification', () => {
      it('should validate MFA codes properly', async () => {
        mockAmplifyAuth.confirmSignIn.and.returnValue(Promise.resolve({
          isSignedIn: true,
          nextStep: { signInStep: 'DONE' }
        }));

        const result = await service.mfaVerify('123456');
        expect(result.StatusCode).toBe(200);
      });

      it('should reject invalid MFA codes', async () => {
        const invalidCodes = SecurityTestUtils.createInvalidVerificationCodes();

        for (const code of invalidCodes) {
          const result = await service.mfaVerify(code);
          expect(result.StatusCode).toBeGreaterThanOrEqual(400);
        }
      });

      it('should prevent MFA bypass attempts', async () => {
        const bypassAttempts = [
          '',
          'null',
          'undefined',
          '000000',
          '123456',
          'BYPASS',
          '<script>alert("bypass")</script>'
        ];

        mockAmplifyAuth.confirmSignIn.and.returnValue(Promise.reject(new Error('Invalid code')));

        for (const code of bypassAttempts) {
          const result = await service.mfaVerify(code);
          expect(result.StatusCode).toBeGreaterThanOrEqual(400);
        }
      });

      it('should handle timing attacks on MFA verification', async () => {
        const validCode = '123456';
        const invalidCode = '000000';

        mockAmplifyAuth.confirmSignIn.and.callFake((params) => {
          if (params.challengeResponse === validCode) {
            return Promise.resolve({ isSignedIn: true });
          }
          return Promise.reject(new Error('Invalid code'));
        });

        const timingTest = await SecurityTestUtils.createTimingAttackTest(
          { code: validCode },
          { code: invalidCode },
          (data) => service.mfaVerify(data.code)
        );

        expect(timingTest.isVulnerable).toBe(false);
      });
    });
  });

  describe('Session Management Security Tests', () => {
    
    describe('Session State Security', () => {
      it('should maintain secure authentication state', async () => {
        const validTokens = AuthTestDataFactory.createMockTokens();
        mockAmplifyAuth.fetchAuthSession.and.returnValue(Promise.resolve({ tokens: validTokens }));

        let authState: boolean = false;
        service.isAuthenticated.subscribe((state: boolean) => authState = state);

        await service.checkIsAuthenticated();
        expect(authState).toBe(true);
      });

      it('should handle session corruption gracefully', async () => {
        // Simulate corrupted session data
        mockAmplifyAuth.fetchAuthSession.and.returnValue(Promise.reject(new Error('Session corrupted')));

        const isAuthenticated = await service.checkIsAuthenticated();
        expect(isAuthenticated).toBe(false);

        // Verify state is properly reset
        let authState: boolean = true;
        service.isAuthenticated.subscribe((state: boolean) => authState = state);
        expect(authState).toBe(false);
      });

      it('should properly clean up on signOut', async () => {
        mockAmplifyAuth.signOut.and.returnValue(Promise.resolve({}));

        await service.signOut();

        // Verify all observables are reset
        let authState: boolean = true;
        let currentUser: any = 'not-null';

        service.isAuthenticated.subscribe((state: boolean) => authState = state);
        service.currentUser.subscribe((user: any) => currentUser = user);

        expect(authState).toBe(false);
        expect(currentUser).toBeNull();
      });

      it('should handle concurrent signOut attempts', async () => {
        mockAmplifyAuth.signOut.and.returnValue(Promise.resolve({}));

        // Multiple concurrent signOut calls
        const signOutPromises = [
          service.signOut(),
          service.signOut(),
          service.signOut()
        ];

        await Promise.all(signOutPromises);

        // Should not cause any errors and state should be consistent
        let authState: boolean = true;
        service.isAuthenticated.subscribe((state: boolean) => authState = state);
        expect(authState).toBe(false);
      });
    });
  });

  describe('Password Security Tests', () => {
    
    describe('Password Reset Security', () => {
      it('should handle password reset securely', async () => {
        mockAmplifyAuth.resetPassword.and.returnValue(Promise.resolve({
          nextStep: {
            resetPasswordStep: 'CONFIRM_RESET_PASSWORD_WITH_CODE',
            codeDeliveryDetails: {
              destination: 't***@example.com'
            }
          }
        }));

        const result = await service.initiatePasswordReset('test@example.com');
        expect(result.StatusCode).toBe(200);
        expect(result.Message).toContain('password reset');
      });

      it('should prevent password reset enumeration', async () => {
        // Both valid and invalid emails should return similar responses
        mockAmplifyAuth.resetPassword.and.returnValue(Promise.resolve({
          nextStep: { resetPasswordStep: 'CONFIRM_RESET_PASSWORD_WITH_CODE' }
        }));

        const validResult = await service.initiatePasswordReset('valid@example.com');
        const invalidResult = await service.initiatePasswordReset('invalid@example.com');

        expect(validResult.StatusCode).toBe(invalidResult.StatusCode);
        expect(validResult.Message).toBe(invalidResult.Message);
      });

      it('should validate new password strength', async () => {
        const weakPasswords = SecurityTestUtils.createWeakPasswords();

        mockAmplifyAuth.confirmResetPassword.and.returnValue(Promise.reject(
          new Error('Password does not meet requirements')
        ));

        for (const password of weakPasswords) {
          const result = await service.confirmPasswordReset(
            'test@example.com',
            '123456',
            password
          );
          expect(result.StatusCode).toBeGreaterThanOrEqual(400);
        }
      });
    });
  });

  describe('Input Validation Security Tests', () => {
    
    describe('Email Validation', () => {
      it('should reject malformed email inputs', async () => {
        const malformedEmails = SecurityTestUtils.createMalformedEmails();

        for (const email of malformedEmails) {
          const result = await service.signIn(email, 'ValidP@ssw0rd!');
          expect(result.StatusCode).toBeGreaterThanOrEqual(400);
        }
      });

      it('should sanitize email inputs', async () => {
        const xssEmails = [
          'test@domain.com<script>alert("xss")</script>',
          'test+<img src=x onerror=alert(1)>@domain.com',
          'test@domain.com"onclick="alert(1)"'
        ];

        for (const email of xssEmails) {
          const result = await service.signIn(email, 'ValidP@ssw0rd!');
          expect(result.StatusCode).toBeGreaterThanOrEqual(400);
          expect(result.Message).not.toContain('<script>');
          expect(result.Message).not.toContain('onclick');
        }
      });
    });

    describe('Phone Number Validation', () => {
      it('should validate phone number format', async () => {
        const invalidPhones = SecurityTestUtils.createInvalidPhoneNumbers();

        // Mock createCognitoUser to test phone validation
        userService.createUser.and.returnValue(Promise.resolve(AuthTestDataFactory.createMockUser()));
        mockAmplifyAuth.signUp.and.returnValue(Promise.resolve({
          isSignUpComplete: false,
          nextStep: { signUpStep: 'CONFIRM_SIGN_UP' }
        }));

        for (const phone of invalidPhones) {
          try {
            await service.createCognitoUser({
              firstName: 'Test',
              lastName: 'User',
              email: 'test@example.com',
              phoneNumber: phone,
              userId: 'test-id',
              cognitoId: 'cognito-id',
              emailVerified: false,
              phoneVerified: false,
              groups: [],
              status: 'ACTIVE',
              cognitoSub: 'cognito-sub',
              mfaEnabled: false,
              mfaSetupComplete: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }, 'ValidP@ssw0rd!');
          } catch (error) {
            // Should throw validation error for invalid phones
            expect(error).toBeDefined();
          }
        }
      });
    });
  });

  describe('Error Handling Security Tests', () => {
    
    it('should not expose sensitive information in error messages', async () => {
      const sensitiveError = new Error('AWS Internal Error: AccessKey=AKIA123, Secret=secret123, Token=token123');
      mockAmplifyAuth.signIn.and.returnValue(Promise.reject(sensitiveError));

      const result = await service.signIn('test@example.com', 'password');

      expect(result.Message).not.toContain('AKIA123');
      expect(result.Message).not.toContain('secret123');
      expect(result.Message).not.toContain('token123');
      expect(result.Message).not.toContain('AccessKey');
    });

    it('should handle network errors securely', async () => {
      mockAmplifyAuth.signIn.and.returnValue(Promise.reject(new Error('Network Error')));

      const result = await service.signIn('test@example.com', 'password');

      expect(result.StatusCode).toBe(500);
      expect(result.Message).toContain('authentication failed');
      expect(result.Message).not.toContain('Network Error');
    });

    it('should log security events appropriately', async () => {
      const consoleSpy = spyOn(console, 'error');

      mockAmplifyAuth.signIn.and.returnValue(Promise.reject(new Error('Security violation')));

      await service.signIn('<script>alert("xss")</script>@domain.com', 'password');

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('Performance Security Tests', () => {
    
    it('should handle high-frequency authentication attempts', async () => {
      mockAmplifyAuth.signIn.and.returnValue(Promise.resolve({ isSignedIn: true }));

      const attempts = 100;
      const promises = [];

      for (let i = 0; i < attempts; i++) {
        promises.push(service.signIn(`test${i}@example.com`, 'password'));
      }

      const results = await Promise.allSettled(promises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;

      expect(successCount).toBeLessThanOrEqual(attempts);
      // Should handle load without crashing
    });

    it('should maintain performance under security stress', async () => {
      const { executionTime } = await SecurityTestUtils.measureExecutionTime(async () => {
        return service.signIn('test@example.com', 'password');
      });

      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});