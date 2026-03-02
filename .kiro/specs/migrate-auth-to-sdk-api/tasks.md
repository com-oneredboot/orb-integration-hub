# Implementation Plan: Migrate Pre-Auth Operations to SDK API

## Overview

Migrate `CheckEmailExists` and `CreateUserFromCognito` from the Main API (broken `@aws_api_key` auth) to the SDK API (Lambda authorizer). Introduces a fetch-based `SdkApiService`, cleans up stale config and schema annotations, provisions a frontend API key via SSM, and documents the dual-API architecture.

## Tasks

- [ ] 1. Extend SDK API schema and regenerate CDK constructs
  - [x] 1.1 Add `CheckEmailExists` and `CreateUserFromCognito` to SDK API YAML schemas
    - Create or update YAML schema files under `schemas/` to add `CheckEmailExists` query (with `CheckEmailExistsInput` input type and `CheckEmailExists` response type) and `CreateUserFromCognito` mutation (with `CreateUserFromCognitoInput` input type and `CreateUserFromCognito` response type) to the SDK API
    - Wire both operations to their existing Lambda functions via Lambda data sources using SSM ARN lookup
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.2 Remove `CheckEmailExists` and `CreateUserFromCognito` from Main API YAML schemas
    - Update YAML schema files to remove `@aws_api_key` annotations from `CheckEmailExists` and `CreateUserFromCognito` types and field definitions
    - Remove the Lambda data sources and resolvers for these operations from the Main API schema config
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 1.3 Run `orb-schema generate` and commit regenerated files
    - Run `pipenv run orb-schema generate` to regenerate all schema, CDK construct, and resolver files
    - Verify `infrastructure/cdk/generated/appsync/sdk_api.py` includes Lambda data sources and resolvers for `CheckEmailExists` and `CreateUserFromCognito`
    - Verify `infrastructure/cdk/generated/appsync/api.py` no longer includes Lambda data sources/resolvers for these operations
    - Verify `apps/api/graphql-sdk/schema.graphql` includes the new types and operations
    - Verify `apps/api/graphql/schema.graphql` no longer has `@aws_api_key` annotations on these operations
    - Commit all generated files (they must be in git)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 2. Checkpoint - Verify schema generation
  - Ensure schema generation completed without errors and generated files are correct, ask the user if questions arise.

- [x] 3. Update environment configuration
  - [x] 3.1 Add `sdkApi` block and remove stale `apiKey` from environment files
    - In `apps/web/src/environments/environment.ts`: add `sdkApi: { url: '{{SDK_API_URL}}', apiKey: '{{SDK_API_KEY}}', region: '{{AWS_REGION}}' }` and remove `apiKey` from the `graphql` object
    - In `apps/web/src/environments/environment.prod.ts`: add `sdkApi` block and remove `graphql.apiKey`
    - In `apps/web/src/environments/environment.local.ts`: add `sdkApi` block and remove `graphql.apiKey`
    - Update the environment interface/type if one exists to include `sdkApi` and remove `graphql.apiKey`
    - _Requirements: 2.1, 2.2, 5.1, 5.2, 5.3_

  - [x] 3.2 Update `setup-dev-env.js` to retrieve SDK API credentials from SSM
    - Add `SDK_API_URL` entry to `FRONTEND_SECRETS_MAP` pointing to SSM parameter `ssmParameterName('appsync/sdk-graphql-url')`
    - Add `SDK_API_KEY` entry to `FRONTEND_SECRETS_MAP` pointing to SSM parameter `ssmParameterName('appsync/sdk-frontend-api-key')`
    - Update the environment template generation to populate `sdkApi.url`, `sdkApi.apiKey`, and `sdkApi.region` from retrieved values
    - _Requirements: 6.2, 6.3_

