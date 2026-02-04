/**
 * Environment Config Selectors
 *
 * Selectors for application environment configuration state management.
 * Follows the same patterns as ApiKeysSelectors.
 *
 * @see .kiro/specs/application-environment-config/design.md
 * _Requirements: 1.1, 2.1, 3.1, 4.1, 8.1_
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { EnvironmentConfigState, initialEnvironmentConfigState } from './environment-config.state';
import { Environment } from '../../../../../core/enums/EnvironmentEnum';

// Feature selector
export const selectEnvironmentConfigState =
  createFeatureSelector<EnvironmentConfigState>('environmentConfig');

// Core data selectors
export const selectConfigs = createSelector(
  selectEnvironmentConfigState,
  (state: EnvironmentConfigState) => state?.configs ?? initialEnvironmentConfigState.configs
);

export const selectSelectedConfig = createSelector(
  selectEnvironmentConfigState,
  (state: EnvironmentConfigState) =>
    state?.selectedConfig ?? initialEnvironmentConfigState.selectedConfig
);

export const selectApplicationId = createSelector(
  selectEnvironmentConfigState,
  (state: EnvironmentConfigState) =>
    state?.applicationId ?? initialEnvironmentConfigState.applicationId
);

export const selectOrganizationId = createSelector(
  selectEnvironmentConfigState,
  (state: EnvironmentConfigState) =>
    state?.organizationId ?? initialEnvironmentConfigState.organizationId
);

// Table display selectors
export const selectConfigRows = createSelector(
  selectEnvironmentConfigState,
  (state: EnvironmentConfigState) =>
    state?.configRows ?? initialEnvironmentConfigState.configRows
);

export const selectFilteredConfigRows = createSelector(
  selectEnvironmentConfigState,
  (state: EnvironmentConfigState) =>
    state?.filteredRows ?? initialEnvironmentConfigState.filteredRows
);

// Filter selectors
export const selectSearchTerm = createSelector(
  selectEnvironmentConfigState,
  (state: EnvironmentConfigState) =>
    state?.searchTerm ?? initialEnvironmentConfigState.searchTerm
);

export const selectEnvironmentFilter = createSelector(
  selectEnvironmentConfigState,
  (state: EnvironmentConfigState) =>
    state?.environmentFilter ?? initialEnvironmentConfigState.environmentFilter
);

// Loading state selectors
export const selectIsLoading = createSelector(
  selectEnvironmentConfigState,
  (state: EnvironmentConfigState) =>
    state?.isLoading ?? initialEnvironmentConfigState.isLoading
);

export const selectIsSaving = createSelector(
  selectEnvironmentConfigState,
  (state: EnvironmentConfigState) =>
    state?.isSaving ?? initialEnvironmentConfigState.isSaving
);

// Error selectors
export const selectLoadError = createSelector(
  selectEnvironmentConfigState,
  (state: EnvironmentConfigState) =>
    state?.loadError ?? initialEnvironmentConfigState.loadError
);

export const selectSaveError = createSelector(
  selectEnvironmentConfigState,
  (state: EnvironmentConfigState) =>
    state?.saveError ?? initialEnvironmentConfigState.saveError
);

// Computed selectors
export const selectHasConfigs = createSelector(
  selectConfigs,
  (configs) => configs.length > 0
);

export const selectConfigCount = createSelector(
  selectConfigs,
  (configs) => configs.length
);

export const selectFilteredConfigCount = createSelector(
  selectFilteredConfigRows,
  (filteredRows) => filteredRows.length
);

export const selectHasFiltersApplied = createSelector(
  selectSearchTerm,
  selectEnvironmentFilter,
  (searchTerm, environmentFilter) => !!searchTerm || !!environmentFilter
);

export const selectIsAnyOperationInProgress = createSelector(
  selectIsLoading,
  selectIsSaving,
  (isLoading, isSaving) => isLoading || isSaving
);

export const selectHasAnyError = createSelector(
  selectLoadError,
  selectSaveError,
  (loadError, saveError) => !!loadError || !!saveError
);

// Config by environment selector (memoized)
export const selectConfigByEnvironment = (environment: Environment) =>
  createSelector(selectConfigs, (configs) =>
    configs.find((c) => c.environment === environment)
  );

// Selected config derived selectors
export const selectSelectedConfigAllowedOrigins = createSelector(
  selectSelectedConfig,
  (config) => config?.allowedOrigins ?? []
);

export const selectSelectedConfigAllowedOriginsCount = createSelector(
  selectSelectedConfigAllowedOrigins,
  (origins) => origins.length
);

export const selectSelectedConfigRateLimits = createSelector(
  selectSelectedConfig,
  (config) => ({
    perMinute: config?.rateLimitPerMinute ?? 0,
    perDay: config?.rateLimitPerDay ?? 0,
  })
);

export const selectSelectedConfigWebhookConfig = createSelector(
  selectSelectedConfig,
  (config) => ({
    url: config?.webhookUrl ?? '',
    secret: config?.webhookSecret ?? '',
    events: config?.webhookEvents ?? [],
    enabled: config?.webhookEnabled ?? false,
    maxRetries: config?.webhookMaxRetries ?? 3,
    retryDelaySeconds: config?.webhookRetryDelaySeconds ?? 60,
  })
);

export const selectSelectedConfigFeatureFlags = createSelector(
  selectSelectedConfig,
  (config) => config?.featureFlags ?? {}
);

export const selectSelectedConfigFeatureFlagsCount = createSelector(
  selectSelectedConfigFeatureFlags,
  (flags) => Object.keys(flags).length
);

export const selectSelectedConfigFeatureFlagKeys = createSelector(
  selectSelectedConfigFeatureFlags,
  (flags) => Object.keys(flags)
);

// Feature flag by key selector
export const selectFeatureFlagByKey = (key: string) =>
  createSelector(selectSelectedConfigFeatureFlags, (flags) => flags[key]);

// Configs by environment type
export const selectProductionConfig = createSelector(selectConfigs, (configs) =>
  configs.find((c) => c.environment === Environment.Production)
);

export const selectStagingConfig = createSelector(selectConfigs, (configs) =>
  configs.find((c) => c.environment === Environment.Staging)
);

export const selectDevelopmentConfig = createSelector(selectConfigs, (configs) =>
  configs.find((c) => c.environment === Environment.Development)
);

// Environment availability selectors
export const selectAvailableEnvironments = createSelector(selectConfigs, (configs) =>
  configs.map((c) => c.environment)
);

export const selectMissingEnvironments = createSelector(
  selectAvailableEnvironments,
  (available) => {
    const allEnvironments = [
      Environment.Production,
      Environment.Staging,
      Environment.Development,
    ];
    return allEnvironments.filter((env) => !available.includes(env));
  }
);
