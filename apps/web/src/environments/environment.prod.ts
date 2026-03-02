// file: apps/web/src/environments/environment.prod.ts
// author: Claude Code
// date: 2025-06-21
// description: Production environment configuration with debug mode disabled

export const environment = {
  appName: 'Integration Hub',
  production: true,
  debugMode: false, // Debug mode DISABLED for production security
  loggingLevel: 'error', // Only error logging in production
  cognito: {
    userPoolId: '{{COGNITO_USER_POOL_ID}}',
    userPoolClientId: '{{COGNITO_CLIENT_ID}}',
    qrCodeIssuer: '{{COGNITO_QR_ISSUER}}'
  },
  graphql: {
    url: '{{GRAPHQL_API_URL}}',
    region: '{{AWS_REGION}}'
  },
  sdkApi: {
    url: '{{SDK_API_URL}}',
    apiKey: '{{SDK_API_KEY}}',
    region: '{{AWS_REGION}}'
  }
};