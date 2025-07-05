// file: frontend/src/app/core/testing/security-test-utils.ts
// author: Claude Code Assistant
// date: 2025-06-20
// description: Security-focused testing utilities for authentication components

import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

/**
 * Security test utilities for authentication testing
 */
export class SecurityTestUtils {

  /**
   * Generate malformed JWT tokens for security testing
   */
  static createMalformedTokens(): Record<string, string> {
    return {
      'empty': '',
      'invalid_format': 'not.a.jwt',
      'tampered_header': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9TAMPERED.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
      'tampered_payload': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQTAMPERED.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
      'expired_token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.4Adcj3UFYzPUVaVF43FmMab6RlaQD8A9V8wFzzht-KQ',
      'malicious_payload': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI8c2NyaXB0PmFsZXJ0KCd4c3MnKTwvc2NyaXB0PiIsIm5hbWUiOiJKb2huIERvZSIsImlhdCI6MTUxNjIzOTAyMn0.abc123',
      'null_signature': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.',
      'sql_injection': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiInIE9SIDEgPSAxIC0tIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.abc123'
    };
  }

  /**
   * Generate XSS attack payloads for input validation testing
   */
  static createXSSPayloads(): string[] {
    return [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src="x" onerror="alert(\'xss\')">',
      '<svg onload="alert(\'xss\')">',
      '"><script>alert("xss")</script>',
      'javascript:void(0)',
      '<iframe src="javascript:alert(\'xss\')"></iframe>',
      '<body onload="alert(\'xss\')">',
      '<div onclick="alert(\'xss\')">Click me</div>',
      'eval("alert(\'xss\')")'
    ];
  }

  /**
   * Generate SQL injection payloads for input validation testing
   */
  static createSQLInjectionPayloads(): string[] {
    return [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "admin'--",
      "' OR 1=1 --",
      "') OR ('1'='1",
      "1' OR '1'='1' /*",
      "'; INSERT INTO users VALUES ('hacker'); --",
      "' AND (SELECT COUNT(*) FROM users) > 0 --",
      "1'; EXEC sp_executesql N'SELECT @@version' --"
    ];
  }

  /**
   * Generate weak passwords for security testing
   */
  static createWeakPasswords(): string[] {
    return [
      'password',
      '123456',
      'qwerty',
      'abc123',
      'password123',
      'admin',
      'letmein',
      'welcome',
      'monkey',
      '111111',
      '123123',
      'Password1', // Missing special character
      'password!', // Missing uppercase
      'PASSWORD!', // Missing lowercase
      'Password', // Missing number and special char
      'Pass1!', // Too short
      'aaaaaaaaaa', // No variety
      'Password123', // Missing special character
      'password!@#$%', // Missing uppercase and numbers
    ];
  }

  /**
   * Generate malformed email addresses for validation testing
   */
  static createMalformedEmails(): string[] {
    return [
      'not-an-email',
      '@domain.com',
      'user@',
      'user..name@domain.com',
      'user@domain',
      'user name@domain.com',
      'user@domain..com',
      '.user@domain.com',
      'user.@domain.com',
      'user@.domain.com',
      'user@domain.com.',
      '<script>alert("xss")</script>@domain.com',
      'user@domain.com<script>',
      '"user"@domain.com',
      'user@[192.168.1.1]', // IP address in brackets
      'very.long.email.address.that.exceeds.normal.limits@very.long.domain.name.that.should.not.be.accepted.com',
      'user@domain,com', // Comma instead of dot
      'user@@domain.com', // Double @
      ''
    ];
  }

  /**
   * Generate invalid phone numbers for validation testing
   */
  static createInvalidPhoneNumbers(): string[] {
    return [
      '123',
      'abc-def-ghij',
      '123-456-7890-1234-5678', // Too long
      '+1-abc-def-ghij',
      'phone',
      '1234567890123456', // Too long
      '+',
      '++1234567890',
      '123 456 7890',
      '(123) 456-7890',
      '<script>alert("xss")</script>',
      'DROP TABLE users',
      '',
      null as any,
      undefined as any
    ];
  }

  /**
   * Generate invalid verification codes for testing
   */
  static createInvalidVerificationCodes(): string[] {
    return [
      '12345', // Too short
      '1234567', // Too long
      'abcdef', // Non-numeric
      '123abc',
      '',
      'code',
      '<script>alert("xss")</script>',
      'DROP TABLE',
      '000000', // All zeros (potentially weak)
      '123456', // Sequential
      '111111', // All same
      null as any,
      undefined as any,
      ' 123456 ', // With spaces
      '12 34 56' // With internal spaces
    ];
  }

