/**
 * Environment Config Reducer
 *
 * Handles state transitions for environment configuration management.
 *
 * @see .kiro/specs/application-environment-config/design.md
 * _Requirements: 1.1, 2.1, 3.1, 4.1, 8.1_
 */

import { createReducer, on } from '@ngrx/store';
import { EnvironmentConfigActions } from './environment-config.actions';
import { initialEnvironmentConfigState } from './environment-config.state';

export const environmentConfigReducer = createReducer(
  initialEnvironmentConfigState,

  // Set Application Context
  on(EnvironmentConfigActions.setApplicationContext, (state, { applicationId, organizationId }) => ({
    ...state,
    applicationId,
    organizationId,
  })),

  // Load Configs
  on(EnvironmentConfigActions.loadConfigs, (state) => ({
    ...state,
    isLoading: true,
    loadError: null,
  })),

  on(EnvironmentConfigActions.loadConfigsSuccess, (state, { configs }) => ({
    ...state,
    configs,
    isLoading: false,
    loadError: null,
  })),

  on(EnvironmentConfigActions.loadConfigsFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    loadError: error,
  })),

  // Load Single Config
  on(EnvironmentConfigActions.loadConfig, (state) => ({
    ...state,
    isLoading: true,
    loadError: null,
  })),

  on(EnvironmentConfigActions.loadConfigSuccess, (state, { config }) => ({
    ...state,
    selectedConfig: config,
    isLoading: false,
    loadError: null,
  })),

  on(EnvironmentConfigActions.loadConfigFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    loadError: error,
  })),

  // Create Config
  on(EnvironmentConfigActions.createConfig, (state) => ({
    ...state,
    isSaving: true,
    saveError: null,
  })),

  on(EnvironmentConfigActions.createConfigSuccess, (state, { config }) => ({
    ...state,
    configs: [...state.configs, config],
    selectedConfig: config,
    isSaving: false,
    saveError: null,
  })),

  on(EnvironmentConfigActions.createConfigFailure, (state, { error }) => ({
    ...state,
    isSaving: false,
    saveError: error,
  })),

  // Update Config
  on(EnvironmentConfigActions.updateConfig, (state) => ({
    ...state,
    isSaving: true,
    saveError: null,
  })),

  on(EnvironmentConfigActions.updateConfigSuccess, (state, { config }) => ({
    ...state,
    configs: state.configs.map((c) =>
      c.applicationId === config.applicationId && c.environment === config.environment
        ? config
        : c
    ),
    selectedConfig:
      state.selectedConfig?.applicationId === config.applicationId &&
      state.selectedConfig?.environment === config.environment
        ? config
        : state.selectedConfig,
    isSaving: false,
    saveError: null,
  })),

  on(EnvironmentConfigActions.updateConfigFailure, (state, { error }) => ({
    ...state,
    isSaving: false,
    saveError: error,
  })),

  // Add Allowed Origin
  on(EnvironmentConfigActions.addAllowedOrigin, (state) => ({
    ...state,
    isSaving: true,
    saveError: null,
  })),

  on(EnvironmentConfigActions.addAllowedOriginSuccess, (state, { config }) => ({
    ...state,
    configs: state.configs.map((c) =>
      c.applicationId === config.applicationId && c.environment === config.environment
        ? config
        : c
    ),
    selectedConfig:
      state.selectedConfig?.applicationId === config.applicationId &&
      state.selectedConfig?.environment === config.environment
        ? config
        : state.selectedConfig,
    isSaving: false,
    saveError: null,
  })),

  on(EnvironmentConfigActions.addAllowedOriginFailure, (state, { error }) => ({
    ...state,
    isSaving: false,
    saveError: error,
  })),

  // Remove Allowed Origin
  on(EnvironmentConfigActions.removeAllowedOrigin, (state) => ({
    ...state,
    isSaving: true,
    saveError: null,
  })),

  on(EnvironmentConfigActions.removeAllowedOriginSuccess, (state, { config }) => ({
    ...state,
    configs: state.configs.map((c) =>
      c.applicationId === config.applicationId && c.environment === config.environment
        ? config
        : c
    ),
    selectedConfig:
      state.selectedConfig?.applicationId === config.applicationId &&
      state.selectedConfig?.environment === config.environment
        ? config
        : state.selectedConfig,
    isSaving: false,
    saveError: null,
  })),

  on(EnvironmentConfigActions.removeAllowedOriginFailure, (state, { error }) => ({
    ...state,
    isSaving: false,
    saveError: error,
  })),

  // Update Webhook Config
  on(EnvironmentConfigActions.updateWebhookConfig, (state) => ({
    ...state,
    isSaving: true,
    saveError: null,
  })),

  on(EnvironmentConfigActions.updateWebhookConfigSuccess, (state, { config }) => ({
    ...state,
    configs: state.configs.map((c) =>
      c.applicationId === config.applicationId && c.environment === config.environment
        ? config
        : c
    ),
    selectedConfig:
      state.selectedConfig?.applicationId === config.applicationId &&
      state.selectedConfig?.environment === config.environment
        ? config
        : state.selectedConfig,
    isSaving: false,
    saveError: null,
  })),

  on(EnvironmentConfigActions.updateWebhookConfigFailure, (state, { error }) => ({
    ...state,
    isSaving: false,
    saveError: error,
  })),

  // Regenerate Webhook Secret
  on(EnvironmentConfigActions.regenerateWebhookSecret, (state) => ({
    ...state,
    isSaving: true,
    saveError: null,
  })),

  on(EnvironmentConfigActions.regenerateWebhookSecretSuccess, (state) => ({
    ...state,
    isSaving: false,
    saveError: null,
  })),

  on(EnvironmentConfigActions.regenerateWebhookSecretFailure, (state, { error }) => ({
    ...state,
    isSaving: false,
    saveError: error,
  })),

  // Set Feature Flag
  on(EnvironmentConfigActions.setFeatureFlag, (state) => ({
    ...state,
    isSaving: true,
    saveError: null,
  })),

  on(EnvironmentConfigActions.setFeatureFlagSuccess, (state, { config }) => ({
    ...state,
    configs: state.configs.map((c) =>
      c.applicationId === config.applicationId && c.environment === config.environment
        ? config
        : c
    ),
    selectedConfig:
      state.selectedConfig?.applicationId === config.applicationId &&
      state.selectedConfig?.environment === config.environment
        ? config
        : state.selectedConfig,
    isSaving: false,
    saveError: null,
  })),

  on(EnvironmentConfigActions.setFeatureFlagFailure, (state, { error }) => ({
    ...state,
    isSaving: false,
    saveError: error,
  })),

  // Delete Feature Flag
  on(EnvironmentConfigActions.deleteFeatureFlag, (state) => ({
    ...state,
    isSaving: true,
    saveError: null,
  })),

  on(EnvironmentConfigActions.deleteFeatureFlagSuccess, (state, { config }) => ({
    ...state,
    configs: state.configs.map((c) =>
      c.applicationId === config.applicationId && c.environment === config.environment
        ? config
        : c
    ),
    selectedConfig:
      state.selectedConfig?.applicationId === config.applicationId &&
      state.selectedConfig?.environment === config.environment
        ? config
        : state.selectedConfig,
    isSaving: false,
    saveError: null,
  })),

  on(EnvironmentConfigActions.deleteFeatureFlagFailure, (state, { error }) => ({
    ...state,
    isSaving: false,
    saveError: error,
  })),

  // Selection Management
  on(EnvironmentConfigActions.selectConfig, (state, { config }) => ({
    ...state,
    selectedConfig: config,
  })),

  // Filter Management
  on(EnvironmentConfigActions.setSearchTerm, (state, { searchTerm }) => ({
    ...state,
    searchTerm,
  })),

  on(EnvironmentConfigActions.setEnvironmentFilter, (state, { environmentFilter }) => ({
    ...state,
    environmentFilter,
  })),

  // Config Rows Management
  on(EnvironmentConfigActions.updateConfigRows, (state, { configRows }) => ({
    ...state,
    configRows,
  })),

  on(EnvironmentConfigActions.updateFilteredConfigRows, (state, { filteredRows }) => ({
    ...state,
    filteredRows,
  })),

  // Error Management
  on(EnvironmentConfigActions.clearErrors, (state) => ({
    ...state,
    loadError: null,
    saveError: null,
  })),

  on(EnvironmentConfigActions.clearSaveError, (state) => ({
    ...state,
    saveError: null,
  })),

  // UI State Management
  on(EnvironmentConfigActions.setLoading, (state, { isLoading }) => ({
    ...state,
    isLoading,
  })),

  on(EnvironmentConfigActions.setSaving, (state, { isSaving }) => ({
    ...state,
    isSaving,
  })),

  // Reset State
  on(EnvironmentConfigActions.resetState, () => initialEnvironmentConfigState)
);
