/**
 * Application Roles State
 *
 * Defines the state structure for application role management.
 * Follows the Organizations/Environments store pattern as the canonical reference.
 *
 * @see .kiro/specs/application-roles-management/design.md
 * _Requirements: 8.1_
 */

import { IApplicationRoles } from '../../../../../core/models/ApplicationRolesModel';

/**
 * Represents a row in the roles table with enriched data
 */
export interface ApplicationRoleTableRow {
  role: IApplicationRoles;
  roleTypeLabel: string;
  statusLabel: string;
  lastActivity: string;
}

/**
 * NgRx state for application roles feature
 */
export interface ApplicationRolesState {
  // Core data
  roles: IApplicationRoles[];
  roleRows: ApplicationRoleTableRow[];
  filteredRoleRows: ApplicationRoleTableRow[];
  selectedRole: IApplicationRoles | null;

  // Context
  applicationId: string | null;
  organizationId: string | null;

  // Filter state
  searchTerm: string;
  statusFilter: string;
  roleTypeFilter: string;

  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;

  // Error states
  error: string | null;
  createError: string | null;
  updateError: string | null;
  deleteError: string | null;

  // Dialog state
  showCreateDialog: boolean;
  showEditDialog: boolean;
}

/**
 * Initial state for application roles feature
 */
export const initialApplicationRolesState: ApplicationRolesState = {
  // Core data
  roles: [],
  roleRows: [],
  filteredRoleRows: [],
  selectedRole: null,

  // Context
  applicationId: null,
  organizationId: null,

  // Filter state
  searchTerm: '',
  statusFilter: '',
  roleTypeFilter: '',

  // Loading states
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,

  // Error states
  error: null,
  createError: null,
  updateError: null,
  deleteError: null,

  // Dialog state
  showCreateDialog: false,
  showEditDialog: false,
};
