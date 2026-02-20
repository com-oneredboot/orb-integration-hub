/**
 * API Service Testing Utilities
 *
 * Provides mock Amplify configuration for unit tests.
 * This prevents "Amplify has not been configured" warnings
 * when services that extend ApiService are instantiated in tests.
 *
 * @see .kiro/specs/fix-graphql-service-tests/design.md
 */

import { Amplify } from 'aws-amplify';

let amplifyConfigured = false;

/**
 * Configure Amplify with mock settings for testing.
 * This prevents "Amplify has not been configured" warnings
 * without requiring real AWS credentials.
 *
 * Safe to call multiple times - only configures once.
 */
export function configureAmplifyForTesting(): void {
  if (amplifyConfigured) {
    return;
  }

  try {
    Amplify.configure({
      Auth: {
        Cognito: {
          userPoolClientId: 'test-client-id',
          userPoolId: 'us-east-1_TestPool',
        },
      },
      API: {
        GraphQL: {
          endpoint: 'http://localhost:4000/graphql',
          region: 'us-east-1',
          defaultAuthMode: 'apiKey',
          apiKey: 'test-api-key',
        },
      },
    });
    amplifyConfigured = true;
  } catch {
    // Already configured or configuration error - ignore
    amplifyConfigured = true;
  }
}

/**
 * Call this in test setup to configure Amplify before any tests run.
 * This is the main entry point for test environment setup.
 */
export function setupTestEnvironment(): void {
  configureAmplifyForTesting();
}
