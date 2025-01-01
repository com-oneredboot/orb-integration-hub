
// src/environments/environment.prod.ts
export const environment = {
  appName: 'OneRedBoot.com',
  production: true,
  cognito: {
    userPoolId: 'orb-integration-hub-prod-user-pool-id',
    userPoolClientId: 'orb-integration-hub-prod-user-pool-client-id',
    qrCodeIssuer: 'OneRedBoot.com'
  }
};
