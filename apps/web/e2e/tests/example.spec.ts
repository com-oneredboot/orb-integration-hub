/**
 * Example E2E test demonstrating best practices
 * 
 * This test demonstrates:
 * - Authentication with stored state
 * - Resource creation with fixtures
 * - Cleanup in afterEach hook
 * - GraphQL waiting with utils
 * - Error handling patterns
 */

import { test, expect } from '@playwright/test';
import { getTestUser } from '../auth/cognito';
import { createTestOrganization, cleanupTestData, TestResource } from '../fixtures';
import { waitForGraphQL, takeTimestampedScreenshot } from '../utils';

test.describe('Example E2E Test', () => {
  const resources: TestResource[] = [];
  
  test.beforeEach(async ({ page }) => {
    // Authentication state is already loaded from e2e/.auth/user.json
    // Navigate to the page under test
    await page.goto('/customers/organizations');
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="organizations-list"]', { timeout: 10000 });
  });
  
  test.afterEach(async () => {
    // Cleanup test data - runs even if test fails
    await cleanupTestData(resources);
    resources.length = 0;
  });
  
  test('demonstrates resource creation and cleanup', async ({ page }) => {
    try {
      // Create test organization using fixtures
      const org = await createTestOrganization({
        name: 'example-org',
        description: 'Example organization for testing'
      });
      resources.push(org);
      
      // Navigate to organization detail page
      await page.goto(`/customers/organizations/${org.id}`);
      
      // Wait for GraphQL query to complete
      await waitForGraphQL(page, 'getOrganization');
      
      // Verify organization details are displayed
      await expect(page.locator('[data-testid="org-name"]')).toContainText('e2e-test-example-org');
      await expect(page.locator('[data-testid="org-description"]')).toContainText('Example organization for testing');
      
      // Take screenshot for documentation
      await takeTimestampedScreenshot(page, 'organization-detail');
      
    } catch (error) {
      // Take screenshot on error for debugging
      await takeTimestampedScreenshot(page, 'error-state');
      throw error;
    }
  });
  
  test('demonstrates form interaction', async ({ page }) => {
    try {
      // Click create button
      await page.click('[data-testid="create-org-button"]');
      
      // Wait for form to appear
      await page.waitForSelector('[data-testid="org-form"]');
      
      // Fill form fields
      await page.fill('[data-testid="org-name-input"]', 'Test Organization');
      await page.fill('[data-testid="org-description-input"]', 'Test description');
      
      // Submit form
      await page.click('[data-testid="save-button"]');
      
      // Wait for GraphQL mutation to complete
      await waitForGraphQL(page, 'createOrganization');
      
      // Wait for navigation to detail page
      await page.waitForURL(/\/customers\/organizations\/[a-f0-9-]+/);
      
      // Extract organization ID from URL for cleanup
      const url = page.url();
      const orgId = url.split('/').pop();
      
      if (orgId) {
        resources.push({
          id: orgId,
          type: 'organization',
          createdAt: new Date()
        });
      }
      
      // Verify organization was created
      await expect(page.locator('[data-testid="org-name"]')).toContainText('Test Organization');
      
    } catch (error) {
      await takeTimestampedScreenshot(page, 'form-error');
      throw error;
    }
  });
  
  test('demonstrates error handling', async ({ page }) => {
    // Test user credentials
    const testUser = getTestUser();
    expect(testUser.email).toBeTruthy();
    expect(testUser.password).toBeTruthy();
    
    // Navigate to a page that requires authentication
    await page.goto('/customers/organizations');
    
    // Verify we're authenticated (not redirected to login)
    await expect(page).not.toHaveURL(/\/auth\/login/);
    
    // Verify page loaded successfully
    await expect(page.locator('[data-testid="organizations-list"]')).toBeVisible();
  });
  
  test('demonstrates waiting for stable elements', async ({ page }) => {
    // Navigate to page with animations
    await page.goto('/user/dashboard');
    
    // Wait for element to be visible and stable (animations complete)
    const element = page.locator('[data-testid="dashboard-header"]');
    await element.waitFor({ state: 'visible' });
    await page.waitForTimeout(100); // Small delay for animations
    
    // Now safe to interact with element
    await expect(element).toBeVisible();
  });
});
