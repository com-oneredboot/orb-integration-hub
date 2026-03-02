# Requirements Document

## Introduction

This document defines the requirements for a self-contained E2E authentication test suite in orb-integration-hub. The test suite exercises the complete authentication lifecycle — signup, signin, signout, and account deletion — using Playwright against the local Angular frontend (localhost:4200) connected to the deployed AWS dev backend (Cognito, AppSync, DynamoDB).

The test suite is fully self-contained: it creates its own test user during signup, reuses that user's credentials for subsequent tests, and deletes the user at the end via AWS SDK calls. No pre-existing test users, secrets, or `.env.test` files are required.

This spec also addresses a cleanup of the `GRAPHQL_API_KEY` references from the setup-dev scripts and environment files. The main AppSync API authenticates via Cognito only — there is no API key for the main API. The SDK API uses API keys but is out of scope for this work.

## Glossary

- **Auth_Test_Suite**: The Playwright E2E test suite at `apps/web/e2e/tests/auth.spec.ts` that tests the full authentication lifecycle
- **Test_User**: A Cognito user account created dynamically during the signup test and deleted at the end of the test run
- **Auth_Flow_Component**: The Angular component at `features/user/components/auth-flow/` that handles all authentication steps (email entry, password, verification, MFA, signin)
- **Setup_Dev_Script**: The Node.js script at `apps/web/scripts/setup-dev-env.js` that retrieves AWS credentials for local development
- **Secrets_Retrieval_Script**: The Node.js script at `apps/web/scripts/secrets-retrieval.js` that retrieves secrets from AWS for build-time replacement
- **Test_Replace_Script**: The Node.js script at `apps/web/scripts/test-replace-secrets.js` that tests the string replacement system
- **Environment_Config**: The TypeScript environment files at `apps/web/src/environments/environment.ts` and `environment.prod.ts`
- **Cognito_Client**: The AWS SDK Cognito Identity Provider client used for user deletion during test cleanup
- **DynamoDB_Client**: The AWS SDK DynamoDB client used for user record deletion during test cleanup
- **Shared_Test_State**: The mechanism by which the signup test passes generated credentials (email, password) to subsequent signin, signout, and delete tests


## Requirements

### Requirement 1: Self-Contained Auth Test Suite

**User Story:** As a developer, I want an E2E test suite that creates its own test user and cleans up after itself, so that I can run auth tests without pre-existing test users or secret retrieval.

#### Acceptance Criteria

1. THE Auth_Test_Suite SHALL create a new test user during the signup test using a unique email address with timestamp (e.g., `e2e-test-{timestamp}@test.orb-integration-hub.com`)
2. THE Auth_Test_Suite SHALL generate a strong random password during the signup test that meets Cognito password policy requirements
3. WHEN the signup test completes, THE Auth_Test_Suite SHALL store the generated email and password in Shared_Test_State for use by subsequent tests
4. THE Auth_Test_Suite SHALL execute tests in a fixed serial order: signup, signin, signout, delete account
5. IF the signup test fails, THEN THE Auth_Test_Suite SHALL skip all subsequent tests since they depend on the created user
6. WHEN all tests complete, THE Auth_Test_Suite SHALL delete the test user from both Cognito and DynamoDB using AWS SDK calls
7. IF any test fails before the delete step, THEN THE Auth_Test_Suite SHALL still attempt user cleanup in an `afterAll` hook

### Requirement 2: Signup Test Flow

**User Story:** As a developer, I want to test the complete signup flow end-to-end, so that I can verify new user registration works correctly.

#### Acceptance Criteria

1. WHEN the signup test runs, THE Auth_Test_Suite SHALL navigate to `/authenticate` and enter a unique test email address
2. WHEN the email is submitted, THE Auth_Test_Suite SHALL detect the "new user" flow and proceed to the password step
3. WHEN the password step is reached, THE Auth_Test_Suite SHALL enter the generated password and submit the form
4. WHEN email verification is required, THE Auth_Test_Suite SHALL handle the verification step (auto-confirm via AWS SDK AdminConfirmSignUp if needed)
5. WHEN signup completes successfully, THE Auth_Test_Suite SHALL verify the user reaches the dashboard or profile setup page
6. THE Auth_Test_Suite SHALL store the Cognito user ID (sub) from the signup response for cleanup purposes

### Requirement 3: Signin Test Flow

**User Story:** As a developer, I want to test the signin flow with the previously created user, so that I can verify returning user authentication works correctly.

#### Acceptance Criteria

1. WHEN the signin test runs, THE Auth_Test_Suite SHALL navigate to `/authenticate` and enter the email from Shared_Test_State
2. WHEN the email is recognized as an existing user, THE Auth_Test_Suite SHALL proceed to the password/signin step
3. WHEN the password is submitted, THE Auth_Test_Suite SHALL verify successful authentication by checking navigation to the dashboard
4. THE Auth_Test_Suite SHALL verify the authenticated user's email matches the test email from Shared_Test_State

### Requirement 4: Signout Test Flow

**User Story:** As a developer, I want to test the signout flow, so that I can verify users can properly end their session.

#### Acceptance Criteria

1. WHEN the signout test runs, THE Auth_Test_Suite SHALL be authenticated from the previous signin test
2. WHEN the signout action is triggered, THE Auth_Test_Suite SHALL verify the user is redirected to the login/authenticate page
3. THE Auth_Test_Suite SHALL verify the user session is cleared by confirming protected routes redirect to authentication

