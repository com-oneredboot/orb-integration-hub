# Implementation Plan: Store Consolidation

## Overview

This plan consolidates the `apiKeys` NgRx store into the `environments` store, making `environments` the single source of truth for both environment configurations and API keys.

## Tasks

- [x] 1. Update main.ts to remove apiKeys store registration
  - Remove `apiKeysReducer` import and registration from `provideStore`
  - Remove `ApiKeysEffects` import and registration from `provideEffects`
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Migrate ApplicationDetailPageComponent
  - [x] 2.1 Update imports to use environments store
    - Remove imports from `api-keys` directory
    - Import `EnvironmentsActions` from environments store
    - Import `GeneratedKeyResult` from environments state
    - Update selector imports to use `fromEnvironments`
    - _Requirements: 2.6, 2.7, 6.1_
  
  - [x] 2.2 Update loadApiKeys method to use EnvironmentsActions
    - Replace `ApiKeysActions.setApplicationContext` with `EnvironmentsActions.setApplicationContext`
    - Replace `ApiKeysActions.loadApiKeys` with `EnvironmentsActions.loadEnvironments`
    - _Requirements: 2.1_
  
  - [x] 2.3 Update API key operation dispatches
    - Replace `ApiKeysActions.generateApiKey` with `EnvironmentsActions.generateApiKey`
    - Replace `ApiKeysActions.rotateApiKey` with `EnvironmentsActions.rotateApiKey`
    - Replace `ApiKeysActions.revokeApiKey` with `EnvironmentsActions.revokeApiKey`
    - Replace `ApiKeysActions.clearGeneratedKey` with `EnvironmentsActions.clearGeneratedKey`
    - _Requirements: 2.2, 2.3, 2.4, 2.5_

- [x] 3. Migrate EnvironmentDetailPageComponent
  - [x] 3.1 Update imports to use environments store
    - Remove imports from `api-keys` directory
    - Import `EnvironmentsActions` from environments store
    - Import `GeneratedKeyResult` from environments state
    - Update selector imports to use `fromEnvironments`
    - _Requirements: 3.6, 3.7, 6.1_
  
  - [x] 3.2 Update loadData method to use EnvironmentsActions
    - Replace `ApiKeysActions.setApplicationContext` with `EnvironmentsActions.setApplicationContext`
    - Replace `ApiKeysActions.loadApiKeys` with `EnvironmentsActions.loadEnvironments`
    - _Requirements: 3.1_
  
  - [x] 3.3 Update API key operation dispatches
    - Replace `ApiKeysActions.generateApiKey` with `EnvironmentsActions.generateApiKey`
    - Replace `ApiKeysActions.rotateApiKey` with `EnvironmentsActions.rotateApiKey`
    - Replace `ApiKeysActions.revokeApiKey` with `EnvironmentsActions.revokeApiKey`
    - Replace `ApiKeysActions.clearGeneratedKey` with `EnvironmentsActions.clearGeneratedKey`
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

- [x] 4. Checkpoint - Verify compilation and basic functionality
  - Run `npm run build` to verify no TypeScript errors
  - Run `npm run lint` to verify no linting issues
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Deprecate api-keys store files
  - [x] 5.1 Add deprecation notices to api-keys store files
    - Add `@deprecated` JSDoc comment to each file explaining migration to environments store
    - _Requirements: 5.1, 5.2_
  
  - [x] 5.2 Update api-keys index.ts with deprecation warning
    - Add prominent deprecation notice at top of file
    - _Requirements: 5.1_

- [x] 6. Update component test files
  - [x] 6.1 Update ApplicationDetailPageComponent test imports
    - Update spec file to import from environments store
    - Update mock selectors to use environments selectors
    - _Requirements: 2.6, 2.7_
  
  - [x] 6.2 Update EnvironmentDetailPageComponent test imports
    - Update spec file to import from environments store
    - Update mock selectors to use environments selectors
    - _Requirements: 3.6, 3.7_

- [x] 7. Final checkpoint - Run all tests and verify
  - Run `npm test` to verify all tests pass
  - Run `npm run build` to verify production build works
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- The environments store already has all necessary actions, reducers, effects, and selectors
- The migration is primarily import and action name changes
- Test files need to be updated to match the new import paths
- The api-keys store files are kept but deprecated for reference
