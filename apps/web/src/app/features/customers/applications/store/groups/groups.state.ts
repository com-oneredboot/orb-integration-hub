/**
 * Groups State
 *
 * Defines the state structure for application group management.
 * Follows the same patterns as ApplicationsState.
 *
 * @see .kiro/specs/application-access-management/design.md
 * _Requirements: 8.1, 8.5_
 */

import { IApplicationGroups } from '../../../../../core/models/ApplicationGroupsModel';
import { IApplicationGroupUsers } from '../../../../../core/models/ApplicationGroupUsersModel';

/**
 * Represents a row in the groups table with enriched data
 */
export interface GroupTableRow {
  group: IApplicationGroups;
  applicationId: string;
  memberCount: number;
  lastActivity: string;
}

/**
 * NgRx state for groups feature
 */
export interface GroupsState {
  // Core group data
  groups: IApplicationGroups[];
  groupRows: GroupTableRow[];
  filteredGroupRows: GroupTableRow[];
  selectedGroup: IApplicationGroups | null;

  // Group members
  groupMembers: IApplicationGroupUsers[];

  // Current application context
  currentApplicationId: string | null;

  // UI State
  isInCreateMode: boolean;
  isCreatingNew: boolean;

  // Filter state
  searchTerm: string;
  statusFilter: string;

  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  isLoadingMembers: boolean;

  // Error states
  error: string | null;
  saveError: string | null;
  deleteError: string | null;
  membersError: string | null;

  // Operation states
  lastCreatedGroup: IApplicationGroups | null;
  lastUpdatedGroup: IApplicationGroups | null;
  lastDeletedGroupId: string | null;
}

/**
 * Initial state for groups feature
 */
export const initialGroupsState: GroupsState = {
  // Core group data
  groups: [],
  groupRows: [],
  filteredGroupRows: [],
  selectedGroup: null,

  // Group members
  groupMembers: [],

  // Current application context
  currentApplicationId: null,

  // UI State
  isInCreateMode: false,
  isCreatingNew: false,

  // Filter state
  searchTerm: '',
  statusFilter: '',

  // Loading states
  isLoading: false,
  isSaving: false,
  isDeleting: false,
  isLoadingMembers: false,

  // Error states
  error: null,
  saveError: null,
  deleteError: null,
  membersError: null,

  // Operation states
  lastCreatedGroup: null,
  lastUpdatedGroup: null,
  lastDeletedGroupId: null,
};
