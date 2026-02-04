/**
 * Environments State
 *
 * Defines the state structure for application environment configuration management.
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
 * NgRx state for environments list feature
 */
export interface EnvironmentsState {
  // Core data
  configs: IApplicationEnvironmentConfig[];
  apiKeys: IApplicationApiKeys[];
  environmentRows: EnvironmentTableRow[];
  filteredEnvironmentRows: EnvironmentTableRow[];

  // Context
  applicationId: string | null;
  organizationId: string | null;

  // Filter state
  searchTerm: string;
  statusFilter: string;

  // Loading states
  isLoading: boolean;
  error: string | null;
}

/**
 * Initial state for environments list feature
 */
export const initialEnvironmentsState: EnvironmentsState = {
  // Core data
  configs: [],
  apiKeys: [],
  environmentRows: [],
  filteredEnvironmentRows: [],

  // Context
  applicationId: null,
  organizationId: null,

  // Filter state
  searchTerm: '',
  statusFilter: '',

  // Loading states
  isLoading: false,
  error: null,
};
