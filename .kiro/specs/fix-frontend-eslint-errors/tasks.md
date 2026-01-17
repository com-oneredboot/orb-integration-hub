# Implementation Plan: Fix Frontend ESLint Errors

## Overview

Fix all ESLint errors in the Angular frontend hand-written files. Tasks are organized by error category for efficient batch processing.

## Phase 1: Original Errors (Completed)

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
  - Remove or use unused variable assignments
  - File: `auth-flow.component.ts`
  - _Requirements: 2.1, 2.2_

- [x] 5. Fix unused variables in test files
  - Remove or use unused mock variables in spec files
  - Files: `dashboard.component.spec.ts`, `profile.component.spec.ts`
  - _Requirements: 2.1, 2.2_

- [x] 6. Fix unused variables in user store files
  - Remove or use unused variables
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

- [x] 12. Checkpoint - Phase 1 complete
  - Commit: 9b8317f
  - _Requirements: 7.1_

## Phase 2: Type Safety Errors (155 no-explicit-any)

- [x] 14. Fix explicit any in core services
  - Replace `any` with proper types in service files
  - Files: `api.service.ts`, `cognito.service.ts`, `error-handler.service.ts`, `organization.service.ts`, `user.service.ts`
  - _Requirements: 8.1_

- [x] 15. Fix explicit any in core auth services
  - Replace `any` with proper types in auth service files
  - Files: `core/services/auth/auth-analytics.service.ts`, `core/services/auth/auth-performance.service.ts`
  - _Requirements: 8.1_

- [x] 16. Fix explicit any in core testing utilities
  - Replace `any` with proper types in test utilities
  - Files: `auth-test-data.factory.ts`, `organization-test-data.factory.ts`, `security-test-utils.ts`, `types.ts`
  - _Requirements: 8.1_

- [x] 17. Fix explicit any in core service specs
  - Replace `any` with proper types in test files
  - Files: `error-handler.service.spec.ts`
  - _Requirements: 8.1_

- [x] 18. Fix explicit any in user feature services
  - Replace `any` with proper types in user services
  - Files: `features/user/services/auth-analytics.service.ts`, `features/user/services/auth-performance.service.ts`
  - _Requirements: 8.1_

- [x] 19. Fix explicit any in user feature components
  - Replace `any` with proper types in user components
  - Files: `auth-flow.component.ts`, `auth-container.component.ts`, `login.component.ts`, `password.component.ts`, `dashboard.component.ts`, `profile.component.ts`, `this-is-not-the-page.component.ts`
  - _Requirements: 8.1_

- [x] 20. Fix explicit any in user feature specs and store
  - Replace `any` with proper types in user specs and store
  - Files: `profile.component.spec.ts`, `user.effects.ts`
  - _Requirements: 8.1_

- [x] 21. Fix explicit any in customer feature components
  - Replace `any` with proper types in customer components
  - Files: `application-detail.component.ts`, `organizations-list.component.ts`
  - _Requirements: 8.1_

- [x] 22. Fix explicit any in shared components
  - Replace `any` with proper types in shared components
  - Files: `auth-input-field.component.ts`
  - _Requirements: 8.1_

- [x] 23. Checkpoint - Type safety complete
  - Run `npm run lint` and verify no `no-explicit-any` errors
  - _Requirements: 8.1_

## Phase 3: Accessibility Errors (34 total)

- [x] 24. Fix label accessibility in customer templates
  - Add proper label associations using `for` attribute or wrapping
  - Files: `application-detail.component.html`, `applications-list.component.html`, `organization-detail.component.html`, `organizations-list.component.html`
  - _Requirements: 9.1_

- [x] 25. Fix label accessibility in user templates
  - Add proper label associations
  - Files: `dashboard.component.html`
  - _Requirements: 9.1_

- [x] 26. Fix click event accessibility in layout templates
  - Add `keydown` handlers and `tabindex` for interactive elements
  - Files: `platform-layout.component.html`, `user-layout.component.html`
  - _Requirements: 9.2, 9.3_

- [x] 27. Checkpoint - Accessibility complete
  - Run `npm run lint` and verify no accessibility errors
  - _Requirements: 9.1, 9.2, 9.3_

## Phase 4: Standalone Components (3 total)

- [x] 28. Convert components to standalone
  - Add `standalone: true` and import dependencies directly
  - Files: Components flagged by `prefer-standalone` rule
  - _Requirements: 10.1_

- [x] 29. Final verification
  - Run `npm run lint` and verify 0 errors, 0 warnings
  - Run `npm test` to ensure no regressions
  - _Requirements: 7.1_

- [x] 30. Final commit
  - Commit all changes with message: `fix: resolve all ESLint errors and warnings in frontend`
  - _Requirements: 7.1_

## Notes

- Phase 1 completed: 74 original errors fixed (commit 9b8317f)
- Issue #59 resolved: Regenerated models with orb-schema-generator v0.13.6 (commit fbf1cbf)
- ESLint config updated to treat all warnings as errors
- No behavioral changes should be made - only code cleanup to satisfy ESLint rules
- Type replacements should use specific types from generated models or create new interfaces as needed
