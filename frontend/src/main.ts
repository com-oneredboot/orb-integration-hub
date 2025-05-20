// file: frontend/src/main.ts
// author: Corey Dale Peters
// date: 2025-03-07
// description: TypeScript file

// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom } from '@angular/core';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { authReducer } from './app/features/user/components/auth-flow/store/auth.reducer';
import { AuthEffects } from './app/features/user/components/auth-flow/store/auth.effects';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgOptimizedImage } from '@angular/common';
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

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideStore({ auth: authReducer }),
    provideEffects([AuthEffects]),
    importProvidersFrom(BrowserModule, ReactiveFormsModule, FontAwesomeModule, NgOptimizedImage)
  ]
}).catch(err => console.error(err));
