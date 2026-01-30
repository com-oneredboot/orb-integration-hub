# Implementation Plan: Fix GraphQL Service Tests

## Overview

This implementation plan addresses the 102 failing GraphQL service tests by configuring AWS Amplify in the test environment. The solution adds minimal Amplify configuration to prevent "Amplify has not been configured" warnings without modifying the existing well-designed test files.

## Tasks

- [x] 1. Create test utilities module
  - [x] 1.1 Create `apps/web/src/app/core/testing/api-service.testing.ts`
    - Create `configureAmplifyForTesting()` function with mock GraphQL endpoint
    - Create `setupTestEnvironment()` export function
    - Add JSDoc documentation explaining the purpose
    - _Requirements: 1.1, 1.4, 4.3, 4.4_

- [x] 2. Integrate Amplify configuration into test setup
  - [x] 2.1 Create `apps/web/src/test-setup.ts` to call `setupTestEnvironment()`
    - Import `setupTestEnvironment` from testing utilities
    - Call setup function before Angular test environment initialization
    - Update `tsconfig.spec.json` to include test-setup.ts
    - Update `angular.json` to include test-setup.ts in polyfills
    - _Requirements: 1.1, 1.3, 4.3_

- [x] 3. Checkpoint - Verify test environment configuration
  - Run service tests to verify Amplify warnings are eliminated
  - Amplify configuration working - no more NoValidAuthTokens errors
  - _Requirements: 2.4, 3.1, 3.2, 3.3, 3.4_

- [x] 4. Fix additional test failures discovered
  - [x] 4.1 Fix user-status-calculation.property.spec.ts
    - Add provideMockActions to test setup
    - _Requirements: 1.3, 2.3_

- [x] 5. Verify property tests complete successfully
  - [x] 5.1 Run OrganizationService property tests
    - Verify 100 iterations complete without auth errors
    - _Requirements: 1.3, 2.3, 3.1_
  - [x] 5.2 Run ApplicationService property tests
    - Verify 100 iterations complete without auth errors
    - _Requirements: 1.3, 2.3, 3.2_
  - [x] 5.3 Run ApiService property tests
    - Verify 100 iterations complete without auth errors
    - _Requirements: 1.3, 2.3, 3.3_

- [x] 6. Final checkpoint - Ensure all tests pass
  - Run full test suite
  - Verify 0 failures in test output
  - Confirm no Amplify configuration warnings in output
  - _Requirements: 2.4, 4.2_

## Notes

- The existing test files are well-designed and should NOT be modified
- The solution configures Amplify rather than suppressing warnings
- Property tests use fast-check with 100 iterations minimum
- Tests verify Observable return types without subscribing (no real API calls)
- Additional test failures discovered during verification need separate fixes
