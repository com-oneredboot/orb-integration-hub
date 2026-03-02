/**
 * Authentication Lifecycle E2E Tests
 *
 * Self-contained test suite that exercises the full auth lifecycle:
 * signup → signin → signout → cleanup.
 *
 * Creates its own test user dynamically and cleans up via AWS SDK calls.
 * No pre-existing test users, .env.test files, or secrets retrieval needed.
 *
 * Prerequisites:
 * - Active AWS SSO session: `aws sso login --profile sso-orb-dev`
 * - Local frontend running at http://localhost:4200
 */

import { test } from '@playwright/test';
import { checkAWSCredentials } from '../utils';
import {
  CognitoIdentityProviderClient,
  AdminConfirmSignUpCommand,
  AdminDeleteUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { fromSSO } from '@aws-sdk/credential-providers';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const USER_POOL_ID = 'us-east-1_8ch8unBaX';
const USERS_TABLE = 'orb-integration-hub-dev-users';
const AWS_REGION = 'us-east-1';
const AWS_PROFILE = 'sso-orb-dev';

// ---------------------------------------------------------------------------
// AWS SDK clients
// ---------------------------------------------------------------------------
const credentials = fromSSO({ profile: AWS_PROFILE });
const cognitoClient = new CognitoIdentityProviderClient({ region: AWS_REGION, credentials });
const dynamoClient = new DynamoDBClient({ region: AWS_REGION, credentials });

// ---------------------------------------------------------------------------
// Shared test state
// ---------------------------------------------------------------------------
interface AuthTestState {
  email: string;
  password: string;
  cognitoUsername: string | null;
  userId: string | null;
  signupSucceeded: boolean;
}

const state: AuthTestState = {
  email: '',
  password: '',
  cognitoUsername: null,
  userId: null,
  signupSucceeded: false,
};

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Generates a unique test email using the current timestamp.
 */
export function generateTestEmail(): string {
  return `e2e-test-${Date.now()}@test.orb-integration-hub.com`;
}

/**
 * Generates a password that satisfies Cognito password policy:
 * 8+ chars, uppercase, lowercase, digit, special character.
 */
export function generateTestPassword(): string {
  return `E2eTest#${Date.now().toString().slice(-10)}`;
}

/**
 * Auto-confirms a Cognito user's email (bypasses verification code).
 */
async function adminConfirmSignUp(username: string): Promise<void> {
  await cognitoClient.send(
    new AdminConfirmSignUpCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
    }),
  );
}

/**
 * Deletes a user from Cognito. Tolerates UserNotFoundException.
 */
async function adminDeleteUser(username: string): Promise<void> {
  try {
    await cognitoClient.send(
      new AdminDeleteUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
      }),
    );
  } catch (error: unknown) {
    const err = error as { name?: string };
    if (err.name !== 'UserNotFoundException') {
      throw error;
    }
    // User already gone — nothing to do
  }
}

/**
 * Deletes a user record from the DynamoDB users table.
 */
