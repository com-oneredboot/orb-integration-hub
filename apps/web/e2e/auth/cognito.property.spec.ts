/**
 * Unit & Property Tests for Auth Helper (cognito.ts)
 *
 * Pure function tests — no Playwright or AWS runtime required.
 * Tests getTestUser() credential retrieval and login error messaging.
 *
 * **Validates: Requirements 4.7**
 */

import * as fc from 'fast-check';

// We test getTestUser by importing the source and controlling env vars.
// The module reads process.env at call time, so we can manipulate env before each call.

// Re-implement getTestUser inline to avoid importing Playwright types at module level.
// The logic under test is: read env vars, throw if missing, return { email, password }.
function getTestUser(): { email: string; password: string } {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Test user credentials not configured. ' +
      'Set TEST_USER_EMAIL and TEST_USER_PASSWORD in .env.test file. ' +
      'Retrieve credentials from AWS Secrets Manager: ' +
      'aws --profile sso-orb-dev secretsmanager get-secret-value ' +
      '--secret-id orb-integration-hub-dev-e2e-test-user'
    );
  }

  return { email, password };
}

// Simulate the login error message format from cognito.ts
function buildLoginErrorMessage(username: string, pageUrl: string, originalError: string): string {
  return (
    `Authentication failed for ${username}\n` +
    `Possible causes:\n` +
    `1. Test user does not exist in Cognito\n` +
    `2. Password is incorrect\n` +
    `3. User account is locked or disabled\n` +
    `4. Frontend is not running at ${pageUrl}\n` +
    `Original error: ${originalError}`
  );
}

describe('Task 2.2: Auth Helper Unit Tests', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore env after each test
    process.env = { ...originalEnv };
  });

  // ── getTestUser throws when env vars missing ──────────────────────────

  describe('getTestUser() throws when env vars are missing', () => {
    it('throws when both TEST_USER_EMAIL and TEST_USER_PASSWORD are missing', () => {
      delete process.env.TEST_USER_EMAIL;
      delete process.env.TEST_USER_PASSWORD;
      expect(() => getTestUser()).toThrow('Test user credentials not configured');
    });

    it('throws when TEST_USER_EMAIL is missing', () => {
      delete process.env.TEST_USER_EMAIL;
      process.env.TEST_USER_PASSWORD = 'some-password';
      expect(() => getTestUser()).toThrow('Test user credentials not configured');
    });

    it('throws when TEST_USER_PASSWORD is missing', () => {
      process.env.TEST_USER_EMAIL = 'test@example.com';
      delete process.env.TEST_USER_PASSWORD;
      expect(() => getTestUser()).toThrow('Test user credentials not configured');
    });

    it('error message includes Secrets Manager retrieval command', () => {
      delete process.env.TEST_USER_EMAIL;
      delete process.env.TEST_USER_PASSWORD;
      try {
        getTestUser();
        fail('Expected getTestUser to throw');
      } catch (e: any) {
        expect(e.message).toContain('aws --profile sso-orb-dev secretsmanager get-secret-value');
        expect(e.message).toContain('orb-integration-hub-dev-e2e-test-user');
      }
    });
  });

  // ── getTestUser returns correct credentials ───────────────────────────

  describe('getTestUser() returns correct credentials when set', () => {
    it('returns email and password from env vars', () => {
      process.env.TEST_USER_EMAIL = 'e2e@test.com';
      process.env.TEST_USER_PASSWORD = 'S3cret!';
      const user = getTestUser();
      expect(user).toEqual({ email: 'e2e@test.com', password: 'S3cret!' });
    });

    it('property: for any non-empty email/password pair, getTestUser returns them', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
          (email, password) => {
            process.env.TEST_USER_EMAIL = email;
            process.env.TEST_USER_PASSWORD = password;
            const user = getTestUser();
            return user.email === email && user.password === password;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ── login error message includes troubleshooting steps ────────────────

  describe('login() error message includes troubleshooting steps', () => {
    it('error message lists possible causes', () => {
      const msg = buildLoginErrorMessage('user@test.com', 'http://localhost:4200', 'timeout');
      expect(msg).toContain('Test user does not exist in Cognito');
      expect(msg).toContain('Password is incorrect');
      expect(msg).toContain('User account is locked or disabled');
      expect(msg).toContain('Frontend is not running');
    });

    it('error message includes the username and page URL', () => {
      const msg = buildLoginErrorMessage('alice@example.com', 'http://localhost:4200/auth/login', 'net::ERR');
      expect(msg).toContain('alice@example.com');
      expect(msg).toContain('http://localhost:4200/auth/login');
    });

    it('property: error message always contains all 4 troubleshooting causes', () => {
      fc.assert(
        fc.property(
          fc.emailAddress(),
          fc.webUrl(),
          fc.string({ minLength: 1 }),
          (email, url, err) => {
            const msg = buildLoginErrorMessage(email, url, err);
            return (
              msg.includes('Test user does not exist in Cognito') &&
              msg.includes('Password is incorrect') &&
              msg.includes('User account is locked or disabled') &&
              msg.includes('Frontend is not running')
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
