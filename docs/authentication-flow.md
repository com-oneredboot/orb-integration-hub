# Third-Party Authentication Flow

## Overview

This document describes the authentication flow for third-party applications integrating with orb-integration-hub. The flow uses an OAuth-style redirect pattern where users authenticate on the orb-integration-hub platform, and authentication tokens are returned to the third-party application.

## Architecture

```
3rd Party App → orb SDK → Lambda Authorizer → Auth Token → Login UI → Cognito → Callback
```

## Flow Diagram

```
┌─────────────────┐
│  3rd Party App  │
│  (using orb SDK)│
└────────┬────────┘
         │ 1. initiate({ client_id, client_secret, callback_url })
         ▼
┌─────────────────────────┐
│  Lambda Authorizer      │
│  - Validates app creds  │
│  - Creates auth token   │
└────────┬────────────────┘
         │ 2. Returns { auth_token, login_url }
         ▼
┌─────────────────────────┐
│  3rd Party App          │
│  Redirects user browser │
└────────┬────────────────┘
         │ 3. GET https://login.orb.com?token={auth_token}
         ▼
┌─────────────────────────┐
│  orb Login Frontend     │
│  - Validates token      │
│  - Shows login form     │
└────────┬────────────────┘
         │ 4. User enters credentials
         ▼
┌─────────────────────────┐
│  AWS Cognito            │
│  - Authenticates user   │
│  - Handles MFA          │
│  - Returns user claims  │
└────────┬────────────────┘
         │ 5. Authentication successful
         ▼
┌─────────────────────────┐
│  orb Backend            │
│  - Updates auth token   │
│  - Creates auth code    │
└────────┬────────────────┘
         │ 6. Redirects: GET {callback_url}?code={auth_code}
         ▼
┌─────────────────────────┐
│  3rd Party App          │
│  Receives callback      │
└────────┬────────────────┘
         │ 7. exchange({ code, client_id, client_secret })
         ▼
┌─────────────────────────┐
│  Lambda Authorizer      │
│  - Validates code       │
│  - Returns user claims  │
└────────┬────────────────┘
         │ 8. Returns { user, access_token, refresh_token }
         ▼
┌─────────────────────────┐
│  3rd Party App          │
│  User authenticated     │
└─────────────────────────┘
```

## Detailed Flow

### 1. Initiate Authentication

**3rd Party App** calls the orb SDK to initiate login:

```typescript
const authResponse = await orbSDK.auth.initiate({
  client_id: 'app-client-id',
  client_secret: 'app-client-secret',
  callback_url: 'https://3rdparty.com/auth/callback',
  environment: 'production'
});
```

**Request:**
- Endpoint: `POST /sdk/auth/initiate`
- Headers: None (credentials in body)
- Body:
  ```json
  {
    "client_id": "app-client-id",
    "client_secret": "app-client-secret",
    "callback_url": "https://3rdparty.com/auth/callback",
    "environment": "production"
  }
  ```

**Lambda Authorizer validates:**
- `client_id` and `client_secret` match a registered application
- Application status is `ACTIVE`
- Application has access to the specified environment
- `callback_url` matches one of the registered callback URLs for the application

**Lambda Authorizer creates auth token:**
- Generates cryptographically secure random token (32 bytes, base64url encoded)
- Stores in DynamoDB `auth_tokens` table:
  ```json
  {
    "token": "auth-token-value",
    "client_id": "app-client-id",
    "callback_url": "https://3rdparty.com/auth/callback",
    "environment": "production",
    "status": "PENDING",
    "created_at": 1234567890,
    "expires_at": 1234568190,  // 5 minutes from creation
    "ttl": 1234568490  // DynamoDB TTL: 10 minutes from creation
  }
  ```

**Response:**
```json
{
  "auth_token": "auth-token-value",
  "login_url": "https://login.orb-integration-hub.com?token=auth-token-value",
  "expires_in": 300
}
```

### 2. Redirect to Login

**3rd Party App** redirects the user's browser:

```typescript
window.location.href = authResponse.login_url;
```

Browser navigates to:
```
GET https://login.orb-integration-hub.com?token=auth-token-value
```

### 3. Validate Token and Show Login Form

**orb Login Frontend** receives the token:

1. Extracts `token` from query parameter
2. Calls backend to validate token:
   ```
   POST /auth/validate-token
   Body: { "token": "auth-token-value" }
   ```

**Backend validates:**
- Token exists in `auth_tokens` table
- Token status is `PENDING`
- Token has not expired (`expires_at` > current time)

