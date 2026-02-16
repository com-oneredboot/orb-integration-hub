/**
 * Users State
 * 
 * Defines the state structure for application users management.
 * Uses GetApplicationUsers Lambda query to retrieve users with their role assignments.
 */

import { UserWithRoles, RoleAssignment } from '../../../../core/graphql/GetApplicationUsers.graphql';

export interface UserTableRow {
  user: UserWithRoles;
  userStatus: string;
  roleCount: number;
  environments: string[];
  organizationNames: string[];
  applicationNames: string[];
  lastActivity: string;
  roleAssignments: RoleAssignment[];
}

export interface UsersState {
  // Core data
  usersWithRoles: UserWithRoles[];
  userRows: UserTableRow[];
  filteredUserRows: UserTableRow[];  // Computed by reducer
  selectedUser: UserWithRoles | null;
  selectedUserId: string | null;

  // Filter state - Server-side (trigger reload)
  organizationIds: string[];
  applicationIds: string[];
  environment: string | null;
  
  // Filter state - Client-side (no reload)
  searchTerm: string;
  statusFilter: string;

  // Pagination
  nextToken: string | null;
  hasMore: boolean;

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Operation states
  lastLoadedTimestamp: number | null;
}

export const initialUsersState: UsersState = {
  // Core data
  usersWithRoles: [],
  userRows: [],
  filteredUserRows: [],
  selectedUser: null,
  selectedUserId: null,

  // Filter state - Server-side
  organizationIds: [],
  applicationIds: [],
  environment: null,
  
  // Filter state - Client-side
  searchTerm: '',
  statusFilter: '',

  // Pagination
  nextToken: null,
  hasMore: false,

  // Loading states
  isLoading: false,
  error: null,

  // Operation states
  lastLoadedTimestamp: null,
};

