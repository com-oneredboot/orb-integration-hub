// file: frontend/src/environments/environment.prod.ts
// author: Corey Dale Peters
// date: 2025-06-20
// description: Production environment configuration with secure placeholder tokens

// src/environments/environment.prod.ts
export const environment = {
  appName: 'OneRedBoot.com',
  production: true,
  loggingLevel: 'info',
  cognito: {
    userPoolId: '{{COGNITO_USER_POOL_ID}}',
    userPoolClientId: '{{COGNITO_CLIENT_ID}}',
    qrCodeIssuer: '{{COGNITO_QR_ISSUER}}'
  },
  graphql: {
    url: '{{GRAPHQL_API_URL}}',
    region: '{{AWS_REGION}}',
    apiKey: '{{GRAPHQL_API_KEY}}'
  }
};
