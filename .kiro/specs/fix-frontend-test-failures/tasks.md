# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Breadcrumb Icon Rendering
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: For this deterministic bug, scope the property to the concrete failing cases: any test rendering BreadcrumbComponent with map icon
  - Test that running the full test suite on UNFIXED code produces 103 failures with "Could not find icon with iconName=map and prefix=fas" error
  - Test that UserPageComponent tests fail when rendering breadcrumbs with map icon
  - Test that OrganizationsListComponent tests fail due to breadcrumb icon error
  - Test that BreadcrumbComponent tests fail when trying to render map icon
  - The test assertions should match: all affected tests fail with the same FontAwesome icon error
  - Run test on UNFIXED code: `cd apps/web && npm run test:ci`
  - **EXPECTED OUTCOME**: Test FAILS with 103 failures (this is correct - it proves the bug exists)
  - Document counterexamples found: specific test names and error messages showing missing map icon
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Icon Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (tests not using breadcrumbs)
  - Verify that 1557 tests currently pass on UNFIXED code (tests without breadcrumbs)
  - Verify that all 70+ registered FontAwesome icons work correctly in passing tests
  - Verify that breadcrumb separator icon (faChevronRight) works in production
  - Write property-based tests capturing observed behavior patterns: all non-breadcrumb icon usage should continue to work identically
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code: `cd apps/web && npm run test:ci` (verify 1557 pass)
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix for missing FontAwesome map icon registration

  - [x] 3.1 Implement the fix
    - Add `faMap` to the import statement from `@fortawesome/free-solid-svg-icons` in the "Navigation & Actions" section
    - Add `faMap` to the `library.addIcons()` call in the `configureFontAwesome()` function in the "Navigation & Actions" section
    - Add `'map'` to the `registeredIcons` array in the "Navigation & Actions" section
    - Maintain alphabetical ordering within the "Navigation & Actions" section
    - _Bug_Condition: isBugCondition(test) where test.componentUnderTest uses BreadcrumbComponent AND BreadcrumbComponent.template contains icon="map" AND faMap NOT IN registeredIcons(fontawesome-icons.ts)_
    - _Expected_Behavior: For any test execution where a component renders BreadcrumbComponent with the map icon, the fixed FontAwesome configuration SHALL successfully provide the faMap icon, allowing the breadcrumb component to render without errors and all affected tests to pass_
    - _Preservation: For any FontAwesome icon usage that is NOT the map icon in breadcrumbs, the fixed configuration SHALL produce exactly the same behavior as the original configuration, preserving all existing icon registrations and rendering behavior_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Breadcrumb Icon Rendering
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1: `cd apps/web && npm run test:ci`
    - **EXPECTED OUTCOME**: Test PASSES with 0 failures out of 1665 tests (confirms bug is fixed)
    - Verify all 103 previously failing tests now pass
    - Verify error message "Could not find icon with iconName=map" no longer appears
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing Icon Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2: `cd apps/web && npm run test:ci`
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Verify all 1557 previously passing tests still pass
    - Verify all 70+ registered icons continue to work correctly
    - Verify breadcrumb separator icon (faChevronRight) still works
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full test suite: `cd apps/web && npm run test:ci`
  - Verify 0 failures out of 1665 tests
  - Verify no linting errors: `cd apps/web && npm run lint`
  - Verify production build succeeds: `cd apps/web && npm run build`
  - Manually test breadcrumb rendering in development environment
  - Ask the user if questions arise
