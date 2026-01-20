# Requirements Document

## Introduction

This feature removes incomplete and non-functional test infrastructure from orb-integration-hub, aligning the CI/CD approach with the established pattern in orb-geo-fence. The current `comprehensive-testing.yml` workflow has been failing for 2+ days due to missing dependencies (jest, puppeteer), incomplete test implementations, and broken configurations. The deployment workflows already follow the correct pattern and should be preserved.

## Glossary

- **CI_Pipeline**: The GitHub Actions workflow that runs on pull requests and pushes
- **Deployment_Workflow**: Manual-trigger workflows that deploy to specific environments
- **Integration_Tests**: Tests that verify component interactions with external services
- **E2E_Tests**: End-to-end tests using Cypress to test user flows
- **Performance_Tests**: Tests measuring application performance using Lighthouse and Artillery
- **Unit_Tests**: Tests that verify individual functions and components in isolation

## Requirements

### Requirement 1: Remove Comprehensive Testing Workflow

**User Story:** As a developer, I want to remove the failing comprehensive-testing.yml workflow, so that CI stops blocking PRs with broken tests.

#### Acceptance Criteria

1. WHEN the cleanup is complete, THE CI_Pipeline SHALL no longer include the comprehensive-testing.yml workflow
2. THE Repository SHALL retain the three deployment workflows (deploy-infrastructure.yml, deploy-lambda-layers.yml, deploy-website.yml)

### Requirement 2: Remove Integration Test Infrastructure

**User Story:** As a developer, I want to remove the incomplete integration test files, so that the codebase doesn't contain non-functional test scaffolding.

#### Acceptance Criteria

1. WHEN the cleanup is complete, THE Repository SHALL no longer contain the `apps/web/integration-tests/` directory
2. WHEN the cleanup is complete, THE Repository SHALL no longer contain jest-related npm scripts in package.json

### Requirement 3: Remove E2E Test Infrastructure

**User Story:** As a developer, I want to remove the Cypress E2E tests that require environment configuration unavailable in CI, so that the codebase doesn't contain tests that cannot run.

#### Acceptance Criteria

1. WHEN the cleanup is complete, THE Repository SHALL no longer contain the `apps/web/cypress/` directory
2. WHEN the cleanup is complete, THE Repository SHALL no longer contain the `apps/web/cypress.config.ts` file
3. WHEN the cleanup is complete, THE Repository SHALL no longer contain cypress-related npm scripts in package.json

### Requirement 4: Remove Performance Test Infrastructure

**User Story:** As a developer, I want to remove the incomplete performance test files that are missing dependencies, so that the codebase doesn't contain broken test infrastructure.

#### Acceptance Criteria

1. WHEN the cleanup is complete, THE Repository SHALL no longer contain the `apps/web/performance-tests/` directory
2. WHEN the cleanup is complete, THE Repository SHALL no longer contain performance-related npm scripts in package.json

### Requirement 5: Clean Up Package Dependencies

**User Story:** As a developer, I want to remove unused test-related dependencies from package.json, so that the project doesn't have unnecessary dependencies.

#### Acceptance Criteria

1. WHEN the cleanup is complete, THE package.json SHALL no longer include cypress as a devDependency
2. WHEN the cleanup is complete, THE package.json SHALL no longer include artillery as a devDependency
3. WHEN the cleanup is complete, THE package.json SHALL no longer include lighthouse as a devDependency
4. THE package.json SHALL retain dependencies required for unit tests (karma, jasmine)

### Requirement 6: Integrate Unit Tests into Deployment Workflows

**User Story:** As a developer, I want unit tests to run as part of the deployment pipelines (like orb-geo-fence), so that deployments are validated before going to AWS.

#### Acceptance Criteria

1. WHEN deploy-infrastructure.yml runs, THE Deployment_Workflow SHALL execute backend unit tests before CDK synth (unless skip_tests is true)
2. WHEN deploy-website.yml runs, THE Deployment_Workflow SHALL execute frontend unit tests before building the Angular project (unless skip_tests is true)
3. THE deploy-website.yml workflow SHALL include a skip_tests input parameter for emergency deployments
4. IF skip_tests is true, THEN THE Deployment_Workflow SHALL display a warning message about skipped tests

### Requirement 7: Preserve Core Deployment Functionality

**User Story:** As a developer, I want to ensure the existing deployment workflows remain functional, so that we can continue deploying to AWS environments.

#### Acceptance Criteria

1. THE deploy-infrastructure.yml workflow SHALL retain all existing deployment functionality
2. THE deploy-lambda-layers.yml workflow SHALL remain unchanged and functional
3. THE deploy-website.yml workflow SHALL retain all existing deployment functionality

### Requirement 8: Update Documentation

**User Story:** As a developer, I want documentation updated to reflect the removal of test infrastructure, so that future developers understand the current testing approach.

#### Acceptance Criteria

1. IF a testing-related README exists in the removed directories, THEN THE Repository SHALL no longer contain those README files
2. THE CHANGELOG.md SHALL be updated to document the removal of test infrastructure
