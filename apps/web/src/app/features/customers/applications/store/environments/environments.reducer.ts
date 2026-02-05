/**
 * Environments Reducer
 *
 * Handles state changes for application environments management.
 * This is the single source of truth for both environment configs AND API keys.
 * Follows the Organizations store pattern as the canonical reference.
 *
 * @see .kiro/specs/environments-list-and-detail/design.md
 * _Requirements: 2.5, 4.1, 4.2, 4.3, 4.4, 4.5_
 */

import { createReducer, on } from '@ngrx/store';
import { EnvironmentsActions } from './environments.actions';
import {
  EnvironmentsState,
  initialEnvironmentsState,
  EnvironmentTableRow,
  EnvironmentStatus,
} from './environments.state';
import { IApplicationEnvironmentConfig } from '../../../../../core/models/ApplicationEnvironmentConfigModel';
import { IApplicationApiKeys } from '../../../../../core/models/ApplicationApiKeysModel';
import { Environment } from '../../../../../core/enums/EnvironmentEnum';
import { ApplicationApiKeyStatus } from '../../../../../core/enums/ApplicationApiKeyStatusEnum';

export const environmentsReducer = createReducer(
  initialEnvironmentsState,

  // Set Application Context
  on(
    EnvironmentsActions.setApplicationContext,
    (state, { applicationId, organizationId }): EnvironmentsState => ({
      ...state,
      applicationId,
      organizationId,
    })
  ),

  // Load Environments
  on(
    EnvironmentsActions.loadEnvironments,
    (state): EnvironmentsState => ({
      ...state,
      isLoading: true,
      error: null,
    })
  ),

  on(
    EnvironmentsActions.loadEnvironmentsSuccess,
    (state, { configs, apiKeys }): EnvironmentsState => {
      const environmentRows = buildEnvironmentRows(configs, apiKeys);

      return {
        ...state,
        isLoading: false,
        configs,
        apiKeys,
        environmentRows,
        filteredEnvironmentRows: applyAllFilters(environmentRows, state.searchTerm, state.statusFilter, state.environmentFilter),
        error: null,
      };
    }
  ),

  on(
    EnvironmentsActions.loadEnvironmentsFailure,
    (state, { error }): EnvironmentsState => ({
      ...state,
      isLoading: false,
      error,
    })
  ),

  // Generate API Key
  on(
    EnvironmentsActions.generateApiKey,
    (state): EnvironmentsState => ({
      ...state,
      isGenerating: true,
      generateError: null,
      generatedKey: null,
    })
  ),

  on(
    EnvironmentsActions.generateApiKeySuccess,
    (state, { apiKey, generatedKey }): EnvironmentsState => {
      const updatedApiKeys = [...state.apiKeys, apiKey];
      const environmentRows = buildEnvironmentRows(state.configs, updatedApiKeys);

      return {
        ...state,
        isGenerating: false,
        apiKeys: updatedApiKeys,
        environmentRows,
        filteredEnvironmentRows: applyAllFilters(environmentRows, state.searchTerm, state.statusFilter, state.environmentFilter),
        generatedKey: generatedKey,
        generateError: null,
      };
    }
  ),

  on(
    EnvironmentsActions.generateApiKeyFailure,
    (state, { error }): EnvironmentsState => ({
      ...state,
      isGenerating: false,
      generateError: error,
    })
  ),

  // Rotate API Key
  on(
    EnvironmentsActions.rotateApiKey,
    (state): EnvironmentsState => ({
      ...state,
      isRotating: true,
      rotateError: null,
      generatedKey: null,
    })
  ),

  on(
    EnvironmentsActions.rotateApiKeySuccess,
    (state, { apiKey, newKey }): EnvironmentsState => {
      const updatedApiKeys = state.apiKeys.map((k) =>
        k.applicationApiKeyId === apiKey.applicationApiKeyId ? apiKey : k
      );
      const environmentRows = buildEnvironmentRows(state.configs, updatedApiKeys);

      return {
        ...state,
        isRotating: false,
        apiKeys: updatedApiKeys,
        environmentRows,
        filteredEnvironmentRows: applyAllFilters(environmentRows, state.searchTerm, state.statusFilter, state.environmentFilter),
        generatedKey: newKey,
        rotateError: null,
      };
    }
  ),

  on(
    EnvironmentsActions.rotateApiKeyFailure,
    (state, { error }): EnvironmentsState => ({
      ...state,
      isRotating: false,
      rotateError: error,
    })
  ),

  // Regenerate API Key
  on(
    EnvironmentsActions.regenerateApiKey,
    (state): EnvironmentsState => ({
      ...state,
      isRegenerating: true,
      regenerateError: null,
      regeneratedKeyResult: null,
    })
  ),

  on(
    EnvironmentsActions.regenerateApiKeySuccess,
    (state, { oldKey, newKey, regeneratedKeyResult }): EnvironmentsState => {
      // Update the old key to ROTATING status and add the new key
      let updatedApiKeys = state.apiKeys.map((k) =>
        k.applicationApiKeyId === oldKey.applicationApiKeyId ? oldKey : k
      );
      updatedApiKeys = [...updatedApiKeys, newKey];
      const environmentRows = buildEnvironmentRows(state.configs, updatedApiKeys);

      return {
        ...state,
        isRegenerating: false,
        apiKeys: updatedApiKeys,
        environmentRows,
        filteredEnvironmentRows: applyAllFilters(environmentRows, state.searchTerm, state.statusFilter, state.environmentFilter),
        regeneratedKeyResult: regeneratedKeyResult,
        generatedKey: {
          apiKeyId: newKey.applicationApiKeyId,
          fullKey: regeneratedKeyResult.newKeyFullValue,
          environment: newKey.environment,
          keyPrefix: newKey.keyPrefix,
        },
        regenerateError: null,
      };
    }
  ),

  on(
    EnvironmentsActions.regenerateApiKeyFailure,
    (state, { error }): EnvironmentsState => ({
      ...state,
      isRegenerating: false,
      regenerateError: error,
    })
  ),

  // Clear Regenerated Key Result
  on(
    EnvironmentsActions.clearRegeneratedKeyResult,
    (state): EnvironmentsState => ({
      ...state,
      regeneratedKeyResult: null,
    })
  ),

  // Revoke API Key
  on(
    EnvironmentsActions.revokeApiKey,
    (state): EnvironmentsState => ({
      ...state,
      isRevoking: true,
      revokeError: null,
    })
  ),

  on(
    EnvironmentsActions.revokeApiKeySuccess,
    (state, { apiKeyId, revokedKey }): EnvironmentsState => {
      const updatedApiKeys = state.apiKeys.map((k) =>
        k.applicationApiKeyId === apiKeyId ? revokedKey : k
      );
      const environmentRows = buildEnvironmentRows(state.configs, updatedApiKeys);

      return {
        ...state,
        isRevoking: false,
        apiKeys: updatedApiKeys,
        environmentRows,
        filteredEnvironmentRows: applyAllFilters(environmentRows, state.searchTerm, state.statusFilter, state.environmentFilter),
        selectedApiKey:
          state.selectedApiKey?.applicationApiKeyId === apiKeyId
            ? null
            : state.selectedApiKey,
        revokeError: null,
      };
    }
  ),

  on(
    EnvironmentsActions.revokeApiKeyFailure,
    (state, { error }): EnvironmentsState => ({
      ...state,
      isRevoking: false,
      revokeError: error,
    })
  ),

  // Selection Management
  on(
    EnvironmentsActions.selectApiKey,
    (state, { apiKey }): EnvironmentsState => ({
      ...state,
      selectedApiKey: apiKey,
    })
  ),

  // Clear Generated Key
  on(
    EnvironmentsActions.clearGeneratedKey,
    (state): EnvironmentsState => ({
      ...state,
      generatedKey: null,
    })
  ),

  // Filter Management
  on(
    EnvironmentsActions.setSearchTerm,
    (state, { searchTerm }): EnvironmentsState => {
      const filteredRows = applyAllFilters(state.environmentRows, searchTerm, state.statusFilter, state.environmentFilter);

      return {
        ...state,
        searchTerm,
        filteredEnvironmentRows: filteredRows,
      };
    }
  ),

  on(
    EnvironmentsActions.setStatusFilter,
    (state, { statusFilter }): EnvironmentsState => {
      const filteredRows = applyAllFilters(state.environmentRows, state.searchTerm, statusFilter, state.environmentFilter);

      return {
        ...state,
        statusFilter,
        filteredEnvironmentRows: filteredRows,
      };
    }
  ),

  on(
    EnvironmentsActions.setEnvironmentFilter,
    (state, { environmentFilter }): EnvironmentsState => {
      const filteredRows = applyAllFilters(state.environmentRows, state.searchTerm, state.statusFilter, environmentFilter);

      return {
        ...state,
        environmentFilter,
        filteredEnvironmentRows: filteredRows,
      };
    }
  ),

  on(EnvironmentsActions.applyFilters, (state): EnvironmentsState => {
    const filteredRows = applyAllFilters(state.environmentRows, state.searchTerm, state.statusFilter, state.environmentFilter);

    return {
      ...state,
      filteredEnvironmentRows: filteredRows,
    };
  }),

  // Error Management
  on(
    EnvironmentsActions.clearErrors,
    (state): EnvironmentsState => ({
      ...state,
      error: null,
      generateError: null,
      regenerateError: null,
      rotateError: null,
      revokeError: null,
    })
  ),

  on(
    EnvironmentsActions.clearGenerateError,
    (state): EnvironmentsState => ({
      ...state,
      generateError: null,
    })
  ),

  on(
    EnvironmentsActions.clearRotateError,
    (state): EnvironmentsState => ({
      ...state,
      rotateError: null,
    })
  ),

  on(
    EnvironmentsActions.clearRevokeError,
    (state): EnvironmentsState => ({
      ...state,
      revokeError: null,
    })
  ),

  // UI State Management
  on(
    EnvironmentsActions.setLoading,
    (state, { isLoading }): EnvironmentsState => ({
      ...state,
      isLoading,
    })
  ),

  on(
    EnvironmentsActions.setGenerating,
    (state, { isGenerating }): EnvironmentsState => ({
      ...state,
      isGenerating,
    })
  ),

  on(
    EnvironmentsActions.setRotating,
    (state, { isRotating }): EnvironmentsState => ({
      ...state,
      isRotating,
    })
  ),

  on(
    EnvironmentsActions.setRevoking,
    (state, { isRevoking }): EnvironmentsState => ({
      ...state,
      isRevoking,
    })
  ),

  // Utility Actions
  on(
    EnvironmentsActions.resetState,
    (): EnvironmentsState => ({
      ...initialEnvironmentsState,
    })
  ),

  on(
    EnvironmentsActions.refreshEnvironments,
    (state): EnvironmentsState => ({
      ...state,
      isLoading: true,
      error: null,
    })
  )
);

