/**
 * Application Users Actions
 * 
 * Defines all actions for application user state management
 */

import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { IUsers } from '../../../../../core/models/UsersModel';
import { IApplicationUsers } from '../../../../../core/models/ApplicationUsersModel';
import { EnvironmentRoleAssignment } from './application-users.state';

export interface UserAssignment {
  userId: string;
  environmentRoles: Array<{
    environmentId: string;
    roleId: string;
  }>;
}

export interface RoleUpdate {
  userId: string;
  environmentId: string;
  roleId: string;
}

export const ApplicationUsersActions = createActionGroup({
  source: 'Application Users',
  events: {
    // Load users for application
    'Load Application Users': props<{ applicationId: string }>(),
    'Load Application Users Success': props<{ 
      users: IUsers[];
      applicationUsers: IApplicationUsers[];
      roleAssignments: EnvironmentRoleAssignment[];
    }>(),
    'Load Application Users Failure': props<{ error: string }>(),

    // Assign user to application
    'Assign User To Application': props<{ 
      applicationId: string;
      assignment: UserAssignment;
    }>(),
    'Assign User Success': props<{ 
      user: IUsers;
      applicationUser: IApplicationUsers;
      roleAssignments: EnvironmentRoleAssignment[];
    }>(),
    'Assign User Failure': props<{ error: string }>(),

    // Unassign user from application
    'Unassign User From Application': props<{ 
      applicationId: string;
      userId: string;
    }>(),
    'Unassign User Success': props<{ userId: string }>(),
    'Unassign User Failure': props<{ error: string }>(),

    // Update user role for environment
    'Update User Role': props<{ 
      applicationId: string;
      update: RoleUpdate;
    }>(),
    'Update User Role Success': props<{ 
      userId: string;
      environmentId: string;
      roleId: string;
      roleName: string;
    }>(),
    'Update User Role Failure': props<{ error: string }>(),

    // Filter Management
    'Set Search Term': props<{ searchTerm: string }>(),
    'Set Role Filter': props<{ roleFilter: string }>(),
    'Set Environment Filter': props<{ environmentFilter: string }>(),
    'Apply Filters': emptyProps(),

    // Error Management
    'Clear Errors': emptyProps(),
    'Clear Assign Error': emptyProps(),
    'Clear Unassign Error': emptyProps(),
    'Clear Role Update Error': emptyProps(),

    // Utility Actions
    'Reset State': emptyProps()
  }
});