**If valid:**
- Returns application name and environment for display
- Frontend shows branded login form

**If invalid:**
- Returns error message
- Frontend shows error page with "Invalid or expired authentication request"

### 4. User Authentication

**User enters credentials** on the orb login form:
- Email address
- Password

**orb Frontend** calls Cognito via AWS Amplify:

```typescript
const result = await signIn({
  username: email,
  password: password
});
```

**Cognito authenticates:**
- Validates credentials
- If MFA is enabled, prompts for MFA code
- Returns ID token, access token, refresh token

**User claims extracted from ID token:**
```json
{
  "sub": "cognito-user-id",
  "email": "user@example.com",
  "email_verified": true,
  "cognito:groups": ["USER"],
  "custom:userId": "user-uuid"
}
```

### 5. Update Auth Token with User Claims

**orb Backend** updates the auth token record:

```json
{
  "token": "auth-token-value",
  "client_id": "app-client-id",
  "callback_url": "https://3rdparty.com/auth/callback",
  "environment": "production",
  "status": "AUTHENTICATED",
  "user_claims": {
    "userId": "user-uuid",
    "email": "user@example.com",
    "email_verified": true,
    "cognito_sub": "cognito-user-id",
    "groups": ["USER"]
  },
  "authenticated_at": 1234567950,
  "created_at": 1234567890,
  "expires_at": 1234568190,
  "ttl": 1234568490
}
```

**Backend creates authorization code:**
- Generates cryptographically secure random code (32 bytes, base64url encoded)
- Stores in DynamoDB `authorization_codes` table:
  ```json
  {
    "code": "auth-code-value",
    "auth_token": "auth-token-value",
    "client_id": "app-client-id",
    "used": false,
    "created_at": 1234567950,
    "expires_at": 1234568010,  // 1 minute from creation
    "ttl": 1234568310  // DynamoDB TTL: 6 minutes from creation
  }
  ```

### 6. Redirect to Callback

**orb Backend** redirects the user's browser:

```
HTTP 302 Found
Location: https://3rdparty.com/auth/callback?code=auth-code-value&state=optional-state-value
```

Browser navigates to the 3rd party callback URL.

### 7. Exchange Code for Tokens

**3rd Party App Backend** receives the callback and exchanges the code:

```typescript
const tokenResponse = await orbSDK.auth.exchange({
  code: 'auth-code-value',
  client_id: 'app-client-id',
  client_secret: 'app-client-secret'
});
```

**Request:**
- Endpoint: `POST /sdk/auth/exchange`
- Headers: None (credentials in body)
- Body:
  ```json
  {
    "code": "auth-code-value",
    "client_id": "app-client-id",
    "client_secret": "app-client-secret"
  }
  ```

**Lambda Authorizer validates:**
- Code exists in `authorization_codes` table
- Code has not been used (`used: false`)
- Code has not expired (`expires_at` > current time)
- `client_id` matches the code's `client_id`
- `client_secret` is valid for the application

**Lambda Authorizer retrieves user claims:**
- Looks up the `auth_token` linked to the code
- Extracts `user_claims` from the auth token record

**Lambda Authorizer marks code as used:**
```json
{
  "code": "auth-code-value",
  "auth_token": "auth-token-value",
  "client_id": "app-client-id",
  "used": true,
  "used_at": 1234567960,
  "created_at": 1234567950,
  "expires_at": 1234568010,
  "ttl": 1234568310
}
```

**Lambda Authorizer generates application tokens:**
- Creates JWT access token with claims:
  ```json
  {
    "sub": "user-uuid",
    "email": "user@example.com",
    "app_id": "app-client-id",
    "environment": "production",
    "iss": "orb-integration-hub",
    "aud": "app-client-id",
    "iat": 1234567960,
    "exp": 1234571560  // 1 hour from issuance
  }
  ```
- Creates refresh token (opaque token stored in DynamoDB)

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "refresh-token-value",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user": {
    "userId": "user-uuid",
    "email": "user@example.com",
    "email_verified": true,
    "groups": ["USER"]
  }
}
```

### 8. Authenticated Session

**3rd Party App** now has:
- User information
- Access token for API calls
- Refresh token for obtaining new access tokens

**Making API calls:**
```typescript
const response = await fetch('https://api.orb-integration-hub.com/graphql', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ query: '...' })
});
```

## Signup Flow

The signup flow is identical to the login flow, except:

1. The `login_url` parameter can specify signup mode:
   ```
   https://signup.orb-integration-hub.com?token=auth-token-value
   ```

2. The orb frontend shows a signup form instead of login form

3. User completes signup and email verification on the orb platform

4. After verification, the flow continues from step 5 (redirect to callback)

## Logout Flow

### Option 1: Client-Side Logout (Recommended)

**3rd Party App** simply clears local tokens:

```typescript
// Clear tokens from storage
localStorage.removeItem('access_token');
localStorage.removeItem('refresh_token');

