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
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
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

// Initialize security headers for CSRF protection
if (typeof document !== 'undefined') {
  // Set Content Security Policy for additional security
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Required for Angular and AWS Amplify
    "style-src 'self' 'unsafe-inline'", // Required for Angular component styles
    "img-src 'self' data: https:", // Allow images from self, data URLs, and HTTPS
    "font-src 'self' data:",
    "connect-src 'self' https://*.amazonaws.com https://*.amplifyapp.com", // AWS services
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
  document.head.appendChild(meta);

  // Set additional security headers via meta tags (excluding X-Frame-Options which requires HTTP headers)
  const securityHeaders = [
    { name: 'X-Content-Type-Options', content: 'nosniff' },
    { name: 'X-XSS-Protection', content: '1; mode=block' },
    { name: 'Referrer-Policy', content: 'strict-origin-when-cross-origin' }
  ];

  securityHeaders.forEach(({ name, content }) => {
    const metaTag = document.createElement('meta');
    metaTag.httpEquiv = name;
    metaTag.content = content;
    document.head.appendChild(metaTag);
  });

  console.debug('[Security] Security headers initialized');
  console.info('[Security] Note: X-Frame-Options and frame-ancestors directives should be set via HTTP headers at server level for full protection');
}

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideStore({ auth: authReducer }),
    provideEffects([AuthEffects]),
    provideHttpClient(withInterceptorsFromDi()), // Enable HTTP client for CSRF functionality
    importProvidersFrom(BrowserModule, ReactiveFormsModule, FontAwesomeModule, NgOptimizedImage)
  ]
}).catch(err => console.error(err));
