# Implementation Plan: Orb SDK - Iteration 1

**STATUS: IN PLANNING** - This spec is planned for future implementation and has not been started.

## Overview

Iteration 1 focuses on Authentication, Authorization, and SDK Infrastructure. This includes the SDK AppSync API with Lambda authorizer (merged from application-access-management Phase 5).

## Tasks

### Phase 1: SDK Infrastructure

- [x] 1. Create SDK AppSync API infrastructure
  - [x] 1.1 Update schema-generator.yml with SDK AppSync configuration
    - Add `appsync.sdk` section with AWS_LAMBDA auth
    - Configure table filtering (exclude ApplicationApiKeys)
    - Set operation filtering
    - _Requirements: 1.1_
  - [x] 1.2 Create API Key Authorizer Lambda
    - Create `apps/api/lambdas/api_key_authorizer/handler.py`
    - Validate `orb_{env}_{key}` format
    - Hash and lookup key in ApplicationApiKeys table
    - Return org/app/env context on success
    - _Requirements: 1.1_
  - [x] 1.3 Create appsync_sdk_stack.py
    - Generate SDK AppSync API with Lambda authorizer
    - Wire up Lambda authorizer
    - Create SSM parameters for SDK endpoint
    - _Requirements: 1.1_
  - [x] 1.4 Deploy SDK infrastructure to dev
    - Run `cdk deploy` for SDK stack
    - Verify SDK AppSync API is accessible
    - Test Lambda authorizer with valid/invalid keys
    - _Requirements: 1.1_

- [x] 2. Initialize TypeScript SDK package
  - [x] 2.1 Create package structure
    - Create `packages/orb-sdk-core/` directory
    - Set up `package.json` with @orb/sdk-core name
    - Configure TypeScript with `tsconfig.json`
    - Set up build scripts
    - _Requirements: 26.1_
  - [x] 2.2 Set up testing infrastructure
    - Configure Jest for unit tests
    - Configure fast-check for property tests
    - Add test scripts to package.json
    - _Requirements: 13.1_
  - [x] 2.3 Create error types
    - Create `src/errors/` with OrbError base class
    - Add AuthenticationError, AuthorizationError, ValidationError
    - Add NetworkError, ServiceUnavailableError
    - Include error codes matching orb-integration-hub registry
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

### Phase 2: TypeScript Authentication Module

- [ ] 3. Implement Token Manager
  - [ ] 3.1 Create TokenManager class
    - Implement `storeTokens()`, `getTokens()`, `clearTokens()`
    - Use localStorage for web (configurable storage adapter)
    - _Requirements: 7.1, 7.2_
  - [ ] 3.2 Implement token refresh
    - Implement `refreshTokens()` using Cognito
    - Implement `isTokenExpired()` check
    - _Requirements: 7.1_
  - [ ] 3.3 Implement auto-refresh
    - Start background refresh before expiry
    - Emit sessionExpired event on refresh failure
    - _Requirements: 7.1, 7.3_
  - [ ] 3.4 Write property test for token refresh
    - **Property 1: Token Refresh Maintains Session**
    - **Validates: Requirements 7.1**

- [ ] 4. Implement Auth Module - Sign Up
  - [ ] 4.1 Create AuthModule class structure
    - Set up Cognito client integration
    - Create event emitter for state changes
    - _Requirements: 11.1_
  - [ ] 4.2 Implement signUp
    - Call Cognito signUp with email/password
    - Return pending verification status
    - Emit signUp event
    - _Requirements: 2.1, 2.4_
  - [ ] 4.3 Implement confirmSignUp
    - Verify email with confirmation code
    - Handle invalid/expired codes
    - _Requirements: 3.1, 3.2_
  - [ ] 4.4 Implement resendConfirmationCode
    - Send new verification code
    - Handle rate limiting
    - _Requirements: 3.3, 3.4_