/**
 * Compute environment status from API key state
 * _Requirements: 4.1, 4.2, 4.3, 4.4_
 */
export function computeEnvironmentStatus(
  apiKey: IApplicationApiKeys | null | undefined
): EnvironmentStatus {
  if (!apiKey) {
    return 'Not Configured';
  }

  switch (apiKey.status) {
    case ApplicationApiKeyStatus.Active:
    case ApplicationApiKeyStatus.Rotating:
      return 'Active';
    case ApplicationApiKeyStatus.Revoked:
      return 'Revoked';
    case ApplicationApiKeyStatus.Expired:
      return 'Expired';
    default:
      return 'Not Configured';
  }
}

/**
 * Get human-readable label for environment type
 */
function getEnvironmentLabel(env: Environment): string {
  const labels: Record<string, string> = {
    [Environment.Production]: 'Production',
    [Environment.Staging]: 'Staging',
    [Environment.Development]: 'Development',
    [Environment.Test]: 'Test',
    [Environment.Preview]: 'Preview',
    [Environment.Unknown]: 'Unknown',
  };
  return labels[env] || env;
}

/**
 * Build environment table rows from configs and API keys
 * API keys are the primary source - they define which environments exist.
 * Configs provide additional data (rate limits, origins, webhooks).
 * _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_
 */
