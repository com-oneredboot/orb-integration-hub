/**
 * API Keys Reducer
 *
 * Handles state changes for application API key management.
 * Follows the same patterns as GroupsReducer.
 *
 * @see .kiro/specs/application-access-management/design.md
 * _Requirements: 9.1, 9.5_
 */

import { createReducer, on } from '@ngrx/store';
import { ApiKeysActions } from './api-keys.actions';
import { ApiKeysState, ApiKeyTableRow, initialApiKeysState } from './api-keys.state';
import { ApplicationApiKeyStatus } from '../../../../../core/enums/ApplicationApiKeyStatusEnum';
import { Environment } from '../../../../../core/enums/EnvironmentEnum';

export const apiKeysReducer = createReducer(
  initialApiKeysState,

  // Set Application Context
  on(
    ApiKeysActions.setApplicationContext,
    (state, { applicationId, organizationId }): ApiKeysState => ({
      ...state,
      currentApplicationId: applicationId,
      currentOrganizationId: organizationId,
    })
  ),

  // Load API Keys
  on(
    ApiKeysActions.loadApiKeys,
    (state): ApiKeysState => ({
      ...state,
      isLoading: true,
      error: null,
    })
  ),

  on(ApiKeysActions.loadApiKeysSuccess, (state, { apiKeys }): ApiKeysState => {
    const apiKeyRows: ApiKeyTableRow[] = apiKeys.map((apiKey) => ({
      apiKey,
      applicationId: apiKey.applicationId,
      environmentLabel: getEnvironmentLabel(apiKey.environment),
      statusLabel: getStatusLabel(apiKey.status),
      lastActivity: formatLastActivity(apiKey.lastUsedAt || apiKey.updatedAt),
      isRotating: apiKey.status === ApplicationApiKeyStatus.Rotating,
    }));

    return {
      ...state,
      isLoading: false,
      apiKeys,
      apiKeyRows,
      filteredApiKeyRows: apiKeyRows,
      error: null,
    };
  }),

  on(
    ApiKeysActions.loadApiKeysFailure,
    (state, { error }): ApiKeysState => ({
      ...state,
      isLoading: false,
      error,
    })
  ),

  // Generate API Key
  on(
    ApiKeysActions.generateApiKey,
    (state): ApiKeysState => ({
      ...state,
      isGenerating: true,
      generateError: null,
      generatedKey: null,
    })
  ),

  on(
    ApiKeysActions.generateApiKeySuccess,
    (state, { apiKey, generatedKey }): ApiKeysState => {
      const newRow: ApiKeyTableRow = {
        apiKey,
        applicationId: apiKey.applicationId,
        environmentLabel: getEnvironmentLabel(apiKey.environment),
        statusLabel: getStatusLabel(apiKey.status),
        lastActivity: formatLastActivity(apiKey.updatedAt),
        isRotating: false,
      };

      const updatedApiKeys = [...state.apiKeys, apiKey];
      const updatedRows = [...state.apiKeyRows, newRow];

      return {
        ...state,
        isGenerating: false,
        apiKeys: updatedApiKeys,
        apiKeyRows: updatedRows,
        filteredApiKeyRows: updatedRows.filter((row) =>
          applyFilters(row, state.searchTerm, state.statusFilter, state.environmentFilter)
        ),
        generatedKey: generatedKey,
        lastGeneratedKey: apiKey,
        generateError: null,
      };
    }
  ),

  on(
    ApiKeysActions.generateApiKeyFailure,
    (state, { error }): ApiKeysState => ({
      ...state,
      isGenerating: false,
      generateError: error,
    })
  ),

  // Rotate API Key
  on(
    ApiKeysActions.rotateApiKey,
    (state): ApiKeysState => ({
      ...state,
      isRotating: true,
      rotateError: null,
      generatedKey: null,
    })
  ),

  on(
    ApiKeysActions.rotateApiKeySuccess,
    (state, { apiKey, newKey }): ApiKeysState => {
      const updatedApiKeys = state.apiKeys.map((k) =>
        k.applicationApiKeyId === apiKey.applicationApiKeyId ? apiKey : k
      );

      const updatedRows = state.apiKeyRows.map((row) =>
        row.apiKey.applicationApiKeyId === apiKey.applicationApiKeyId
          ? {
              ...row,
              apiKey,
              statusLabel: getStatusLabel(apiKey.status),
              lastActivity: formatLastActivity(apiKey.updatedAt),
              isRotating: apiKey.status === ApplicationApiKeyStatus.Rotating,
            }
          : row
      );

      return {
        ...state,
        isRotating: false,
        apiKeys: updatedApiKeys,
        apiKeyRows: updatedRows,
        filteredApiKeyRows: updatedRows.filter((row) =>
          applyFilters(row, state.searchTerm, state.statusFilter, state.environmentFilter)
        ),
        generatedKey: newKey,
        lastRotatedKey: apiKey,
        rotateError: null,
      };
    }
  ),

  on(
    ApiKeysActions.rotateApiKeyFailure,
    (state, { error }): ApiKeysState => ({
      ...state,
      isRotating: false,
      rotateError: error,
    })
  ),

  // Revoke API Key
  on(
    ApiKeysActions.revokeApiKey,
    (state): ApiKeysState => ({
      ...state,
      isRevoking: true,
      revokeError: null,
    })
  ),

  on(
    ApiKeysActions.revokeApiKeySuccess,
    (state, { apiKeyId }): ApiKeysState => {
      // Update the key status to REVOKED instead of removing it
      const updatedApiKeys = state.apiKeys.map((k) =>
        k.applicationApiKeyId === apiKeyId
          ? { ...k, status: ApplicationApiKeyStatus.Revoked }
          : k
      );

      const updatedRows = state.apiKeyRows.map((row) =>
        row.apiKey.applicationApiKeyId === apiKeyId
          ? {
              ...row,
              apiKey: { ...row.apiKey, status: ApplicationApiKeyStatus.Revoked },
              statusLabel: getStatusLabel(ApplicationApiKeyStatus.Revoked),
              isRotating: false,
            }
          : row
      );

      return {
        ...state,
        isRevoking: false,
        apiKeys: updatedApiKeys,
        apiKeyRows: updatedRows,
        filteredApiKeyRows: updatedRows.filter((row) =>
          applyFilters(row, state.searchTerm, state.statusFilter, state.environmentFilter)
        ),
        selectedApiKey:
          state.selectedApiKey?.applicationApiKeyId === apiKeyId
            ? null
            : state.selectedApiKey,
        lastRevokedKeyId: apiKeyId,
        revokeError: null,
      };
    }
  ),

  on(
    ApiKeysActions.revokeApiKeyFailure,
    (state, { error }): ApiKeysState => ({
      ...state,
      isRevoking: false,
      revokeError: error,
    })
  ),

  // Selection Management
  on(
    ApiKeysActions.selectApiKey,
    (state, { apiKey }): ApiKeysState => ({
      ...state,
      selectedApiKey: apiKey,
    })
  ),

  // Clear Generated Key
  on(
    ApiKeysActions.clearGeneratedKey,
    (state): ApiKeysState => ({
      ...state,
      generatedKey: null,
    })
  ),

  // Filter Management
  on(ApiKeysActions.setSearchTerm, (state, { searchTerm }): ApiKeysState => {
    const filteredRows = state.apiKeyRows.filter((row) =>
      applyFilters(row, searchTerm, state.statusFilter, state.environmentFilter)
    );

    return {
      ...state,
      searchTerm,
      filteredApiKeyRows: filteredRows,
    };
  }),

  on(ApiKeysActions.setStatusFilter, (state, { statusFilter }): ApiKeysState => {
    const filteredRows = state.apiKeyRows.filter((row) =>
      applyFilters(row, state.searchTerm, statusFilter, state.environmentFilter)
    );

    return {
      ...state,
      statusFilter,
      filteredApiKeyRows: filteredRows,
    };
  }),

  on(ApiKeysActions.setEnvironmentFilter, (state, { environmentFilter }): ApiKeysState => {
    const filteredRows = state.apiKeyRows.filter((row) =>
      applyFilters(row, state.searchTerm, state.statusFilter, environmentFilter)
    );

    return {
      ...state,
      environmentFilter,
      filteredApiKeyRows: filteredRows,
    };
  }),

  on(ApiKeysActions.applyFilters, (state): ApiKeysState => {
    const filteredRows = state.apiKeyRows.filter((row) =>
      applyFilters(row, state.searchTerm, state.statusFilter, state.environmentFilter)
    );

    return {
      ...state,
      filteredApiKeyRows: filteredRows,
    };
  }),

  // API Key Rows Management
  on(ApiKeysActions.updateApiKeyRows, (state, { apiKeyRows }): ApiKeysState => {
    const filteredRows = apiKeyRows.filter((row) =>
      applyFilters(row, state.searchTerm, state.statusFilter, state.environmentFilter)
    );

    return {
      ...state,
      apiKeyRows,
      filteredApiKeyRows: filteredRows,
    };
  }),

  // Error Management
  on(
    ApiKeysActions.clearErrors,
    (state): ApiKeysState => ({
      ...state,
      error: null,
      generateError: null,
      rotateError: null,
      revokeError: null,
    })
  ),

  on(
    ApiKeysActions.clearGenerateError,
    (state): ApiKeysState => ({
      ...state,
      generateError: null,
    })
  ),

  on(
    ApiKeysActions.clearRotateError,
    (state): ApiKeysState => ({
      ...state,
      rotateError: null,
    })
  ),

  on(
    ApiKeysActions.clearRevokeError,
    (state): ApiKeysState => ({
      ...state,
      revokeError: null,
    })
  ),

  // UI State Management
  on(
    ApiKeysActions.setLoading,
    (state, { isLoading }): ApiKeysState => ({
      ...state,
      isLoading,
    })
  ),

  on(
    ApiKeysActions.setGenerating,
    (state, { isGenerating }): ApiKeysState => ({
      ...state,
      isGenerating,
    })
  ),

  on(
    ApiKeysActions.setRotating,
    (state, { isRotating }): ApiKeysState => ({
      ...state,
      isRotating,
    })
  ),

  on(
    ApiKeysActions.setRevoking,
    (state, { isRevoking }): ApiKeysState => ({
      ...state,
      isRevoking,
    })
  ),

  // Utility Actions
  on(
    ApiKeysActions.resetState,
    (): ApiKeysState => ({
      ...initialApiKeysState,
    })
  ),

  on(
    ApiKeysActions.refreshApiKeys,
    (state): ApiKeysState => ({
      ...state,
      isLoading: true,
      error: null,
    })
  )
);

