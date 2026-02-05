/**
 * @deprecated This file is deprecated. Use the environments store instead.
 * The API keys functionality has been consolidated into the environments store.
 * Import from '../../store/environments/environments.state' instead.
 *
 * API Keys State
 *
 * Defines the state structure for application API key management.
 * Follows the same patterns as GroupsState.
 *
 * @see .kiro/specs/application-access-management/design.md
 * @see .kiro/specs/store-consolidation/requirements.md - Requirements 5.1, 5.2
 * _Requirements: 9.1, 9.5_
 */

import { IApplicationApiKeys } from '../../../../../core/models/ApplicationApiKeysModel';
import { Environment } from '../../../../../core/enums/EnvironmentEnum';

/**
 * Represents a row in the API keys table with enriched data
 */
export interface ApiKeyTableRow {
  apiKey: IApplicationApiKeys;
  applicationId: string;
  environmentLabel: string;
  statusLabel: string;
  lastActivity: string;
  isRotating: boolean;
}

/**
 * Result of a key generation operation
 * Contains the full key (only available once at generation time)
 */
export interface GeneratedKeyResult {
  apiKeyId: string;
  fullKey: string;
  environment: Environment;
  keyPrefix: string;
}

/**
 * Result of a key regeneration operation
 * Contains both the old key (now ROTATING) and the new key (ACTIVE)
 */
export interface RegeneratedKeyResult {
  oldKey: IApplicationApiKeys;
  newKey: IApplicationApiKeys;
  newKeyFullValue: string;
  environment: Environment;
}

/**
 * NgRx state for API keys feature
 */
export interface ApiKeysState {
  // Core API key data
  apiKeys: IApplicationApiKeys[];
  apiKeyRows: ApiKeyTableRow[];
  filteredApiKeyRows: ApiKeyTableRow[];
  selectedApiKey: IApplicationApiKeys | null;

  // Current application context
  currentApplicationId: string | null;
  currentOrganizationId: string | null;

  // Generated key (only available immediately after generation)
  generatedKey: GeneratedKeyResult | null;

  // Regenerated key result (shows both old ROTATING and new ACTIVE keys)
  regeneratedKeyResult: RegeneratedKeyResult | null;

  // Filter state
  searchTerm: string;
  statusFilter: string;
  environmentFilter: string;

  // Loading states
  isLoading: boolean;
  isGenerating: boolean;
  isRegenerating: boolean;
  isRotating: boolean;
  isRevoking: boolean;

  // Error states
  error: string | null;
  generateError: string | null;
  regenerateError: string | null;
  rotateError: string | null;
  revokeError: string | null;

  // Operation states
  lastGeneratedKey: IApplicationApiKeys | null;
  lastRotatedKey: IApplicationApiKeys | null;
  lastRevokedKeyId: string | null;
}

/**
 * Initial state for API keys feature
 */
export const initialApiKeysState: ApiKeysState = {
  // Core API key data
  apiKeys: [],
  apiKeyRows: [],
  filteredApiKeyRows: [],
  selectedApiKey: null,

  // Current application context
  currentApplicationId: null,
  currentOrganizationId: null,

  // Generated key
  generatedKey: null,

  // Regenerated key result
  regeneratedKeyResult: null,

  // Filter state
  searchTerm: '',
  statusFilter: '',
  environmentFilter: '',

  // Loading states
  isLoading: false,
  isGenerating: false,
  isRegenerating: false,
  isRotating: false,
  isRevoking: false,

  // Error states
  error: null,
  generateError: null,
  regenerateError: null,
  rotateError: null,
  revokeError: null,

  // Operation states
  lastGeneratedKey: null,
  lastRotatedKey: null,
  lastRevokedKeyId: null,
};
