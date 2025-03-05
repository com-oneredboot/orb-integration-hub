// src/environments/environment.ts
export const environment = {
  appName: 'OneRedBoot.com (Development)',
  production: false,
  loggingLevel: 'debug',
  cognito: {
    userPoolId: 'us-east-1_YRI3K0Ijp',
    userPoolClientId: '1tfddnvolaq04ufmcimq35mlkl',
    qrCodeIssuer: 'OneRedBoot.com'
  },
  graphql: {
    url: 'https://jtl26ovh4vf27ehd5kslhsmyxy.appsync-api.us-east-1.amazonaws.com/graphql',
    region: 'us-east-1',
    apiKey: 'da2-p5p56xpjibahvn22tuvx2aihtm'
  }
};