// Redirect to login
window.location.href = '/login';
```

This is sufficient for most use cases since:
- Access tokens are short-lived (1 hour)
- Refresh tokens can be revoked server-side if needed

### Option 2: Server-Side Logout

**3rd Party App** calls the SDK to revoke tokens:

```typescript
await orbSDK.auth.logout({
  access_token: 'current-access-token',
  client_id: 'app-client-id',
  client_secret: 'app-client-secret'
});
```

**Request:**
- Endpoint: `POST /sdk/auth/logout`
- Headers: `Authorization: Bearer {access_token}`
- Body:
  ```json
  {
    "client_id": "app-client-id",
    "client_secret": "app-client-secret"
  }
  ```

**Lambda Authorizer:**
- Validates access token
- Adds access token to blacklist (DynamoDB table with TTL)
- Revokes associated refresh token
- Returns success

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Option 3: Redirect to orb Logout

**3rd Party App** redirects user to orb logout endpoint:

```
GET https://login.orb-integration-hub.com/logout?client_id=app-client-id&redirect_uri=https://3rdparty.com
```

**orb Backend:**
- Clears Cognito session
- Redirects back to 3rd party app

## Token Refresh Flow

When the access token expires, the 3rd party app can obtain a new one:

```typescript
const refreshResponse = await orbSDK.auth.refresh({
  refresh_token: 'current-refresh-token',
  client_id: 'app-client-id',
  client_secret: 'app-client-secret'
});
```

**Request:**
- Endpoint: `POST /sdk/auth/refresh`
- Body:
  ```json
  {
    "refresh_token": "current-refresh-token",
    "client_id": "app-client-id",
    "client_secret": "app-client-secret"
  }
  ```

**Lambda Authorizer validates:**
- Refresh token exists and is not revoked
- Refresh token has not expired
- `client_id` matches the token's application

**Response:**
```json
{
  "access_token": "new-access-token",
  "expires_in": 3600
}
```

Note: The refresh token itself does not change.

## DynamoDB Tables

### auth_tokens

Stores authentication tokens created during the initiate step.

| Attribute | Type | Description |
|-----------|------|-------------|
| token (PK) | String | Authentication token (32 bytes, base64url) |
| client_id | String | Application client ID |
| callback_url | String | Registered callback URL |
| environment | String | Environment (dev/staging/production) |
| status | String | PENDING, AUTHENTICATED, EXPIRED, USED |
| user_claims | Map | User information after authentication |
| created_at | Number | Unix timestamp (seconds) |
| authenticated_at | Number | Unix timestamp when user authenticated |
| expires_at | Number | Unix timestamp (5 minutes from creation) |
| ttl | Number | DynamoDB TTL (10 minutes from creation) |

**Indexes:**
- Primary Key: `token`
- GSI: `client_id-created_at-index` (for cleanup/auditing)

### authorization_codes

Stores authorization codes created after successful authentication.

| Attribute | Type | Description |
|-----------|------|-------------|
| code (PK) | String | Authorization code (32 bytes, base64url) |
| auth_token | String | Reference to auth_tokens record |
| client_id | String | Application client ID |
| used | Boolean | Whether code has been exchanged |
| used_at | Number | Unix timestamp when code was used |
| created_at | Number | Unix timestamp (seconds) |
| expires_at | Number | Unix timestamp (1 minute from creation) |
| ttl | Number | DynamoDB TTL (6 minutes from creation) |

**Indexes:**
- Primary Key: `code`
- GSI: `auth_token-index` (for looking up by auth token)

### refresh_tokens

Stores refresh tokens for obtaining new access tokens.

| Attribute | Type | Description |
|-----------|------|-------------|
| refresh_token (PK) | String | Refresh token (32 bytes, base64url) |
| client_id | String | Application client ID |
| user_id | String | User UUID |
| revoked | Boolean | Whether token has been revoked |
| revoked_at | Number | Unix timestamp when revoked |
| created_at | Number | Unix timestamp (seconds) |
| expires_at | Number | Unix timestamp (30 days from creation) |
| ttl | Number | DynamoDB TTL (31 days from creation) |

**Indexes:**
- Primary Key: `refresh_token`
- GSI: `user_id-created_at-index` (for listing user's tokens)
- GSI: `client_id-created_at-index` (for listing app's tokens)

### token_blacklist

Stores revoked access tokens until they expire naturally.

| Attribute | Type | Description |
|-----------|------|-------------|
| token_jti (PK) | String | JWT ID (jti claim from access token) |
| revoked_at | Number | Unix timestamp when revoked |
| expires_at | Number | Unix timestamp (original token expiry) |
| ttl | Number | DynamoDB TTL (same as expires_at) |

**Indexes:**
- Primary Key: `token_jti`

## Security Considerations

### 1. CSRF Protection ✅ ADDRESSED

**Threat:** Attacker tricks user into authenticating for attacker's application.

**Mitigation:**
- `state` parameter support in initiate and callback
- 3rd party app generates random state value
- State is passed through the flow and validated on callback
- Callback URL must be pre-registered with the application

**Implementation:**
```typescript
// 3rd party app generates state
const state = generateRandomString(32);
sessionStorage.setItem('auth_state', state);

