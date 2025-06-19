// file: frontend/src/environments/environment.ts
// author: Corey Dale Peters
// date: 2025-03-07
// description: TypeScript file

// src/environments/environment.ts
export const environment = {
  appName: 'Integration Hub',
  production: false,
  loggingLevel: 'debug',
  cognito: {
    userPoolId: 'us-east-1_3axyfJmvW',
    userPoolClientId: '40r8ms3deicu90jcfh6kpjdp1g',
    qrCodeIssuer: 'OneRedBoot.com'
  },
  graphql: {
    url: 'https://62fdzwsyvje53e2zg56zj7brfm.appsync-api.us-east-1.amazonaws.com/graphql', // Replace with production URL
    region: 'us-east-1',
    apiKey: 'da2-2efhtxv5fna4zgoynl7vbdmvcu' // Replace with production API key
  }
};
