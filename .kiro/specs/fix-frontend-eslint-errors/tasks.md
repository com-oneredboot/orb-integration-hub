# Implementation Plan: Fix Frontend ESLint Errors

## Overview

Fix 74 ESLint errors in the Angular frontend hand-written files. Tasks are organized by error category for efficient batch processing.

## Tasks

- [x] 1. Fix unused imports in core and shared files
  - Remove unused imports from service and component files
  - Files: `base_feature.component.ts`, `form-validation.service.ts`, `status-badge.component.ts`, `auth-button.component.ts`
  - _Requirements: 1.1, 1.2_

- [x] 2. Fix unused imports in customer feature files
  - Remove unused imports from applications and organizations components
  - Files: `applications-list.component.ts`, `organizations-list.component.ts`, `organizations.reducer.ts`
  - _Requirements: 1.1, 1.2_

- [x] 3. Fix unused imports in user feature files
  - Remove unused imports from auth-flow, profile, and store files
  - Files: `auth-flow.component.ts`, `auth-container.component.ts`, `profile.component.ts`, `profile.component.spec.ts`, `auth-analytics.service.ts`, `auth-performance.service.ts`, `user.actions.ts`, `user.effects.ts`, `user.reducer.ts`
  - _Requirements: 1.1, 1.2_

- [x] 4. Fix unused variables in auth-flow component
  - Remove or use unused variable assignments: `testResult`, `currentUrl`, `currentStep$`
  - File: `auth-flow.component.ts`
  - _Requirements: 2.1, 2.2_

- [x] 5. Fix unused variables in test files
  - Remove or use unused mock variables in spec files
  - Files: `dashboard.component.spec.ts`, `profile.component.spec.ts`
  - _Requirements: 2.1, 2.2_

- [x] 6. Fix unused variables in user store files
  - Remove or use unused variables: `email`, `mfaEnabled`, `mfaSetupComplete`, `phoneVerificationNeeded`
  - Files: `user.effects.ts`, `user.reducer.ts`
  - _Requirements: 2.1, 2.2_

- [x] 7. Fix unused function parameters
  - Prefix unused parameters with underscore
  - Files: `error-handler.service.ts`, `auth-flow.component.ts`, `profile.component.spec.ts`, `user.effects.ts`, `user.reducer.ts`, `auth-input-field.component.ts`, `status-display.service.ts`
  - _Requirements: 2.1, 2.3_

- [x] 8. Fix empty lifecycle methods
  - Add `void 0;` statement to empty lifecycle methods
  - Files: `applications.component.ts`, `organizations.component.ts`, `auth-container.component.ts`, `dashboard.component.ts`
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 9. Fix negated async pipes in templates
  - Replace `!(observable | async)` with `(observable | async) === false`
  - Files: `organization-detail.component.html`, `organizations-list.component.html`, `password.component.html`, `platform-layout.component.html`, `user-layout.component.html`
  - _Requirements: 4.1, 4.2_

- [x] 10. Fix case declarations in switch statements
  - Wrap case blocks with variable declarations in braces
  - Files: `auth-flow.component.ts`, `auth-performance.service.ts`
  - _Requirements: 5.1, 5.2_

- [x] 11. Fix async promise executors
  - Refactor async Promise executors to use proper async/await patterns
  - File: `security-test-utils.ts`
  - _Requirements: 6.1, 6.2_

- [x] 12. Checkpoint - Verify all errors fixed
  - Run `npm run lint` in `apps/web`
  - Verify ≤2 errors (only generated file errors in `AuthModel.ts`)
  - Ensure no new errors introduced
  - _Requirements: 7.1, 7.2_

- [x] 13. Final verification and commit
  - Run full lint check
  - Commit changes with message: `fix: resolve ESLint errors in frontend hand-written files`
  - Commit: 9b8317f
  - _Requirements: 7.1_

## Notes

- Tasks are ordered to fix related files together for efficiency
- ✅ Issue #59 resolved: Regenerated models with orb-schema-generator v0.13.6 (commit fbf1cbf)
- Final lint result: 0 errors, 192 warnings (warnings are acceptable)
- Warnings (e.g., `@typescript-eslint/no-explicit-any`) are acceptable and should not be treated as failures
- No behavioral changes should be made - only code cleanup to satisfy ESLint rules
