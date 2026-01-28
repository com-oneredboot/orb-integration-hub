# Implementation Plan: API Key Configuration Flow

## Overview

This implementation adds API key validation to the application activation flow, dashboard CTAs for missing keys, and inline key display after generation.

## Tasks

- [x] 1. Create validation helper function
  - [x] 1.1 Create validateApplicationApiKeys utility function
    - Create file `apps/web/src/app/features/customers/applications/utils/api-key-validation.ts`
    - Implement validation logic comparing environments to active keys
    - Export `ApiKeyValidationResult` interface
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 1.2 Write property test for validation correctness
    - **Property 1: Activation Validation Correctness**
    - **Validates: Requirements 1.1, 1.2, 1.3**

- [x] 2. Update application activation flow
  - [x] 2.1 Add validation check before activation
    - Update `onSave()` in application-detail-page.component.ts
    - Call validateApplicationApiKeys before dispatching update
    - If invalid, show error with missing environments list
    - _Requirements: 1.1, 1.2, 4.1_
  - [x] 2.2 Add activation error UI
    - Add error message section in Details tab template
    - Include link to Security tab
    - Style with warning colors
    - _Requirements: 1.4, 4.1, 4.2_

- [x] 3. Checkpoint - Verify activation validation
  - Test that activation fails with missing keys
  - Test that activation succeeds with all keys configured
  - Verify error message shows correct environments

- [x] 4. Add dashboard CTA for missing API keys
  - [x] 4.1 Extend DashboardCtaService with API key check
    - Add `getApiKeyCtaCards()` method
    - Integrate with existing CTA generation
    - _Requirements: 2.1, 2.5_
  - [x] 4.2 Create API key CTA card template
    - Use medium severity (yellow) styling via 'health' category
    - Show app name and missing key count
    - Action navigates to Security tab with query param
    - _Requirements: 2.2, 2.3, 2.4_
  - [x] 4.3 Write property test for CTA generation
    - **Property 2: CTA Generation Correctness**
    - **Validates: Requirements 2.1, 2.5**
  - [x] 4.4 Write property test for CTA content
    - **Property 3: CTA Content Correctness**
    - **Validates: Requirements 2.3**

- [ ] 5. Checkpoint - Verify dashboard CTA
  - Test CTA appears for apps with missing keys
  - Test CTA does not appear for fully configured apps
  - Test navigation to Security tab works

- [ ] 6. Implement inline key display after generation
  - [ ] 6.1 Add generated key state to component
    - Add `generatedKeyDisplay` property to component
    - Update on successful key generation
    - Clear on tab change
    - _Requirements: 3.1, 3.4, 3.5_
  - [ ] 6.2 Update Security tab template for inline key display
    - Add expanded row state when key is newly generated
    - Show full key with copy button
    - Show warning message
    - _Requirements: 3.1, 3.2, 3.3_
  - [ ] 6.3 Implement copy-to-clipboard functionality
    - Add copy button with clipboard API
    - Show success/error feedback
    - _Requirements: 3.2_
  - [ ] 6.4 Add SCSS for inline key display
    - Style expanded row state
    - Style copy button and warning message
    - _Requirements: 3.1, 3.3_

- [ ] 7. Checkpoint - Verify inline key display
  - Test key appears after generation
  - Test copy button works
  - Test key clears on tab change

- [ ] 8. Write unit tests
  - [ ] 8.1 Write unit tests for validation helper
    - Test various environment/key combinations
    - Test edge cases (no environments, no keys)
    - _Requirements: 1.1, 1.2, 1.3_
  - [ ] 8.2 Write unit tests for activation flow
    - Test error display when validation fails
    - Test successful activation when valid
    - _Requirements: 4.1, 4.2_
  - [ ] 8.3 Write property test for error message content
    - **Property 4: Activation Error Message Correctness**
    - **Validates: Requirements 1.4, 4.1**

- [ ] 9. Final checkpoint
  - Ensure all tests pass
  - Verify end-to-end flow works
  - Test all user scenarios
  - Ask user if questions arise

## Notes

- All tasks are required for comprehensive implementation
- Reuses existing API Keys store and actions
- Dashboard CTA integrates with existing DashboardCtaService
- Follow store-first NgRx pattern per project standards
