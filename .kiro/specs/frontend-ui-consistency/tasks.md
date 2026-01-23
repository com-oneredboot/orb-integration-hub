# Implementation Plan: Frontend UI Consistency

## Overview

This implementation plan addresses UI consistency issues discovered during the comprehensive audit of all SCSS files in the orb-integration-hub frontend. The audit covered 25+ SCSS files across layouts, shared components, and feature components.

## Tasks

- [x] 1. Migrate StatusBadgeComponent to Design System
  - Replace hardcoded hex colors with design system variables
  - _Requirements: 1.9, 6.1_

- [x] 1.1 Update status-badge.component.scss to use design system
  - Add `@use` imports for variables
  - Replace `#2B8A3E` with `v.$success-color`
  - Replace `#721c24`, `#f8d7da` with `v.$danger-color` variants
  - Replace `#856404`, `#fff3cd` with `v.$warning-color` variants
  - Replace `#6c757d`, `#f8f9fa`, `#dee2e6` with gray scale variables
  - _Requirements: 1.9, 6.1_

- [x] 2. Clean Up Redundant CSS Custom Properties
  - Remove duplicate CSS variable declarations from layout components
  - _Requirements: 1.4, 1.7_

- [x] 2.1 Remove redundant CSS vars from app.component.scss
  - Remove `:root` block with `--orb-*` variables (already in `_tokens.scss`)
  - _Requirements: 1.4_

- [x] 2.2 Remove redundant CSS vars from platform-layout.component.scss
  - Remove `:host` block with `--orb-*` variables
  - Add `@use` import for variables
  - Replace hardcoded `#3A3A3A` with design system variable
  - _Requirements: 1.4, 1.9_

- [x] 2.3 Remove redundant CSS vars from user-layout.component.scss
  - Remove `:host` block with `--orb-*` variables
  - Keep existing `@use` import and `v.$` references
  - _Requirements: 1.4_

- [x] 2.4 Add $orb-dark-gray to variables.scss
  - Add `$orb-dark-gray: #3A3A3A` to Common Project Colors section
  - _Requirements: 1.9_

- [x] 3. Verify VerificationCodeInputComponent Fix
  - Confirm the component uses CSS custom properties correctly
  - Visual inspection of verification flows
  - _Requirements: 6.1, 6.3, 6.4_

- [x] 3.1 Build and verify no compilation errors
  - Run `npm run build` in apps/web
  - Verify no SCSS compilation errors
  - _Requirements: 8.3_

