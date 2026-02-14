# @orb/sdk-core

Core TypeScript SDK for orb-integration-hub - Authentication, Authorization, and API client.

## Installation

```bash
npm install @orb/sdk-core
```

## Quick Start

```typescript
import { OrbClient } from '@orb/sdk-core';

// Initialize the client
const client = new OrbClient({
  region: 'us-east-1',
  userPoolId: 'us-east-1_xxxxxxxx',
  userPoolClientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
  apiEndpoint: 'https://xxxxxxxxxx.appsync-api.us-east-1.amazonaws.com/graphql',
});

// Sign in
const result = await client.signIn('user@example.com', 'password');

// Check authentication state
client.onAuthStateChange((state) => {
  console.log('Auth state:', state);
});

// Check permissions
const hasAccess = await client.authorization.hasPermission('read:users');
```

## Features

- **Authentication**: Sign up, sign in, MFA, email/phone verification
- **Token Management**: Automatic token refresh and secure storage
- **Authorization**: Permission checking, role-based access control
- **Type Safety**: Full TypeScript support with comprehensive types
- **Error Handling**: Typed errors with error codes and recovery suggestions

## API Reference

### OrbClient

The main entry point for the SDK.

```typescript
const client = new OrbClient(config: OrbClientConfig);
```

#### Configuration

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| region | string | Yes | AWS region |
| userPoolId | string | Yes | Cognito User Pool ID |
| userPoolClientId | string | Yes | Cognito User Pool Client ID |
| apiEndpoint | string | Yes | AppSync GraphQL endpoint |
| environment | 'dev' \| 'staging' \| 'prod' | No | Environment name |

### Authentication

```typescript
// Sign up
await client.signUp('user@example.com', 'password');

// Confirm sign up
await client.auth.confirmSignUp('user@example.com', '123456');

// Sign in
const result = await client.signIn('user@example.com', 'password');

// Handle MFA if required
if (result.challengeName === 'MFA_REQUIRED') {
  await client.auth.verifyMFA('123456', result.session);
}

// Sign out
await client.signOut();
```

### Authorization

```typescript
// Check permission
const canRead = await client.authorization.hasPermission('read:users');

// Check role
const isAdmin = await client.authorization.hasRole('OWNER');

// Check organization role
const isOrgAdmin = await client.authorization.hasOrgRole('org-123', 'Admin');
```

### Error Handling

```typescript
import { AuthenticationError, AuthorizationError } from '@orb/sdk-core';

try {
  await client.signIn('user@example.com', 'wrong-password');
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.log('Auth error:', error.code, error.message);
  }
}
```

## License

MIT
