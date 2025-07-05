/**
 * Integration test configuration
 */

export interface TestConfig {
  aws: {
    region: string;
    endpoint?: string;
    cognitoUserPoolId: string;
    cognitoClientId: string;
    appsyncEndpoint: string;
    appsyncApiKey: string;
  };
  endpoints: {
    backend: string;
    frontend: string;
    graphql: string;
  };
  credentials: {
    testUserEmail: string;
    testUserPassword: string;
    testPhoneNumber: string;
  };
  timeouts: {
    default: number;
    authentication: number;
    api: number;
    database: number;
  };
  retries: {
    default: number;
    flaky: number;
  };
}

export const getTestConfig = (): TestConfig => {
  const config: TestConfig = {
    aws: {
      region: process.env.TEST_AWS_REGION || 'us-east-1',
      endpoint: process.env.TEST_AWS_ENDPOINT, // For LocalStack
      cognitoUserPoolId: process.env.TEST_COGNITO_USER_POOL_ID || 'us-east-1_testpool',
      cognitoClientId: process.env.TEST_COGNITO_CLIENT_ID || 'test-client-id',
      appsyncEndpoint: process.env.TEST_APPSYNC_ENDPOINT || 'https://test-appsync.amazonaws.com/graphql',
      appsyncApiKey: process.env.TEST_APPSYNC_API_KEY || 'da2-test-api-key'
    },
    endpoints: {
      backend: process.env.TEST_BACKEND_URL || 'http://localhost:3000',
      frontend: process.env.TEST_FRONTEND_URL || 'http://localhost:4200',
      graphql: process.env.TEST_GRAPHQL_URL || 'http://localhost:8080/graphql'
    },
    credentials: {
      testUserEmail: process.env.TEST_USER_EMAIL || 'integration-test@example.com',
      testUserPassword: process.env.TEST_USER_PASSWORD || 'IntegrationTest123!',
      testPhoneNumber: process.env.TEST_PHONE_NUMBER || '+15551234567'
    },
    timeouts: {
      default: parseInt(process.env.TEST_TIMEOUT_DEFAULT || '10000'),
      authentication: parseInt(process.env.TEST_TIMEOUT_AUTH || '15000'),
      api: parseInt(process.env.TEST_TIMEOUT_API || '5000'),
      database: parseInt(process.env.TEST_TIMEOUT_DB || '3000')
    },
    retries: {
      default: parseInt(process.env.TEST_RETRIES_DEFAULT || '3'),
      flaky: parseInt(process.env.TEST_RETRIES_FLAKY || '5')
    }
  };

  return config;
};

export const isLocalStack = (): boolean => {
  return !!process.env.TEST_AWS_ENDPOINT;
};

export const isCIEnvironment = (): boolean => {
  return !!(process.env.CI || process.env.GITHUB_ACTIONS || process.env.GITLAB_CI);
};

export const skipIntegrationTests = (): boolean => {
  return process.env.SKIP_INTEGRATION_TESTS === 'true';
};