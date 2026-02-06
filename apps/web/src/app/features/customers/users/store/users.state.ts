/**
 * Users State
 * 
 * Defines the state structure for users management
 */

import { IUsers } from '../../../../core/models/UsersModel';
import { IApplicationUsers } from '../../../../core/models/ApplicationUsersModel';
import { UserStatus } from '../../../../core/enums/UserStatusEnum';

export interface UserTableRow {
  user: IUsers;
  userStatus: UserStatus;
  applicationCount: number;
  applicationIds: string[];
  lastActivity: string;
}

export interface UsersState {
  // Core data
  users: IUsers[];
  applicationUserRecords: IApplicationUsers[];
  userRows: UserTableRow[];
  filteredUserRows: UserTableRow[];  // Computed by reducer
  selectedUser: IUsers | null;
  selectedUserId: string | null;

  // Filter state
  searchTerm: string;
  statusFilter: string;

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Operation states
  lastLoadedTimestamp: number | null;
}

export const initialUsersState: UsersState = {
  // Core data
  users: [],
  applicationUserRecords: [],
  userRows: [],
  filteredUserRows: [],
  selectedUser: null,
  selectedUserId: null,

  // Filter state
  searchTerm: '',
  statusFilter: '',

  // Loading states
  isLoading: false,
  error: null,

  // Operation states
  lastLoadedTimestamp: null,
};
