# Requirements Document

## Standard Requirements

This spec follows the [orb-templates Spec Standards](../../../repositories/orb-templates/docs/kiro-steering/templates/spec-standards.md).

## Introduction

This feature provides a secure, public API endpoint for checking whether an email address is already registered in the system. This is needed during the authentication flow to determine whether a user should be directed to sign-in or sign-up. The endpoint is designed to be accessible without authentication (via API key) while minimizing information disclosure.

## Related Issues

- orb-schema-generator #67: Bug preventing `@aws_api_key` directive from being rendered (blocker for using existing `UsersQueryByEmail` with API key auth)

## Glossary

- **Check_Email_Service**: The Lambda-backed GraphQL query that checks email existence
- **Auth_Flow_Component**: The frontend authentication component that initiates email checks
- **User_Service**: The existing service that manages user data and authentication
- **API_Key_Auth**: AWS AppSync API key authentication for unauthenticated access

## Requirements

### Requirement 1: Email Existence Check Query

**User Story:** As an unauthenticated user, I want to check if my email is already registered, so that I can be directed to the appropriate sign-in or sign-up flow.

#### Acceptance Criteria

1. WHEN a client sends a CheckEmailExists query with a valid email address, THE Check_Email_Service SHALL return a response indicating whether the email exists in the system
2. WHEN a client sends a CheckEmailExists query with an invalid email format, THE Check_Email_Service SHALL return an error response with a descriptive message
3. THE Check_Email_Service SHALL only return a boolean `exists` field and SHALL NOT expose any user data
4. THE Check_Email_Service SHALL be accessible via API key authentication without requiring Cognito authentication

### Requirement 2: Security and Rate Limiting

**User Story:** As a system administrator, I want the email check endpoint to be protected against abuse, so that malicious actors cannot enumerate registered emails.

#### Acceptance Criteria

1. THE Check_Email_Service SHALL validate email format before querying the database
2. THE Check_Email_Service SHALL log all requests for security auditing purposes
3. WHEN processing requests, THE Check_Email_Service SHALL use consistent response times to prevent timing-based enumeration attacks

### Requirement 3: Frontend Integration

**User Story:** As a developer, I want the auth flow to use the new CheckEmailExists query, so that unauthenticated users can check their email without authentication errors.

#### Acceptance Criteria

1. WHEN the Auth_Flow_Component checks an email, THE User_Service SHALL call the CheckEmailExists query using API key authentication
2. WHEN CheckEmailExists returns `exists: true`, THE Auth_Flow_Component SHALL proceed to the password entry step
3. WHEN CheckEmailExists returns `exists: false`, THE Auth_Flow_Component SHALL proceed to the registration flow
4. IF the CheckEmailExists query fails, THEN THE Auth_Flow_Component SHALL display an appropriate error message to the user

### Requirement 4: Schema Definition

**User Story:** As a developer, I want the CheckEmailExists query defined in the schema generator format, so that it integrates with our existing code generation pipeline.

#### Acceptance Criteria

1. THE CheckEmailExists schema SHALL be defined as a Lambda type in `schemas/lambdas/`
2. THE CheckEmailExists schema SHALL specify `operation: query` for GraphQL query generation
3. THE CheckEmailExists schema SHALL configure only `apiKeyAuthentication` without cognito groups
4. WHEN the schema is processed, THE orb-schema-generator SHALL generate the corresponding GraphQL types, inputs, and TypeScript query definitions


### Requirement 5: Testing

**User Story:** As a developer, I want comprehensive tests for the CheckEmailExists feature, so that I can be confident the feature works correctly and regressions are caught.

#### Acceptance Criteria

1. THE Check_Email_Service SHALL have unit tests covering valid email checks
2. THE Check_Email_Service SHALL have unit tests covering invalid email format rejection
3. THE Check_Email_Service SHALL have unit tests covering error handling scenarios
4. THE frontend integration SHALL have unit tests for the updated auth flow
5. THE property tests SHALL verify email validation logic across many generated inputs

### Requirement 6: Documentation and Versioning

**User Story:** As a developer, I want the feature properly documented and versioned, so that changes are traceable and the codebase remains maintainable.

#### Acceptance Criteria

1. WHEN the feature is implemented, THE Documentation_System SHALL update relevant API documentation
2. WHEN the feature is implemented, THE CHANGELOG SHALL be updated with the new feature
3. THE commit messages SHALL reference this spec and follow conventional commits format
4. WHEN implementation is complete, THE Issue_Tracker SHALL receive a comment summarizing changes

## Related Documentation

- [API Documentation](../../../docs/api.md)
- [Error Handling](../../../docs/error-handling.md)
- [Authentication Flow](../../../docs/architecture.md)
