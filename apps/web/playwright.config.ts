/**
 * Playwright configuration for orb-integration-hub
 * 
 * This configuration supports local E2E testing with authentication state reuse.
 * Tests run against local frontend (http://localhost:4200) and deployed AWS backend.
 */

import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

export default defineConfig({
  testDir: './e2e/tests',
  
  // Parallel execution
  fullyParallel: true,
  
  // CI-specific settings
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list']
  ],
  
  // Global test configuration
  use: {
    // Base URL for navigation
    baseURL: process.env.BASE_URL || 'http://localhost:4200',
    
    // Trace on first retry
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
    
    // Timeout for actions
    actionTimeout: 10000,
    
    // Timeout for navigation
    navigationTimeout: 30000,
  },
  
  // Test timeout
  timeout: 60000,
  
  // Browser projects
  projects: [
    // Auth tests — self-contained, no stored state needed
    {
      name: 'auth',
      testMatch: /auth\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    // Setup project for authentication (used by non-auth tests)
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    
    // Chromium with stored auth
    {
      name: 'chromium',
      testIgnore: /auth\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    
    // Firefox with stored auth
    {
      name: 'firefox',
      testIgnore: /auth\.spec\.ts/,
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    
    // WebKit with stored auth
    {
      name: 'webkit',
      testIgnore: /auth\.spec\.ts/,
      use: {
        ...devices['Desktop Safari'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
  
  // Web server configuration
  webServer: {
    command: 'npm start',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});