- [ ] 5. Implement Auth Module - Sign In
  - [ ] 5.1 Implement signIn
    - Authenticate with Cognito
    - Store tokens via TokenManager
    - Emit signIn event
    - _Requirements: 4.1, 4.5, 4.6_
  - [ ] 5.2 Handle MFA challenge
    - Detect MFA_REQUIRED response
    - Return challenge with session
    - _Requirements: 4.2_
  - [ ] 5.3 Handle MFA setup required
    - Detect MFA_SETUP response
    - Return TOTP secret and QR URI
    - _Requirements: 4.3_
  - [ ] 5.4 Write property test for invalid credentials
    - **Property 4: Invalid Credentials Never Return Tokens**
    - **Validates: Requirements 4.4**

- [ ] 6. Implement Auth Module - MFA
  - [ ] 6.1 Implement verifyMFA
    - Verify TOTP code with Cognito
    - Complete authentication on success
    - _Requirements: 5.1, 5.2_
  - [ ] 6.2 Implement setupMFA
    - Get TOTP secret from Cognito
    - Generate QR code URI
    - _Requirements: 5.3_
  - [ ] 6.3 Implement confirmMFASetup
    - Verify initial TOTP code
    - Enable MFA for user
    - _Requirements: 5.4_

- [ ] 7. Implement Auth Module - Phone Verification
  - [ ] 7.1 Implement sendPhoneVerificationCode
    - Send SMS via Cognito
    - Handle rate limiting
    - _Requirements: 6.1, 6.4_
  - [ ] 7.2 Implement verifyPhone
    - Verify SMS code
    - Mark phone as verified
    - _Requirements: 6.2, 6.3_

- [ ] 8. Implement Sign Out
  - [ ] 8.1 Implement signOut
    - Clear tokens via TokenManager
    - Revoke Cognito session
    - Emit signOut event
    - _Requirements: 7.5, 11.1_
  - [ ] 8.2 Write property test for sign out
    - **Property 2: Sign Out Clears All Tokens**
    - **Validates: Requirements 7.5**

### Phase 3: TypeScript Authorization Module

- [ ] 9. Implement Authorization Module
  - [ ] 9.1 Create AuthorizationModule class
    - Set up permission cache with TTL
    - Integrate with GraphQL client
    - _Requirements: 21.4_
  - [ ] 9.2 Implement hasPermission
    - Check if user has specific permission
    - Use cached resolution
    - _Requirements: 21.1_
  - [ ] 9.3 Implement hasRole
    - Check user group membership (USER, CUSTOMER, EMPLOYEE, OWNER)
    - _Requirements: 21.2, 22.1_
  - [ ] 9.4 Implement hasOrgRole
    - Check organization-scoped roles
    - _Requirements: 21.3, 22.2_
  - [ ] 9.5 Implement getPermissions/getRoles
    - Return all permissions/roles for current user
    - _Requirements: 22.4_
  - [ ] 9.6 Write property test for permission determinism
    - **Property 3: Permission Check Determinism**
    - **Validates: Requirements 21.1**

### Phase 4: OrbClient Integration

- [ ] 10. Create OrbClient
  - [ ] 10.1 Implement OrbClient class
    - Accept configuration (region, userPoolId, etc.)
    - Initialize Auth and Authorization modules
    - _Requirements: 1.1, 1.2_
  - [ ] 10.2 Implement configuration validation
    - Validate required fields
    - Throw descriptive errors for invalid config
    - _Requirements: 1.2_
  - [ ] 10.3 Implement environment variable fallback
    - Read config from env vars if not provided
    - _Requirements: 1.3_
  - [ ] 10.4 Implement onAuthStateChange
    - Subscribe to auth state events
    - Provide current state immediately
    - _Requirements: 11.2, 11.3, 11.4_

- [ ] 11. Create GraphQL Client
  - [ ] 11.1 Implement GraphQL client wrapper
    - Configure for SDK AppSync endpoint
    - Add automatic token injection
    - _Requirements: 1.1_
  - [ ] 11.2 Implement error handling
    - Map GraphQL errors to SDK error types
    - Handle network errors with retry guidance
    - _Requirements: 12.5_

### Phase 5: Python SDK