export function buildEnvironmentRows(
  configs: IApplicationEnvironmentConfig[],
  apiKeys: IApplicationApiKeys[]
): EnvironmentTableRow[] {
  // Get unique environments from both configs and API keys
  const environmentSet = new Set<string>();
  configs.forEach((c) => environmentSet.add(c.environment));
  apiKeys.forEach((k) => environmentSet.add(k.environment));

  // Build rows for each unique environment
  return Array.from(environmentSet).map((env) => {
    // Find matching config and API key for this environment
    const config = configs.find((c) => c.environment === env) || null;
    const apiKey = apiKeys.find((k) => k.environment === env) || null;

    // Compute status from API key
    const status = computeEnvironmentStatus(apiKey);

    // Create a minimal config object if none exists (for display purposes)
    const now = new Date();
    const displayConfig: IApplicationEnvironmentConfig = config || {
      applicationId: apiKey?.applicationId || '',
      organizationId: apiKey?.organizationId || '',
      environment: env as Environment,
      allowedOrigins: [],
      rateLimitPerMinute: 60,
      rateLimitPerDay: 10000,
      webhookEnabled: false,
      webhookMaxRetries: 3,
      webhookRetryDelaySeconds: 60,
      featureFlags: {},
      metadata: {},
      createdAt: apiKey?.createdAt || now,
      updatedAt: apiKey?.updatedAt || now,
    };

    return {
      config: displayConfig,
      apiKey,
      environment: env as Environment,
      environmentLabel: getEnvironmentLabel(env as Environment),
      status,
      statusLabel: status,
      keyPrefix: apiKey?.keyPrefix || '—',
      rateLimitDisplay: config ? `${config.rateLimitPerMinute || 0}/min` : '—',
      originsCount: config?.allowedOrigins?.length || 0,
      webhookStatus: config?.webhookEnabled ? 'Enabled' : 'Disabled',
      lastActivity: formatLastActivity(config?.updatedAt || apiKey?.updatedAt),
    };
  });
}

/**
 * Apply all filters to environment rows
 * _Requirements: 2.4, 2.5_
 */
function applyAllFilters(
  rows: EnvironmentTableRow[],
  searchTerm: string,
  statusFilter: string,
  environmentFilter: string
): EnvironmentTableRow[] {
  return rows.filter((row) => {
    const matchesSearch =
      !searchTerm ||
      row.environmentLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.config.environment.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.keyPrefix.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !statusFilter || row.status === statusFilter;

    const matchesEnvironment =
      !environmentFilter || row.config.environment === environmentFilter;

    return matchesSearch && matchesStatus && matchesEnvironment;
  });
}

/**
 * Format last activity as relative time
 */
function formatLastActivity(dateValue: string | Date | number | undefined): string {
  if (!dateValue) return 'Never';
  const date =
    typeof dateValue === 'number'
      ? new Date(dateValue * 1000)
      : dateValue instanceof Date
        ? dateValue
        : new Date(dateValue);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return diffMins + ' min ago';
  if (diffHours < 24) return diffHours + ' hour' + (diffHours > 1 ? 's' : '') + ' ago';
  if (diffDays < 7) return diffDays + ' day' + (diffDays > 1 ? 's' : '') + ' ago';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
