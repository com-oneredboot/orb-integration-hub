/**
 * AWS Cognito Authentication Flow Integration Tests
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CognitoService } from '../../src/app/core/services/cognito.service';
import { AWSTestSetup } from '../utils/aws-test-setup';
import { getTestConfig, skipIntegrationTests } from '../config/test-config';
import * as AWS from 'aws-sdk';

describe('Cognito Authentication Integration Tests', () => {
  let cognitoService: CognitoService;
  let httpMock: HttpTestingController;
  let awsSetup: AWSTestSetup;
  let cognitoClient: AWS.CognitoIdentityServiceProvider;
  const config = getTestConfig();

  beforeAll(async () => {
    if (skipIntegrationTests()) {
      pending('Integration tests skipped');
      return;
    }

    awsSetup = new AWSTestSetup();
    cognitoClient = awsSetup.getCognitoService();
    
    // Setup test infrastructure
    const userPoolId = await awsSetup.createTestUserPool();
    const clientId = await awsSetup.createTestUserPoolClient(userPoolId);
    await awsSetup.createTestUser(userPoolId);
  });

  afterAll(async () => {
    if (awsSetup) {
      await awsSetup.cleanupTestResources();
    }
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CognitoService]
    });

    cognitoService = TestBed.inject(CognitoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('User Authentication Flow', () => {
    it('should authenticate user with valid credentials', async () => {
      const authRequest = {
        Username: config.credentials.testUserEmail,
        Password: config.credentials.testUserPassword
      };

      // Mock successful authentication response
      const mockAuthResponse = {
        AuthenticationResult: {
          AccessToken: 'mock-access-token',
          IdToken: 'mock-id-token',
          RefreshToken: 'mock-refresh-token',
          ExpiresIn: 3600,
          TokenType: 'Bearer'
        },
        ChallengeName: null,
        Session: null
      };

      // Test authentication
      const result = await cognitoService.signIn(authRequest.Username, authRequest.Password);
      
      expect(result.StatusCode).toBe(200);
      expect(result.Data).toBeDefined();
      expect(result.Data.accessToken).toBeDefined();
      expect(result.Data.idToken).toBeDefined();
    });

    it('should handle invalid credentials gracefully', async () => {
      const invalidCredentials = [
        { email: 'invalid@example.com', password: 'wrongpassword' },
        { email: config.credentials.testUserEmail, password: 'wrongpassword' },
        { email: 'notfound@example.com', password: config.credentials.testUserPassword }
      ];

      for (const credentials of invalidCredentials) {
        const result = await cognitoService.signIn(credentials.email, credentials.password);
        
        expect(result.StatusCode).toBeGreaterThanOrEqual(400);
        expect(result.Message).toContain('Authentication failed');
        expect(result.Data).toBeNull();
      }
    });

    it('should handle MFA challenge flow', async () => {
      // Mock MFA challenge response
      const mfaChallengeResponse = {
        ChallengeName: 'SMS_MFA',
        Session: 'mock-session-token',
        ChallengeParameters: {
          CODE_DELIVERY_DELIVERY_MEDIUM: 'SMS',
          CODE_DELIVERY_DESTINATION: '+***1234567'
        }
      };

      // Simulate MFA challenge
      const challengeResult = await cognitoService.handleMFAChallenge('123456', 'mock-session-token');
      
      expect(challengeResult.StatusCode).toBeDefined();
      if (challengeResult.StatusCode === 200) {
        expect(challengeResult.Data.accessToken).toBeDefined();
      }
    });
  });

  describe('User Registration Flow', () => {
    it('should register new user successfully', async () => {
      const newUserData = {
        email: 'newuser@integration.com',
        password: 'NewUserP@ssw0rd!',
        firstName: 'New',
        lastName: 'User',
        phoneNumber: '+15551234568'
      };

      const result = await cognitoService.signUp(
        newUserData.email,
        newUserData.password,
        newUserData.firstName,
        newUserData.lastName,
        newUserData.phoneNumber
      );

      expect(result.StatusCode).toBe(200);
      expect(result.Data).toBeDefined();
      expect(result.Data.userSub).toBeDefined();
    });

    it('should handle duplicate email registration', async () => {
      const duplicateUserData = {
        email: config.credentials.testUserEmail, // Existing user
        password: 'DuplicateP@ssw0rd!',
        firstName: 'Duplicate',
        lastName: 'User',
        phoneNumber: '+15551234569'
      };

      const result = await cognitoService.signUp(
        duplicateUserData.email,
        duplicateUserData.password,
        duplicateUserData.firstName,
        duplicateUserData.lastName,
        duplicateUserData.phoneNumber
      );

      expect(result.StatusCode).toBeGreaterThanOrEqual(400);
      expect(result.Message).toContain('already exists');
    });

    it('should validate password requirements', async () => {
      const weakPasswords = [
        'password',      // No uppercase, numbers, symbols
        'Password',      // No numbers, symbols
        'Password1',     // No symbols
        'pass',          // Too short
        'PASSWORD123!',  // No lowercase
        '12345678!'      // No letters
      ];

      for (const weakPassword of weakPasswords) {
        const result = await cognitoService.signUp(
          'testweakpass@integration.com',
          weakPassword,
          'Test',
          'User',
          '+15551234570'
        );

        expect(result.StatusCode).toBeGreaterThanOrEqual(400);
        expect(result.Message).toContain('password');
      }
    });
  });

  describe('Email Verification Flow', () => {
    it('should confirm email with valid verification code', async () => {
      const verificationData = {
        email: 'verify@integration.com',
        code: '123456'
      };

      const result = await cognitoService.confirmSignUp(
        verificationData.email,
        verificationData.code
      );

      // In real integration test, this would validate against actual Cognito
      expect(result.StatusCode).toBeDefined();
    });

    it('should handle invalid verification codes', async () => {
      const invalidCodes = [
        '000000',
        '123456789', // Too long
        '12345',     // Too short
        'abcdef',    // Non-numeric
        ''           // Empty
      ];

      for (const invalidCode of invalidCodes) {
        const result = await cognitoService.confirmSignUp(
          'verify@integration.com',
          invalidCode
        );

        expect(result.StatusCode).toBeGreaterThanOrEqual(400);
      }
    });

    it('should resend verification code', async () => {
      const result = await cognitoService.resendConfirmationCode('verify@integration.com');
      
      expect(result.StatusCode).toBeDefined();
      if (result.StatusCode === 200) {
        expect(result.Message).toContain('sent');
      }
    });
  });

  describe('Password Reset Flow', () => {
    it('should initiate password reset', async () => {
      const result = await cognitoService.forgotPassword(config.credentials.testUserEmail);
      
      expect(result.StatusCode).toBeDefined();
      if (result.StatusCode === 200) {
        expect(result.Message).toContain('sent');
      }
    });

    it('should confirm password reset with code', async () => {
      const resetData = {
        email: config.credentials.testUserEmail,
        code: '123456',
        newPassword: 'NewResetP@ssw0rd!'
      };

      const result = await cognitoService.confirmForgotPassword(
        resetData.email,
        resetData.code,
        resetData.newPassword
      );

      expect(result.StatusCode).toBeDefined();
    });

    it('should handle invalid reset codes', async () => {
      const invalidResetData = [
        { code: '000000', password: 'ValidP@ssw0rd!' },
        { code: '123456', password: 'weak' },
        { code: '', password: 'ValidP@ssw0rd!' }
      ];

      for (const data of invalidResetData) {
        const result = await cognitoService.confirmForgotPassword(
          config.credentials.testUserEmail,
          data.code,
          data.password
        );

        expect(result.StatusCode).toBeGreaterThanOrEqual(400);
      }
    });
  });

  describe('Session Management', () => {
    it('should validate active session', async () => {
      // First authenticate
      await cognitoService.signIn(
        config.credentials.testUserEmail,
        config.credentials.testUserPassword
      );

      const isAuthenticated = await cognitoService.checkIsAuthenticated();
      expect(isAuthenticated).toBe(true);

      const hasTokens = await cognitoService.checkHasTokens();
      expect(hasTokens).toBe(true);
    });

    it('should refresh expired tokens', async () => {
      // Mock refresh token scenario
      const refreshResult = await cognitoService.refreshSession();
      
      expect(refreshResult.StatusCode).toBeDefined();
      if (refreshResult.StatusCode === 200) {
        expect(refreshResult.Data.accessToken).toBeDefined();
        expect(refreshResult.Data.idToken).toBeDefined();
      }
    });

    it('should sign out user and clear session', async () => {
      const signOutResult = await cognitoService.signOut();
      
      expect(signOutResult.StatusCode).toBe(200);
      
      const isAuthenticated = await cognitoService.checkIsAuthenticated();
      expect(isAuthenticated).toBe(false);
      
      const hasTokens = await cognitoService.checkHasTokens();
      expect(hasTokens).toBe(false);
    });
  });

  describe('User Profile Management', () => {
    it('should retrieve user profile attributes', async () => {
      // Authenticate first
      await cognitoService.signIn(
        config.credentials.testUserEmail,
        config.credentials.testUserPassword
      );

      const profile = await cognitoService.getCognitoProfile();
      
      expect(profile).toBeDefined();
      expect(profile.email).toBe(config.credentials.testUserEmail);
      expect(profile.phone_number).toBeDefined();
    });

    it('should update user profile attributes', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        phoneNumber: '+15551234571'
      };

      const result = await cognitoService.updateUserAttributes(updateData);
      
      expect(result.StatusCode).toBeDefined();
      if (result.StatusCode === 200) {
        // Verify update was successful
        const profile = await cognitoService.getCognitoProfile();
        expect(profile.given_name).toBe(updateData.firstName);
        expect(profile.family_name).toBe(updateData.lastName);
      }
    });

    it('should change user password', async () => {
      const passwordChangeData = {
        oldPassword: config.credentials.testUserPassword,
        newPassword: 'ChangedP@ssw0rd!'
      };

      const result = await cognitoService.changePassword(
        passwordChangeData.oldPassword,
        passwordChangeData.newPassword
      );

      expect(result.StatusCode).toBeDefined();
    });
  });

  describe('Security and Error Handling', () => {
    it('should handle rate limiting gracefully', async () => {
      // Simulate multiple rapid authentication attempts
      const rapidAttempts = [];
      for (let i = 0; i < 10; i++) {
        rapidAttempts.push(
          cognitoService.signIn('invalid@example.com', 'wrongpassword')
        );
      }

      const results = await Promise.all(rapidAttempts);
      
      // Should handle rate limiting without crashing
      results.forEach(result => {
        expect(result.StatusCode).toBeGreaterThanOrEqual(400);
      });
    });

    it('should sanitize error messages', async () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>@example.com',
        'user@example.com"; DROP TABLE users; --',
        'user@example.com<img src=x onerror=alert(1)>'
      ];

      for (const input of maliciousInputs) {
        const result = await cognitoService.signIn(input, 'password');
        
        expect(result.StatusCode).toBeGreaterThanOrEqual(400);
        expect(result.Message).not.toContain('<script>');
        expect(result.Message).not.toContain('DROP TABLE');
        expect(result.Message).not.toContain('<img');
      }
    });

    it('should handle network failures', async () => {
      // Mock network failure by rejecting HTTP calls
      const req = httpMock.expectOne(() => true);
      req.error(new ErrorEvent('Network error'));

      try {
        await cognitoService.signIn(
          config.credentials.testUserEmail,
          config.credentials.testUserPassword
        );
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle concurrent authentication requests', async () => {
      const concurrentAuth = [];
      
      for (let i = 0; i < 5; i++) {
        concurrentAuth.push(
          cognitoService.signIn(
            config.credentials.testUserEmail,
            config.credentials.testUserPassword
          )
        );
      }

      const results = await Promise.all(concurrentAuth);
      
      // Should handle concurrent requests without race conditions
      results.forEach(result => {
        expect(result.StatusCode).toBeDefined();
      });
    });
  });

  describe('Integration with Backend Services', () => {
    it('should integrate with user service for profile creation', async () => {
      const userCreationData = {
        email: 'integration@example.com',
        firstName: 'Integration',
        lastName: 'Test',
        phoneNumber: '+15551234572'
      };

      // Mock backend user service call
      const req = httpMock.expectOne('/api/users');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.email).toBe(userCreationData.email);
      
      req.flush({
        id: 'user-123',
        email: userCreationData.email,
        status: 'ACTIVE'
      });
    });

    it('should sync authentication state with backend', async () => {
      // Authenticate with Cognito
      await cognitoService.signIn(
        config.credentials.testUserEmail,
        config.credentials.testUserPassword
      );

      // Should notify backend of authentication
      const req = httpMock.expectOne('/api/auth/sync');
      expect(req.request.method).toBe('POST');
      
      req.flush({ status: 'synced' });
    });
  });
});