  /**
   * Create timing attack simulation utility
   */
  static createTimingAttackTest(
    validCredentials: any,
    invalidCredentials: any,
    authFunction: (creds: any) => Promise<any>
  ): Promise<{ isVulnerable: boolean; timingDifference: number }> {
    return new Promise(async (resolve) => {
      const iterations = 10;
      let validTimes: number[] = [];
      let invalidTimes: number[] = [];

      // Test valid credentials timing
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        try {
          await authFunction(validCredentials);
        } catch (error) {
          // Ignore errors, just measure timing
        }
        const end = performance.now();
        validTimes.push(end - start);
      }

      // Test invalid credentials timing
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        try {
          await authFunction(invalidCredentials);
        } catch (error) {
          // Ignore errors, just measure timing
        }
        const end = performance.now();
        invalidTimes.push(end - start);
      }

      const avgValidTime = validTimes.reduce((a, b) => a + b, 0) / validTimes.length;
      const avgInvalidTime = invalidTimes.reduce((a, b) => a + b, 0) / invalidTimes.length;
      const timingDifference = Math.abs(avgValidTime - avgInvalidTime);

      // Consider vulnerable if timing difference > 50ms
      const isVulnerable = timingDifference > 50;

      resolve({ isVulnerable, timingDifference });
    });
  }

  /**
   * Create rate limiting test utility
   */
  static createRateLimitTest(
    authFunction: () => Promise<any>,
    maxAttempts: number,
    timeWindow: number
  ): Promise<{ rateLimitTriggered: boolean; attemptsMade: number }> {
    return new Promise(async (resolve) => {
      let attemptsMade = 0;
      let rateLimitTriggered = false;

      const startTime = Date.now();

      while (Date.now() - startTime < timeWindow && attemptsMade < maxAttempts + 5) {
        try {
          await authFunction();
          attemptsMade++;
        } catch (error: any) {
          attemptsMade++;
          // Check if this is a rate limiting error
          if (error.message?.includes('rate') || 
              error.message?.includes('limit') || 
              error.message?.includes('too many') ||
              error.statusCode === 429) {
            rateLimitTriggered = true;
            break;
          }
        }
        
        // Small delay between attempts
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      resolve({ rateLimitTriggered, attemptsMade });
    });
  }

  /**
   * Create concurrent session test utility
   */
  static createConcurrentSessionTest(
    loginFunction: (credentials: any) => Promise<any>,
    credentials: any,
    sessionCount: number
  ): Promise<{ successfulSessions: number; errors: any[] }> {
    return new Promise(async (resolve) => {
      const promises = [];
      const errors: any[] = [];
      let successfulSessions = 0;

      for (let i = 0; i < sessionCount; i++) {
        promises.push(
          loginFunction(credentials)
            .then(() => {
              successfulSessions++;
            })
            .catch(error => {
              errors.push(error);
            })
        );
      }

      await Promise.allSettled(promises);
      resolve({ successfulSessions, errors });
    });
  }

  /**
   * Mock network delay for testing
   */
  static mockNetworkDelay<T>(response: T, delayMs: number = 100): Observable<T> {
    return of(response).pipe(delay(delayMs));
  }

  /**
   * Mock network error for testing
   */
  static mockNetworkError(errorMessage: string = 'Network Error'): Observable<never> {
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Create password complexity validator for testing
   */
  static validatePasswordComplexity(password: string): {
    isValid: boolean;
    missingCriteria: string[];
  } {
    const criteria = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      noCommonPatterns: !/(password|123456|qwerty|abc123)/i.test(password)
    };

    const missingCriteria: string[] = [];
    
    if (!criteria.minLength) missingCriteria.push('minimum 8 characters');
    if (!criteria.hasUppercase) missingCriteria.push('uppercase letter');
    if (!criteria.hasLowercase) missingCriteria.push('lowercase letter');
    if (!criteria.hasNumber) missingCriteria.push('number');
    if (!criteria.hasSpecial) missingCriteria.push('special character');
    if (!criteria.noCommonPatterns) missingCriteria.push('no common patterns');

    return {
      isValid: missingCriteria.length === 0,
      missingCriteria
    };
  }

  /**
   * Generate test user credentials with various security scenarios
   */
  static createTestCredentials(): {
    valid: any;
    invalid: any;
    malicious: any;
    weak: any;
  } {
    return {
      valid: {
        username: 'testuser@example.com',
        password: 'SecureP@ssw0rd!',
        email: 'testuser@example.com',
        firstName: 'Test',
        lastName: 'User',
        phoneNumber: '+1234567890'
      },
      invalid: {
        username: 'invalid-email',
        password: 'wrong',
        email: 'not-an-email',
        firstName: '',
        lastName: '',
        phoneNumber: '123'
      },
      malicious: {
        username: '<script>alert("xss")</script>@domain.com',
        password: '\'; DROP TABLE users; --',
        email: 'test@domain.com<script>alert("xss")</script>',
        firstName: '<img src=x onerror=alert("xss")>',
        lastName: 'javascript:alert("xss")',
        phoneNumber: '<script>alert("xss")</script>'
      },
      weak: {
        username: 'weak@example.com',
        password: 'password',
        email: 'weak@example.com',
        firstName: 'Weak',
        lastName: 'User',
        phoneNumber: '+1234567890'
      }
    };
  }

  /**
   * Utility to measure function execution time
   */
  static async measureExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; executionTime: number }> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    return { result, executionTime: end - start };
  }
}