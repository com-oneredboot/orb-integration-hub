# Requirements Document

## Introduction

The orb-integration-hub platform uses a dual AppSync API architecture: a Main API (Cognito userPool auth) for authenticated web/mobile users, and an SDK API (Lambda authorizer) for programmatic/third-party access. Two pre-authentication operations — `CheckEmailExists` and `CreateUserFromCognito` — are currently annotated with `@aws_api_key` on the Main API schema, but the Main API has no API key auth mode configured. The frontend calls these operations with `authMode: 'apiKey'`, which fails at runtime with "No api-key configured."

This spec migrates these two operations to route through the SDK API, configures a second Amplify GraphQL client on the frontend for SDK API access, cleans up stale configuration, and documents the dual-API architecture in the project steering file.

## Glossary

- **Main_API**: The primary AppSync GraphQL API using Cognito userPool authentication, serving authenticated web and mobile users. Endpoint configured in `environment.graphql.url`.
- **SDK_API**: The secondary AppSync GraphQL API using a Lambda authorizer that validates API keys in `orb_{env}_{key}` format. Used for programmatic and third-party access. Endpoint stored in SSM at `/orb/integration-hub/dev/appsync/sdk-graphql-url`.
- **Lambda_Authorizer**: The Lambda function that validates SDK API keys for the SDK_API. Configured via SSM parameter `/orb/integration-hub/dev/lambda/authorizer/arn`.
- **Frontend_API_Key**: A dedicated SDK API key provisioned for the frontend to call pre-authentication operations on the SDK_API. Validated by the Lambda_Authorizer.
- **Pre_Auth_Operations**: GraphQL operations (`CheckEmailExists` query and `CreateUserFromCognito` mutation) that must execute before a user is authenticated with Cognito.
- **SDK_Client**: A second Amplify `generateClient` instance configured to call the SDK_API endpoint using the Frontend_API_Key.
- **ApiService**: The Angular base service (`apps/web/src/app/core/services/api.service.ts`) that provides GraphQL query and mutation execution methods.
- **UserService**: The Angular service (`apps/web/src/app/core/services/user.service.ts`) that calls `CheckEmailExists` and `CreateUserFromCognito`.
- **RecoveryService**: The Angular service (`apps/web/src/app/core/services/recovery.service.ts`) that calls `UserService.checkEmailExists()` during the smart recovery auth flow.
- **Environment_Config**: The Angular environment configuration files (`apps/web/src/environments/environment*.ts`) that store API endpoints, keys, and region settings.

## Requirements

### Requirement 1: SDK API Schema Extension for Pre-Auth Operations

**User Story:** As a frontend application, I want the SDK API to support `CheckEmailExists` and `CreateUserFromCognito` operations, so that pre-authentication calls can be routed through an API that supports the required auth mode.

#### Acceptance Criteria

1. THE SDK_API schema SHALL include the `CheckEmailExists` query with `CheckEmailExistsInput` input type and `CheckEmailExists` response type matching the field signatures in the Main_API schema.
2. THE SDK_API schema SHALL include the `CreateUserFromCognito` mutation with `CreateUserFromCognitoInput` input type and `CreateUserFromCognito` response type matching the field signatures in the Main_API schema.
3. THE SDK_API CDK construct SHALL wire `CheckEmailExists` to the existing `CheckEmailExistsLambda` function via a Lambda data source.
4. THE SDK_API CDK construct SHALL wire `CreateUserFromCognito` to the existing `CreateUserFromCognitoLambda` function via a Lambda data source.
5. WHEN the SDK_API receives a `CheckEmailExists` query with a valid Frontend_API_Key, THE Lambda_Authorizer SHALL authorize the request and THE `CheckEmailExistsLambda` SHALL return the email existence status, Cognito status, and Cognito sub.
6. WHEN the SDK_API receives a `CreateUserFromCognito` mutation with a valid Frontend_API_Key, THE Lambda_Authorizer SHALL authorize the request and THE `CreateUserFromCognitoLambda` SHALL create or return the user record.

