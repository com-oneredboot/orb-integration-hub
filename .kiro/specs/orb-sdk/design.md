# Design Document: Orb SDK - Iteration 1

## Overview

This design covers Iteration 1 of the Orb SDK: Authentication, Authorization, and SDK Infrastructure. It incorporates the SDK AppSync API infrastructure from the application-access-management spec Phase 5.

## Architecture

### Package Structure

```
packages/
├── orb-sdk-core/           # @orb/sdk-core - Framework-agnostic TypeScript
│   ├── src/
│   │   ├── auth/           # Authentication module
│   │   ├── authorization/  # Authorization module  
│   │   ├── client/         # GraphQL client
│   │   ├── errors/         # Error types
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
└── orb-sdk-python/         # orb-sdk-python - Python SDK
    ├── orb_sdk/
    │   ├── auth.py
    │   ├── authorization.py
    │   ├── client.py
    │   └── errors.py
    ├── pyproject.toml
    └── tests/
```

### SDK AppSync API (from application-access-management Phase 5)

A separate AppSync API for SDK access with Lambda authorizer:

```yaml
# schema-generator.yml addition
appsync:
  sdk:
    name: "${project}-${env}-appsync-sdk"
    auth:
      default: AWS_LAMBDA
      lambda_authorizer:
        function_name: api-key-authorizer
        result_ttl_seconds: 300
        identity_validation_expression: "^orb_[a-z]+_[a-zA-Z0-9]+$"
    tables:
      - Users
      - Organizations
      - OrganizationMembers
      - ApplicationGroups
      - ApplicationGroupUsers
      - ApplicationGroupRoles
      - ApplicationUserRoles
    exclude_operations:
      - "ApplicationApiKeys*"  # SDK can't manage its own keys
```

### Authentication Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Consumer App   │────▶│   Orb SDK       │────▶│    Cognito      │
│                 │     │                 │     │                 │
│  signIn()       │     │  Auth Module    │     │  User Pool      │
│  signUp()       │     │  Token Manager  │     │                 │
│  verifyMFA()    │     │  Event Emitter  │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │    AppSync      │
                        │   (SDK API)     │
                        │                 │
                        │  Lambda Auth    │
                        └─────────────────┘
```

## Component Design

### 1. SDK Client (OrbClient)

```typescript
// packages/orb-sdk-core/src/client/orb-client.ts
export interface OrbClientConfig {
  region: string;
  userPoolId: string;
  userPoolClientId: string;
  apiEndpoint: string;
  environment?: 'dev' | 'staging' | 'prod';
}

export class OrbClient {
  private auth: AuthModule;
  private authorization: AuthorizationModule;
  private tokenManager: TokenManager;
  private eventEmitter: EventEmitter;
  
  constructor(config: OrbClientConfig);
  
  // Auth shortcuts
  signUp(email: string, password: string): Promise<SignUpResult>;
  signIn(email: string, password: string): Promise<SignInResult>;
  signOut(): Promise<void>;
  
  // Module access
  get auth(): AuthModule;
  get authorization(): AuthorizationModule;
  
  // State observation
  onAuthStateChange(callback: AuthStateCallback): Unsubscribe;
}
```

### 2. Auth Module

```typescript
// packages/orb-sdk-core/src/auth/auth-module.ts
export class AuthModule {
  // Sign Up
  signUp(params: SignUpParams): Promise<SignUpResult>;
  confirmSignUp(email: string, code: string): Promise<void>;
  resendConfirmationCode(email: string): Promise<void>;
  
  // Sign In
  signIn(params: SignInParams): Promise<SignInResult>;
  
  // MFA
  verifyMFA(code: string, session: string): Promise<AuthTokens>;
  setupMFA(): Promise<MFASetupResult>;
  confirmMFASetup(code: string): Promise<void>;
  
  // Phone Verification
  sendPhoneVerificationCode(phoneNumber: string): Promise<void>;
  verifyPhone(code: string): Promise<void>;
  
  // Session
  signOut(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  getSession(): Promise<AuthSession | null>;
}
```

### 3. Token Manager

```typescript
// packages/orb-sdk-core/src/auth/token-manager.ts
export class TokenManager {
  // Token storage
  storeTokens(tokens: AuthTokens): Promise<void>;
  getTokens(): Promise<AuthTokens | null>;
  clearTokens(): Promise<void>;
  
  // Token refresh
  refreshTokens(): Promise<AuthTokens>;
  isTokenExpired(): boolean;
  
  // Auto-refresh
  startAutoRefresh(): void;
  stopAutoRefresh(): void;
}
```

### 4. Authorization Module

```typescript
// packages/orb-sdk-core/src/authorization/authorization-module.ts
export class AuthorizationModule {
  // Permission checking
  hasPermission(permission: string): Promise<boolean>;
  hasRole(role: UserRole): Promise<boolean>;
  hasOrgRole(orgId: string, role: OrgRole): Promise<boolean>;
  
  // Permission resolution
  getPermissions(): Promise<string[]>;
  getRoles(): Promise<UserRole[]>;
  getOrgRoles(orgId: string): Promise<OrgRole[]>;
  
