# Implementation Plan: Angular 21 Upgrade

## Overview

This implementation plan guides the upgrade of the orb-integration-hub Angular frontend from version 19.2.18 to Angular 21.x.x. The upgrade follows a two-step incremental approach (Angular 19 → 20 → 21) to minimize risk and allow breaking changes to be addressed systematically. All tasks build on previous steps, with checkpoints to ensure stability before proceeding.

## Tasks

- [-] 1. Pre-Migration Preparation
  - [x] 1.1 Create feature branch and establish baseline
    - Create feature branch: `feat/angular-21-upgrade`
    - Run full test suite: `cd apps/web && npm test -- --code-coverage`
    - Capture test results to `baseline-tests.txt`
    - Run production build: `npm run build`
    - Capture bundle sizes to `baseline-build.txt`
    - Capture dependency tree: `npm list > baseline-deps.txt`
    - Verify all tests pass (establish clean baseline)
    - _Requirements: 13.1, 13.3, 13.4_
  
  - [x] 1.2 Review Angular changelogs and verify environment
    - Review Angular 20 changelog for breaking changes
    - Review Angular 21 changelog for breaking changes
    - Document potential breaking changes affecting this codebase
    - Verify Node.js version meets requirements (20.11+ or 22.0+)
    - Verify TypeScript version compatibility
    - _Requirements: 2.1, 2.2, 3.2_
  
  - [x]* 1.3 Write property test for Angular package version consistency
    - **Property 1: Angular Package Version Consistency**
    - **Validates: Requirements 1.2, 1.4**
    - Create test file: `apps/web/src/app/upgrade-verification.spec.ts`
    - Test that all @angular/* packages have consistent version
    - Test will initially verify Angular 19, then 20, then 21 as upgrade progresses

- [x] 2. Checkpoint - Verify clean baseline
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. Angular 20 Migration
  - [x] 3.1 Execute Angular 20 update command
    - Navigate to frontend: `cd apps/web`
    - Run Angular CLI update: `ng update @angular/core@20 @angular/cli@20`
    - Review migration schematic output
    - Document any warnings or manual steps required
    - _Requirements: 1.1, 1.2, 2.1_
  
  - [x] 3.2 Update TypeScript and build tools
    - Update TypeScript to version required by Angular 20
    - Update @angular-devkit/build-angular to version 20
    - Update @angular/compiler-cli to version 20
    - Run `npm install` to resolve dependencies
    - _Requirements: 3.1, 5.2_
  
  - [x] 3.3 Update NgRx packages to version 20
    - Update @ngrx/store to version 20
    - Update @ngrx/effects to version 20
    - Update @ngrx/entity to version 20
    - Update @ngrx/store-devtools to version 20
    - Run `npm install` to resolve dependencies
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [x] 3.4 Update Angular Material and CDK to version 20
    - Update @angular/cdk to version 20
    - Update @angular/material to version 20
    - Run `npm install` to resolve dependencies
    - _Requirements: 3.3_
  
  - [x] 3.5 Resolve Angular 20 breaking changes
    - Review migration schematic changes
    - Manually resolve any breaking changes not handled by schematics
    - Update deprecated API usage
    - Fix TypeScript compilation errors
    - _Requirements: 2.2, 2.3, 2.5_
  
  - [x] 3.6 Fix linting errors from Angular 20 changes
    - Run linter: `npm run lint`
    - Fix all linting errors
    - Ensure zero errors and zero warnings
    - _Requirements: 2.4, 8.4, 13.2_
  
  - [ ]* 3.7 Run unit tests and fix failures
    - Run test suite: `npm test`
    - Fix any test failures due to Angular 20 changes
    - Update test utilities if needed (e.g., TestBed.inject vs TestBed.get)
    - Ensure all tests pass
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 8.3_
  
  - [ ]* 3.8 Write property test for build success preservation
    - **Property 2: Build Success Preservation**
    - **Validates: Requirements 1.3, 2.3, 3.5, 5.3, 8.2, 13.4**
    - Test that development build succeeds
    - Test that production build succeeds
    - Compare bundle sizes to baseline (within 10%)
  
  - [x] 3.9 Verify development workflows work
    - Test dev server: `npm start` (verify starts without errors)
    - Test production build: `npm run build` (verify completes successfully)
    - Test linter: `npm run lint` (verify zero errors)
    - Test hot module replacement works
    - _Requirements: 8.1, 8.2, 8.4, 8.5_
  
  - [-] 3.10 Commit Angular 20 upgrade
    - Review all changes with `git diff`
    - Stage all changes: `git add .`
    - Commit with conventional format: `feat: upgrade to Angular 20 #issue-number`
    - _Requirements: 12.1, 12.2, 12.3_

- [ ] 4. Checkpoint - Verify Angular 20 stability
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Angular 21 Migration
  - [ ] 5.1 Execute Angular 21 update command
    - Navigate to frontend: `cd apps/web`
    - Run Angular CLI update: `ng update @angular/core@21 @angular/cli@21`
    - Review migration schematic output
    - Document any warnings or manual steps required
    - _Requirements: 1.1, 1.2, 2.1_
  
  - [ ] 5.2 Update TypeScript to 5.7+
    - Update TypeScript to version 5.7 or higher (Angular 21 requirement)
    - Update @angular-devkit/build-angular to version 21
    - Update @angular/compiler-cli to version 21
    - Run `npm install` to resolve dependencies
    - _Requirements: 3.1, 5.2_
  
  - [ ] 5.3 Update NgRx packages to version 21
    - Update @ngrx/store to version 21
    - Update @ngrx/effects to version 21
    - Update @ngrx/entity to version 21
    - Update @ngrx/store-devtools to version 21
    - Run `npm install` to resolve dependencies
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [ ] 5.4 Update Angular Material and CDK to version 21
    - Update @angular/cdk to version 21
    - Update @angular/material to version 21
    - Run `npm install` to resolve dependencies
    - _Requirements: 3.3_
  
  - [ ] 5.5 Update third-party Angular integrations
    - Update @fortawesome/angular-fontawesome to Angular 21 compatible version
    - Update angular-eslint to Angular 21 compatible version
    - Check aws-amplify compatibility and update if needed
    - Run `npm install` to resolve dependencies
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [ ] 5.6 Resolve Angular 21 breaking changes
    - Review migration schematic changes
    - Manually resolve any breaking changes not handled by schematics
    - Update deprecated API usage
    - Fix TypeScript compilation errors
    - _Requirements: 2.2, 2.3, 2.5_
  
  - [ ] 5.7 Fix linting errors from Angular 21 changes
    - Run linter: `npm run lint`
    - Fix all linting errors
    - Ensure zero errors and zero warnings
    - _Requirements: 2.4, 8.4, 13.2_
  
  - [ ]* 5.8 Run unit tests and fix failures
    - Run test suite: `npm test`
    - Fix any test failures due to Angular 21 changes
    - Update test utilities if needed
    - Ensure all tests pass
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 8.3_
  
  - [ ]* 5.9 Write property test for ecosystem package compatibility
    - **Property 5: Ecosystem Package Compatibility**
    - **Validates: Requirements 3.3, 4.1, 4.2, 4.3, 4.4, 7.1, 7.2, 7.3**
    - Test that NgRx version matches Angular version
    - Test that Angular Material version matches Angular version
    - Test that all ecosystem packages are compatible
  
  - [ ] 5.10 Verify development workflows work
    - Test dev server: `npm start` (verify starts without errors)
    - Test production build: `npm run build` (verify completes successfully)
    - Test linter: `npm run lint` (verify zero errors)
    - Test hot module replacement works
    - _Requirements: 8.1, 8.2, 8.4, 8.5_
  
  - [ ] 5.11 Update property test to verify Angular 21
    - Update test from task 1.3 to verify all @angular/* packages at version 21.x.x
    - Run test to confirm all packages updated correctly
    - _Requirements: 1.2, 1.4, 1.5_
  
  - [ ] 5.12 Commit Angular 21 upgrade
    - Review all changes with `git diff`
    - Stage all changes: `git add .`
    - Commit with conventional format: `feat: upgrade to Angular 21 #issue-number`
    - _Requirements: 12.1, 12.2, 12.3_

- [ ] 6. Checkpoint - Verify Angular 21 stability
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Post-Migration Verification
  - [ ] 7.1 Run full test suite with coverage
    - Run tests with coverage: `npm test -- --code-coverage`
    - Compare results to baseline-tests.txt
    - Verify all tests pass (100% pass rate)
    - Verify coverage maintained or improved
    - _Requirements: 6.4, 13.3_
  
  - [ ]* 7.2 Write property test for test coverage maintenance
    - **Property 9: Test Coverage Maintenance**
    - **Validates: Requirements 6.5**
    - Test that statement coverage >= baseline
    - Test that branch coverage >= baseline
    - Test that function coverage >= baseline
    - Test that line coverage >= baseline
  
  - [ ] 7.3 Verify production build and bundle sizes
    - Run production build: `npm run build`
    - Compare bundle sizes to baseline-build.txt
    - Verify bundle sizes within acceptable limits (within 10% of baseline)
    - Verify no bundle budget warnings or errors
    - _Requirements: 5.5, 13.4_
  
  - [ ] 7.4 Verify dependency resolution
    - Run clean install: `rm -rf node_modules package-lock.json && npm install`
    - Verify no dependency conflicts
    - Verify no peer dependency warnings
    - _Requirements: 3.4, 13.1_
  
  - [ ]* 7.5 Write property test for dependency resolution success
    - **Property 6: Dependency Resolution Success**
    - **Validates: Requirements 3.4, 13.1**
    - Test that npm install completes without errors
    - Test that no peer dependency conflicts exist
  
  - [ ] 7.6 Manual testing - Authentication flow
    - Start dev server: `npm start`
    - Test user login with valid credentials
    - Test user logout
    - Test protected route redirects
    - Test JWT token handling
    - _Requirements: 9.1_
  
  - [ ] 7.7 Manual testing - User dashboard
    - Navigate to user dashboard
    - Verify dashboard loads without errors
    - Verify user data displays correctly
    - Verify navigation works
    - _Requirements: 9.2_
  
  - [ ] 7.8 Manual testing - Customer features
    - Test organizations list page loads
    - Test organization detail page works
    - Test organization create/edit/delete operations
    - Test applications list page loads
    - Test application detail page works
    - Test groups list page loads
    - Test group detail page works
    - _Requirements: 9.3_
  
  - [ ] 7.9 Manual testing - GraphQL integration
    - Test GraphQL queries execute successfully
    - Test GraphQL mutations execute successfully
    - Test error handling works correctly
    - Test loading states display correctly
    - _Requirements: 9.4_
  
  - [ ] 7.10 Manual testing - NgRx state management
    - Verify NgRx store updates correctly
    - Verify effects trigger as expected
    - Verify selectors return correct data
    - Verify NgRx DevTools work
    - _Requirements: 4.5_
  
  - [ ]* 7.11 Write property test for functional regression prevention
    - **Property 4: Functional Regression Prevention**
    - **Validates: Requirements 2.5, 4.5, 7.4, 7.5, 9.5, 13.5**
    - This property is validated by the entire test suite passing
    - Individual feature tests validate this property
    - Document that manual testing completed successfully
  
  - [ ]* 7.12 Write property test for code quality standards
    - **Property 3: Code Quality Standards Maintained**
    - **Validates: Requirements 2.4, 8.4, 13.2**
    - Test that linting passes with zero errors
    - Test that linting passes with zero warnings
  
  - [ ]* 7.13 Write property test for development workflow preservation
    - **Property 7: Development Workflow Preservation**
    - **Validates: Requirements 5.4, 8.1, 8.2, 8.3, 8.4**
    - Test that `npm start` succeeds
    - Test that `npm run build` succeeds
    - Test that `npm test` succeeds
    - Test that `npm run lint` succeeds

- [ ] 8. Checkpoint - Verify all functionality works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Documentation and Version Management
  - [ ] 9.1 Update README.md
    - Update framework version to Angular 21.x.x
    - Update NgRx version to 21.x.x
    - Update TypeScript version to 5.7+
    - Update Node.js requirement to 20.11+ or 22.0+
    - _Requirements: 10.1_
  
  - [ ] 9.2 Update CHANGELOG.md
    - Add new version section with upgrade details
    - List Angular version change (19.2.18 → 21.x.x)
    - List NgRx version change (19.2.1 → 21.x.x)
    - List TypeScript version change (5.6.3 → 5.7.x)
    - Document breaking changes resolved
    - Reference issue number
    - _Requirements: 10.4, 11.2, 11.3, 11.5_
  
  - [ ] 9.3 Document migration notes
    - Document any significant breaking changes resolved
    - Document any new patterns or APIs adopted
    - Document any manual steps required
    - Update relevant documentation for code pattern changes
    - _Requirements: 10.3, 10.5_
  
  - [ ] 9.4 Bump version in package.json
    - Bump minor version (e.g., 0.4.0 → 0.5.0)
    - Follow semantic versioning
    - _Requirements: 11.1, 11.4_
  
  - [ ] 9.5 Final commit for documentation
    - Stage documentation changes: `git add README.md CHANGELOG.md package.json`
    - Commit: `docs: update documentation for Angular 21 upgrade #issue-number`
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [ ] 10. Final Verification and Completion
  - [ ] 10.1 Run final verification checklist
    - Clean install: `rm -rf node_modules && npm install`
    - Verify no errors or warnings during install
    - Run linter: `npm run lint` (verify zero errors)
    - Run tests: `npm test` (verify 100% pass rate)
    - Run production build: `npm run build` (verify success)
    - Start dev server: `npm start` (verify application loads)
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [ ] 10.2 Review all changes and create pull request
    - Review all commits in feature branch
    - Verify all requirements addressed
    - Verify all correctness properties validated
    - Create pull request with detailed description
    - Include before/after comparison (versions, bundle sizes, test results)
    - Request code review
    - _Requirements: 12.4_

- [ ] 11. Final checkpoint - Ready for merge
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster completion
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at critical milestones
- Property tests validate universal correctness properties from the design document
- The two-step upgrade path (19 → 20 → 21) minimizes risk by addressing breaking changes incrementally
- All manual testing should be performed in a local development environment before merging
- Bundle size increases beyond 10% should be investigated and justified
- Test coverage must be maintained or improved - no reduction allowed