- [ ] 4. Implement `SdkApiService`
  - [x] 4.1 Create `SdkApiService` at `apps/web/src/app/core/services/sdk-api.service.ts`
    - Implement `@Injectable({ providedIn: 'root' })` service
    - Read `sdkApi.url` and `sdkApi.apiKey` from environment config in constructor
    - Implement `query<T>(query: string, variables?: Record<string, unknown>): Promise<GraphQLResult<T>>` using `fetch` with POST to SDK endpoint, `Authorization` header set to `sdkApi.apiKey`, `Content-Type: application/json`
    - Implement `mutate<T>(mutation: string, variables?: Record<string, unknown>): Promise<GraphQLResult<T>>` using the same fetch pattern
    - Implement error handling per design: detect network errors (`TypeError`, `Failed to fetch`), authorization errors (HTTP 401/403, `Unauthorized`), GraphQL errors, and invalid JSON
    - _Requirements: 2.4, 2.5, 3.4, 3.5_

  - [ ]* 4.2 Write property test: SDK client sends correct Authorization header (Property 1)
    - **Property 1: SDK client sends correct Authorization header**
    - Use `fast-check` to generate random operation strings and variables objects
    - Verify every request includes `Authorization` header equal to configured `sdkApi.apiKey`
    - Verify every request URL matches configured `sdkApi.url`
    - Tag: `Feature: migrate-auth-to-sdk-api, Property 1: SDK client sends correct Authorization header`
    - **Validates: Requirements 2.4**

  - [ ]* 4.3 Write property test: Error classification correctness (Property 4)
    - **Property 4: Error classification correctness**
    - Use `fast-check` to generate random error objects representing network failures and authorization failures
    - Verify network errors produce "unreachable" error messages and auth errors produce "invalid or expired" messages
    - Verify the two error categories are mutually exclusive
    - Tag: `Feature: migrate-auth-to-sdk-api, Property 4: Error classification correctness`
    - **Validates: Requirements 3.4, 3.5**

  - [ ]* 4.4 Write unit tests for `SdkApiService`
    - Test correct request construction (URL, headers, body)
    - Test handling of empty response
    - Test network error handling
    - Test authorization error handling
    - Test GraphQL error handling
    - Test invalid JSON response handling
    - _Requirements: 2.4, 3.4, 3.5_

- [ ] 5. Modify `ApiService` to remove `apiKeyClient` and reject `apiKey` auth mode
  - [x] 5.1 Remove `apiKeyClient` and reject `apiKey` auth mode in `ApiService`
    - Remove the `apiKeyClient` field (the `generateClient({ authMode: 'apiKey' })` call)
    - In the `execute()` method, if `authMode === 'apiKey'` is passed, throw an error with code `DEPRECATED_AUTH_MODE` and message: "apiKey auth mode is no longer supported on the Main API. Use SdkApiService for pre-auth operations."
    - Log a warning via `DebugLogService`
    - _Requirements: 5.4, 5.5_

  - [ ]* 5.2 Write property test: apiKey auth mode rejection (Property 5)
    - **Property 5: apiKey auth mode rejection**
    - Use `fast-check` to generate random operation strings and variables
    - Verify `ApiService.execute()` with `authMode === 'apiKey'` always throws an error
    - Verify the error message directs callers to use `SdkApiService`
    - Tag: `Feature: migrate-auth-to-sdk-api, Property 5: apiKey auth mode rejection`
    - **Validates: Requirements 5.5**

  - [ ]* 5.3 Write unit tests for `ApiService` changes
    - Test that `apiKeyClient` field no longer exists
    - Test that `execute()` with `authMode: 'apiKey'` throws the expected error
    - _Requirements: 5.4, 5.5_

