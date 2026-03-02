/**
 * Cognito authentication helper for E2E tests
 * 
 * This module provides functions for authenticating test users and managing
 * authentication state across E2E tests.
 */

import { Page } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface SignupData extends LoginCredentials {
  email: string;
  name: string;
}

export interface AuthState {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * Retrieves test user credentials from environment variables
 * @returns Test user credentials
 * @throws Error if credentials are not configured
 */
export function getTestUser(): TestUser {
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

/**
 * Login to the application using Cognito
 * @param page - Playwright page instance
 * @param credentials - Test user credentials
 * @returns Promise that resolves when authentication is complete
 */
export async function login(page: Page, credentials: LoginCredentials): Promise<void> {
  try {
    await page.goto('/auth/login');

    await page.locator('input[name="username"], input[type="email"]').fill(credentials.username);
    await page.locator('input[name="password"], input[type="password"]').fill(credentials.password);
    await page.locator('button[type="submit"]').click();

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Store authentication state
    await page.context().storageState({ path: 'e2e/.auth/user.json' });
  } catch (error: any) {
    throw new Error(
      `Authentication failed for ${credentials.username}\n` +
      `Possible causes:\n` +
      `1. Test user does not exist in Cognito\n` +
      `2. Password is incorrect\n` +
      `3. User account is locked or disabled\n` +
      `4. Frontend is not running at ${page.url()}\n` +
      `Original error: ${error.message}`
    );
  }
}

/**
 * Logout from the application
 * @param page - Playwright page instance
 */
export async function logout(page: Page): Promise<void> {
  await page.locator('button:has-text("Logout"), a:has-text("Logout")').click();
  await page.waitForURL('**/auth/login');
}

/**
 * Sign up a new user account
 * @param page - Playwright page instance
 * @param data - Signup data including email, name, username, and password
 */
export async function signup(page: Page, data: SignupData): Promise<void> {
  await page.goto('/auth/signup');

  await page.locator('input[name="email"]').fill(data.email);
  await page.locator('input[name="name"]').fill(data.name);
  await page.locator('input[name="username"]').fill(data.username);
  await page.locator('input[name="password"]').fill(data.password);
  await page.locator('button[type="submit"]').click();

  // Wait for confirmation page or redirect
  await page.waitForURL('**/auth/confirm', { timeout: 10000 });
}

/**
 * Get authentication token from storage
 * @param page - Playwright page instance
 * @returns Authentication token or null if not found
 */
export async function getAuthToken(page: Page): Promise<string | null> {
  const cookies = await page.context().cookies();
  const authCookie = cookies.find(c => c.name === 'idToken' || c.name === 'accessToken');
  return authCookie?.value || null;
}