### Requirement 2: Frontend SDK API Client Configuration

**User Story:** As a developer, I want the frontend to have a dedicated GraphQL client for the SDK API, so that pre-authentication operations can be called against the correct endpoint.

#### Acceptance Criteria

1. THE Environment_Config SHALL include `sdkApi.url` and `sdkApi.apiKey` properties for the SDK_API endpoint and Frontend_API_Key, separate from the Main_API `graphql.url` configuration.
2. THE Environment_Config SHALL include `sdkApi.region` property defaulting to the same region as the Main_API.
3. WHEN the application bootstraps, THE `main.ts` Amplify configuration SHALL remain unchanged, configuring only the Main_API with `defaultAuthMode: 'userPool'`.
4. THE ApiService SHALL provide an SDK_Client instance that sends requests to the SDK_API endpoint with the Frontend_API_Key in the authorization header expected by the Lambda_Authorizer.
5. THE ApiService SHALL expose a method for executing GraphQL operations against the SDK_Client, distinct from the existing `query` and `mutate` methods that target the Main_API.

### Requirement 3: Route Pre-Auth Operations Through SDK API

**User Story:** As a user signing up or recovering my account, I want the email existence check and user record creation to work reliably, so that the authentication flow completes without errors.

#### Acceptance Criteria

1. WHEN `UserService.checkEmailExists()` is called, THE UserService SHALL execute the `CheckEmailExists` query against the SDK_Client instead of the Main_API apiKey client.
2. WHEN `UserService.createUserFromCognito()` is called, THE UserService SHALL execute the `CreateUserFromCognito` mutation against the SDK_Client instead of the Main_API apiKey client.
3. THE `RecoveryService.smartCheck()` method SHALL continue to function without modification, receiving the same response shape from `UserService.checkEmailExists()`.
4. IF the SDK_Client request fails due to a network error, THEN THE UserService SHALL throw an error with a descriptive message indicating the SDK API is unreachable.
5. IF the SDK_Client request fails due to an authorization error, THEN THE UserService SHALL throw an error with a descriptive message indicating the Frontend_API_Key is invalid or expired.

### Requirement 4: Main API Schema Cleanup

**User Story:** As a developer, I want the Main API schema to accurately reflect its supported auth modes, so that the schema does not contain misleading `@aws_api_key` annotations.

#### Acceptance Criteria

1. THE Main_API schema SHALL remove the `@aws_api_key` annotation from the `CheckEmailExists` query field definition.
2. THE Main_API schema SHALL remove the `@aws_api_key` annotation from the `CreateUserFromCognito` mutation field definition.
3. THE Main_API schema SHALL remove the `@aws_api_key` annotation from the `CheckEmailExists` type definition.
4. THE Main_API schema SHALL remove the `@aws_api_key` annotation from the `CreateUserFromCognito` type definition.
5. THE Main_API CDK construct SHALL remove the Lambda data sources and resolvers for `CheckEmailExists` and `CreateUserFromCognito`, since these operations will be served exclusively by the SDK_API.

### Requirement 5: Environment Configuration Cleanup

**User Story:** As a developer, I want stale API key references removed from environment configuration, so that the codebase does not contain misleading or unused configuration values.

#### Acceptance Criteria

1. THE `environment.ts` file SHALL remove the `apiKey` property from the `graphql` configuration object.
2. THE `environment.prod.ts` file SHALL remove the `apiKey` property from the `graphql` configuration object.
3. THE `environment.local.ts` file SHALL remove the `apiKey` property from the `graphql` configuration object.
4. THE ApiService SHALL remove the `apiKeyClient` field that generates a client with `authMode: 'apiKey'` targeting the Main_API.
5. WHEN the `execute()` method in ApiService receives `authMode === 'apiKey'`, THE ApiService SHALL reject the call or route it to the SDK_Client instead.

