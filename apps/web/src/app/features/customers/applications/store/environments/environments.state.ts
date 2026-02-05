/**
 * Environments State
 *
 * Defines the state structure for application environment configuration management.
 * This is the single source of truth for both environment configs AND API keys.
 * Follows the Organizations store pattern as the canonical reference.
 *
 * @see .kiro/specs/environments-list-and-detail/design.md
 * _Requirements: 2.1, 4.5_
 */

import { IApplicationEnvironmentConfig } from '../../../../../core/models/ApplicationEnvironmentConfigModel';
import { IApplicationApiKeys } from '../../../../../core/models/ApplicationApiKeysModel';
import { Environment } from '../../../../../core/enums/EnvironmentEnum';

/**
 * Environment status computed from API key state
 */
export type EnvironmentStatus = 'Active' | 'Not Configured' | 'Revoked' | 'Expired';

/**
 * Represents a row in the environments table with enriched data
 */
export interface EnvironmentTableRow {
  config: IApplicationEnvironmentConfig;
  apiKey: IApplicationApiKeys | null;
  environment: Environment;
  environmentLabel: string;
  status: EnvironmentStatus;
  statusLabel: string;
  keyPrefix: string;
  rateLimitDisplay: string;
  originsCount: number;
  webhookStatus: 'Enabled' | 'Disabled';
  lastActivity: string;
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
 * NgRx state for environments feature
 * Single source of truth for environment configs AND API keys
 */
export interface EnvironmentsState {
  // Core data
  configs: IApplicationEnvironmentConfig[];
  apiKeys: IApplicationApiKeys[];
  environmentRows: EnvironmentTableRow[];
  filteredEnvironmentRows: EnvironmentTableRow[];
  selectedApiKey: IApplicationApiKeys | null;

  // Context
  applicationId: string | null;
  organizationId: string | null;

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
}

/**
 * Initial state for environments feature
 */
export const initialEnvironmentsState: EnvironmentsState = {
  // Core data
  configs: [],
  apiKeys: [],
  environmentRows: [],
  filteredEnvironmentRows: [],
  selectedApiKey: null,

  // Context
  applicationId: null,
  organizationId: null,

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
};
