// src/environments/environment.ts
export const environment = {
  appName: 'OneRedBoot.com',
  production: false,
  cognito: {
    userPoolId: 'us-east-1_YRI3K0Ijp',
    userPoolClientId: '1tfddnvolaq04ufmcimq35mlkl',
    qrCodeIssuer: 'OneRedBoot.com'
  },
  graphql: {
    url: 'https://ex4l6y6jwffr7mhtqvaqz7cqva.appsync-api.us-east-1.amazonaws.com/graphql',
    region: 'us-east-1',
    apiKey: 'da2-walbvsmodfhjnaopahk3xzdwc4'
  }
};