### Requirement 5: Test User Cleanup

**User Story:** As a developer, I want the test user to be automatically deleted after tests complete, so that the dev environment is not polluted with test accounts.

#### Acceptance Criteria

1. WHEN the cleanup step runs, THE Auth_Test_Suite SHALL delete the test user from Cognito using `AdminDeleteUserCommand` with the stored Cognito username
2. WHEN the cleanup step runs, THE Auth_Test_Suite SHALL delete the test user record from the DynamoDB users table using the stored user ID
3. THE Auth_Test_Suite SHALL configure AWS SDK clients using the `sso-orb-dev` profile and `us-east-1` region
4. IF the Cognito deletion fails, THEN THE Auth_Test_Suite SHALL log the error and still attempt DynamoDB deletion
5. IF AWS credentials are expired, THEN THE Auth_Test_Suite SHALL log a clear error message instructing the developer to run `aws sso login --profile sso-orb-dev`

### Requirement 6: Remove GRAPHQL_API_KEY from Setup Scripts

**User Story:** As a developer, I want the incorrect GRAPHQL_API_KEY references removed from the setup-dev scripts, so that the setup process does not fail trying to retrieve a non-existent secret.

#### Acceptance Criteria

1. THE Setup_Dev_Script SHALL remove the `GRAPHQL_API_KEY` entry from the `FRONTEND_SECRETS_MAP` object
2. THE Setup_Dev_Script SHALL remove the `apiKey` property from the generated `environment.local.ts` graphql configuration
3. THE Secrets_Retrieval_Script SHALL remove the `GRAPHQL_API_KEY` entry from the `FRONTEND_SECRETS_MAP` object
4. THE Test_Replace_Script SHALL remove all `GRAPHQL_API_KEY` references from mock secrets and test file templates
5. THE Environment_Config SHALL remove the `apiKey` property from the `graphql` object in `environment.ts`
6. THE Environment_Config SHALL remove the `apiKey` property from the `graphql` object in `environment.prod.ts`
7. WHEN the Setup_Dev_Script runs after these changes, THE Setup_Dev_Script SHALL complete without errors related to missing API key secrets

### Requirement 7: Playwright Configuration for Auth Tests

**User Story:** As a developer, I want the Playwright configuration to support serial auth test execution, so that the auth test suite runs tests in the correct dependency order.

#### Acceptance Criteria

1. THE Playwright_Config SHALL support running auth tests in serial mode (not parallel) since each test depends on the previous test's state
2. THE Playwright_Config SHALL configure a `baseURL` of `http://localhost:4200` for local frontend testing
3. THE Playwright_Config SHALL capture screenshots on test failure for debugging
4. THE Playwright_Config SHALL set reasonable timeouts for authentication operations (navigation: 30s, actions: 10s)

### Requirement 8: Documentation Updates

**User Story:** As a developer, I want documentation updated to reflect the self-contained auth test approach, so that other developers understand how to run and extend the tests.

#### Acceptance Criteria

1. THE `apps/web/e2e/README.md` SHALL document the auth test suite's self-contained approach (no pre-existing users or secrets needed)
2. THE `apps/web/e2e/README.md` SHALL document the test execution order (signup → signin → signout → delete)
3. THE `apps/web/e2e/README.md` SHALL document the prerequisite of an active AWS SSO session for test cleanup
4. THE `apps/web/e2e/README.md` SHALL document how to run the auth tests: `npx playwright test auth.spec.ts`

### Requirement 9: Version and Changelog Management

**User Story:** As a developer, I want version and changelog updates to reflect the auth test suite addition, so that changes are properly tracked.

#### Acceptance Criteria

1. WHEN the auth test suite is complete, THE Project SHALL update `CHANGELOG.md` with an entry for the E2E auth test suite
2. THE CHANGELOG entry SHALL describe the self-contained auth test approach and the GRAPHQL_API_KEY cleanup
3. THE CHANGELOG entry SHALL reference the GitHub issue number for this feature

### Requirement 10: Git Commit Standards

**User Story:** As a developer, I want git commits to follow conventional commits format, so that the commit history is clear and traceable.

#### Acceptance Criteria

1. WHEN committing auth test files, THE Commit_Message SHALL use the `test:` prefix (e.g., `test: add self-contained E2E auth test suite`)
2. WHEN committing setup script cleanup, THE Commit_Message SHALL use the `fix:` prefix (e.g., `fix: remove non-existent GRAPHQL_API_KEY from setup scripts`)
3. THE Commit_Message SHALL reference the GitHub issue number using `#issue` syntax

### Requirement 11: Final Verification

**User Story:** As a developer, I want a verification checklist to ensure the auth test suite works end-to-end, so that I can confirm all components are properly configured.

#### Acceptance Criteria

1. WHEN verification is performed, THE Developer SHALL confirm the auth test suite runs successfully with `npx playwright test auth.spec.ts`
2. WHEN verification is performed, THE Developer SHALL confirm the test user is created during signup and deleted during cleanup
3. WHEN verification is performed, THE Developer SHALL confirm `npm run setup-dev` completes without GRAPHQL_API_KEY errors
4. WHEN verification is performed, THE Developer SHALL confirm no linting errors exist in the modified files
5. WHEN verification is performed, THE Developer SHALL confirm the environment files no longer contain `apiKey` references
