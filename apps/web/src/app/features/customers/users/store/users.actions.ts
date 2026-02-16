/**
 * Users Actions
 * 
 * Defines all actions for application users state management.
 * Uses GetApplicationUsers Lambda query.
 */

import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { UserWithRoles } from '../../../../core/graphql/GetApplicationUsers.graphql';
import { UserTableRow } from './users.state';

export const UsersActions = createActionGroup({
  source: 'Users',
  events: {
    // Load Application Users
    'Load Users': emptyProps(),
    'Load Users Success': props<{ 
      usersWithRoles: UserWithRoles[];
      nextToken?: string;
    }>(),
    'Load Users Failure': props<{ error: string }>(),

    // Load More (Pagination)
    'Load More Users': emptyProps(),
    'Load More Users Success': props<{ 
      usersWithRoles: UserWithRoles[];
      nextToken?: string;
    }>(),

    // Selection Management
    'Select User': props<{ user: UserWithRoles }>(),
    'Set Selected User Id': props<{ userId: string }>(),

    // Filter Management - Server-side (trigger reload)
    'Set Organization Filter': props<{ organizationIds: string[] }>(),
    'Set Application Filter': props<{ applicationIds: string[] }>(),
    'Set Environment Filter': props<{ environment: string | null }>(),
    
    // Filter Management - Client-side (no reload)
    'Set Search Term': props<{ searchTerm: string }>(),
    'Set Status Filter': props<{ statusFilter: string }>(),
    'Apply Filters': emptyProps(),

    // User Rows Management
    'Update User Rows': props<{ userRows: UserTableRow[] }>(),
    'Update Filtered User Rows': props<{ filteredRows: UserTableRow[] }>(),

    // Error Management
    'Clear Errors': emptyProps(),

    // Utility Actions
    'Reset State': emptyProps(),
    'Refresh Users': emptyProps(),
  }
});