- [ ] 6. Modify `UserService` to route pre-auth operations through `SdkApiService`
  - [x] 6.1 Update `UserService` to inject `SdkApiService` and route pre-auth calls
    - Inject `SdkApiService` into `UserService` constructor
    - Rewrite `checkEmailExists()` to call `sdkApiService.query<CheckEmailExistsResponse>(...)` with the `CheckEmailExists` GraphQL query string and variables
    - Rewrite `createUserFromCognito()` to call `sdkApiService.mutate<CreateUserFromCognitoResponse>(...)` with the `CreateUserFromCognito` GraphQL mutation string and variables
    - Add error handling: catch `NetworkError` → throw "Failed to check email existence: SDK API is unreachable"; catch `AuthenticationError` → throw "... API key is invalid or expired"; catch other → throw generic failure message
    - Apply same error wrapping pattern to `createUserFromCognito()`
    - Ensure response shape returned to callers (including `RecoveryService`) is unchanged
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 6.2 Write property test: Pre-auth operations route through SDK client (Property 2)
    - **Property 2: Pre-auth operations route through SDK client**
    - Use `fast-check` to generate random email strings for `checkEmailExists()` and random cognitoSub strings for `createUserFromCognito()`
    - Verify `SdkApiService.query`/`mutate` is called exactly once per invocation
    - Verify Main API client methods are never called
    - Tag: `Feature: migrate-auth-to-sdk-api, Property 2: Pre-auth operations route through SDK client`
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 6.3 Write property test: Response shape compatibility (Property 3)
    - **Property 3: Response shape compatibility**
    - Use `fast-check` to generate random valid `CheckEmailExists` response objects with `{ email, exists, cognitoStatus, cognitoSub }`
    - Verify `UserService.checkEmailExists()` returns an object with the same `{ exists, cognitoStatus, cognitoSub }` shape preserving all field values
    - Tag: `Feature: migrate-auth-to-sdk-api, Property 3: Response shape compatibility`
    - **Validates: Requirements 3.3**

  - [ ]* 6.4 Write unit tests for `UserService` changes
    - Test `checkEmailExists()` calls `SdkApiService.query` (not `ApiService`)
    - Test `createUserFromCognito()` calls `SdkApiService.mutate` (not `ApiService`)
    - Test network error wrapping
    - Test authorization error wrapping
    - Test `RecoveryService.smartCheck()` still works with mocked `UserService`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 7. Checkpoint - Verify frontend changes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Update `setup-dev-env.js` and provision frontend API key
  - [x] 8.1 Update `secrets-retrieval.js` if needed for SDK API parameters
    - Check if `apps/web/scripts/secrets-retrieval.js` needs updates to support the new SSM parameters
    - Ensure the retrieval logic handles the new `SDK_API_URL` and `SDK_API_KEY` entries
    - _Requirements: 6.2, 6.3_

  - [x] 8.2 Document the manual API key provisioning step
    - Add a comment or section in `setup-dev-env.js` explaining that the Frontend_API_Key must be provisioned in the `ApplicationApiKeys` DynamoDB table in `orb_{env}_{key}` format
    - Document that the key must be stored in SSM at `/orb/integration-hub/{env}/appsync/sdk-frontend-api-key`
    - Document that the key should be scoped to `CheckEmailExists` and `CreateUserFromCognito` operations only
    - _Requirements: 6.1, 6.2, 6.4_

- [x] 9. Update documentation and steering file
  - [x] 9.1 Add "Dual AppSync API Architecture" section to `.kiro/steering/project-standards.md`
    - Describe Main_API (Cognito userPool auth) and SDK_API (Lambda authorizer) with their intended use cases
    - Specify that pre-auth operations belong on the SDK_API
    - Specify that authenticated user operations belong on the Main_API
    - Include SSM parameter paths for SDK_API endpoint (`/orb/integration-hub/{env}/appsync/sdk-graphql-url`) and Frontend_API_Key (`/orb/integration-hub/{env}/appsync/sdk-frontend-api-key`)
    - Include guidance on adding new pre-authentication operations to the SDK_API in the future
    - Use consistent terminology from the requirements glossary
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3_

- [x] 10. Version bump and changelog
  - [x] 10.1 Bump version and update CHANGELOG.md
    - Bump minor version in the appropriate version file (e.g., `package.json` or `pyproject.toml`)
    - Add CHANGELOG.md entry describing the migration of pre-auth operations to the SDK API
    - Reference related issue numbers in the changelog entry
    - _Requirements: 9.1, 9.2, 9.3_

- [~] 11. Final checkpoint - Verify all changes
  - Ensure all tests pass (unit + property-based), no linting errors, no TypeScript compilation errors, CHANGELOG.md updated, version bumped, all commits reference related issues. Ask the user if questions arise.
  - _Requirements: 10.1, 10.2, 10.3, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation after schema generation and frontend changes
- Property tests validate the 5 correctness properties from the design document using `fast-check`
- Schema changes MUST go through YAML files + `orb-schema generate` — never edit generated files directly
- All generated files must be committed to git (deployment workflows don't run schema generation)
- Use `--legacy-peer-deps` for any `npm install` commands
- Follow conventional commits: `feat: description #issue`
