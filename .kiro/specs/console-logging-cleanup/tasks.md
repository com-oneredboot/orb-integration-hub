# Implementation Plan: Console Logging Cleanup

## Overview

Replace all production `console.log()` and `console.info()` statements with `console.debug()` to reduce noise in production console output. This cleanup targets approximately 30-40 instances across NgRx effects, reducers, components, services, and utilities in the Angular frontend.

## Tasks

- [x] 1. Automated search and verification setup
  - Run grep search for all `console.log(` instances in production code
  - Run grep search for all `console.info(` instances in production code
  - Create baseline count for verification
  - _Requirements: 4.1.1, 4.1.2_

- [x] 2. Replace console.log in NgRx effects
  - [x] 2.1 Update user.effects.ts
    - Replace 15+ `console.log()` statements with `console.debug()`
    - Verify all effect logging uses debug level
    - _Requirements: 2.2.1, 2.1.1_
  
  - [x] 2.2 Update applications.effects.ts
    - Replace 2+ `console.log()` statements with `console.debug()`
    - _Requirements: 2.2.1, 2.1.1_
  
  - [x] 2.3 Update environments.effects.ts
    - Replace 1+ `console.log()` statements with `console.debug()`
    - _Requirements: 2.2.1, 2.1.1_
  
  - [x] 2.4 Verify effects logging
    - Run grep search to confirm zero `console.log()` in effects files
    - _Requirements: 4.1.1_

- [x] 3. Replace console.log in NgRx reducers
  - [x] 3.1 Update user.reducer.ts
    - Replace 1 `console.log()` statement with `console.debug()`
    - Verify reducer logging uses debug level
    - _Requirements: 2.2.2, 2.1.1_
  
  - [x] 3.2 Verify reducer logging
    - Run grep search to confirm zero `console.log()` in reducer files
    - _Requirements: 4.1.1_

- [x] 4. Replace console.info in services
  - [x] 4.1 Update error-handler.service.ts
    - Replace 4 `console.info()` statements with `console.debug()`
    - Verify error recovery logging uses debug level
    - Ensure `console.error()` and `console.warn()` remain unchanged
    - _Requirements: 2.2.4, 2.1.1, 4.1.3_
  
  - [x] 4.2 Update rate-limiting.service.ts
    - Replace 1 `console.info()` statement with `console.debug()`
    - _Requirements: 2.2.4, 2.1.1_
  
  - [x] 4.3 Verify service logging
    - Run grep search to confirm zero `console.info()` in service files
    - _Requirements: 4.1.2_

- [x] 5. Checkpoint - Verify core files updated
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Replace console.log in components
  - [x] 6.1 Update user-layout.component.ts
    - Replace 1 `console.log()` statement with `console.debug()`
    - _Requirements: 2.2.3, 2.1.1_
  
  - [x] 6.2 Update dashboard.component.ts
    - Replace 1 `console.log()` statement with `console.debug()`
    - _Requirements: 2.2.3, 2.1.1_
  
  - [x] 6.3 Update application-detail-page.component.ts
    - Replace 4 `console.log()` statements with `console.debug()`
    - _Requirements: 2.2.3, 2.1.1_
  
  - [x] 6.4 Verify component logging
    - Run grep search to confirm zero `console.log()` in component files
    - _Requirements: 4.1.1_

- [x] 7. Replace console.log in utilities
  - [x] 7.1 Update api-key-validation.ts JSDoc example
    - Replace `console.log()` in JSDoc example with `console.debug()`
    - _Requirements: 2.3.1, 2.1.1_
  
  - [x] 7.2 Update organization-test-data.factory.ts
    - Replace 1 `console.log()` statement with `console.debug()`
    - _Requirements: 2.2.3, 2.1.1_
  
  - [x] 7.3 Verify utility logging
    - Run grep search to confirm zero `console.log()` in utility files
    - _Requirements: 4.1.1_

- [x] 8. Final verification and testing
  - [x] 8.1 Run comprehensive grep searches
    - Verify zero `console.log()` in production code (excluding test files)
    - Verify zero `console.info()` in production code (excluding test files)
    - Verify `console.error()` and `console.warn()` preserved
    - _Requirements: 4.1.1, 4.1.2, 4.1.3_
  
  - [x] 8.2 Run unit tests
    - Execute `npm test` to verify all tests pass
    - _Requirements: 4.3.1_
  
  - [x] 8.3 Run linter
    - Execute `npm run lint` to verify zero linting errors
    - _Requirements: 4.3.2_
  
  - [x] 8.4 Run production build
    - Execute `npm run build` to verify build succeeds
    - _Requirements: 4.3.3_
  
  - [x] 8.5 Manual browser console verification
    - Test in development mode with Verbose filter (debug messages visible)
    - Test in production build with Default filter (console clean)
    - _Requirements: 4.2.2, 4.2.3_

- [x] 9. Documentation and version updates
  - [x] 9.1 Add console logging standards comment in main.ts
    - Document console.debug() usage pattern
    - Explain how to enable verbose logging
    - _Requirements: 8.1_
  
  - [x] 9.2 Update CHANGELOG.md
    - Add entry for console logging cleanup
    - Reference issue number if applicable
    - _Requirements: 8.2_
  
  - [x] 9.3 Bump version in package.json
    - Increment patch version
    - _Requirements: 8.2_

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Test files (`*.spec.ts`) are explicitly excluded from cleanup
- Files with `isDevelopment()` wrapped logging are excluded (already correct)
- All `console.error()` and `console.warn()` calls must remain unchanged
- Use atomic commits by file category for easy review
