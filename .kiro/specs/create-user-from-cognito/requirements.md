# Requirements Document

## Standard Requirements

This spec follows the [orb-templates Spec Standards](../../repositories/orb-templates/docs/kiro-steering/templates/spec-standards.md).

## Introduction

This feature introduces a secure, purpose-built Lambda operation for creating user records in DynamoDB during the self-registration flow. Currently, the `UsersCreate` mutation has dual authentication (`@aws_api_key` and `@aws_auth`), which presents security concerns. This feature separates concerns by:

1. Creating a new `CreateUserFromCognito` Lambda operation (API key only) that validates against Cognito before creating records
2. Removing `@aws_api_key` from `UsersCreate` to restrict it to authenticated admin operations only

This follows the same security pattern established by `CheckEmailExists`.

## Related Documentation

- [API Documentation](../../../docs/api.md) - Current API authentication patterns
- [Auth Flow Documentation](../../../docs/components/auth/auth-flow/) - Frontend authentication flow
- [CheckEmailExists Lambda](../../../apps/api/lambdas/check_email_exists/) - Reference implementation

## Glossary

- **CreateUserFromCognito_Lambda**: Lambda function that creates DynamoDB user records by validating against Cognito
- **UsersCreate_Mutation**: Existing GraphQL mutation for creating user records (to be restricted to admin only)
- **Cognito_Service**: AWS Cognito User Pool service for identity management
- **DynamoDB_Users_Table**: The Users table storing user profile data
- **API_Key_Auth**: AppSync authentication using API key (for public/unauthenticated operations)
- **Cognito_Auth**: AppSync authentication using Cognito User Pool tokens (for authenticated operations)
- **PostConfirmation_Trigger**: Cognito Lambda trigger that runs after email verification

## Requirements

### Requirement 1: CreateUserFromCognito Schema Definition

**User Story:** As a developer, I want a schema definition for CreateUserFromCognito, so that orb-schema-generator can generate the GraphQL types and resolver configuration.

#### Acceptance Criteria

1. THE Schema_System SHALL create `schemas/lambdas/CreateUserFromCognito.yml` following the Lambda type schema pattern
2. THE Schema_Definition SHALL specify operation type as `mutation`
3. THE Schema_Definition SHALL specify `apiKeyAuthentication` only (no Cognito auth)
4. THE Schema_Definition SHALL define input attribute `cognitoSub` (string, required)
5. THE Schema_Definition SHALL define output attributes matching the Users model (userId, email, firstName, lastName, status, etc.)

### Requirement 2: CreateUserFromCognito Lambda Implementation

**User Story:** As a new user completing MFA setup, I want my DynamoDB record to be created automatically, so that I can access the application without manual intervention.

#### Acceptance Criteria

1. WHEN a client calls CreateUserFromCognito with a valid cognitoSub, THE CreateUserFromCognito_Lambda SHALL validate the user exists in Cognito
2. WHEN the Cognito user is validated, THE CreateUserFromCognito_Lambda SHALL extract user attributes (email, given_name, family_name, email_verified, sub) from Cognito
3. WHEN extracting user attributes, THE CreateUserFromCognito_Lambda SHALL use only Cognito-provided data and SHALL NOT accept client-provided user data
4. WHEN the user is validated, THE CreateUserFromCognito_Lambda SHALL create a record in DynamoDB_Users_Table with Cognito-verified data
5. WHEN creating the user record, THE CreateUserFromCognito_Lambda SHALL set status to PENDING and groups to ['USER']
6. IF the cognitoSub does not exist in Cognito, THEN THE CreateUserFromCognito_Lambda SHALL return an error without creating a record
7. IF a user record already exists for the cognitoSub, THEN THE CreateUserFromCognito_Lambda SHALL return the existing user without creating a duplicate
8. THE CreateUserFromCognito_Lambda SHALL be accessible via API key authentication only (`@aws_api_key`)

### Requirement 3: UsersCreate Mutation Security Restriction

**User Story:** As a security administrator, I want UsersCreate to require Cognito authentication, so that only authorized users can create arbitrary user records.

#### Acceptance Criteria

1. THE UsersCreate_Mutation SHALL require Cognito authentication with groups EMPLOYEE or OWNER
2. THE UsersCreate_Mutation SHALL NOT be accessible via API key authentication
3. WHEN an unauthenticated client attempts UsersCreate, THE API SHALL return an Unauthorized error

### Requirement 4: Frontend Integration

**User Story:** As a developer, I want the frontend to use CreateUserFromCognito during the auth flow, so that user records are created securely.

#### Acceptance Criteria

1. WHEN handleMFASuccess detects a user not in DynamoDB, THE Frontend SHALL call CreateUserFromCognito instead of UsersCreate
2. WHEN calling CreateUserFromCognito, THE Frontend SHALL use API key authentication
3. WHEN CreateUserFromCognito succeeds, THE Frontend SHALL complete the auth flow with the returned user data

### Requirement 5: Input Validation and Security

**User Story:** As a security engineer, I want all inputs validated server-side, so that the system is protected from malicious input.

#### Acceptance Criteria

1. WHEN receiving a cognitoSub, THE CreateUserFromCognito_Lambda SHALL validate it matches UUID format
2. THE CreateUserFromCognito_Lambda SHALL implement consistent response timing to prevent timing attacks
3. THE CreateUserFromCognito_Lambda SHALL log operations without exposing PII
4. IF any validation fails, THEN THE CreateUserFromCognito_Lambda SHALL return a generic error message

### Requirement 6: Error Handling

**User Story:** As a developer, I want clear error responses, so that I can handle failures appropriately.

#### Acceptance Criteria

1. IF Cognito service is unavailable, THEN THE CreateUserFromCognito_Lambda SHALL return error code ORB-AUTH-010
2. IF DynamoDB service is unavailable, THEN THE CreateUserFromCognito_Lambda SHALL return error code ORB-API-010
3. IF cognitoSub format is invalid, THEN THE CreateUserFromCognito_Lambda SHALL return error code ORB-AUTH-011
4. IF user not found in Cognito, THEN THE CreateUserFromCognito_Lambda SHALL return error code ORB-AUTH-012

### Requirement 7: Documentation Updates

**User Story:** As a developer, I want updated documentation, so that I understand the authentication architecture.

#### Acceptance Criteria

1. THE Documentation_System SHALL update docs/api.md with CreateUserFromCognito operation details
2. THE Documentation_System SHALL create or update auth flow architecture documentation
3. THE Documentation_System SHALL document the security rationale for separating API key and Cognito auth operations

### Requirement 8: Testing Requirements

**User Story:** As a QA engineer, I want comprehensive tests, so that I can verify the feature works correctly.

#### Acceptance Criteria

1. THE Testing_System SHALL include unit tests for CreateUserFromCognito Lambda with >85% coverage
2. THE Testing_System SHALL include property-based tests for input validation
3. THE Testing_System SHALL include integration tests for the complete auth flow
4. THE Testing_System SHALL verify UsersCreate rejects API key authentication
