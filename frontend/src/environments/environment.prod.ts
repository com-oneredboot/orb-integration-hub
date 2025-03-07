// file: frontend/src/environments/environment.prod.ts
// author: Corey Dale Peters
// date: 2025-03-07
// description: TypeScript file


// src/environments/environment.prod.ts
export const environment = {
  appName: 'OneRedBoot.com',
  production: true,
  cognito: {
    userPoolId: 'orb-integration-hub-prod-user-pool-id',
    userPoolClientId: 'orb-integration-hub-prod-user-pool-client-id',
    qrCodeIssuer: 'OneRedBoot.com'
  },
  graphql: {
    url: 'https://jtl26ovh4vf27ehd5kslhsmyxy.appsync-api.us-east-1.amazonaws.com/graphql', // Replace with production URL
    region: 'us-east-1',
    apiKey: 'da2-p5p56xpjibahvn22tuvx2aihtm' // Replace with production API key
  }
};