async function deleteUserFromDynamoDB(userId: string): Promise<void> {
  await dynamoClient.send(
    new DeleteItemCommand({
      TableName: USERS_TABLE,
      Key: { userId: { S: userId } },
    }),
  );
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe.serial('Authentication Lifecycle', () => {
  test.beforeAll(async () => {
    await checkAWSCredentials();
    state.email = generateTestEmail();
    state.password = generateTestPassword();
  });

  test.afterAll(async () => {
    // Best-effort cleanup — always attempt both, log errors but don't throw
    if (state.cognitoUsername) {
      try {
        await adminDeleteUser(state.cognitoUsername);
      } catch (e) {
        console.error('Cognito cleanup failed:', e);
      }
    }
    if (state.userId) {
      try {
        await deleteUserFromDynamoDB(state.userId);
      } catch (e) {
        console.error('DynamoDB cleanup failed:', e);
      }
    }
  });

  // -------------------------------------------------------------------------
  // Signup
  // -------------------------------------------------------------------------
  test('signup: create new account', async ({ page }) => {
    // 1. Navigate to the auth flow
    await page.goto('/authenticate');

    // 2. Enter email
    await page.waitForSelector('#email-input', { state: 'visible' });
    await page.fill('#email-input', state.email);
    await page.click('button[type="submit"]');

    // 3. New-user flow → password setup step
    await page.waitForSelector('#password-setup-input', { state: 'visible', timeout: 15000 });
    await page.fill('#password-setup-input', state.password);

    // 4. Wait for password validation to pass (submit button becomes enabled)
    await page.waitForFunction(
      () => {
        const btn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
        return btn && !btn.disabled;
      },
      { timeout: 5000 },
    );
    await page.click('button[type="submit"]');

    // 5. Wait for Cognito to process signup — app shows email verification step
    await page.waitForSelector('.auth-flow__form-step--active', { timeout: 30000 });
    await page.waitForTimeout(2000); // Allow Cognito to finish processing

    // 6. Admin-confirm the user (bypass email verification)
    await adminConfirmSignUp(state.email);
    state.cognitoUsername = state.email; // Cognito uses email as username

    // 7. Navigate back and sign in (app may be stuck on verification step)
    await page.goto('/authenticate');
    await page.waitForSelector('#email-input', { state: 'visible' });
    await page.fill('#email-input', state.email);
    await page.click('button[type="submit"]');

    // 8. Existing confirmed user → password signin step
    await page.waitForSelector('#password-input', { state: 'visible', timeout: 15000 });
    await page.fill('#password-input', state.password);

    await page.waitForFunction(
      () => {
        const btn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
        return btn && !btn.disabled;
      },
      { timeout: 5000 },
    );
    await page.click('button[type="submit"]');

    // 9. Verify navigation away from /authenticate
    await page.waitForURL(/\/(dashboard|profile|mfa)/, { timeout: 30000 });

    // 10. Mark signup as succeeded
    state.signupSucceeded = true;

    // 11. Best-effort: try to extract userId from the page for cleanup
    // (not critical — Cognito cleanup via email is the primary path)
  });

  // -------------------------------------------------------------------------
  // Signin
  // -------------------------------------------------------------------------
  test('signin: sign in with existing account', async ({ page }) => {
    test.skip(!state.signupSucceeded, 'Signup did not succeed');

    // 1. Navigate to auth flow
    await page.goto('/authenticate');

    // 2. Enter email
    await page.waitForSelector('#email-input', { state: 'visible' });
    await page.fill('#email-input', state.email);
    await page.click('button[type="submit"]');

    // 3. Existing user → password step
    await page.waitForSelector('#password-input', { state: 'visible', timeout: 15000 });
    await page.fill('#password-input', state.password);

    await page.waitForFunction(
      () => {
        const btn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
        return btn && !btn.disabled;
      },
      { timeout: 5000 },
    );

    // 4. Submit
    await page.click('button[type="submit"]');

    // 5. Verify navigation to dashboard or profile
    await page.waitForURL(/\/(dashboard|profile)/, { timeout: 30000 });
  });

  // -------------------------------------------------------------------------
  // Signout
  // -------------------------------------------------------------------------
  test('signout: sign out and verify redirect', async ({ page }) => {
    test.skip(!state.signupSucceeded, 'Signup did not succeed');

    // 1. Trigger signout via query parameter
    await page.goto('/authenticate?signout=true');

    // 2. Wait for redirect to clean /authenticate (no signout param)
    await page.waitForURL(/\/authenticate$/, { timeout: 15000 });

    // 3. Verify the email input is visible (user is logged out)
    await page.waitForSelector('#email-input', { state: 'visible' });

    // 4. Verify protected route redirects back to authenticate
    await page.goto('/dashboard');
    await page.waitForURL(/\/authenticate/, { timeout: 15000 });
  });
});
