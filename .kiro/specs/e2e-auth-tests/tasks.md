# Implementation Plan: E2E Auth Tests

## Overview

Implement a self-contained Playwright E2E auth test suite (signup → signin → signout → cleanup) and remove stale `GRAPHQL_API_KEY` references from setup scripts and environment files. Tests use shared state across serial steps, AWS SDK for user confirmation and cleanup, and fast-check property tests for helper function correctness.

## Tasks

- [x] 1. Remove GRAPHQL_API_KEY from environment files and setup scripts
  - [x] 1.1 Remove `apiKey` from `graphql` object in `apps/web/src/environments/environment.ts`
    - Delete the `apiKey: '{{GRAPHQL_API_KEY}}'` line from the `graphql` config
    - _Requirements: 6.5_
  - [x] 1.2 Remove `apiKey` from `graphql` object in `apps/web/src/environments/environment.prod.ts`
    - Delete the `apiKey: '{{GRAPHQL_API_KEY}}'` line from the `graphql` config
    - _Requirements: 6.6_
  - [x] 1.3 Remove `apiKey` from `Amplify.configure()` in `apps/web/src/main.ts`
    - Delete the `apiKey: environment.graphql.apiKey` line from the `API.GraphQL` config
    - _Requirements: 6.5, 6.6_
  - [x] 1.4 Remove `GRAPHQL_API_KEY` from `apps/web/scripts/setup-dev-env.js`
    - Remove the `GRAPHQL_API_KEY` entry from `FRONTEND_SECRETS_MAP`
    - Remove the `apiKey` line from the generated `environment.local.ts` template string
    - _Requirements: 6.1, 6.2_
  - [x] 1.5 Remove `GRAPHQL_API_KEY` from `apps/web/scripts/secrets-retrieval.js`
    - Remove the `GRAPHQL_API_KEY` entry from `FRONTEND_SECRETS_MAP`
    - _Requirements: 6.3_
  - [x] 1.6 Remove `GRAPHQL_API_KEY` from `apps/web/scripts/test-replace-secrets.js`
    - Remove `GRAPHQL_API_KEY` from mock secrets object
    - Remove `apiKey` references from test file templates (main.js, environment.js, config.json)
    - _Requirements: 6.4_

- [x] 2. Checkpoint - Verify GRAPHQL_API_KEY removal
  - Ensure no linting or compilation errors in modified files, ask the user if questions arise.

- [x] 3. Write the self-contained auth test suite
  - [x] 3.1 Rewrite `apps/web/e2e/tests/auth.spec.ts` with self-contained auth lifecycle tests
    - Define `AuthTestState` interface and module-scoped state object
    - Implement `generateTestEmail()` helper returning `e2e-test-{timestamp}@test.orb-integration-hub.com`
    - Implement `generateTestPassword()` helper meeting Cognito policy (8+ chars, uppercase, lowercase, digit, special char)
    - Implement `adminConfirmSignUp()` using `AdminConfirmSignUpCommand` from `@aws-sdk/client-cognito-identity-provider`
    - Implement `adminDeleteUser()` tolerating `UserNotFoundException`
    - Implement `deleteUserFromDynamoDB()` for DynamoDB users table cleanup
    - Add `beforeAll` hook: call `checkAWSCredentials()`, generate email and password, store in shared state
    - Add `afterAll` hook: best-effort cleanup — delete from Cognito then DynamoDB, log errors but don't throw
    - Use `test.describe.serial` for fixed execution order
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 5.1, 5.2, 5.3, 5.4, 5.5_
  - [x] 3.2 Implement signup test within `auth.spec.ts`
    - Navigate to `/authenticate`, enter generated email in `#email-input`, submit
    - Detect new-user flow, enter password in `#password-setup-input`, submit
    - Call `adminConfirmSignUp()` via AWS SDK to bypass email verification
    - Verify user reaches dashboard or profile setup page
    - Extract and store `cognitoUsername` and `userId` in shared state
    - Mark `signupSucceeded = true` in shared state
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  - [x] 3.3 Implement signin test within `auth.spec.ts`
    - Skip if `signupSucceeded` is false
    - Navigate to `/authenticate`, enter email from shared state
    - Detect existing-user flow, enter password in `#password-input`, submit
    - Verify navigation to dashboard
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x] 3.4 Implement signout test within `auth.spec.ts`
    - Skip if `signupSucceeded` is false
    - Trigger signout action (click signout button/menu item)
    - Verify redirect to `/authenticate`
    - Verify protected route redirects back to authentication
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 4. Checkpoint - Verify auth test suite compiles
  - Ensure no TypeScript compilation errors in `apps/web/e2e/tests/auth.spec.ts`, ask the user if questions arise.

- [x] 5. Property-based tests for helper functions
  - [x]* 5.1 Write property test for generateTestEmail
    - **Property 1: Generated test emails are unique and well-formed**
    - Use fast-check to generate random timestamps, verify each email matches `e2e-test-{digits}@test.orb-integration-hub.com` and distinct timestamps produce distinct emails
    - Create test file at `apps/web/e2e/tests/auth-helpers.property.spec.ts`
    - Run minimum 100 iterations
    - **Validates: Requirements 1.1**
  - [x]* 5.2 Write property test for generateTestPassword
    - **Property 2: Generated passwords meet Cognito password policy**
    - Use fast-check to generate 100+ passwords, verify each has ≥8 chars, at least one uppercase, one lowercase, one digit, one special character from `!@#$%^&*`
    - Add to `apps/web/e2e/tests/auth-helpers.property.spec.ts`
    - **Validates: Requirements 1.2**

- [x] 6. Update E2E documentation
  - [x] 6.1 Rewrite `apps/web/e2e/README.md` to document self-contained auth test approach
    - Document that auth tests create their own user and clean up — no `.env.test` or pre-existing users needed
    - Document test execution order: signup → signin → signout → delete
    - Document prerequisite: active AWS SSO session (`aws sso login --profile sso-orb-dev`)
    - Document how to run: `npx playwright test auth.spec.ts`
    - Keep existing sections for other test types (organizations, applications, etc.)
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 7. Final checkpoint - Verify everything works
  - Ensure all modified files have no linting or compilation errors, ask the user if questions arise.
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The design uses TypeScript throughout (Playwright + fast-check), so all tasks use TypeScript
- The existing `apps/web/e2e/fixtures/index.ts` provides `deleteTestUser()`, `cognitoClient`, and `dynamoClient` — the auth spec reuses the AWS SDK client pattern but implements its own helpers for `AdminConfirmSignUp` and targeted cleanup
- The existing `apps/web/e2e/utils/index.ts` provides `checkAWSCredentials()` and `generateTestId()` — reused directly
- The existing `playwright.config.ts` already supports serial mode, baseURL, screenshots, and timeouts — no changes needed
- Property tests validate the test infrastructure helpers, not the E2E flows themselves
- Changelog and git commit tasks (Requirements 9, 10) are handled at commit time, not as coding tasks
