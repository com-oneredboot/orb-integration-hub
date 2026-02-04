/**
 * Environments Selectors
 *
 * Selectors for application environments list state management.
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

// Loading state selectors
export const selectIsLoading = createSelector(
  selectEnvironmentsState,
  (state: EnvironmentsState) => state?.isLoading ?? initialEnvironmentsState.isLoading
);

// Error selectors
export const selectError = createSelector(
  selectEnvironmentsState,
  (state: EnvironmentsState) => state?.error ?? initialEnvironmentsState.error
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
  (searchTerm, statusFilter) => !!searchTerm || !!statusFilter
);

// Environment by type selector (memoized)
export const selectEnvironmentRowByType = (environment: string) =>
  createSelector(selectEnvironmentRows, (rows) =>
    rows.find((row) => row.config.environment === environment)
  );
