/**
 * Environments Selectors
 *
 * Selectors for application environments state management.
 * This is the single source of truth for both environment configs AND API keys.
 * Follows the Organizations store pattern as the canonical reference.
 *
 * @see .kiro/specs/environments-list-and-detail/design.md
 * _Requirements: 2.1_
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { EnvironmentsState, initialEnvironmentsState } from './environments.state';

// Feature selector
export const selectEnvironmentsState =
  createFeatureSelector<EnvironmentsState>('environments');

// Core data selectors
export const selectConfigs = createSelector(
  selectEnvironmentsState,
  (state: EnvironmentsState) => state?.configs ?? initialEnvironmentsState.configs
);

export const selectApiKeys = createSelector(
  selectEnvironmentsState,
  (state: EnvironmentsState) => state?.apiKeys ?? initialEnvironmentsState.apiKeys
);

export const selectEnvironmentRows = createSelector(
  selectEnvironmentsState,
  (state: EnvironmentsState) =>
    state?.environmentRows ?? initialEnvironmentsState.environmentRows
);

export const selectFilteredEnvironmentRows = createSelector(
  selectEnvironmentsState,
  (state: EnvironmentsState) =>
    state?.filteredEnvironmentRows ?? initialEnvironmentsState.filteredEnvironmentRows
);

export const selectSelectedApiKey = createSelector(
  selectEnvironmentsState,
  (state: EnvironmentsState) =>
    state?.selectedApiKey ?? initialEnvironmentsState.selectedApiKey
);

// Context selectors
export const selectApplicationId = createSelector(
  selectEnvironmentsState,
  (state: EnvironmentsState) =>
    state?.applicationId ?? initialEnvironmentsState.applicationId
);

export const selectOrganizationId = createSelector(
  selectEnvironmentsState,
  (state: EnvironmentsState) =>
    state?.organizationId ?? initialEnvironmentsState.organizationId
);

// Generated key selectors
export const selectGeneratedKey = createSelector(
  selectEnvironmentsState,
  (state: EnvironmentsState) =>
    state?.generatedKey ?? initialEnvironmentsState.generatedKey
);

export const selectRegeneratedKeyResult = createSelector(
  selectEnvironmentsState,
  (state: EnvironmentsState) =>
    state?.regeneratedKeyResult ?? initialEnvironmentsState.regeneratedKeyResult
);

// Filter selectors
export const selectSearchTerm = createSelector(
  selectEnvironmentsState,
  (state: EnvironmentsState) => state?.searchTerm ?? initialEnvironmentsState.searchTerm
);

export const selectStatusFilter = createSelector(
  selectEnvironmentsState,
  (state: EnvironmentsState) =>
    state?.statusFilter ?? initialEnvironmentsState.statusFilter
);

export const selectEnvironmentFilter = createSelector(
  selectEnvironmentsState,
  (state: EnvironmentsState) =>
    state?.environmentFilter ?? initialEnvironmentsState.environmentFilter
);

// Loading state selectors
export const selectIsLoading = createSelector(
  selectEnvironmentsState,
  (state: EnvironmentsState) => state?.isLoading ?? initialEnvironmentsState.isLoading
);

export const selectIsGenerating = createSelector(
  selectEnvironmentsState,
  (state: EnvironmentsState) => state?.isGenerating ?? initialEnvironmentsState.isGenerating
);

export const selectIsRegenerating = createSelector(
  selectEnvironmentsState,
  (state: EnvironmentsState) => state?.isRegenerating ?? initialEnvironmentsState.isRegenerating
);

export const selectIsRotating = createSelector(
  selectEnvironmentsState,
  (state: EnvironmentsState) => state?.isRotating ?? initialEnvironmentsState.isRotating
);

export const selectIsRevoking = createSelector(
  selectEnvironmentsState,
  (state: EnvironmentsState) => state?.isRevoking ?? initialEnvironmentsState.isRevoking
);

// Error selectors
export const selectError = createSelector(
  selectEnvironmentsState,
  (state: EnvironmentsState) => state?.error ?? initialEnvironmentsState.error
);

export const selectGenerateError = createSelector(
  selectEnvironmentsState,
  (state: EnvironmentsState) => state?.generateError ?? initialEnvironmentsState.generateError
);

export const selectRegenerateError = createSelector(
  selectEnvironmentsState,
  (state: EnvironmentsState) => state?.regenerateError ?? initialEnvironmentsState.regenerateError
);

export const selectRotateError = createSelector(
  selectEnvironmentsState,
  (state: EnvironmentsState) => state?.rotateError ?? initialEnvironmentsState.rotateError
);

export const selectRevokeError = createSelector(
  selectEnvironmentsState,
  (state: EnvironmentsState) => state?.revokeError ?? initialEnvironmentsState.revokeError
);

// Computed selectors
export const selectHasEnvironments = createSelector(
  selectEnvironmentRows,
  (rows) => rows.length > 0
);

export const selectEnvironmentCount = createSelector(
  selectEnvironmentRows,
  (rows) => rows.length
);

export const selectFilteredEnvironmentCount = createSelector(
  selectFilteredEnvironmentRows,
  (filteredRows) => filteredRows.length
);

export const selectHasFiltersApplied = createSelector(
  selectSearchTerm,
  selectStatusFilter,
  selectEnvironmentFilter,
  (searchTerm, statusFilter, environmentFilter) => !!searchTerm || !!statusFilter || !!environmentFilter
);

// Environment by type selector (memoized)
export const selectEnvironmentRowByType = (environment: string) =>
  createSelector(selectEnvironmentRows, (rows) =>
    rows.find((row) => row.config.environment === environment)
  );

// API key by environment selector
export const selectApiKeyByEnvironment = (environment: string) =>
  createSelector(selectApiKeys, (apiKeys) =>
    apiKeys.find((key) => key.environment === environment)
  );
