# Implementation Plan: Enum Schema Migration

**Status: CLOSED**

## Overview

This implementation plan migrates all code from using backward-compatible SCREAMING_CASE enum aliases to using the generated PascalCase enums directly. The migration is organized by enum type, followed by cleanup and documentation updates.

## Tasks

- [x] 1. Migrate AuthStep enum usage
  - [x] 1.1 Update user.state.ts
    - Remove the `AuthSteps` alias object and its type
    - Keep only the re-export of `AuthStep` from the generated enum
    - _Requirements: 1.1, 5.1_
  
  - [x] 1.2 Update user.reducer.ts
    - Replace all `AuthSteps.` references with `AuthStep.`
    - Update import to use `AuthStep` from `core/enums/AuthStepEnum`
    - _Requirements: 1.2, 1.4_
  
  - [x] 1.3 Update user.selectors.ts
    - Replace all `AuthSteps.` references with `AuthStep.`
    - Update import to use `AuthStep` from `core/enums/AuthStepEnum`
    - _Requirements: 1.2, 1.4_
  
  - [x] 1.4 Update user.effects.ts
    - Replace all `AuthSteps.` references with `AuthStep.`
    - Update import to use `AuthStep` from `core/enums/AuthStepEnum`
    - _Requirements: 1.2, 1.4_
  
  - [x] 1.5 Update user.effects.spec.ts
    - Replace all `AuthSteps.` references with `AuthStep.`
    - Update import to use `AuthStep` from `core/enums/AuthStepEnum`
    - _Requirements: 1.2, 7.4_
  
  - [x] 1.6 Update user.effects.property.spec.ts
    - Replace all `AuthSteps.` references with `AuthStep.`
    - Update import to use `AuthStep` from `core/enums/AuthStepEnum`
    - _Requirements: 1.2, 7.4_
  
  - [x] 1.7 Update auth-flow.component.spec.ts
    - Replace all `AuthSteps.` references with `AuthStep.`
    - Update import to use `AuthStep` from `core/enums/AuthStepEnum`
    - _Requirements: 1.2, 7.4_

- [x] 2. Migrate recovery-related enum usage
  - [x] 2.1 Update RecoveryModel.ts
    - Remove `CognitoUserStatus` alias object
    - Remove `RecoveryAction` alias object
    - Update function implementations to use generated enum values
    - Keep interface definitions and message constants
    - _Requirements: 2.1, 3.1, 5.2_
  
  - [x] 2.2 Update recovery.service.ts
    - Replace `AuthSteps.` references with `AuthStep.`
    - Ensure imports come from generated enum files
    - _Requirements: 1.2, 2.2, 3.2_
  
  - [x] 2.3 Update recovery.service.spec.ts
    - Replace `AuthSteps.` references with `AuthStep.`
    - Update imports to use generated enum files
    - _Requirements: 1.2, 7.4_

- [x] 3. Migrate ProfileSetupStep enum usage
  - [x] 3.1 Update profile.component.ts
    - Remove the `ProfileSetupStep` alias object
    - Update all references to use PascalCase values from generated enum
    - Update import to use `ProfileSetupStep` from `core/enums/ProfileSetupStepEnum`
    - _Requirements: 4.1, 4.2, 5.3_
  
  - [x] 3.2 Update profile.component.spec.ts
    - Replace any `ProfileSetupStep.` SCREAMING_CASE references with PascalCase
    - Update imports to use generated enum file
    - _Requirements: 4.2, 7.4_
  
  - [x] 3.3 Update profile.component.property.spec.ts
    - Replace any `ProfileSetupStep.` SCREAMING_CASE references with PascalCase
    - Update imports to use generated enum file
    - _Requirements: 4.2, 7.4_

- [x] 4. Migrate auth-progress-storage service
  - [x] 4.1 Update auth-progress-storage.service.ts
    - Replace any `AuthSteps.` references with `AuthStep.`
    - Update import to use `AuthStep` from `core/enums/AuthStepEnum`
    - _Requirements: 1.2, 1.4_
  
  - [x] 4.2 Update auth-progress-storage.service.spec.ts
    - Replace all `AuthSteps.` references with `AuthStep.`
    - Update import to use `AuthStep` from `core/enums/AuthStepEnum`
    - _Requirements: 1.2, 7.4_

- [x] 5. Checkpoint - Verify migration
  - Run `npm run lint` in apps/web to check for errors
  - Run `npm test` in apps/web to verify all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 6. Update coding standards documentation
  - [x] 6.1 Add Enum Standards section to frontend-components.md
    - Add section after existing component patterns
    - Include rules for enum creation
    - Include correct vs incorrect patterns
    - Include UI-only enum exception
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 7. Final verification
  - [x] 7.1 Verify no deprecated patterns remain
    - Search for `AuthSteps\.` - should return zero matches
    - Search for `@deprecated.*alias` - should return zero matches
    - Search for SCREAMING_CASE enum values - should return zero matches
    - _Requirements: 1.3, 1.4, 5.4_
  
  - [x] 7.2 Run full test suite
    - Run `npm test` in apps/web
    - Run `npm run lint` in apps/web
    - Verify TypeScript compilation succeeds
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 8. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- The generated enums use PascalCase member names but SCREAMING_CASE string values
- Example: `AuthStep.EmailEntry = "EMAIL_ENTRY"` - the string value is unchanged
- This means backend compatibility is preserved - only the TypeScript references change
- UI-only enums (like `EnvironmentDetailTab`, `ApplicationDetailTab`) are acceptable and don't need migration
- All enums in `core/enums/` are already generated by orb-schema-generator - this spec migrates the **usage** of those enums (removing backward-compatible aliases)
- No new schema registries need to be created - they already exist
