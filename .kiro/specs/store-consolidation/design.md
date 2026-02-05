# Design Document: Store Consolidation

## Overview

This design describes the consolidation of the `apiKeys` NgRx store into the `environments` store. The `environments` store will become the single source of truth for both environment configurations and API keys, eliminating duplicate API calls and data inconsistency.

The consolidation involves:
1. Updating `main.ts` to remove `apiKeys` store registration
2. Migrating `ApplicationDetailPageComponent` to use `EnvironmentsActions`
3. Migrating `EnvironmentDetailPageComponent` to use `EnvironmentsActions`
4. Deprecating/removing the `api-keys` store directory

## Architecture

The consolidated architecture follows the existing NgRx store pattern:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Components                                │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐ │
│  │ ApplicationDetail   │    │ EnvironmentDetailPage           │ │
│  │ PageComponent       │    │ Component                       │ │
│  └──────────┬──────────┘    └──────────────┬──────────────────┘ │
│             │                              │                     │
│             ▼                              ▼                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              EnvironmentsActions                          │   │
│  │  - loadEnvironments                                       │   │
│  │  - generateApiKey / rotateApiKey / revokeApiKey          │   │
│  │  - setApplicationContext                                  │   │
│  │  - clearGeneratedKey                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              EnvironmentsEffects                          │   │
│  │  - loadEnvironments$ → ApiKeyService                      │   │
│  │  - generateApiKey$ → ApiKeyService                        │   │
│  │  - rotateApiKey$ → ApiKeyService                          │   │
│  │  - revokeApiKey$ → ApiKeyService                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              EnvironmentsState                            │   │
│  │  - configs: IApplicationEnvironmentConfig[]               │   │
│  │  - apiKeys: IApplicationApiKeys[]                         │   │
│  │  - generatedKey: GeneratedKeyResult | null                │   │
│  │  - isGenerating, isRevoking, isRotating                   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### main.ts Changes

**Before:**
```typescript
provideStore({ 
  user: userReducer,
  organizations: organizationsReducer,
  applications: applicationsReducer,
  apiKeys: apiKeysReducer,        // REMOVE
  environments: environmentsReducer
}),
provideEffects([
  UserEffects, 
  OrganizationsEffects, 
  ApplicationsEffects, 
  ApiKeysEffects,                 // REMOVE
  EnvironmentsEffects
]),
```

**After:**
```typescript
provideStore({ 
  user: userReducer,
  organizations: organizationsReducer,
  applications: applicationsReducer,
  environments: environmentsReducer
}),
provideEffects([
  UserEffects, 
  OrganizationsEffects, 
  ApplicationsEffects, 
  EnvironmentsEffects
]),
```

### ApplicationDetailPageComponent Migration

**Import Changes:**
```typescript
// REMOVE these imports:
// import { ApiKeysActions } from '../../store/api-keys/api-keys.actions';
// import * as fromApiKeys from '../../store/api-keys/api-keys.selectors';
// import { GeneratedKeyResult } from '../../store/api-keys/api-keys.state';

// KEEP/USE these imports:
import { EnvironmentsActions } from '../../store/environments/environments.actions';
import * as fromEnvironments from '../../store/environments/environments.selectors';
import { GeneratedKeyResult } from '../../store/environments/environments.state';
```

**Action Dispatch Changes:**

| Old Action | New Action |
|------------|------------|
| `ApiKeysActions.setApplicationContext` | `EnvironmentsActions.setApplicationContext` |
| `ApiKeysActions.loadApiKeys` | `EnvironmentsActions.loadEnvironments` |
| `ApiKeysActions.generateApiKey` | `EnvironmentsActions.generateApiKey` |
| `ApiKeysActions.rotateApiKey` | `EnvironmentsActions.rotateApiKey` |
| `ApiKeysActions.revokeApiKey` | `EnvironmentsActions.revokeApiKey` |
| `ApiKeysActions.clearGeneratedKey` | `EnvironmentsActions.clearGeneratedKey` |

### EnvironmentDetailPageComponent Migration

Same pattern as ApplicationDetailPageComponent - replace all `ApiKeysActions` with `EnvironmentsActions`.

### Selector Mapping

| Old Selector | New Selector |
|--------------|--------------|
| `fromApiKeys.selectApiKeys` | `fromEnvironments.selectApiKeys` |
| `fromApiKeys.selectIsGenerating` | `fromEnvironments.selectIsGenerating` |
| `fromApiKeys.selectIsRevoking` | `fromEnvironments.selectIsRevoking` |
| `fromApiKeys.selectGeneratedKey` | `fromEnvironments.selectGeneratedKey` |

## Data Models

The `environments` store already contains all necessary types. No new types are needed.

**Existing Types in environments.state.ts:**
- `GeneratedKeyResult` - Result of key generation with full key value
- `RegeneratedKeyResult` - Result of key regeneration with old and new keys
- `EnvironmentsState` - Complete state including `apiKeys: IApplicationApiKeys[]`

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: No ApiKeys Store Imports in Components

*For any* TypeScript component file in the applications feature directory (excluding test and spec files), there SHALL be zero import statements containing the path `api-keys`.

**Validates: Requirements 2.7, 3.7, 5.3**

This property ensures complete migration - if any component still imports from the api-keys store, the migration is incomplete.

## Error Handling

### Migration Errors

If a component still references `ApiKeysActions` after migration:
- TypeScript compilation will fail with "Cannot find name 'ApiKeysActions'"
- This is the desired behavior to catch incomplete migrations

### Runtime Errors

If the `apiKeys` store is not registered but a component tries to select from it:
- The selector will return `undefined` or the initial state
- The environments store selectors should be used instead

### Rollback Strategy

If issues are discovered after migration:
1. Re-add `apiKeysReducer` and `ApiKeysEffects` to main.ts
2. Revert component changes
3. Both stores can coexist temporarily during debugging

## Testing Strategy

### Unit Tests

Unit tests should verify:
- Components dispatch correct `EnvironmentsActions` instead of `ApiKeysActions`
- Selectors return expected data from environments state
- No imports from `api-keys` directory in migrated components

### Property Tests

Property tests should verify:
- **Property 1**: Static analysis of main.ts to verify single store registration
- **Property 2**: Static analysis of component files to verify action sources
- **Property 3**: Static analysis to verify no api-keys imports

### Integration Tests

Integration tests should verify:
- API key generation works through environments store
- API key rotation works through environments store
- API key revocation works through environments store
- Loading environments loads both configs and API keys

### Test Configuration

- Use Jest for unit and property tests
- Mock the NgRx store in component tests
- Verify action dispatches using `store.dispatch` spy
