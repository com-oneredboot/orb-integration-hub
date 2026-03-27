# Implementation Plan: Local E2E Testing Setup

## Overview

This implementation plan converts the Local E2E Testing Setup design into actionable coding tasks. The feature provides a complete local development workflow for running Playwright end-to-end tests against the Angular frontend and AWS backend services.

The implementation follows 8 phases: Core Infrastructure, Authentication System, Test Fixtures, Utility Functions, Documentation, orb-templates Integration, Optional Features (Test Data Seeding), and Testing/Validation.

## Tasks

- [x] 1. Phase 1: Core Infrastructure
  - [x] 1.1 Create Playwright configuration file
    - Create `apps/web/playwright.config.ts` with environment-specific settings
    - Configure `baseURL` to use `process.env.BASE_URL` with fallback to `http://localhost:4200`
    - Configure `webServer` to auto-start Angular dev server if not running
    - Set `fullyParallel: true` for local execution
    - Set `workers: 1` and `retries: 2` for CI environment
    - Configure reporters: `html` and `list`
    - Configure artifact capture: `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'`, `trace: 'on-first-retry'`
    - Set up browser projects (chromium, firefox, webkit) with auth state dependency
    - Create setup project for authentication that runs before other tests
    - _Requirements: 3.6, 3.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 9.7_
  
  - [x] 1.2 Create environment variable template
    - Create `apps/web/.env.test.example` with all required environment variables
    - Include `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `BASE_URL`, `AWS_PROFILE`, `AWS_REGION`
    - Include AWS resource IDs: `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `APPSYNC_API_URL`, `APPSYNC_API_KEY`
    - Include `ENVIRONMENT` variable
    - Add comments explaining how to retrieve credentials from AWS Secrets Manager
    - _Requirements: 2.3, 2.4, 2.6, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  
  - [x] 1.3 Update .gitignore for E2E testing
    - Add `apps/web/e2e/.auth/` to exclude stored authentication state
    - Add `apps/web/playwright-report/` to exclude test reports
    - Add `apps/web/test-results/` to exclude test artifacts
    - Add `apps/web/.env.test` to exclude test credentials
    - _Requirements: 1.3, 1.4, 2.7_
  
  - [x] 1.4 Add npm scripts for test execution
    - Add `e2e` script: `playwright test`
    - Add `e2e:ui` script: `playwright test --ui`
    - Add `e2e:headed` script: `playwright test --headed`
    - Add `e2e:debug` script: `playwright test --debug`
    - Add `e2e:report` script: `playwright show-report`
    - Add `e2e:codegen` script: `playwright codegen http://localhost:4200`
    - Add `e2e:install` script: `playwright install`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 1.5 Create E2E directory structure
    - Create `apps/web/e2e/` directory
    - Create subdirectories: `auth/`, `fixtures/`, `page-objects/`, `tests/`, `utils/`
    - _Requirements: 1.1, 1.2_

- [x] 2. Phase 2: Authentication System
  - [x] 2.1 Create Cognito auth helper module
    - Create `apps/web/e2e/auth/cognito.ts`
    - Define `TestUser` interface with `email` and `password` properties
    - Define `AuthState` interface with token properties
    - Implement `login()` function that navigates to login page, fills credentials, submits form, waits for dashboard navigation, and saves auth state to `e2e/.auth/user.json`
    - Implement `logout()` function that navigates to logout page and waits for login page
    - Implement `getTestUser()` function that retrieves credentials from environment variables with clear error message if missing
    - Add error handling with helpful messages for authentication failures
    - _Requirements: 4.3, 4.4, 2.1, 2.2_
  
  - [x]* 2.2 Write unit tests for auth helper
    - Test that `getTestUser()` throws error when credentials are missing
    - Test that `getTestUser()` returns correct credentials when environment variables are set
    - Test that `login()` error message includes troubleshooting steps
    - _Requirements: 4.7_