### Requirement 6: Frontend API Key Provisioning for SDK API

**User Story:** As a platform operator, I want a dedicated API key provisioned for the frontend to call the SDK API, so that pre-authentication operations are authorized by the Lambda_Authorizer.

#### Acceptance Criteria

1. THE platform SHALL provision a Frontend_API_Key in the `orb_{env}_{key}` format that the Lambda_Authorizer accepts.
2. THE Frontend_API_Key SHALL be stored in AWS SSM Parameter Store at a path following the naming convention `/orb/integration-hub/{env}/appsync/sdk-frontend-api-key`.
3. THE `setup-dev-env.js` script SHALL retrieve the Frontend_API_Key from SSM and populate the `sdkApi.apiKey` field in the local environment configuration.
4. THE Frontend_API_Key SHALL have permissions scoped to only the `CheckEmailExists` and `CreateUserFromCognito` operations on the SDK_API.
5. IF the Lambda_Authorizer receives a request with an invalid or missing Frontend_API_Key, THEN THE Lambda_Authorizer SHALL return an unauthorized response.

### Requirement 7: Dual-API Architecture Documentation

**User Story:** As a developer onboarding to the project, I want the dual-API architecture documented in the project steering file, so that I understand which API to use for different operation types.

#### Acceptance Criteria

1. THE `.kiro/steering/project-standards.md` file SHALL include a "Dual AppSync API Architecture" section describing the Main_API and SDK_API, their auth modes, and their intended use cases.
2. THE documentation SHALL specify that Pre_Auth_Operations (operations called before Cognito authentication) belong on the SDK_API.
3. THE documentation SHALL specify that all authenticated user operations belong on the Main_API with Cognito userPool auth.
4. THE documentation SHALL include the SSM parameter paths for discovering the SDK_API endpoint and Frontend_API_Key.
5. THE documentation SHALL include guidance on adding new pre-authentication operations to the SDK_API in the future.

### Requirement 8: Documentation Updates

**User Story:** As a developer, I want all relevant documentation updated to reflect the migration, so that documentation remains accurate and consistent.

#### Acceptance Criteria

1. WHEN the migration is complete, THE project documentation SHALL be updated to reflect the new SDK API client architecture.
2. THE documentation SHALL not duplicate information already present in other documentation files.
3. THE documentation SHALL use consistent terminology matching the Glossary defined in this requirements document.

### Requirement 9: Version and Changelog Management

**User Story:** As a project maintainer, I want the version bumped and changelog updated, so that the migration is properly tracked in the project history.

#### Acceptance Criteria

1. WHEN the migration is complete, THE project version SHALL be bumped following semantic versioning (minor version bump for new feature).
2. THE CHANGELOG.md SHALL include an entry describing the migration of pre-auth operations to the SDK API.
3. THE CHANGELOG entry SHALL reference any related issue numbers.

### Requirement 10: Git Commit Standards

**User Story:** As a project maintainer, I want commits to follow conventional commit format, so that the project history is consistent and traceable.

#### Acceptance Criteria

1. THE git commits SHALL follow conventional commit format: `feat: description #issue`.
2. THE git commits SHALL reference all related issue numbers.
3. THE git commits SHALL use descriptive messages that explain the change.

### Requirement 11: Final Verification

**User Story:** As a developer, I want all changes verified before merging, so that the migration does not introduce regressions.

#### Acceptance Criteria

1. WHEN all changes are complete, all existing unit tests SHALL pass.
2. WHEN all changes are complete, all existing property-based tests SHALL pass.
3. WHEN all changes are complete, no linting errors SHALL exist in modified files.
4. WHEN all changes are complete, no TypeScript compilation errors SHALL exist.
5. WHEN all changes are complete, THE CHANGELOG.md SHALL be updated.
6. WHEN all changes are complete, THE version SHALL be bumped appropriately.
7. WHEN all changes are complete, all commits SHALL reference related issues.
