# Implementation Plan: CI Cleanup and Test Integration

## Overview

This plan removes incomplete test infrastructure and integrates unit tests into deployment workflows, following the orb-geo-fence pattern. Tasks are ordered sequentially for safe execution.

## Tasks

- [x] 1. Delete comprehensive-testing.yml workflow
  - Remove `.github/workflows/comprehensive-testing.yml`
  - _Requirements: 1.1_

- [x] 2. Delete integration test infrastructure
  - Remove `apps/web/integration-tests/` directory and all contents
  - _Requirements: 2.1_

- [x] 3. Delete E2E test infrastructure
  - Remove `apps/web/cypress/` directory and all contents
  - Remove `apps/web/cypress.config.ts`
  - _Requirements: 3.1, 3.2_

- [x] 4. Delete performance test infrastructure
  - Remove `apps/web/performance-tests/` directory and all contents
  - _Requirements: 4.1_

- [x] 5. Clean up package.json scripts
  - Remove jest-related scripts (test:integration, test:integration:*, test:contracts, test:contracts:publish)
  - Remove cypress-related scripts (test:e2e, test:e2e:open, test:e2e:headless, test:coverage, test:all)
  - Remove performance-related scripts (perf:*, bundle:analyze)
  - Keep unit test scripts (test, lint)
  - _Requirements: 2.2, 3.3, 4.2_

- [x] 6. Clean up package.json devDependencies
  - Remove cypress
  - Remove artillery
  - Remove lighthouse
  - Remove webpack-bundle-analyzer
  - Keep karma, jasmine-core, and other unit test dependencies
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 7. Update deploy-website.yml with frontend tests
  - Add skip_tests input parameter (boolean, default false)
  - Add "Skip tests warning" step (conditional on skip_tests)
  - Add "Run frontend unit tests" step before build (conditional on NOT skip_tests)
  - Add "Run linting" step before build (conditional on NOT skip_tests)
  - Preserve all existing deployment functionality
  - _Requirements: 6.2, 6.3, 6.4, 7.3_

- [x] 8. Verify deploy-infrastructure.yml has backend tests
  - Confirm existing "Run CDK Tests" step is present
  - Confirm skip_tests input parameter exists
  - Confirm "Skip tests warning" step exists
  - No changes needed if already correct (it already follows the pattern)
  - _Requirements: 6.1, 7.1_

- [x] 9. Verify deploy-lambda-layers.yml is unchanged
  - Confirm file exists and is functional
  - No changes needed
  - _Requirements: 7.2_

- [x] 10. Update CHANGELOG.md
  - Add entry documenting removal of test infrastructure
  - Document integration of unit tests into deployment workflows
  - _Requirements: 8.2_

- [x] 11. Run npm install to update package-lock.json
  - Execute `npm install` in apps/web to regenerate lock file
  - Verify no errors

- [x] 12. Checkpoint - Verify cleanup complete
  - Confirm all deleted files/directories are gone
  - Confirm package.json is correct
  - Confirm workflows are valid YAML
  - Run `npm test` locally to verify unit tests still work

## Notes

- All tasks are required (no optional tasks)
- Execute in sequential order
- Each task references specific requirements for traceability
- Checkpoint at end ensures all changes are verified before commit
