# Requirements Document

## Introduction

This document defines the requirements for the Local E2E Testing Setup feature in orb-integration-hub. The feature provides a complete local development workflow for running Playwright end-to-end tests against the Angular frontend and AWS backend services. This builds upon the existing E2E test generator (completed in `.kiro/specs/e2e-test-generator/`) by defining the developer experience, project structure, test data management, and documentation needed for local testing.

The local E2E testing setup enables developers to:
- Run generated Playwright tests locally with a single command
- Test against both local frontend (http://localhost:4200) and deployed dev backend (AppSync, Cognito, DynamoDB)
- Create and manage test users and data in the dev environment
- Debug failing tests with browser DevTools
- Clean up test data to avoid polluting environments

## Glossary

- **E2E_Test_Generator**: The Python tool at `tools/e2e_generator/` that generates Playwright tests from YAML schemas
- **Playwright**: The browser automation framework used for E2E testing
- **Test_User**: A Cognito user account created specifically for E2E testing in the dev environment
- **Test_Data**: Resources (organizations, applications, groups) created during E2E test execution
- **Dev_Environment**: The AWS development environment (AppSync API, Cognito user pool, DynamoDB tables) deployed via CDK
- **Local_Frontend**: The Angular development server running at http://localhost:4200
- **Test_Cleanup**: The process of deleting test users and data from the dev environment after test execution
- **Auth_State**: Playwright's stored authentication state (cookies, tokens) saved to `e2e/.auth/user.json`
- **Test_Fixtures**: Helper functions for creating test users and prerequisite resources
- **Page_Objects**: Classes representing application pages with methods for interacting with UI elements
- **AWS_Profile**: The SSO profile `sso-orb-dev` used for AWS CLI operations in tests

## Requirements

### Requirement 1: Project Structure Standards

**User Story:** As a developer, I want a standardized E2E test directory structure, so that I can easily locate tests, helpers, and configuration files.

#### Acceptance Criteria

1. THE E2E_Test_Generator SHALL generate all test files into `apps/web/e2e/` directory
2. THE E2E_Test_Generator SHALL organize generated files into subdirectories: `tests/`, `page-objects/`, `auth/`, `fixtures/`, and `utils/`
3. THE Project SHALL maintain a `.gitignore` entry for `apps/web/e2e/.auth/` to exclude stored authentication state
4. THE Project SHALL maintain a `.gitignore` entry for `apps/web/playwright-report/` to exclude test reports
5. THE Project SHALL commit all generated test files (`tests/*.spec.ts`, `page-objects/*.page.ts`) to version control
6. THE Project SHALL maintain a `playwright.config.ts` file at `apps/web/playwright.config.ts` with environment-specific configuration
7. THE Project SHALL maintain a README file at `apps/web/e2e/README.md` documenting the E2E test structure and usage

### Requirement 2: Developer Setup Workflow

**User Story:** As a developer, I want a simple setup process for E2E testing, so that I can start running tests quickly after cloning the repository.

#### Acceptance Criteria

1. WHEN a developer clones the repository, THE Developer SHALL run `cd apps/web && npm install` to install Playwright dependencies
2. WHEN Playwright is installed for the first time, THE Developer SHALL run `npx playwright install` to install browser binaries
3. WHEN setting up test credentials, THE Developer SHALL create a `.env.test` file in `apps/web/` with required environment variables
4. THE `.env.test` file SHALL contain `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `BASE_URL`, and `AWS_PROFILE` variables
5. WHEN retrieving test credentials from AWS, THE Developer SHALL run `aws --profile sso-orb-dev secretsmanager get-secret-value --secret-id orb-integration-hub-dev-e2e-test-user` to obtain test user credentials
6. THE Project SHALL provide a `.env.test.example` file documenting required environment variables and their format
7. THE Project SHALL include `.env.test` in `.gitignore` to prevent committing credentials

### Requirement 3: Test Execution Commands

**User Story:** As a developer, I want convenient npm scripts for running E2E tests, so that I can execute tests in different modes without memorizing Playwright CLI options.

#### Acceptance Criteria

1. WHEN a developer runs `npm run e2e`, THE System SHALL execute all E2E tests in headless mode
2. WHEN a developer runs `npm run e2e:ui`, THE System SHALL open Playwright's UI mode for interactive test execution
3. WHEN a developer runs `npm run e2e:headed`, THE System SHALL execute tests with visible browser windows
4. WHEN a developer runs `npm run e2e:debug`, THE System SHALL execute tests in debug mode with Playwright Inspector
5. WHEN a developer runs `npm run e2e:report`, THE System SHALL open the HTML test report from the last test run
6. THE Playwright_Config SHALL configure `baseURL` to use `process.env.BASE_URL` with fallback to `http://localhost:4200`
7. THE Playwright_Config SHALL configure `webServer` to automatically start the Angular dev server if not already running

### Requirement 4: Test User Management

**User Story:** As a developer, I want a reliable way to create and manage test users, so that I can run E2E tests without manually creating users in the AWS console.

#### Acceptance Criteria

1. THE Project SHALL maintain a dedicated test user in Cognito with email `e2e-test-user@orb-integration-hub.com` for E2E testing
2. THE Test_User credentials SHALL be stored in AWS Secrets Manager at `orb-integration-hub-dev-e2e-test-user`
3. WHEN a test requires authentication, THE Test SHALL use the `login()` helper from `e2e/auth/cognito.ts` with test user credentials
4. WHEN a test completes authentication, THE Auth_Helper SHALL save authentication state to `e2e/.auth/user.json`
5. WHEN running multiple tests, THE Playwright_Config SHALL reuse stored authentication state to avoid repeated logins
6. THE Project SHALL provide a command phrase `delete test user [email]` for cleaning up test users created during development
7. IF a test user becomes corrupted or locked, THEN THE Developer SHALL delete and recreate the user using AWS CLI commands

### Requirement 5: Test Data Management Strategy

**User Story:** As a developer, I want a clear strategy for managing test data, so that tests don't pollute the dev environment with orphaned resources.

#### Acceptance Criteria

1. WHEN a test creates resources (organizations, applications, groups), THE Test SHALL use unique identifiers with `e2e-test-` prefix
2. WHEN a test completes successfully, THE Test SHALL delete all created resources in a cleanup step
3. WHEN a test fails, THE Test SHALL attempt cleanup in an `afterEach` hook to prevent orphaned data
4. THE Test_Fixtures SHALL provide a `cleanupTestData()` function for deleting resources by ID
5. THE Project SHALL document a manual cleanup procedure for removing orphaned test data using AWS CLI
6. THE Project SHALL recommend running tests against a dedicated test environment (not shared dev) for CI/CD pipelines
7. WHEN creating prerequisite resources, THE Test_Fixtures SHALL provide a `createPrerequisites()` function for dependent resources

### Requirement 6: Environment Configuration

**User Story:** As a developer, I want clear documentation on environment variables, so that I can configure tests for different environments (local, dev, staging).

#### Acceptance Criteria

1. THE `.env.test.example` file SHALL document all required environment variables with example values
2. THE `.env.test.example` file SHALL include `TEST_USER_EMAIL=e2e-test-user@orb-integration-hub.com`
3. THE `.env.test.example` file SHALL include `TEST_USER_PASSWORD=<retrieve-from-aws-secrets>`
4. THE `.env.test.example` file SHALL include `BASE_URL=http://localhost:4200` for local frontend testing
5. THE `.env.test.example` file SHALL include `AWS_PROFILE=sso-orb-dev` for AWS CLI operations
6. THE `.env.test.example` file SHALL include `AWS_REGION=us-east-1` for AWS service configuration
7. WHEN testing against deployed frontend, THE Developer SHALL set `BASE_URL` to the CloudFront distribution URL

### Requirement 7: E2E Testing Documentation

**User Story:** As a developer, I want comprehensive documentation on running E2E tests, so that I can understand the testing workflow and troubleshoot issues.

#### Acceptance Criteria

1. THE `apps/web/e2e/README.md` file SHALL document the E2E test directory structure
2. THE `apps/web/e2e/README.md` file SHALL provide step-by-step setup instructions for first-time users
3. THE `apps/web/e2e/README.md` file SHALL document all available npm scripts for running tests
4. THE `apps/web/e2e/README.md` file SHALL explain how to retrieve test user credentials from AWS Secrets Manager
5. THE `apps/web/e2e/README.md` file SHALL document the test data cleanup strategy
6. THE `apps/web/e2e/README.md` file SHALL provide troubleshooting guidance for common issues (authentication failures, timeout errors, cleanup failures)
7. THE `apps/web/e2e/README.md` file SHALL include examples of writing new E2E tests using the generated page objects

### Requirement 8: Test Isolation and Reliability

**User Story:** As a developer, I want tests to be isolated and reliable, so that test failures indicate real bugs rather than flaky tests or test interdependencies.

#### Acceptance Criteria

1. WHEN running tests in parallel, THE Playwright_Config SHALL configure `fullyParallel: true` for faster execution
2. WHEN running tests in CI, THE Playwright_Config SHALL configure `workers: 1` to prevent race conditions
3. WHEN a test fails in CI, THE Playwright_Config SHALL configure `retries: 2` to handle transient failures
4. WHEN a test fails, THE Playwright_Config SHALL capture screenshots with `screenshot: 'only-on-failure'`
5. WHEN a test fails, THE Playwright_Config SHALL capture video with `video: 'retain-on-failure'`
6. WHEN a test fails, THE Playwright_Config SHALL capture trace with `trace: 'on-first-retry'`
7. THE Test SHALL use `waitForGraphQL()` utility to wait for API responses before asserting UI state

### Requirement 9: Debugging Support

**User Story:** As a developer, I want effective debugging tools for E2E tests, so that I can quickly identify and fix failing tests.

#### Acceptance Criteria

1. WHEN a developer runs `npm run e2e:debug`, THE Playwright_Inspector SHALL open with step-by-step execution controls
2. WHEN a test fails, THE Test_Report SHALL include screenshots showing the UI state at failure
3. WHEN a test fails, THE Test_Report SHALL include video recording of the test execution
4. WHEN a test fails, THE Test_Report SHALL include trace files for detailed debugging with Playwright Trace Viewer
5. THE `apps/web/e2e/utils/index.ts` file SHALL provide a `takeTimestampedScreenshot()` function for manual screenshots
6. THE Test SHALL use `page.pause()` for setting breakpoints during test development
7. THE Playwright_Config SHALL configure `reporter: 'html'` for generating detailed HTML test reports

### Requirement 10: Integration with orb-templates Standards

**User Story:** As a developer, I want E2E testing to follow orb-templates standards, so that the testing approach is consistent across orb projects.

#### Acceptance Criteria

1. THE Project SHALL document E2E testing standards in `repositories/orb-templates/docs/testing-standards/e2e-testing.md`
2. THE E2E_Testing_Standards SHALL define the project structure pattern (`apps/web/e2e/` directory)
3. THE E2E_Testing_Standards SHALL define the test data naming convention (`e2e-test-` prefix)
4. THE E2E_Testing_Standards SHALL define the cleanup strategy (delete in afterEach hooks)
5. THE E2E_Testing_Standards SHALL define the authentication pattern (reuse stored auth state)
6. THE E2E_Testing_Standards SHALL define the environment variable naming convention
7. IF orb-templates team approves, THEN THE Standards SHALL be added to the orb-templates repository via pull request

### Requirement 11: AWS Integration for Test Operations

**User Story:** As a developer, I want tests to interact with AWS services using proper authentication, so that tests can create and clean up resources in the dev environment.

#### Acceptance Criteria

1. WHEN tests need to interact with AWS services, THE Test SHALL use AWS SDK with `sso-orb-dev` profile
2. WHEN tests need to create Cognito users, THE Test_Fixtures SHALL use `@aws-sdk/client-cognito-identity-provider`
3. WHEN tests need to query DynamoDB, THE Test_Fixtures SHALL use `@aws-sdk/client-dynamodb`
4. WHEN tests need to retrieve secrets, THE Test_Fixtures SHALL use `@aws-sdk/client-secrets-manager`
5. THE Test_Fixtures SHALL configure AWS SDK clients with `region: 'us-east-1'` and `credentials` from SSO profile
6. THE Project SHALL document required AWS permissions for running E2E tests (Cognito, DynamoDB, Secrets Manager)
7. IF AWS credentials expire, THEN THE Test SHALL fail with a clear error message instructing the developer to run `aws sso login --profile sso-orb-dev`

### Requirement 12: Test Data Seeding (Optional)

**User Story:** As a developer, I want the option to seed test data before running tests, so that tests can run against a known state without creating resources in every test.

#### Acceptance Criteria

1. WHERE test data seeding is enabled, THE Project SHALL provide a `npm run e2e:seed` script
2. WHERE test data seeding is enabled, THE Seed_Script SHALL create a dedicated test organization with ID `e2e-test-org`
3. WHERE test data seeding is enabled, THE Seed_Script SHALL create test applications and groups under the test organization
4. WHERE test data seeding is enabled, THE Seed_Script SHALL store seeded resource IDs in `e2e/.test-data.json`
5. WHERE test data seeding is enabled, THE Tests SHALL read seeded resource IDs from `e2e/.test-data.json` instead of creating new resources
6. WHERE test data seeding is enabled, THE Project SHALL provide a `npm run e2e:cleanup-seed` script to delete seeded data
7. WHERE test data seeding is enabled, THE `.gitignore` SHALL exclude `e2e/.test-data.json`

### Requirement 13: Documentation Updates

**User Story:** As a developer, I want project documentation updated to reflect E2E testing capabilities, so that the testing approach is discoverable and well-documented.

#### Acceptance Criteria

1. THE Project SHALL update `apps/web/README.md` to include a section on E2E testing
2. THE Project SHALL update the root `README.md` to mention E2E testing in the testing section
3. THE Project SHALL add E2E testing to the "Command Phrases" section in `project-standards.md`
4. THE Command_Phrase `run e2e tests` SHALL execute `cd apps/web && npm run e2e:ui`
5. THE Command_Phrase `setup e2e testing` SHALL guide the developer through the setup process
6. THE Project SHALL document E2E testing in the architecture documentation
7. THE Project SHALL reference the E2E test generator spec (`.kiro/specs/e2e-test-generator/`) in the E2E testing documentation

### Requirement 14: Version and Changelog Management

**User Story:** As a developer, I want version and changelog updates to reflect the E2E testing setup, so that changes are properly tracked.

#### Acceptance Criteria

1. WHEN the E2E testing setup is complete, THE Project SHALL bump the version in `apps/web/package.json` following semantic versioning
2. WHEN the version is bumped, THE Project SHALL update `CHANGELOG.md` with a new version section
3. THE CHANGELOG SHALL include an entry for "Local E2E Testing Setup" feature
4. THE CHANGELOG SHALL reference the GitHub issue number for this feature
5. THE CHANGELOG SHALL describe the key capabilities added (test execution, debugging, cleanup)
6. THE CHANGELOG SHALL follow the format: `- Local E2E Testing Setup with Playwright (#issue)`
7. THE Version_Bump SHALL be a minor version increment (e.g., 0.4.0 → 0.5.0) as this is a new feature

### Requirement 15: Git Commit Standards

**User Story:** As a developer, I want git commits to follow conventional commits format, so that the commit history is clear and traceable.

#### Acceptance Criteria

1. WHEN committing E2E testing setup files, THE Commit_Message SHALL follow conventional commits format
2. THE Commit_Message SHALL use the `feat:` prefix for new feature commits
3. THE Commit_Message SHALL reference the GitHub issue number using `#issue` syntax
4. THE Commit_Message SHALL be descriptive of the changes (e.g., `feat: add local E2E testing setup with Playwright #42`)
5. WHEN committing documentation updates, THE Commit_Message SHALL use the `docs:` prefix
6. WHEN committing configuration files, THE Commit_Message SHALL use the `chore:` prefix
7. THE Commit_Message SHALL NOT use `git commit --amend` on pushed commits

### Requirement 16: Final Verification

**User Story:** As a developer, I want a verification checklist to ensure the E2E testing setup is complete and working, so that I can confirm all components are properly configured.

#### Acceptance Criteria

1. WHEN verification is performed, THE Developer SHALL run `npm run e2e:ui` and confirm Playwright UI opens
2. WHEN verification is performed, THE Developer SHALL execute at least one generated test and confirm it passes
3. WHEN verification is performed, THE Developer SHALL confirm test user authentication succeeds
4. WHEN verification is performed, THE Developer SHALL confirm test data cleanup executes without errors
5. WHEN verification is performed, THE Developer SHALL confirm the E2E README is complete and accurate
6. WHEN verification is performed, THE Developer SHALL confirm all environment variables are documented
7. WHEN verification is performed, THE Developer SHALL confirm no linting errors exist in E2E test files
