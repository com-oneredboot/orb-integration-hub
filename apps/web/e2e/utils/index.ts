/**
 * Utility functions for E2E tests
 * 
 * This module provides helper functions for common E2E testing tasks.
 */

import { Page } from '@playwright/test';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { fromSSO } from '@aws-sdk/credential-providers';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Waits for a GraphQL operation to complete
 * @param page - Playwright page instance
 * @param operationName - Name of the GraphQL operation
 * @param timeout - Maximum wait time in milliseconds
 */
export async function waitForGraphQL(
  page: Page,
  operationName: string,
  timeout = 5000
): Promise<void> {
  await page.waitForResponse(
    response =>
      response.url().includes('/graphql') &&
      response.request().postDataJSON()?.operationName === operationName,
    { timeout }
  );
}

/**
 * Takes a timestamped screenshot for debugging
 * @param page - Playwright page instance
 * @param name - Screenshot name prefix
 */
export async function takeTimestampedScreenshot(
  page: Page,
  name: string
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${name}-${timestamp}.png`;
  const screenshotPath = path.join('test-results', 'screenshots', filename);
  
  // Ensure directory exists
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved: ${screenshotPath}`);
}

/**
 * Waits for an element to be visible and stable
 * @param page - Playwright page instance
 * @param selector - Element selector
 * @param timeout - Maximum wait time in milliseconds
 */
export async function waitForStableElement(
  page: Page,
  selector: string,
  timeout = 5000
): Promise<void> {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible', timeout });
  
  // Wait for element to stop moving (animations complete)
  await page.waitForTimeout(100); // Small delay for animations
}

/**
 * Fills a form field and waits for validation
 * @param page - Playwright page instance
 * @param selector - Input field selector
 * @param value - Value to fill
 */
export async function fillAndValidate(
  page: Page,
  selector: string,
  value: string
): Promise<void> {
  await page.fill(selector, value);
  await page.locator(selector).blur(); // Trigger validation
  await page.waitForTimeout(100); // Wait for validation to complete
}

/**
 * Checks if AWS credentials are valid
 * @throws Error if credentials are expired or invalid
 */
export async function checkAWSCredentials(): Promise<void> {
  try {
    const client = new STSClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: fromSSO({ profile: process.env.AWS_PROFILE || 'sso-orb-dev' })
    });
    
    await client.send(new GetCallerIdentityCommand({}));
  } catch (error: any) {
    throw new Error(
      'AWS credentials are invalid or expired. ' +
      'Please run: aws sso login --profile sso-orb-dev'
    );
  }
}

/**
 * Formats a date for display in tests
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatTestDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Generates a unique test identifier
 * @param prefix - Identifier prefix
 * @returns Unique identifier string
 */
export function generateTestId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
