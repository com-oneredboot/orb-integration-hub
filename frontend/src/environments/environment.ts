// file: frontend/src/environments/environment.ts
// author: Corey Dale Peters
// date: 2025-06-20
// description: Development environment configuration with secure credential handling

import { getEnvironmentConfig } from './environment.config';

// src/environments/environment.ts
export const environment = {
  appName: 'Integration Hub',
  production: false,
  loggingLevel: 'debug',
  cognito: {
    userPoolId: getEnvironmentConfig(
      'COGNITO_USER_POOL_ID', 
      'us-east-1_3axyfJmvW', // Development fallback only
      true
    ),
    userPoolClientId: getEnvironmentConfig(
      'COGNITO_CLIENT_ID', 
      '40r8ms3deicu90jcfh6kpjdp1g', // Development fallback only
      true
    ),
    qrCodeIssuer: getEnvironmentConfig(
      'COGNITO_QR_ISSUER', 
      'OneRedBoot.com',
      false
    )
  },
  graphql: {
    url: getEnvironmentConfig(
      'GRAPHQL_API_URL', 
      'https://62fdzwsyvje53e2zg56zj7brfm.appsync-api.us-east-1.amazonaws.com/graphql', // Development fallback only
      true
    ),
    region: getEnvironmentConfig(
      'AWS_REGION', 
      'us-east-1',
      true
    ),
    apiKey: getEnvironmentConfig(
      'GRAPHQL_API_KEY', 
      'da2-2efhtxv5fna4zgoynl7vbdmvcu', // Development fallback only
      true
    )
  }
};
