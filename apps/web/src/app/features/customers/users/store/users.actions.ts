/**
 * Users Actions
 * 
 * Defines all actions for users state management
 */

import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { IUsers } from '../../../../core/models/UsersModel';
import { IApplicationUsers } from '../../../../core/models/ApplicationUsersModel';
import { UserTableRow } from './users.state';

export const UsersActions = createActionGroup({
  source: 'Users',
  events: {
    // Load Users
    'Load Users': emptyProps(),
    'Load Users Success': props<{ 
      users: IUsers[];
      applicationUserRecords: IApplicationUsers[];
    }>(),
    'Load Users Failure': props<{ error: string }>(),

    // Selection Management
    'Select User': props<{ user: IUsers | null }>(),
    'Set Selected User Id': props<{ userId: string | null }>(),

    // Filter Management
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
