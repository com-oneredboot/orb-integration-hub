// file: frontend/src/environments/environment.prod.ts
// author: Corey Dale Peters
// date: 2025-06-20
// description: Production environment configuration requiring secure environment variables

import { getEnvironmentConfig } from './environment.config';

// src/environments/environment.prod.ts
export const environment = {
  appName: 'OneRedBoot.com',
  production: true,
  loggingLevel: 'info', // Production logging level
  cognito: {
    userPoolId: getEnvironmentConfig(
      'COGNITO_USER_POOL_ID', 
      undefined, // No fallback - must be provided via environment variables
      true
    ),
    userPoolClientId: getEnvironmentConfig(
      'COGNITO_CLIENT_ID', 
      undefined, // No fallback - must be provided via environment variables
      true
    ),
    qrCodeIssuer: getEnvironmentConfig(
      'COGNITO_QR_ISSUER',
      'OneRedBoot.com', // Safe default for branding
      false
    )
  },
  graphql: {
    url: getEnvironmentConfig(
      'GRAPHQL_API_URL', 
      undefined, // No fallback - must be provided via environment variables
      true
    ),
    region: getEnvironmentConfig(
      'AWS_REGION', 
      undefined, // No fallback - must be provided via environment variables
      true
    ),
    apiKey: getEnvironmentConfig(
      'GRAPHQL_API_KEY', 
      undefined, // No fallback - must be provided via environment variables
      true
    )
  }
};
