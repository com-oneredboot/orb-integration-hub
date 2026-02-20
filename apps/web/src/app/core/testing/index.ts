// file: apps/web/src/app/core/testing/index.ts
// author: Claude Code Assistant
// date: 2025-06-23
// description: Barrel export for testing utilities and test data factories

// Test Data Factories
export { AuthTestDataFactory } from './auth-test-data.factory';
export { OrganizationTestDataFactory } from './organization-test-data.factory';

// Security Testing Utilities
export { SecurityTestUtils } from './security-test-utils';

// Cross-Browser Testing Suite
export { CrossBrowserTestingSuite } from './cross-browser-testing-suite';

// Re-export commonly used testing types and interfaces
export type { TestCredentials, TestScenario, SecurityTestCase } from './types';

// Test configuration constants
export const TEST_CONFIG = {
  DEFAULT_TIMEOUT: 5000,
  NETWORK_DELAY: 100,
  RATE_LIMIT_WINDOW: 60000,
  MAX_ATTEMPTS: 5,
  SECURITY_TEST_ITERATIONS: 10
} as const;

// Common test utilities
export const TestUtils = {
  /**
   * Create a promise that resolves after specified delay
   */
  delay: (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms)),
  
  /**
   * Generate random test email
   */
  randomEmail: (): string => `test.${Date.now()}.${Math.random().toString(36).substr(2, 9)}@example.com`,
  
  /**
   * Generate random test phone number
   */
  randomPhone: (): string => `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
  
  /**
   * Generate random user ID for testing
   */
  randomUserId: (): string => `test-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  
  /**
   * Check if running in test environment
   */
  isTestEnvironment: (): boolean => typeof jasmine !== 'undefined' || typeof jest !== 'undefined'
};