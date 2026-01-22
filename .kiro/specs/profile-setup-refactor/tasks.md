# Implementation Plan: Profile Setup Refactor

## Overview

This implementation plan refactors profile setup functionality from the authentication flow to the profile page. The work is organized to build incrementally, with each task building on previous ones.

## Tasks

- [x] 1. Update Profile Component with Step-Based Flow
  - [x] 1.1 Add ProfileSetupStep enum and state interfaces
    - Create `ProfileSetupStep` enum: NAME, PHONE, PHONE_VERIFY, COMPLETE
    - Add `ProfileSetupState` and `PhoneVerificationState` interfaces
    - _Requirements: 2.1, 2.2, 3.1_

  - [x] 1.2 Create separate forms for each step
    - Add `nameForm` with firstName, lastName validators
    - Add `phoneForm` with E.164 pattern validator
    - Add `verifyForm` with 6-digit code validator
    - _Requirements: 1.1, 3.2_

  - [x] 1.3 Implement flow navigation methods
    - Add `startFullFlow()` for "Edit Profile" button
    - Add `startFromIncomplete()` for dashboard links
    - Add `nextStep()`, `previousStep()`, `skipToStep()` methods
    - Add `getFirstIncompleteStep()` helper
    - _Requirements: 2.1, 2.2, 6.2_

  - [x] 1.4 Write property test for phone number validation
    - **Property 2: Phone Number Validation**
    - **Validates: Requirements 3.2**

- [x] 2. Update Profile Component Template
  - [x] 2.1 Create step-based template structure
    - Add conditional rendering for each step (NAME, PHONE, PHONE_VERIFY)
    - Show only current step form, hide summary during flow
    - Add progress indicator showing current step
    - _Requirements: 2.1, 2.2_

  - [x] 2.2 Apply auth flow styling to inputs
    - Copy input styling from auth flow components
    - Add visible borders, proper contrast, focus states
    - Add validation error styling matching auth flow
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 2.3 Write property test for edit mode state consistency
    - **Property 1: Edit Mode State Consistency**
    - **Validates: Requirements 2.1, 2.2, 2.3**

- [x] 3. Implement Phone Verification in Profile
  - [x] 3.1 Add phone verification service integration
    - Inject SmsVerificationService
    - Add `sendVerificationCode()` method calling Lambda
    - Add `verifyPhoneCode()` method
    - Add cooldown timer logic for resend
    - _Requirements: 4.1, 4.5_

  - [x] 3.2 Create phone verification UI
    - Add "Verify Phone" button after phone entry
    - Add code input field with 6-digit mask
    - Add resend button with cooldown timer
    - Add error message display
    - _Requirements: 4.2, 4.4, 4.5, 4.6_

  - [x] 3.3 Write property test for phone verification data integrity
    - **Property 3: Phone Verification Data Integrity**
    - **Validates: Requirements 3.4**

  - [x] 3.4 Write property test for verification code correctness
    - **Property 4: Verification Code Correctness**
    - **Validates: Requirements 4.3, 4.4**

- [x] 4. Checkpoint - Profile Component Complete
  - Ensure all profile component tests pass
  - Verify step flow works correctly
  - Ask the user if questions arise

- [x] 5. Remove Profile Steps from Auth Flow
  - [x] 5.1 Update AuthSteps enum
    - Remove NAME_SETUP, PHONE_SETUP, PHONE_VERIFY from enum
    - Update any switch statements or conditionals
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 5.2 Update auth flow state machine
    - Remove transitions to/from removed steps
    - Update MFA completion to go directly to dashboard
    - _Requirements: 5.4, 5.5_

  - [x] 5.3 Remove unused auth flow templates
    - Remove NAME_SETUP template section
    - Remove PHONE_SETUP template section
    - Remove PHONE_VERIFY template section
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 5.4 Update auth flow unit tests
    - Remove tests for deleted steps
    - Add tests verifying MFA → dashboard flow
    - _Requirements: 8.3_

- [x] 6. Update Dashboard Navigation
  - [x] 6.1 Update health check navigation methods
    - Change `goToPhoneVerification()` to navigate to `/profile?mode=setup&startFrom=incomplete`
    - Change `goToNameSetup()` to navigate to `/profile?mode=setup&startFrom=incomplete`
    - Remove any navigation to `/authenticate` for profile items
    - _Requirements: 6.1, 6.4_

  - [ ] 6.2 Write property test for dashboard navigation consistency
    - **Property 5: Dashboard Navigation Consistency**
    - **Validates: Requirements 6.1, 6.4**

  - [ ] 6.3 Write unit tests for dashboard navigation
    - Test health check click navigates to profile
    - Test query parameters are correct
    - _Requirements: 8.4_

- [x] 7. Update User Status Calculation
  - [x] 7.1 Review and update status calculation logic
    - Verify status is PENDING when required fields missing
    - Verify status is PENDING when phone not verified
    - Verify status is ACTIVE when all complete
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
    - Note: Logic already exists in profile.component.ts - sets UserStatus.Active on save

  - [ ] 7.2 Write property test for user status calculation
    - **Property 6: User Status Calculation**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**

- [ ] 8. Checkpoint - Integration Complete
  - Ensure all tests pass
  - Verify end-to-end flow works
  - Ask the user if questions arise

- [ ] 9. Add Profile Component Unit Tests
  - [ ] 9.1 Write unit tests for edit mode toggling
    - Test `startFullFlow()` sets correct state
    - Test `startFromIncomplete()` skips completed steps
    - Test cancel returns to summary
    - _Requirements: 8.1_

  - [ ] 9.2 Write unit tests for phone verification flow
    - Test code sending triggers service call
    - Test successful verification updates state
    - Test error handling displays messages
    - _Requirements: 8.2_

  - [ ] 9.3 Write property test for form validation error display
    - **Property 7: Form Validation Error Display**
    - **Validates: Requirements 1.3**

- [ ] 10. Final Checkpoint
  - Ensure all tests pass
  - Run linting and type checking
  - Verify no console errors in browser
  - Ask the user if questions arise

## Notes

- All tasks are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Follow orb-templates spec standards for commits and issue updates