- [ ] 12. Initialize Python SDK package
  - [ ] 12.1 Create package structure
    - Create `packages/orb-sdk-python/` directory
    - Set up `pyproject.toml`
    - Configure pytest and hypothesis
    - _Requirements: 26.4_
  - [ ] 12.2 Create error types
    - Create `orb_sdk/errors.py`
    - Mirror TypeScript error hierarchy
    - _Requirements: 18.4_

- [ ] 13. Implement Python Auth Module
  - [ ] 13.1 Implement client credentials authentication
    - Authenticate using Cognito client credentials flow
    - For service account / backend-to-backend
    - _Requirements: 18.1, 18.5_
  - [ ] 13.2 Implement token verification
    - Verify JWT signature and claims
    - Cache JWKS keys with TTL
    - _Requirements: 20.1, 20.2, 20.3_
  - [ ] 13.3 Implement token refresh
    - Auto-refresh before expiry
    - _Requirements: 18.2_
  - [ ] 13.4 Provide sync and async interfaces
    - Both synchronous and asyncio versions
    - _Requirements: 18.3_

- [ ] 14. Implement Python Authorization Module
  - [ ] 14.1 Implement permission checking
    - hasPermission, hasRole methods
    - Cache with configurable TTL
    - _Requirements: 21.1, 21.4_
  - [ ] 14.2 Implement role-based access control
    - Support user groups and org roles
    - _Requirements: 22.1, 22.2, 22.3_
  - [ ] 14.3 Create Flask/FastAPI decorators
    - Route protection decorators
    - _Requirements: 20.5_

- [ ] 15. Implement Python API Client
  - [ ] 15.1 Create GraphQL client
    - Typed methods for queries/mutations
    - Pydantic models for validation
    - _Requirements: 19.1, 19.2_
  - [ ] 15.2 Implement retry with backoff
    - Exponential backoff for transient failures
    - Connection pooling
    - _Requirements: 19.4, 19.5_

### Phase 6: Testing & Documentation

- [ ] 16. Write comprehensive tests
  - [ ] 16.1 TypeScript unit tests
    - Test all auth flows with mocked Cognito
    - Test authorization with mocked responses
    - Aim for >80% coverage
    - _Requirements: 13.1_
  - [ ] 16.2 TypeScript property tests
    - All 5 correctness properties
    - _Requirements: 13.1_
  - [ ] 16.3 Python unit tests
    - Mirror TypeScript test coverage
    - _Requirements: 19.3_
  - [ ] 16.4 Integration tests
    - End-to-end against dev environment
    - _Requirements: 1.4_

- [ ] 17. Create documentation
  - [ ] 17.1 TypeScript SDK README
    - Installation, quick start, examples
    - _Requirements: 13.1_
  - [ ] 17.2 Python SDK README
    - Installation, quick start, examples
    - _Requirements: 18.1_
  - [ ] 17.3 API reference documentation
    - JSDoc for TypeScript
    - Docstrings for Python
    - _Requirements: 13.1_
  - [ ] 17.4 Create CHANGELOG.md for both packages
    - Document v1.0.0 release
    - _Requirements: 26.5_

### Phase 7: Publishing

- [ ] 18. Publish packages
  - [ ] 18.1 Publish @orb/sdk-core to npm
    - Version 1.0.0
    - _Requirements: 26.1_
  - [ ] 18.2 Publish orb-sdk-python to CodeArtifact
    - Version 1.0.0
    - _Requirements: 26.4_
  - [ ] 18.3 Update project CHANGELOG.md
    - Document SDK release
    - _Requirements: 26.5_

## Notes

- Iteration 1 focuses on auth/authorization only
- User management, org management, billing deferred to Iteration 2
- Angular and React adapters deferred to Iteration 2
- Offline support and advanced logging deferred to Iteration 2

## Dependencies

- orb-schema-generator v1.0.0+ (Multi-AppSync API support) ✅
- ApplicationApiKeys table (from application-access-management) ✅
- API Key generation/validation (from application-access-management) ✅
