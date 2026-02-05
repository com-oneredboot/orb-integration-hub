/**
 * @deprecated This file is deprecated. Use the environments store instead.
 * The API keys functionality has been consolidated into the environments store.
 * Import from '../../store/environments/environments.selectors' instead.
 *
 * API Keys Selectors
 *
 * Selectors for application API key state management.
 * Follows the same patterns as GroupsSelectors.
 *
 * @see .kiro/specs/application-access-management/design.md
 * @see .kiro/specs/store-consolidation/requirements.md - Requirements 5.1, 5.2
 * _Requirements: 9.1, 9.5_
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ApiKeysState, initialApiKeysState } from './api-keys.state';

// Feature selector
export const selectApiKeysState = createFeatureSelector<ApiKeysState>('apiKeys');

// Core data selectors
export const selectApiKeys = createSelector(
  selectApiKeysState,
  (state: ApiKeysState) => state?.apiKeys ?? initialApiKeysState.apiKeys
);

export const selectApiKeyRows = createSelector(
  selectApiKeysState,
  (state: ApiKeysState) => state?.apiKeyRows ?? initialApiKeysState.apiKeyRows
);

export const selectSelectedApiKey = createSelector(
  selectApiKeysState,
  (state: ApiKeysState) =>
    state?.selectedApiKey ?? initialApiKeysState.selectedApiKey
);

export const selectCurrentApplicationId = createSelector(
  selectApiKeysState,
  (state: ApiKeysState) =>
    state?.currentApplicationId ?? initialApiKeysState.currentApplicationId
);

export const selectCurrentOrganizationId = createSelector(
  selectApiKeysState,
  (state: ApiKeysState) =>
    state?.currentOrganizationId ?? initialApiKeysState.currentOrganizationId
);

// Generated key selector
export const selectGeneratedKey = createSelector(
  selectApiKeysState,
  (state: ApiKeysState) =>
    state?.generatedKey ?? initialApiKeysState.generatedKey
);

// Regenerated key result selector
export const selectRegeneratedKeyResult = createSelector(
  selectApiKeysState,
  (state: ApiKeysState) =>
    state?.regeneratedKeyResult ?? initialApiKeysState.regeneratedKeyResult
);

// Filter selectors
export const selectSearchTerm = createSelector(
  selectApiKeysState,
  (state: ApiKeysState) => state?.searchTerm ?? initialApiKeysState.searchTerm
);

export const selectStatusFilter = createSelector(
  selectApiKeysState,
  (state: ApiKeysState) => state?.statusFilter ?? initialApiKeysState.statusFilter
);

export const selectEnvironmentFilter = createSelector(
  selectApiKeysState,
  (state: ApiKeysState) =>
    state?.environmentFilter ?? initialApiKeysState.environmentFilter
);

// Filtered API keys selector (from state, computed by reducer)
export const selectFilteredApiKeyRows = createSelector(
  selectApiKeysState,
  (state: ApiKeysState) =>
    state?.filteredApiKeyRows ?? initialApiKeysState.filteredApiKeyRows
);

// Loading state selectors
export const selectIsLoading = createSelector(
  selectApiKeysState,
  (state: ApiKeysState) => state?.isLoading ?? initialApiKeysState.isLoading
);

export const selectIsGenerating = createSelector(
  selectApiKeysState,
  (state: ApiKeysState) => state?.isGenerating ?? initialApiKeysState.isGenerating
);

export const selectIsRotating = createSelector(
  selectApiKeysState,
  (state: ApiKeysState) => state?.isRotating ?? initialApiKeysState.isRotating
);

export const selectIsRevoking = createSelector(
  selectApiKeysState,
  (state: ApiKeysState) => state?.isRevoking ?? initialApiKeysState.isRevoking
);

// Regenerating state selector
export const selectIsRegenerating = createSelector(
  selectApiKeysState,
  (state: ApiKeysState) => state?.isRegenerating ?? initialApiKeysState.isRegenerating
);

// Error selectors
export const selectError = createSelector(
  selectApiKeysState,
  (state: ApiKeysState) => state?.error ?? initialApiKeysState.error
);

export const selectGenerateError = createSelector(
  selectApiKeysState,
  (state: ApiKeysState) =>
    state?.generateError ?? initialApiKeysState.generateError
);

export const selectRotateError = createSelector(
  selectApiKeysState,
  (state: ApiKeysState) => state?.rotateError ?? initialApiKeysState.rotateError
);

export const selectRevokeError = createSelector(
  selectApiKeysState,
  (state: ApiKeysState) => state?.revokeError ?? initialApiKeysState.revokeError
);

// Operation result selectors
export const selectLastGeneratedKey = createSelector(
  selectApiKeysState,
  (state: ApiKeysState) =>
    state?.lastGeneratedKey ?? initialApiKeysState.lastGeneratedKey
);

export const selectLastRotatedKey = createSelector(
  selectApiKeysState,
  (state: ApiKeysState) =>
    state?.lastRotatedKey ?? initialApiKeysState.lastRotatedKey
);

export const selectLastRevokedKeyId = createSelector(
  selectApiKeysState,
  (state: ApiKeysState) =>
    state?.lastRevokedKeyId ?? initialApiKeysState.lastRevokedKeyId
);

// Computed selectors
export const selectHasApiKeys = createSelector(
  selectApiKeys,
  (apiKeys) => apiKeys.length > 0
);

export const selectApiKeyCount = createSelector(
  selectApiKeys,
  (apiKeys) => apiKeys.length
);

export const selectFilteredApiKeyCount = createSelector(
  selectFilteredApiKeyRows,
  (filteredRows) => filteredRows.length
);

export const selectHasFiltersApplied = createSelector(
  selectSearchTerm,
  selectStatusFilter,
  selectEnvironmentFilter,
  (searchTerm, statusFilter, environmentFilter) =>
    !!searchTerm || !!statusFilter || !!environmentFilter
);

export const selectIsAnyOperationInProgress = createSelector(
  selectIsLoading,
  selectIsGenerating,
  selectIsRotating,
  selectIsRevoking,
  (isLoading, isGenerating, isRotating, isRevoking) =>
    isLoading || isGenerating || isRotating || isRevoking
);

export const selectHasAnyError = createSelector(
  selectError,
  selectGenerateError,
  selectRotateError,
  selectRevokeError,
  (error, generateError, rotateError, revokeError) =>
    !!error || !!generateError || !!rotateError || !!revokeError
);

// API key by ID selector (memoized)
export const selectApiKeyById = (apiKeyId: string) =>
  createSelector(selectApiKeys, (apiKeys) =>
    apiKeys.find((k) => k.applicationApiKeyId === apiKeyId)
  );

// API key row by ID selector (memoized)
export const selectApiKeyRowById = (apiKeyId: string) =>
  createSelector(selectApiKeyRows, (apiKeyRows) =>
    apiKeyRows.find((row) => row.apiKey.applicationApiKeyId === apiKeyId)
  );

// Active API keys count
export const selectActiveApiKeyCount = createSelector(selectApiKeys, (apiKeys) =>
  apiKeys.filter((k) => k.status === 'ACTIVE').length
);

// API keys by environment selector
export const selectApiKeysByEnvironment = (environment: string) =>
  createSelector(selectApiKeys, (apiKeys) =>
    apiKeys.filter((k) => k.environment === environment)
  );
