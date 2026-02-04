/**
 * Environments Reducer
 *
 * Handles state changes for application environments list management.
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
      // Build environment rows from configs and API keys
      const environmentRows = buildEnvironmentRows(configs, apiKeys);

      return {
        ...state,
        isLoading: false,
        configs,
        apiKeys,
        environmentRows,
        filteredEnvironmentRows: environmentRows,
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

  // Filter Management
  on(
    EnvironmentsActions.setSearchTerm,
    (state, { searchTerm }): EnvironmentsState => {
      const filteredRows = state.environmentRows.filter((row) =>
        applyFilters(row, searchTerm, state.statusFilter)
      );

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
      const filteredRows = state.environmentRows.filter((row) =>
        applyFilters(row, state.searchTerm, statusFilter)
      );

      return {
        ...state,
        statusFilter,
        filteredEnvironmentRows: filteredRows,
      };
    }
  ),

  on(EnvironmentsActions.applyFilters, (state): EnvironmentsState => {
    const filteredRows = state.environmentRows.filter((row) =>
      applyFilters(row, state.searchTerm, state.statusFilter)
    );

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
 * Apply filters to environment rows
 * _Requirements: 2.4, 2.5_
 */
function applyFilters(
  row: EnvironmentTableRow,
  searchTerm: string,
  statusFilter: string
): boolean {
  const matchesSearch =
    !searchTerm ||
    row.environmentLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.config.environment.toLowerCase().includes(searchTerm.toLowerCase());

  const matchesStatus = !statusFilter || row.status === statusFilter;

  return matchesSearch && matchesStatus;
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