  // Cache management
  invalidateCache(): void;
}
```

### 5. Error Types

```typescript
// packages/orb-sdk-core/src/errors/errors.ts
export class OrbError extends Error {
  code: string;
  recoverable: boolean;
  suggestion?: string;
}

export class AuthenticationError extends OrbError {}
export class AuthorizationError extends OrbError {}
export class ValidationError extends OrbError {}
export class NetworkError extends OrbError {}
export class ServiceUnavailableError extends OrbError {}
```

### 6. Python SDK

```python
# packages/orb-sdk-python/orb_sdk/client.py
class OrbClient:
    def __init__(self, config: OrbClientConfig):
        self.auth = AuthModule(config)
        self.authorization = AuthorizationModule(config)
    
    # Convenience methods
    async def verify_token(self, token: str) -> TokenClaims:
        """Verify a JWT token and return claims."""
        
    def get_user_from_token(self, token: str) -> User:
        """Extract user info from token."""

# packages/orb-sdk-python/orb_sdk/auth.py
class AuthModule:
    async def authenticate(self, client_id: str, client_secret: str) -> AuthTokens:
        """Authenticate using client credentials (service account)."""
        
    async def verify_token(self, token: str) -> TokenClaims:
        """Verify and decode a JWT token."""
        
    async def refresh_tokens(self, refresh_token: str) -> AuthTokens:
        """Refresh authentication tokens."""
```

## API Key Authorizer Lambda

```python
# apps/api/lambdas/api_key_authorizer/handler.py
def handler(event, context):
    """
    Lambda authorizer for SDK AppSync API.
    Validates API keys in format: orb_{env}_{random}
    """
    token = event.get('authorizationToken', '')
    
    # Validate format
    if not re.match(r'^orb_[a-z]+_[a-zA-Z0-9]+$', token):
        return deny_policy()
    
    # Hash and lookup
    key_hash = hashlib.sha256(token.encode()).hexdigest()
    key_record = lookup_key(key_hash)
    
    if not key_record or key_record['status'] != 'ACTIVE':
        return deny_policy()
    
    # Return allow policy with context
    return allow_policy(
        context={
            'organizationId': key_record['organizationId'],
            'applicationId': key_record['applicationId'],
            'environment': key_record['environment']
        }
    )
```

## Correctness Properties

### Property 1: Token Refresh Maintains Session
For any valid session, refreshing tokens before expiry maintains authentication state.

```typescript
// Test: Token refresh preserves user identity
property("token refresh maintains user identity", async () => {
  const user = await client.signIn(email, password);
  const originalUserId = user.userId;
  
  await client.tokenManager.refreshTokens();
  
  const currentUser = await client.getCurrentUser();
  expect(currentUser.userId).toBe(originalUserId);
});
```

### Property 2: Sign Out Clears All Tokens
After sign out, no tokens remain accessible.

```typescript
property("sign out clears all tokens", async () => {
  await client.signIn(email, password);
  await client.signOut();
  
  const tokens = await client.tokenManager.getTokens();
  expect(tokens).toBeNull();
});
```

### Property 3: Permission Check Determinism
Same user with same roles always gets same permission result.

```typescript
property("permission check is deterministic", async () => {
  const result1 = await client.authorization.hasPermission("read:users");
  const result2 = await client.authorization.hasPermission("read:users");
  expect(result1).toBe(result2);
});
```

### Property 4: Invalid Credentials Never Return Tokens
Invalid credentials never result in valid tokens.

```typescript
property("invalid credentials never return tokens", async () => {
  try {
    await client.signIn(email, "wrong-password");
    fail("Should have thrown");
  } catch (e) {
    expect(e).toBeInstanceOf(AuthenticationError);
    const tokens = await client.tokenManager.getTokens();
    expect(tokens).toBeNull();
  }
});
```

### Property 5: API Key Validation Round-Trip
A generated API key can be validated and returns correct context.

```typescript
property("api key validation round-trip", async () => {
  const { key, applicationId, environment } = await generateApiKey();
  const context = await validateApiKey(key);
  
  expect(context.applicationId).toBe(applicationId);
  expect(context.environment).toBe(environment);
});
```

## Testing Strategy

### Unit Tests
- Mock Cognito responses for auth flows
- Mock AppSync responses for API calls
- Test error handling for all failure modes
- Test token storage/retrieval

### Property Tests
- Token lifecycle properties
- Permission resolution properties
- API key validation properties

### Integration Tests
- End-to-end auth flows against dev Cognito
- API key generation and validation
- Permission resolution with real data

## Dependencies

### TypeScript SDK
- `@aws-sdk/client-cognito-identity-provider` - Cognito operations
- `graphql-request` - GraphQL client
- `jwt-decode` - Token decoding

### Python SDK
- `boto3` - AWS SDK
- `pyjwt` - JWT handling
- `httpx` - HTTP client
- `pydantic` - Data validation

## File Changes

### New Files
- `packages/orb-sdk-core/` - TypeScript SDK package
- `packages/orb-sdk-python/` - Python SDK package
- `apps/api/lambdas/api_key_authorizer/` - Lambda authorizer
- `infrastructure/cdk/stacks/appsync_sdk_stack.py` - SDK AppSync stack

### Modified Files
- `schema-generator.yml` - Add SDK AppSync configuration
- `infrastructure/cdk/app.py` - Add SDK stack
- `Pipfile` - Add SDK Python package (local dev)