- [ ] 3.2 Visual verification of verification code input
  - Check auth-flow email verification uses red colors
  - Check auth-flow MFA verification uses red colors
  - Check profile phone verification uses red colors
  - Verify focus rings are red (#E31837), not blue
  - Verify resend link hovers to red
  - Verify type icons (email/phone/mfa) are red
  - _Requirements: 6.1, 6.3, 6.4, 6.5_

- [ ] 4. Checkpoint - Verify build and visual consistency
  - Ensure build passes with no errors
  - Confirm all verification flows use red colors
  - Ask the user if questions arise

- [x] 5. Migrate Pages to Use Shared DebugPanelComponent
  - Replace custom debug sections with shared component
  - _Requirements: 1.4, 1.7_

- [x] 5.1 Migrate auth-flow to use DebugPanelComponent
  - Import `DebugPanelComponent` in auth-flow.component.ts
  - Replace custom `.auth-flow__debug` section with `<app-debug-panel>`
  - Create `debugContext` property with form/store state
  - Remove custom debug SCSS styles (use shared styles)
  - _Requirements: 1.4, 1.7_

- [x] 5.2 Migrate this-is-not-the-page to use DebugPanelComponent
  - Import `DebugPanelComponent` in this-is-not-the-page.component.ts
  - Replace custom `.not-found__debug` section with `<app-debug-panel>`
  - Create `debugContext` property with page info
  - Remove custom debug SCSS styles
  - _Requirements: 1.4, 1.7_

- [x] 5.3 Migrate applications to use DebugPanelComponent
  - Import `DebugPanelComponent` in applications.component.ts
  - Replace custom `.applications__debug` section with `<app-debug-panel>`
  - Create `debugContext` property with component state
  - Remove custom debug SCSS styles
  - _Requirements: 1.4, 1.7_

- [x] 5.4 Migrate organizations to use DebugPanelComponent
  - Import `DebugPanelComponent` in organizations.component.ts
  - Replace custom `.organizations__debug` section with `<app-debug-panel>`
  - Create `debugContext` property with component state
  - Remove custom debug SCSS styles
  - _Requirements: 1.4, 1.7_

- [x] 5.5 Migrate dashboard to use DebugPanelComponent
  - Import `DebugPanelComponent` and `DebugLogService` in dashboard.component.ts
  - Replace custom `.dashboard__debug` section with `<app-debug-panel>`
  - Create `debugContext` getter with user state
  - Add `debugLogs$` observable
  - _Requirements: 1.4, 1.7_

- [x] 5.6 Migrate profile to use DebugPanelComponent
  - Import `DebugPanelComponent` in profile.component.ts
  - Replace custom `.profile__debug` section with `<app-debug-panel>`
  - Create `debugContext` getter with form/flow state
  - Remove custom `copyDebugSummary()` method (now in shared component)
  - Remove custom debug SCSS styles (~80 lines)
  - _Requirements: 1.4, 1.7_

- [x] 6. Create Design System Documentation
  - Document available variables, mixins, and components
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 6.1 Create design system documentation file
  - Create `docs/design/design-system.md`
  - Document all SCSS variables from `variables.scss`
  - Document all CSS custom properties from `_tokens.scss`
  - Document all mixins from `mixins.scss`
  - Document global component classes from `components.scss`
  - Include usage examples for each
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 7. Add Property Tests for Color Consistency
  - Create tests to verify no hardcoded blue colors
  - _Requirements: 1.9, 2.7, 6.1, 8.1_

- [ ] 7.1 Write property test for no hardcoded brand colors
  - **Property 7: No Hardcoded Colors**
  - Create test that scans SCSS files for hardcoded blue hex values (#3b82f6, #2563eb)
  - Verify all color references use design system variables or CSS custom properties
  - **Validates: Requirements 1.9, 2.7, 6.1, 8.1**

- [ ] 7.2 Write property test for primary color consistency
  - **Property 1: Primary Color Consistency**
  - Verify primary color references resolve to #E31837
  - **Validates: Requirements 2.7, 6.1**

- [ ] 8. Add Unit Tests for Design System Components
  - Test shared component rendering
  - _Requirements: 2.1, 2.2, 2.3, 3.1_

- [ ] 8.1 Write unit tests for AuthButtonComponent variants
  - Test primary, secondary, outline, ghost, danger, success variants render correctly
  - Test loading and disabled states
  - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

- [ ] 8.2 Write unit tests for AuthInputFieldComponent states
  - Test default, valid, invalid, pending states render correctly
  - Test focus state styling
  - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

- [ ] 8.3 Write unit tests for VerificationCodeInputComponent
  - Test component renders with correct colors
  - Test all verification types (email, phone, mfa) display correct icons
  - Test resend button styling
  - **Validates: Requirements 6.1, 6.3, 6.4**

- [ ] 9. Final Checkpoint - All tests pass
  - Ensure all tests pass
  - Verify visual consistency across all pages
  - Ask the user if questions arise

## Notes

- All tasks are required for comprehensive coverage
- The VerificationCodeInputComponent fix has already been implemented
- StatusBadgeComponent and layout components need migration (discovered in comprehensive audit)
- Focus is on verification, documentation, and adding safeguards
- Property tests will help prevent future regressions

## Files to Modify

| File | Change |
|------|--------|
| `apps/web/src/app/shared/components/ui/status-badge.component.scss` | Migrate to design system variables |
| `apps/web/src/app/app.component.scss` | Remove redundant `:root` CSS vars |
| `apps/web/src/app/layouts/platform-layout/platform-layout.component.scss` | Remove redundant `:host` CSS vars, use variable for dark gray |
| `apps/web/src/app/layouts/user-layout/user-layout.component.scss` | Remove redundant `:host` CSS vars |
| `apps/web/src/styles/variables.scss` | Add `$orb-dark-gray: #3A3A3A` |
| `apps/web/src/app/features/user/components/auth-flow/auth-flow.component.ts` | Import and use DebugPanelComponent |
| `apps/web/src/app/features/user/components/auth-flow/auth-flow.component.html` | Replace custom debug with `<app-debug-panel>` |
| `apps/web/src/app/features/user/components/this-is-not-the-page/this-is-not-the-page.component.ts` | Import and use DebugPanelComponent |
| `apps/web/src/app/features/user/components/this-is-not-the-page/this-is-not-the-page.component.html` | Replace custom debug with `<app-debug-panel>` |
| `apps/web/src/app/features/customers/applications/applications.component.ts` | Import and use DebugPanelComponent |
| `apps/web/src/app/features/customers/applications/applications.component.html` | Replace custom debug with `<app-debug-panel>` |
| `apps/web/src/app/features/customers/organizations/organizations.component.ts` | Import and use DebugPanelComponent |
| `apps/web/src/app/features/customers/organizations/organizations.component.html` | Replace custom debug with `<app-debug-panel>` |
| `apps/web/src/app/features/user/components/dashboard/dashboard.component.ts` | Import DebugPanelComponent, add debugContext getter |
| `apps/web/src/app/features/user/components/dashboard/dashboard.component.html` | Replace custom debug with `<app-debug-panel>` |
| `apps/web/src/app/features/user/components/profile/profile.component.ts` | Import DebugPanelComponent, add debugContext getter, remove copyDebugSummary |
| `apps/web/src/app/features/user/components/profile/profile.component.html` | Replace custom debug with `<app-debug-panel>` |
| `apps/web/src/app/features/user/components/profile/profile.component.scss` | Remove custom debug SCSS styles |
| `docs/design/design-system.md` | Create new documentation file |
