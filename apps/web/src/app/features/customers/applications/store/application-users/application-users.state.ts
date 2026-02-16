/**
 * Application Users State
 * 
 * Defines the state structure for application user management
 */

import { IUsers } from '../../../../../core/models/UsersModel';
import { IApplicationUsers } from '../../../../../core/models/ApplicationUsersModel';

export interface EnvironmentRoleAssignment {
  environmentId: string;
  environmentName: string;
  roleId: string;
  roleName: string;
}

export interface ApplicationUserTableRow {
  user: IUsers;
  applicationUser: IApplicationUsers;
  roleAssignments: EnvironmentRoleAssignment[];
  lastActivity: string;
}

export interface ApplicationUsersState {
  // Core data
  applicationUsers: IApplicationUsers[];
  users: IUsers[];
  userRows: ApplicationUserTableRow[];
  filteredUserRows: ApplicationUserTableRow[];

  // Filter state
  searchTerm: string;
  roleFilter: string;
  environmentFilter: string;

  // Loading states
  isLoading: boolean;
  isAssigning: boolean;
  isUnassigning: boolean;
  isUpdatingRole: boolean;

  // Error states
  error: string | null;
  assignError: string | null;
  unassignError: string | null;
  roleUpdateError: string | null;

  // Operation states
  lastAssignedUser: IUsers | null;
  lastUnassignedUserId: string | null;
}

export const initialApplicationUsersState: ApplicationUsersState = {
  // Core data
  applicationUsers: [],
  users: [],
  userRows: [],
  filteredUserRows: [],

  // Filter state
  searchTerm: '',
  roleFilter: '',
  environmentFilter: '',

  // Loading states
  isLoading: false,
  isAssigning: false,
  isUnassigning: false,
  isUpdatingRole: false,

  // Error states
  error: null,
  assignError: null,
  unassignError: null,
  roleUpdateError: null,

  // Operation states
  lastAssignedUser: null,
  lastUnassignedUserId: null
};
