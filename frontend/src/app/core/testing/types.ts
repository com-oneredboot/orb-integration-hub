// file: frontend/src/app/core/testing/types.ts
// author: Claude Code Assistant
// date: 2025-06-23
// description: Common TypeScript types and interfaces for testing

/**
 * Test credentials for authentication testing
 */
export interface TestCredentials {
  username: string;
  password: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

/**
 * Test scenario configuration
 */
export interface TestScenario {
  name: string;
  description: string;
  input: any;
  expectedOutput?: any;
  expectedError?: any;
  timeout?: number;
  retries?: number;
}

/**
 * Security test case configuration
 */
export interface SecurityTestCase {
  name: string;
  type: 'xss' | 'injection' | 'timing' | 'rate_limit' | 'auth_bypass' | 'token_manipulation';
  payload: any;
  expectedBehavior: 'reject' | 'sanitize' | 'rate_limit' | 'throw_error';
  description: string;
}

/**
 * Test user roles for RBAC testing
 */
export type TestUserRole = 'admin' | 'user' | 'guest' | 'suspended' | 'pending';

/**
 * Test environment configuration
 */
export interface TestEnvironment {
  apiUrl: string;
  cognitoConfig: {
    userPoolId: string;
    clientId: string;
  };
  enableMocking: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Performance test configuration
 */
export interface PerformanceTestConfig {
  concurrentUsers: number;
  testDuration: number;
  operationsPerSecond: number;
  memoryThreshold: number;
  responseTimeThreshold: number;
}

/**
 * Cross-browser test configuration
 */
export interface CrossBrowserTestConfig {
  browsers: ('chrome' | 'firefox' | 'safari' | 'edge')[];
  viewports: Array<{ width: number; height: number; name: string }>;
  features: string[];
}

/**
 * Mock response configuration
 */
export interface MockResponse<T = any> {
  data?: T;
  status: number;
  headers?: Record<string, string>;
  delay?: number;
  error?: string;
}

/**
 * Test data factory options
 */
export interface TestDataFactoryOptions {
  seed?: number;
  locale?: string;
  overrides?: Record<string, any>;
  count?: number;
}

/**
 * Accessibility test configuration
 */
export interface AccessibilityTestConfig {
  level: 'A' | 'AA' | 'AAA';
  rules: string[];
  exclude: string[];
  context?: string;
}

/**
 * Integration test configuration
 */
export interface IntegrationTestConfig {
  endpoints: string[];
  authentication: TestCredentials;
  timeout: number;
  retries: number;
  parallelRequests: number;
}