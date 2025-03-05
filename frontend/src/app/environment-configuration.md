# Environment Configuration Best Practices

## Overview

This document outlines the recommended approach for handling environment-specific configuration in the ORB Integration Hub frontend. These guidelines replace the previous pattern of using mock data fallbacks for development environments.

## Environment Types

1. **Development (Local)**: 
   - Points to development API endpoints
   - Full debugging enabled
   - No mock data, uses real API calls
   - May use development services (Auth, API, etc.)

2. **Testing/QA**:
   - Points to testing API endpoints
   - Reduced debugging
   - No mock data, uses real API calls
   - Uses isolated test services

3. **Production**:
   - Points to production API endpoints
   - Minimal debugging
   - No mock data, no fallbacks
   - Uses production services

## Implementation Pattern

### Environment Files

Use structured environment files:

```typescript
// environment.ts (development)
export const environment = {
  appName: 'OneRedBoot.com (Dev)',
  production: false,
  apiBaseUrl: 'https://dev-api.example.com',
  loggingLevel: 'debug',
  cognito: {
    userPoolId: 'us-east-1_DEV_POOL',
    userPoolClientId: 'dev-client-id',
    qrCodeIssuer: 'OneRedBoot.com'
  },
  graphql: {
    url: 'https://dev-graphql.example.com/graphql',
    region: 'us-east-1',
    apiKey: 'dev-api-key'
  }
};
```

```typescript
// environment.prod.ts
export const environment = {
  appName: 'OneRedBoot.com',
  production: true,
  apiBaseUrl: 'https://api.example.com',
  loggingLevel: 'error',
  cognito: {
    userPoolId: 'us-east-1_PROD_POOL',
    userPoolClientId: 'prod-client-id',
    qrCodeIssuer: 'OneRedBoot.com'
  },
  graphql: {
    url: 'https://graphql.example.com/graphql',
    region: 'us-east-1',
    apiKey: 'prod-api-key'
  }
};
```

### Environment Service

Create a dedicated environment service:

```typescript
@Injectable({
  providedIn: 'root'
})
export class EnvironmentService {
  get isProduction(): boolean {
    return environment.production;
  }
  
  get loggingLevel(): string {
    return environment.loggingLevel;
  }
  
  get apiBaseUrl(): string {
    return environment.apiBaseUrl;
  }
  
  get appName(): string {
    return environment.appName;
  }
  
  // Cognito getters
  get cognitoUserPoolId(): string {
    return environment.cognito.userPoolId;
  }
  
  get cognitoUserPoolClientId(): string {
    return environment.cognito.userPoolClientId;
  }
  
  // GraphQL getters
  get graphqlUrl(): string {
    return environment.graphql.url;
  }
  
  get graphqlRegion(): string {
    return environment.graphql.region;
  }
  
  get graphqlApiKey(): string {
    return environment.graphql.apiKey;
  }
}
```

### Logging Service

Create a dedicated logging service:

```typescript
@Injectable({
  providedIn: 'root'
})
export class LoggingService {
  constructor(private environmentService: EnvironmentService) {}
  
  debug(message: string, data?: any): void {
    if (this.environmentService.loggingLevel === 'debug') {
      console.debug(message, data || '');
    }
  }
  
  info(message: string, data?: any): void {
    if (['debug', 'info'].includes(this.environmentService.loggingLevel)) {
      console.info(message, data || '');
    }
  }
  
  warn(message: string, data?: any): void {
    if (['debug', 'info', 'warn'].includes(this.environmentService.loggingLevel)) {
      console.warn(message, data || '');
    }
  }
  
  error(message: string, error?: any): void {
    // Always log errors
    console.error(message, error || '');
  }
}
```

## Key Advantages

1. **Consistency**: Same code runs in all environments
2. **Transparency**: Clear configuration visibility
3. **Maintainability**: Centralized environment settings
4. **Testability**: No special behavior in tests

## Development Environment Setup

For local development:

1. Use a development backend environment
2. Configure CORS on backend to allow local frontend
3. Set up local environment variables
4. Use real API endpoints with real data

This approach eliminates the need for mock fallbacks while still providing a smooth development experience.