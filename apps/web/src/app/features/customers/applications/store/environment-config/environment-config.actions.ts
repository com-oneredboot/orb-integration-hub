/**
 * Environment Config Actions
 *
 * Defines all actions for application environment configuration state management.
 *
 * @see .kiro/specs/application-environment-config/design.md
 * _Requirements: 1.1, 2.1, 3.1, 4.1, 8.1_
 */

import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { IApplicationEnvironmentConfig } from '../../../../../core/models/ApplicationEnvironmentConfigModel';
import { Environment } from '../../../../../core/enums/EnvironmentEnum';
import { EnvironmentConfigTableRow } from './environment-config.state';

export const EnvironmentConfigActions = createActionGroup({
  source: 'EnvironmentConfig',
  events: {
    // Set Application Context
    'Set Application Context': props<{ applicationId: string; organizationId: string }>(),

    // Load Environment Configs (for an application)
    'Load Configs': props<{ applicationId: string }>(),
    'Load Configs Success': props<{ configs: IApplicationEnvironmentConfig[] }>(),
    'Load Configs Failure': props<{ error: string }>(),

    // Load Single Config
    'Load Config': props<{ applicationId: string; environment: Environment }>(),
    'Load Config Success': props<{ config: IApplicationEnvironmentConfig }>(),
    'Load Config Failure': props<{ error: string }>(),

    // Create Config
    'Create Config': props<{
      applicationId: string;
      organizationId: string;
      environment: Environment;
    }>(),
    'Create Config Success': props<{ config: IApplicationEnvironmentConfig }>(),
    'Create Config Failure': props<{ error: string }>(),

    // Update Config
    'Update Config': props<{
      applicationId: string;
      environment: Environment;
      rateLimitPerMinute?: number;
      rateLimitPerDay?: number;
      webhookEnabled?: boolean;
      metadata?: Record<string, string>;
    }>(),
    'Update Config Success': props<{ config: IApplicationEnvironmentConfig }>(),
    'Update Config Failure': props<{ error: string }>(),

    // Allowed Origins Management
    'Add Allowed Origin': props<{
      applicationId: string;
      environment: Environment;
      origin: string;
    }>(),
    'Add Allowed Origin Success': props<{ config: IApplicationEnvironmentConfig }>(),
    'Add Allowed Origin Failure': props<{ error: string }>(),

    'Remove Allowed Origin': props<{
      applicationId: string;
      environment: Environment;
      origin: string;
    }>(),
    'Remove Allowed Origin Success': props<{ config: IApplicationEnvironmentConfig }>(),
    'Remove Allowed Origin Failure': props<{ error: string }>(),

    // Webhook Configuration
    'Update Webhook Config': props<{
      applicationId: string;
      environment: Environment;
      webhookUrl?: string;
      webhookEvents?: string[];
      webhookEnabled?: boolean;
      webhookMaxRetries?: number;
      webhookRetryDelaySeconds?: number;
    }>(),
    'Update Webhook Config Success': props<{ config: IApplicationEnvironmentConfig }>(),
    'Update Webhook Config Failure': props<{ error: string }>(),

    'Regenerate Webhook Secret': props<{
      applicationId: string;
      environment: Environment;
    }>(),
    'Regenerate Webhook Secret Success': props<{ webhookSecret: string }>(),
    'Regenerate Webhook Secret Failure': props<{ error: string }>(),

    // Feature Flags Management
    'Set Feature Flag': props<{
      applicationId: string;
      environment: Environment;
      key: string;
      value: boolean | string | number;
    }>(),
    'Set Feature Flag Success': props<{ config: IApplicationEnvironmentConfig }>(),
    'Set Feature Flag Failure': props<{ error: string }>(),

    'Delete Feature Flag': props<{
      applicationId: string;
      environment: Environment;
      key: string;
    }>(),
    'Delete Feature Flag Success': props<{ config: IApplicationEnvironmentConfig }>(),
    'Delete Feature Flag Failure': props<{ error: string }>(),

    // Selection Management
    'Select Config': props<{ config: IApplicationEnvironmentConfig | null }>(),

    // Filter Management
    'Set Search Term': props<{ searchTerm: string }>(),
    'Set Environment Filter': props<{ environmentFilter: string }>(),
    'Apply Filters': emptyProps(),

    // Config Rows Management (for table display)
    'Update Config Rows': props<{ configRows: EnvironmentConfigTableRow[] }>(),
    'Update Filtered Config Rows': props<{ filteredRows: EnvironmentConfigTableRow[] }>(),

    // Error Management
    'Clear Errors': emptyProps(),
    'Clear Save Error': emptyProps(),

    // UI State Management
    'Set Loading': props<{ isLoading: boolean }>(),
    'Set Saving': props<{ isSaving: boolean }>(),

    // Utility Actions
    'Reset State': emptyProps(),
    'Refresh Configs': props<{ applicationId: string }>(),
  },
});