// Include in initiate call
const authResponse = await orbSDK.auth.initiate({
  client_id: 'app-client-id',
  client_secret: 'app-client-secret',
  callback_url: 'https://3rdparty.com/auth/callback',
  state: state
});

// Validate on callback
const callbackState = new URLSearchParams(window.location.search).get('state');
if (callbackState !== sessionStorage.getItem('auth_state')) {
  throw new Error('Invalid state parameter');
}
```

### 2. Token Expiration ✅ ADDRESSED

**Threat:** Stolen tokens used indefinitely.

**Mitigation:**
- Auth tokens: 5 minute expiration
- Authorization codes: 1 minute expiration, single-use
- Access tokens: 1 hour expiration
- Refresh tokens: 30 day expiration
- All tokens have DynamoDB TTL for automatic cleanup

**Current Implementation:**
- SMS rate limit table has TTL enabled
- Application API keys have expiration and TTL
- Need to add TTL to auth_tokens, authorization_codes, refresh_tokens tables

### 3. Token Revocation ✅ ADDRESSED

**Threat:** Compromised tokens cannot be invalidated.

**Mitigation:**
- Refresh tokens can be revoked (stored in DynamoDB)
- Access tokens added to blacklist on logout
- Blacklist checked on every API request
- Application API keys support immediate revocation

**Current Implementation:**
- API key revocation fully implemented with property-based tests
- Need to implement token blacklist table and validation

### 4. Replay Attack Prevention ✅ ADDRESSED

**Threat:** Attacker intercepts and reuses authorization code.

**Mitigation:**
- Authorization codes are single-use
- Code marked as `used: true` after first exchange
- Subsequent attempts with same code fail
- Short expiration (1 minute) limits window

**Implementation:**
```python
# In exchange endpoint
code_record = dynamodb.get_item(code)
if code_record['used']:
    raise AuthenticationError('Code already used')
if code_record['expires_at'] < current_time:
    raise AuthenticationError('Code expired')

# Mark as used
dynamodb.update_item(code, {'used': True, 'used_at': current_time})
```

### 5. MFA Support ✅ ADDRESSED

**Threat:** Password compromise leads to account takeover.

**Mitigation:**
- Cognito handles MFA (TOTP)
- MFA setup and verification in existing frontend
- MFA status tracked in user records
- MFA challenge handled transparently in auth flow

**Current Implementation:**
- Full MFA support in Cognito service
- TOTP setup with QR codes
- MFA verification during sign-in
- MFA status in user model (`mfa_enabled`, `mfa_setup_complete`)

### 6. Rate Limiting ✅ PARTIALLY ADDRESSED

**Threat:** Brute force attacks on authentication endpoints.

**Mitigation:**
- Rate limiting on initiate endpoint (per client_id)
- Rate limiting on exchange endpoint (per client_id)
- Rate limiting on refresh endpoint (per refresh_token)
- Cognito provides built-in rate limiting for authentication

**Current Implementation:**
- SMS rate limiting fully implemented
- API key authorizer has rate limiting support
- Need to add rate limiting to SDK auth endpoints

### 7. Callback URL Validation ✅ TO BE IMPLEMENTED

**Threat:** Attacker redirects authorization code to their own server.

**Mitigation:**
- Callback URLs stored in Applications table (array field)
- Exact match validation (no wildcards)
- HTTPS required for production environments
- Subdomain validation to prevent subdomain takeover

**Implementation:**
```python
# In initiate endpoint
application = dynamodb.get_item('Applications', {'applicationId': client_id})
registered_callbacks = application.get('callbackUrls', [])

