/**
 * Applications Actions
 *
 * Defines all actions for application state management.
 * Follows the same patterns as OrganizationsActions.
 *
 * @see .kiro/specs/applications-management/design.md
 * @see .kiro/specs/store-centric-refactoring/design.md
 * _Requirements: 5.1, 2.2, 3.2_
 */

import { createActionGroup, emptyProps, props } from '@ngrx/store';
import {
  IApplications,
  ApplicationsCreateInput,
  ApplicationsUpdateInput,
} from '../../../../core/models/ApplicationsModel';
import { ApplicationTableRow } from './applications.state';

export const ApplicationsActions = createActionGroup({
  source: 'Applications',
  events: {
    // Load Applications (all for user)
    'Load Applications': emptyProps(),
    'Load Applications Success': props<{ applications: IApplications[] }>(),
    'Load Applications Failure': props<{ error: string }>(),

    // Load Single Application (for detail page)
    'Load Application': props<{ applicationId: string }>(),
    'Load Application Success': props<{ application: IApplications }>(),
    'Load Application Failure': props<{ error: string }>(),

    // Create Draft Application (create-on-click pattern)
    'Create Draft Application': props<{ ownerId: string; organizationId?: string }>(),
    'Create Draft Application Success': props<{ application: IApplications }>(),
    'Create Draft Application Failure': props<{ error: string }>(),

    // Create Application
    'Create Application': props<{ input: Partial<ApplicationsCreateInput> }>(),
    'Create Application Success': props<{ application: IApplications }>(),
    'Create Application Failure': props<{ error: string }>(),

    // Update Application
    'Update Application': props<{ input: Partial<ApplicationsUpdateInput> }>(),
    'Update Application Success': props<{ application: IApplications }>(),
    'Update Application Failure': props<{ error: string }>(),

    // Delete Application
    'Delete Application': props<{ applicationId: string }>(),
    'Delete Application Success': props<{ applicationId: string }>(),
    'Delete Application Failure': props<{ error: string }>(),

    // Selection Management
    'Select Application': props<{ application: IApplications | null }>(),

    // Create Mode Management
    'Enter Create Mode': props<{ placeholderApplication: IApplications }>(),
    'Exit Create Mode': emptyProps(),
    'Cancel Create Mode': emptyProps(),

    // Filter Management
    'Set Search Term': props<{ searchTerm: string }>(),
    'Set Organization Filter': props<{ organizationFilter: string }>(),
    'Set Status Filter': props<{ statusFilter: string }>(),
    'Apply Filters': emptyProps(),

    // Application Rows Management (for table display)
    'Update Application Rows': props<{ applicationRows: ApplicationTableRow[] }>(),

    // Error Management
    'Clear Errors': emptyProps(),
    'Clear Save Error': emptyProps(),
    'Clear Delete Error': emptyProps(),

    // UI State Management
    'Set Loading': props<{ isLoading: boolean }>(),
    'Set Saving': props<{ isSaving: boolean }>(),
    'Set Deleting': props<{ isDeleting: boolean }>(),

    // Utility Actions
    'Reset State': emptyProps(),
    'Refresh Applications': emptyProps(),
  },
});