- [x] 3. Phase 3: Test Fixtures
  - [x] 3.1 Create test fixtures module
    - Create `apps/web/e2e/fixtures/index.ts`
    - Define `TestResource` interface with `id`, `type`, and `createdAt` properties
    - Define input interfaces: `CreateOrganizationInput`, `CreateApplicationInput`, `CreateGroupInput`
    - Configure AWS SDK clients with SSO credentials from `process.env.AWS_PROFILE`
    - Set AWS region to `process.env.AWS_REGION` with fallback to `us-east-1`
    - _Requirements: 11.1, 11.5_
  
  - [x] 3.2 Implement resource creation functions
    - Implement `createTestOrganization()` that creates organization with `e2e-test-` prefix and timestamp
    - Implement `createTestApplication()` that creates application with `e2e-test-` prefix and timestamp
    - Implement `createTestGroup()` that creates group with `e2e-test-` prefix and timestamp
    - Implement `createPrerequisites()` that creates organization and application for dependent tests
    - All functions should call GraphQL mutations via AppSync
    - All functions should return `TestResource` with ID, type, and creation timestamp
    - _Requirements: 5.1, 5.7_
  
  - [x] 3.3 Implement cleanup functions
    - Implement `cleanupTestData()` that deletes resources by ID
    - Handle each resource type: organization, application, group, user
    - Continue cleanup even if individual resources fail
    - Log cleanup failures with resource details
    - Provide manual cleanup guidance in console warnings
    - Implement `deleteTestUser()` that deletes from both Cognito and DynamoDB
    - _Requirements: 5.2, 5.3, 5.4, 5.5_
  
  - [x] 3.4 Implement GraphQL client helper
    - Implement `callGraphQL()` function that sends GraphQL requests to AppSync
    - Use `process.env.APPSYNC_API_URL` and `process.env.APPSYNC_API_KEY`
    - Check response for errors and throw with detailed error message
    - Include operation name, errors, and variables in error message
    - _Requirements: 11.1_
  
  - [x] 3.5 Add AWS credential error handling
    - Wrap AWS SDK calls in try-catch blocks
    - Detect `CredentialsProviderError` and `ExpiredTokenException`
    - Throw error with message instructing to run `aws sso login --profile sso-orb-dev`
    - _Requirements: 11.7_
  
  - [x]* 3.6 Write unit tests for fixtures
    - Test that resource creation functions add `e2e-test-` prefix
    - Test that cleanup continues on individual resource failures
    - Test that AWS credential errors include SSO login command
    - Test that GraphQL errors include operation details
    - _Requirements: 5.1, 5.4, 11.7_
  
  - [x]* 3.7 Write property test for test data naming convention
    - **Property 1: Test Data Naming Convention**
    - **Validates: Requirements 5.1**
    - Generate random resource names using fast-check
    - Pass through fixture creation functions
    - Verify all created resources have `e2e-test-` prefix
    - Run 100+ iterations