if callback_url not in registered_callbacks:
    raise AuthenticationError('Invalid callback URL')
if environment == 'production' and not callback_url.startswith('https://'):
    raise AuthenticationError('HTTPS required for production')
```

**Schema Addition:**
```yaml
# schemas/tables/Applications.yml
callbackUrls:
  type: array
  items: string
  required: true
  description: List of registered callback URLs for OAuth redirects
```

### 8. PKCE (Proof Key for Code Exchange) ⚠️ RECOMMENDED

**Threat:** Authorization code interception in public clients (mobile apps, SPAs).

**Mitigation:**
- Client generates random `code_verifier`
- Client sends `code_challenge = SHA256(code_verifier)` in initiate
- Client sends `code_verifier` in exchange
- Server validates `SHA256(code_verifier) == code_challenge`

**Status:** Not currently implemented, but recommended for mobile/SPA clients.

**Implementation:**
```typescript
// Client side
const codeVerifier = generateRandomString(128);
const codeChallenge = await sha256(codeVerifier);

await orbSDK.auth.initiate({
  client_id: 'app-client-id',
  callback_url: 'https://3rdparty.com/auth/callback',
  code_challenge: codeChallenge,
  code_challenge_method: 'S256'
});

// Later in exchange
await orbSDK.auth.exchange({
  code: 'auth-code-value',
  client_id: 'app-client-id',
  code_verifier: codeVerifier
});
```

## Security Summary

| Security Concern | Status | Implementation |
|------------------|--------|----------------|
| CSRF Protection | ✅ Addressed | State parameter support |
| Token Expiration | ✅ Addressed | Short-lived tokens with TTL |
| Token Revocation | ✅ Addressed | Blacklist + refresh token revocation |
| Replay Prevention | ✅ Addressed | Single-use authorization codes |
| MFA Support | ✅ Addressed | Cognito TOTP integration |
| Rate Limiting | 📋 In Spec | SDK endpoint rate limiting to be implemented |
| Callback Validation | 📋 In Spec | Applications.callbackUrls field + validation |
| PKCE | 📋 In Spec | Optional enhancement for mobile/SPA clients |

## API Endpoints

### SDK Authentication Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/sdk/auth/initiate` | POST | Client credentials | Create auth token and login URL |
| `/sdk/auth/exchange` | POST | Client credentials | Exchange code for tokens |
| `/sdk/auth/refresh` | POST | Client credentials | Refresh access token |
| `/sdk/auth/logout` | POST | Access token | Revoke tokens |

### Frontend Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/auth/validate-token` | POST | None | Validate auth token |
| `/auth/authenticate` | POST | None | Process user authentication |

## Error Codes

| Code | Description |
|------|-------------|
| `AUTH_001` | Invalid client credentials |
| `AUTH_002` | Invalid or expired auth token |
| `AUTH_003` | Invalid or expired authorization code |
| `AUTH_004` | Code already used |
| `AUTH_005` | Invalid callback URL |
| `AUTH_006` | Invalid refresh token |
| `AUTH_007` | Token revoked |
| `AUTH_008` | Rate limit exceeded |
| `AUTH_009` | Invalid state parameter |
| `AUTH_010` | MFA required |

## Testing

### Unit Tests

- Token generation and validation
- Code generation and single-use enforcement
- Expiration checking
- Callback URL validation

### Integration Tests

- Complete auth flow from initiate to exchange
- Token refresh flow
- Logout and revocation
- Error handling

### Property-Based Tests

- Token uniqueness
- Code single-use enforcement
- Expiration enforcement
- Revocation enforcement

## Monitoring and Logging

### Metrics

- Authentication attempts (success/failure)
- Token generation rate
- Code exchange rate
- Token refresh rate
- Revocation rate
- Error rates by type

### Audit Logging

- All authentication events
- Token issuance and revocation
- Failed authentication attempts
- Suspicious activity (multiple failures, expired token usage)

## Future Enhancements

1. **PKCE Support** - For mobile and SPA clients
2. **Device Fingerprinting** - Track and limit devices per user
3. **Anomaly Detection** - ML-based suspicious activity detection
4. **Token Binding** - Bind tokens to specific devices/IPs
5. **Consent Screen** - Show user what permissions app is requesting
6. **Scope-Based Permissions** - Fine-grained API access control
