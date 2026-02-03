/**
 * Environment Config State
 *
 * Defines the state shape for application environment configuration management.
 *
 * @see .kiro/specs/application-environment-config/design.md
 * _Requirements: 1.1, 2.1, 3.1, 4.1, 8.1_
 */

import { IApplicationEnvironmentConfig } from '../../../../../core/models/ApplicationEnvironmentConfigModel';
import { Environment } from '../../../../../core/enums/EnvironmentEnum';

/**
 * Table row representation for environment config display
 */
export interface EnvironmentConfigTableRow {
  applicationId: string;
  environment: Environment;
  organizationId: string;
  allowedOriginsCount: number;
  rateLimitPerMinute: number;
  rateLimitPerDay: number;
  webhookEnabled: boolean;
  featureFlagsCount: number;
  updatedAt: number;
}

/**
 * Environment Config State
 */
export interface EnvironmentConfigState {
  // Data
  configs: IApplicationEnvironmentConfig[];
  selectedConfig: IApplicationEnvironmentConfig | null;

  // Application Context
  applicationId: string | null;
  organizationId: string | null;

  // Table Display
  configRows: EnvironmentConfigTableRow[];
  filteredRows: EnvironmentConfigTableRow[];

  // Filters
  searchTerm: string;
  environmentFilter: string;

  // Loading States
  isLoading: boolean;
  isSaving: boolean;

  // Error States
  loadError: string | null;
  saveError: string | null;
}

/**
 * Initial state for environment config
 */
export const initialEnvironmentConfigState: EnvironmentConfigState = {
  configs: [],
  selectedConfig: null,
  applicationId: null,
  organizationId: null,
  configRows: [],
  filteredRows: [],
  searchTerm: '',
  environmentFilter: '',
  isLoading: false,
  isSaving: false,
  loadError: null,
  saveError: null,
};