- [x] 4. Phase 4: Utility Functions
  - [x] 4.1 Create utils module
    - Create `apps/web/e2e/utils/index.ts`
    - Implement `waitForGraphQL()` that waits for GraphQL operation by name
    - Implement `takeTimestampedScreenshot()` that saves screenshots with timestamp to `test-results/screenshots/`
    - Implement `waitForStableElement()` that waits for element to be visible and stable
    - Implement `fillAndValidate()` that fills form field and triggers validation
    - Implement `checkAWSCredentials()` that validates SSO session using STS GetCallerIdentity
    - Implement `formatTestDate()` that formats dates for display
    - Implement `generateTestId()` that generates unique identifiers with prefix
    - _Requirements: 8.7, 9.5, 9.6, 11.7_
  
  - [x]* 4.2 Write unit tests for utils
    - Test that `takeTimestampedScreenshot()` creates directory if not exists
    - Test that `generateTestId()` produces unique identifiers
    - Test that `checkAWSCredentials()` throws error with SSO login command when credentials invalid
    - _Requirements: 11.7_

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Phase 5: Documentation
  - [x] 6.1 Create comprehensive E2E README
    - Create `apps/web/e2e/README.md`
    - Add Overview section explaining purpose, technology stack, and test coverage
    - Add Directory Structure section with visual tree and descriptions
    - Add Setup Instructions with prerequisites and step-by-step first-time setup
    - Add Running Tests section with npm scripts and examples
    - Add Test User Management section explaining dedicated test user and auth state
    - Add Test Data Management section explaining naming convention and cleanup strategy
    - Add Debugging section with UI mode, debug mode, HTML reports, and artifacts
    - Add Troubleshooting section for authentication, timeout, cleanup, and AWS credential issues
    - Add Writing New Tests section with page object usage and best practices
    - Add CI/CD Integration section explaining how tests run in GitHub Actions
    - _Requirements: 1.7, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_
  
  - [x] 6.2 Update frontend README
    - Update `apps/web/README.md` to add E2E Testing section
    - Include quick start instructions
    - Reference `e2e/README.md` for complete documentation
    - List available npm scripts
    - _Requirements: 13.1_
  
  - [x] 6.3 Update root README
    - Update root `README.md` to add E2E Tests subsection under Testing
    - Include setup reference and run command
    - Explain that tests verify complete user workflows against deployed AWS backend
    - _Requirements: 13.2_
  
  - [x] 6.4 Update project standards with command phrases
    - Update `project-standards.md` to add "run e2e tests" command phrase
    - Add "setup e2e testing" command phrase with step-by-step guidance
    - Add "debug e2e test [test-name]" command phrase
    - _Requirements: 13.3, 13.4, 13.5_
  
  - [x] 6.5 Document E2E testing in architecture docs
    - Update architecture documentation to mention E2E testing capabilities
    - Reference the E2E test generator spec
    - _Requirements: 13.6, 13.7_

- [ ] 7. Phase 6: orb-templates Integration
  - [ ] 7.1 Create E2E testing standards document
    - Create `repositories/orb-templates/docs/testing-standards/e2e-testing.md`
    - Document E2E testing standards including purpose and scope
    - Define project structure pattern (`apps/web/e2e/` directory)
    - Define test data naming convention (`e2e-test-` prefix)
    - Define cleanup strategy (delete in afterEach hooks)
    - Define authentication pattern (reuse stored auth state)
    - Define environment variable naming convention
    - Include AWS integration patterns with SSO profile usage
    - Include debugging support patterns
    - Include CI/CD integration patterns
    - Include best practices for test isolation and reliability
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_
  
  - [x]* 7.2 Submit pull request to orb-templates
    - Create branch in orb-templates repository
    - Commit E2E testing standards document
    - Create pull request with description
    - Address review feedback
    - _Requirements: 10.7_

