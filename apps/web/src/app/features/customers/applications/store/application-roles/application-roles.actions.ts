/**
 * Application Roles Actions
 *
 * Defines all actions for application roles state management.
 * Follows the Organizations/Environments store pattern as the canonical reference.
 *
 * @see .kiro/specs/application-roles-management/design.md
 * _Requirements: 8.2, 8.4_
 */

import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { IApplicationRoles } from '../../../../../core/models/ApplicationRolesModel';
import { ApplicationRoleType } from '../../../../../core/enums/ApplicationRoleTypeEnum';

export interface CreateApplicationRoleInput {
  applicationId: string;
  organizationId: string;
  roleName: string;
  roleType: ApplicationRoleType;
  description?: string;
}

export interface UpdateApplicationRoleInput {
  applicationRoleId: string;
  roleName?: string;
  roleType?: ApplicationRoleType;
  description?: string;
}

export const ApplicationRolesActions = createActionGroup({
  source: 'ApplicationRoles',
  events: {
    // Context
    'Set Application Context': props<{ applicationId: string; organizationId: string }>(),

    // Load
    'Load Roles': props<{ applicationId: string }>(),
    'Load Roles Success': props<{ roles: IApplicationRoles[] }>(),
    'Load Roles Failure': props<{ error: string }>(),

    // Create
    'Create Role': props<{ input: CreateApplicationRoleInput }>(),
    'Create Role Success': props<{ role: IApplicationRoles }>(),
    'Create Role Failure': props<{ error: string }>(),

    // Update
    'Update Role': props<{ input: UpdateApplicationRoleInput }>(),
    'Update Role Success': props<{ role: IApplicationRoles }>(),
    'Update Role Failure': props<{ error: string }>(),

    // Deactivate
    'Deactivate Role': props<{ applicationRoleId: string }>(),
    'Deactivate Role Success': props<{ role: IApplicationRoles }>(),
    'Deactivate Role Failure': props<{ error: string }>(),

    // Delete
    'Delete Role': props<{ applicationRoleId: string }>(),
    'Delete Role Success': props<{ applicationRoleId: string }>(),
    'Delete Role Failure': props<{ error: string }>(),

    // Selection
    'Select Role': props<{ role: IApplicationRoles | null }>(),

    // Filters
    'Set Search Term': props<{ searchTerm: string }>(),
    'Set Status Filter': props<{ statusFilter: string }>(),
    'Set Role Type Filter': props<{ roleTypeFilter: string }>(),

    // Dialogs
    'Open Create Dialog': emptyProps(),
    'Close Create Dialog': emptyProps(),
    'Open Edit Dialog': props<{ role: IApplicationRoles }>(),
    'Close Edit Dialog': emptyProps(),

    // Errors
    'Clear Errors': emptyProps(),

    // Reset
    'Reset State': emptyProps(),
  },
});
