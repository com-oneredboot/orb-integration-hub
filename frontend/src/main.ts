// src/main.ts
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { Amplify } from 'aws-amplify';
import { environment } from './environments/environment';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolClientId: environment.cognito.userPoolClientId,
      userPoolId: environment.cognito.userPoolId,
    }
  },
  API: {
    GraphQL: {
      apiKey: environment.graphql.apiKey,
      endpoint: environment.graphql.url,
      region: environment.graphql.region,
      defaultAuthMode: 'userPool',
    }
  }
});

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