- [ ] 8. Phase 7: Optional Features - Test Data Seeding
  - [ ] 8.1 Create seed data script (optional)
    - Create `apps/web/e2e/scripts/seed-data.ts`
    - Implement `seedTestData()` function that creates test organization, applications, and groups
    - Store seeded resource IDs in `e2e/.test-data.json`
    - Log created resource IDs to console
    - _Requirements: 12.2, 12.3, 12.4_
  
  - [ ] 8.2 Create cleanup seed script (optional)
    - Create `apps/web/e2e/scripts/cleanup-seed.ts`
    - Implement `cleanupSeededData()` function that reads `.test-data.json`
    - Delete all seeded resources using `cleanupTestData()`
    - Delete `.test-data.json` file after cleanup
    - _Requirements: 12.6_
  
  - [ ] 8.3 Add seeding npm scripts (optional)
    - Add `e2e:seed` script: `ts-node e2e/scripts/seed-data.ts`
    - Add `e2e:cleanup-seed` script: `ts-node e2e/scripts/cleanup-seed.ts`
    - _Requirements: 12.1_
  
  - [ ] 8.4 Update .gitignore for seeded data (optional)
    - Add `apps/web/e2e/.test-data.json` to .gitignore
    - _Requirements: 12.7_
  
  - [ ] 8.5 Document seeding feature (optional)
    - Add seeding section to `apps/web/e2e/README.md`
    - Explain when to use seeding vs creating fresh data
    - Document seeding and cleanup commands
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [-] 10. Phase 8: Testing and Validation
  - [ ] 10.1 Create unit tests for configuration
    - Create `apps/web/e2e/__tests__/config.test.ts`
    - Test that required directories exist
    - Test that `.gitignore` contains required entries
    - Test that `playwright.config.ts` has required settings
    - Test that `.env.test.example` contains all required variables
    - Test that npm scripts are defined correctly
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x]* 10.2 Write property test for test cleanup execution
    - **Property 2: Test Cleanup Execution**
    - **Validates: Requirements 5.2, 5.3**
    - Generate random test files using fast-check
    - Parse AST to find resource creation
    - Verify all tests with resource creation have `afterEach` cleanup hooks
    - Run 100+ iterations
  
  - [x]* 10.3 Write property test for authentication state persistence
    - **Property 3: Authentication State Persistence**
    - **Validates: Requirements 4.4**
    - Run login function with test credentials
    - Verify `e2e/.auth/user.json` file is created
    - Verify file contains valid auth tokens
    - Run 100+ iterations
  
  - [x]* 10.4 Write property test for AWS SDK configuration
    - **Property 4: AWS SDK Configuration**
    - **Validates: Requirements 11.1**
    - Generate random AWS SDK client instantiations
    - Verify all clients use `sso-orb-dev` profile
    - Verify all clients use `us-east-1` region
    - Run 100+ iterations
  
  - [x]* 10.5 Write property test for AWS credential error handling
    - **Property 5: AWS Credential Error Handling**
    - **Validates: Requirements 11.7**
    - Simulate expired credentials
    - Trigger AWS SDK operations
    - Verify error messages contain SSO login command
    - Run 100+ iterations
  
  - [x]* 10.6 Write property test for test data seeding fallback
    - **Property 6: Test Data Seeding Fallback**
    - **Validates: Requirements 12.5**
    - Create `.test-data.json` with random resource IDs
    - Run tests that support seeding
    - Verify tests read from file instead of creating new resources
    - Run 100+ iterations
  
  - [x] 10.7 Create example test demonstrating patterns
    - Create `apps/web/e2e/tests/example.spec.ts`
    - Demonstrate authentication with stored state
    - Demonstrate resource creation with fixtures
    - Demonstrate cleanup in afterEach hook
    - Demonstrate GraphQL waiting with utils
    - Demonstrate error handling patterns
    - _Requirements: 7.7_
  
  - [ ] 10.8 Run final verification checklist
    - Run `npm run e2e:ui` and confirm Playwright UI opens
    - Execute example test and confirm it passes
    - Confirm test user authentication succeeds
    - Confirm test data cleanup executes without errors
    - Confirm E2E README is complete and accurate
    - Confirm all environment variables are documented
    - Run linter on E2E test files and confirm no errors
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7_

- [x] 11. Documentation Updates and Version Management
  - [x] 11.1 Update CHANGELOG.md
    - Add new version section following semantic versioning
    - Add entry: "Local E2E Testing Setup with Playwright (#issue)"
    - Describe key capabilities: test execution, debugging, cleanup
    - Reference GitHub issue number
    - _Requirements: 14.2, 14.3, 14.4, 14.5, 14.6_
  
  - [x] 11.2 Bump version in package.json
    - Increment minor version (e.g., 0.4.0 → 0.5.0) as this is a new feature
    - _Requirements: 14.1, 14.7_

- [-] 12. Final Checkpoint and Commit
  - [-] 12.1 Commit all changes with conventional commits format
    - Use `feat:` prefix for feature commits
    - Use `docs:` prefix for documentation commits
    - Use `chore:` prefix for configuration commits
    - Reference GitHub issue number using `#issue` syntax
    - Example: `feat: add local E2E testing setup with Playwright #42`
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_
  
  - [ ] 12.2 Final verification
    - Ensure all tests pass (unit + property tests)
    - Ensure no linting errors
    - Ensure documentation is complete
    - Ensure CHANGELOG.md is updated
    - Ensure version is bumped
    - Ensure commits reference issues
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples and edge cases
- Phase 7 (Test Data Seeding) is entirely optional and can be implemented later
- The implementation uses TypeScript as specified in the design document
- All E2E test infrastructure code goes in `apps/web/e2e/` directory
- Generated test files from E2E test generator will be placed in `apps/web/e2e/tests/` and `apps/web/e2e/page-objects/`
