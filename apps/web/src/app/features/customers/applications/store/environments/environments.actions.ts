/**
 * Environments Actions
 *
 * Defines all actions for application environments list state management.
 * Follows the Organizations store pattern as the canonical reference.
 *
 * @see .kiro/specs/environments-list-and-detail/design.md
 * _Requirements: 2.2, 2.4_
 */

import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { IApplicationEnvironmentConfig } from '../../../../../core/models/ApplicationEnvironmentConfigModel';
import { IApplicationApiKeys } from '../../../../../core/models/ApplicationApiKeysModel';

export const EnvironmentsActions = createActionGroup({
  source: 'Environments',
  events: {
    // Set Application Context
    'Set Application Context': props<{ applicationId: string; organizationId: string }>(),

    // Load Environments (configs + API keys for an application)
    'Load Environments': props<{ applicationId: string }>(),
    'Load Environments Success': props<{
      configs: IApplicationEnvironmentConfig[];
      apiKeys: IApplicationApiKeys[];
    }>(),
    'Load Environments Failure': props<{ error: string }>(),

    // Filter Management
    'Set Search Term': props<{ searchTerm: string }>(),
    'Set Status Filter': props<{ statusFilter: string }>(),
    'Apply Filters': emptyProps(),

    // Error Management
    'Clear Errors': emptyProps(),

    // UI State Management
    'Set Loading': props<{ isLoading: boolean }>(),

    // Utility Actions
    'Reset State': emptyProps(),
    'Refresh Environments': props<{ applicationId: string }>(),
  },
});
