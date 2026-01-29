/**
 * API Keys Actions
 *
 * Defines all actions for application API key state management.
 * Follows the same patterns as GroupsActions.
 *
 * @see .kiro/specs/application-access-management/design.md
 * _Requirements: 9.1_
 */

import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { IApplicationApiKeys } from '../../../../../core/models/ApplicationApiKeysModel';
import { Environment } from '../../../../../core/enums/EnvironmentEnum';
import { ApiKeyTableRow, GeneratedKeyResult, RegeneratedKeyResult } from './api-keys.state';

export const ApiKeysActions = createActionGroup({
  source: 'ApiKeys',
  events: {
    // Set Application Context
    'Set Application Context': props<{ applicationId: string; organizationId: string }>(),

    // Load API Keys (for an application)
    'Load Api Keys': props<{ applicationId: string }>(),
    'Load Api Keys Success': props<{ apiKeys: IApplicationApiKeys[] }>(),
    'Load Api Keys Failure': props<{ error: string }>(),

    // Generate API Key
    'Generate Api Key': props<{
      applicationId: string;
      organizationId: string;
      environment: Environment;
    }>(),
    'Generate Api Key Success': props<{
      apiKey: IApplicationApiKeys;
      generatedKey: GeneratedKeyResult;
    }>(),
    'Generate Api Key Failure': props<{ error: string }>(),

    // Regenerate API Key (creates new ACTIVE key, marks old as ROTATING with 7-day grace)
    'Regenerate Api Key': props<{
      apiKeyId: string;
      applicationId: string;
      organizationId: string;
      environment: Environment;
    }>(),
    'Regenerate Api Key Success': props<{
      oldKey: IApplicationApiKeys;
      newKey: IApplicationApiKeys;
      regeneratedKeyResult: RegeneratedKeyResult;
    }>(),
    'Regenerate Api Key Failure': props<{ error: string }>(),

    // Clear Regenerated Key Result
    'Clear Regenerated Key Result': emptyProps(),

    // Rotate API Key
    'Rotate Api Key': props<{
      apiKeyId: string;
      applicationId: string;
      environment: Environment;
    }>(),
    'Rotate Api Key Success': props<{
      apiKey: IApplicationApiKeys;
      newKey: GeneratedKeyResult;
    }>(),
    'Rotate Api Key Failure': props<{ error: string }>(),

    // Revoke API Key
    'Revoke Api Key': props<{
      apiKeyId: string;
      applicationId: string;
      environment: Environment;
    }>(),
    'Revoke Api Key Success': props<{ apiKeyId: string; revokedKey: IApplicationApiKeys }>(),
    'Revoke Api Key Failure': props<{ error: string }>(),

    // Selection Management
    'Select Api Key': props<{ apiKey: IApplicationApiKeys | null }>(),

    // Clear Generated Key (after user has copied it)
    'Clear Generated Key': emptyProps(),

    // Filter Management
    'Set Search Term': props<{ searchTerm: string }>(),
    'Set Status Filter': props<{ statusFilter: string }>(),
    'Set Environment Filter': props<{ environmentFilter: string }>(),
    'Apply Filters': emptyProps(),

    // API Key Rows Management (for table display)
    'Update Api Key Rows': props<{ apiKeyRows: ApiKeyTableRow[] }>(),
    'Update Filtered Api Key Rows': props<{ filteredRows: ApiKeyTableRow[] }>(),

    // Error Management
    'Clear Errors': emptyProps(),
    'Clear Generate Error': emptyProps(),
    'Clear Rotate Error': emptyProps(),
    'Clear Revoke Error': emptyProps(),

    // UI State Management
    'Set Loading': props<{ isLoading: boolean }>(),
    'Set Generating': props<{ isGenerating: boolean }>(),
    'Set Rotating': props<{ isRotating: boolean }>(),
    'Set Revoking': props<{ isRevoking: boolean }>(),

    // Utility Actions
    'Reset State': emptyProps(),
    'Refresh Api Keys': props<{ applicationId: string }>(),
  },
});
