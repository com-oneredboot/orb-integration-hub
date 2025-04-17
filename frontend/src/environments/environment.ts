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
    userPoolId: 'us-east-1_YRI3K0Ijp',
    userPoolClientId: '1tfddnvolaq04ufmcimq35mlkl',
    qrCodeIssuer: 'OneRedBoot.com'
  },
  graphql: {
    url: 'https://ohh6hgzvzvbchp7pkzy675ec2i.appsync-api.us-east-1.amazonaws.com/graphql',
    region: 'us-east-1',
    apiKey: 'da2-33l2upnfdrecpoaerbvlujab4u'
  }
};