// Helper function to apply filters
function applyFilters(
  row: ApiKeyTableRow,
  searchTerm: string,
  statusFilter: string,
  environmentFilter: string
): boolean {
  const matchesSearch =
    !searchTerm ||
    row.apiKey.keyPrefix.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.apiKey.applicationApiKeyId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.environmentLabel.toLowerCase().includes(searchTerm.toLowerCase());

  const matchesStatus = !statusFilter || row.apiKey.status === statusFilter;

  const matchesEnvironment =
    !environmentFilter || row.apiKey.environment === environmentFilter;

  return matchesSearch && matchesStatus && matchesEnvironment;
}

// Helper function to format last activity as relative time
function formatLastActivity(
  dateValue: string | Date | number | undefined
): string {
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
  if (diffHours < 24)
    return diffHours + ' hour' + (diffHours > 1 ? 's' : '') + ' ago';
  if (diffDays < 7)
    return diffDays + ' day' + (diffDays > 1 ? 's' : '') + ' ago';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Helper function to get environment label
function getEnvironmentLabel(environment: Environment): string {
  const labels: Record<Environment, string> = {
    [Environment.Unknown]: 'Unknown',
    [Environment.Production]: 'Production',
    [Environment.Staging]: 'Staging',
    [Environment.Development]: 'Development',
    [Environment.Test]: 'Test',
    [Environment.Preview]: 'Preview',
  };
  return labels[environment] || 'Unknown';
}

// Helper function to get status label
function getStatusLabel(status: ApplicationApiKeyStatus): string {
  const labels: Record<ApplicationApiKeyStatus, string> = {
    [ApplicationApiKeyStatus.Unknown]: 'Unknown',
    [ApplicationApiKeyStatus.Active]: 'Active',
    [ApplicationApiKeyStatus.Rotating]: 'Rotating',
    [ApplicationApiKeyStatus.Revoked]: 'Revoked',
    [ApplicationApiKeyStatus.Expired]: 'Expired',
  };
  return labels[status] || 'Unknown';
}
