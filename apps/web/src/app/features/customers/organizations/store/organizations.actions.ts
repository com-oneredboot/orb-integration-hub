/**
 * Organizations Actions
 * 
 * Defines all actions for organization state management
 */

import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Organizations, OrganizationsCreateInput, OrganizationsUpdateInput } from '../../../../core/models/OrganizationsModel';
import { OrganizationTableRow } from './organizations.state';

export const OrganizationsActions = createActionGroup({
  source: 'Organizations',
  events: {
    // Load Organizations (list)
    'Load Organizations': emptyProps(),
    'Load Organizations Success': props<{ organizations: Organizations[] }>(),
    'Load Organizations Failure': props<{ error: string }>(),

    // Load Single Organization (detail page)
    'Load Organization': props<{ organizationId: string }>(),
    'Load Organization Success': props<{ organization: Organizations }>(),
    'Load Organization Failure': props<{ error: string }>(),

    // Create Draft Organization (create-on-click pattern)
    'Create Draft Organization': emptyProps(),
    'Create Draft Organization Success': props<{ organization: Organizations }>(),
    'Create Draft Organization Failure': props<{ error: string }>(),

    // Create Organization
    'Create Organization': props<{ input: Partial<OrganizationsCreateInput> }>(),
    'Create Organization Success': props<{ organization: Organizations }>(),
    'Create Organization Failure': props<{ error: string }>(),

    // Update Organization  
    'Update Organization': props<{ input: Partial<OrganizationsUpdateInput> }>(),
    'Update Organization Success': props<{ organization: Organizations }>(),
    'Update Organization Failure': props<{ error: string }>(),

    // Delete Organization
    'Delete Organization': props<{ organizationId: string }>(),
    'Delete Organization Success': props<{ organizationId: string }>(),
    'Delete Organization Failure': props<{ error: string }>(),

    // Selection Management
    'Select Organization': props<{ organization: Organizations | null }>(),
    'Set Selected Organization Member Count': props<{ memberCount: number }>(),
    'Set Selected Organization Application Count': props<{ applicationCount: number }>(),

    // Create Mode Management
    'Enter Create Mode': props<{ placeholderOrganization: Organizations }>(),
    'Exit Create Mode': emptyProps(),
    'Cancel Create Mode': emptyProps(),

    // Filter Management
    'Set Search Term': props<{ searchTerm: string }>(),
    'Set Status Filter': props<{ statusFilter: string }>(),
    'Set Role Filter': props<{ roleFilter: string }>(),
    'Apply Filters': emptyProps(),

    // Organization Rows Management (for table display)
    'Update Organization Rows': props<{ organizationRows: OrganizationTableRow[] }>(),
    'Update Filtered Organization Rows': props<{ filteredRows: OrganizationTableRow[] }>(),
    
    // Application Count Management
    'Update Organization Application Counts': props<{ applicationCountsByOrg: Record<string, number> }>(),

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
    'Refresh Organizations': emptyProps()
  }
});