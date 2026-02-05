# Requirements Document

## Introduction

This document specifies the requirements for consolidating the `apiKeys` NgRx store into the `environments` store in the Angular frontend. The goal is to eliminate duplicate API calls and data inconsistency by having a single source of truth for both API keys and environment configurations.

## Glossary

- **Environments_Store**: The NgRx store that manages application environment configurations and API keys as a single source of truth
- **ApiKeys_Store**: The legacy NgRx store that separately managed API keys (to be deprecated)
- **Store_Registration**: The process of registering a reducer and effects with the NgRx store in main.ts
- **Action_Dispatch**: The process of sending an action to the NgRx store to trigger state changes
- **Selector**: A function that extracts specific pieces of state from the NgRx store

## Requirements

### Requirement 1: Single Store Registration

**User Story:** As a developer, I want a single store for environments and API keys, so that I can avoid duplicate data and API calls.

#### Acceptance Criteria

1. THE main.ts SHALL register only the `environments` reducer for environment and API key state management
2. THE main.ts SHALL NOT register the `apiKeys` reducer
3. THE main.ts SHALL register only the `EnvironmentsEffects` for environment and API key side effects
4. THE main.ts SHALL NOT register the `ApiKeysEffects`

### Requirement 2: Component Migration - ApplicationDetailPageComponent

**User Story:** As a developer, I want the ApplicationDetailPageComponent to use the environments store exclusively, so that API key operations are consistent with environment data.

#### Acceptance Criteria

1. WHEN the ApplicationDetailPageComponent loads API keys, THE Component SHALL dispatch `EnvironmentsActions.loadEnvironments` instead of `ApiKeysActions.loadApiKeys`
2. WHEN the ApplicationDetailPageComponent generates an API key, THE Component SHALL dispatch `EnvironmentsActions.generateApiKey` instead of `ApiKeysActions.generateApiKey`
3. WHEN the ApplicationDetailPageComponent rotates an API key, THE Component SHALL dispatch `EnvironmentsActions.rotateApiKey` instead of `ApiKeysActions.rotateApiKey`
4. WHEN the ApplicationDetailPageComponent revokes an API key, THE Component SHALL dispatch `EnvironmentsActions.revokeApiKey` instead of `ApiKeysActions.revokeApiKey`
5. WHEN the ApplicationDetailPageComponent clears a generated key, THE Component SHALL dispatch `EnvironmentsActions.clearGeneratedKey` instead of `ApiKeysActions.clearGeneratedKey`
6. THE ApplicationDetailPageComponent SHALL import selectors from `environments.selectors` instead of `api-keys.selectors`
7. THE ApplicationDetailPageComponent SHALL NOT import from the `api-keys` store directory

### Requirement 3: Component Migration - EnvironmentDetailPageComponent

**User Story:** As a developer, I want the EnvironmentDetailPageComponent to use the environments store exclusively, so that API key operations are consistent with environment data.

#### Acceptance Criteria

1. WHEN the EnvironmentDetailPageComponent loads API keys, THE Component SHALL dispatch `EnvironmentsActions.loadEnvironments` instead of `ApiKeysActions.loadApiKeys`
2. WHEN the EnvironmentDetailPageComponent generates an API key, THE Component SHALL dispatch `EnvironmentsActions.generateApiKey` instead of `ApiKeysActions.generateApiKey`
3. WHEN the EnvironmentDetailPageComponent rotates an API key, THE Component SHALL dispatch `EnvironmentsActions.rotateApiKey` instead of `ApiKeysActions.rotateApiKey`
4. WHEN the EnvironmentDetailPageComponent revokes an API key, THE Component SHALL dispatch `EnvironmentsActions.revokeApiKey` instead of `ApiKeysActions.revokeApiKey`
5. WHEN the EnvironmentDetailPageComponent clears a generated key, THE Component SHALL dispatch `EnvironmentsActions.clearGeneratedKey` instead of `ApiKeysActions.clearGeneratedKey`
6. THE EnvironmentDetailPageComponent SHALL import selectors from `environments.selectors` instead of `api-keys.selectors`
7. THE EnvironmentDetailPageComponent SHALL NOT import from the `api-keys` store directory

### Requirement 4: Environments Store Completeness

**User Story:** As a developer, I want the environments store to have all necessary actions and selectors, so that it can fully replace the apiKeys store.

#### Acceptance Criteria

1. THE Environments_Store SHALL expose a `selectApiKeys` selector that returns all API keys for the current application
2. THE Environments_Store SHALL expose a `selectIsGenerating` selector for API key generation loading state
3. THE Environments_Store SHALL expose a `selectIsRevoking` selector for API key revocation loading state
4. THE Environments_Store SHALL expose a `selectGeneratedKey` selector for newly generated key data
5. THE Environments_Store SHALL support the `setApplicationContext` action to set application and organization IDs
6. THE Environments_Store SHALL support the `loadEnvironments` action to load both configs and API keys

### Requirement 5: Legacy Store Deprecation

**User Story:** As a developer, I want the legacy apiKeys store files to be clearly marked as deprecated, so that future developers know not to use them.

#### Acceptance Criteria

1. THE api-keys store directory SHALL be deleted or marked as deprecated with clear documentation
2. IF the api-keys store files are retained, THEN each file SHALL include a deprecation notice at the top
3. THE api-keys store SHALL NOT be imported by any active component after migration

### Requirement 6: Type Compatibility

**User Story:** As a developer, I want the environments store to use compatible types, so that components can migrate without type errors.

#### Acceptance Criteria

1. THE Environments_Store SHALL export the `GeneratedKeyResult` type from `environments.state.ts`
2. THE Environments_Store SHALL export the `RegeneratedKeyResult` type from `environments.state.ts`
3. THE types exported from Environments_Store SHALL be compatible with the types previously exported from ApiKeys_Store
