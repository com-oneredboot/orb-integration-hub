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
    userPoolId: 'us-east-1_Vt4EWV7Yh',
    userPoolClientId: '4ip90kp92pt2p8i3kos51tj351',
    qrCodeIssuer: 'OneRedBoot.com'
  },
  graphql: {
    url: 'https://3khpbaqhknechjhkqfefyf4v6a.appsync-api.us-east-1.amazonaws.com/graphql', // Replace with production URL
    region: 'us-east-1',
    apiKey: 'da2-e2cylrdqvfaibnsemnolr7pmki' // Replace with production API key
  }
};
