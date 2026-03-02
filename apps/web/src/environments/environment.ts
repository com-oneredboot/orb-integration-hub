// file: apps/web/src/environments/environment.ts
// author: Corey Dale Peters
// date: 2025-06-20
// description: Development environment configuration with secure placeholder tokens

// src/environments/environment.ts
export const environment = {
  appName: 'Integration Hub',
  production: false,
  debugMode: false, // Debug mode disabled by default (overridden in local environment)
  loggingLevel: 'debug',
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
