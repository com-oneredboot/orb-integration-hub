/**
 * Application Roles Reducer
 *
 * Handles state changes for application roles management.
 * Follows the Organizations/Environments store pattern as the canonical reference.
 *
 * @see .kiro/specs/application-roles-management/design.md
 * _Requirements: 8.5_
 */

import { createReducer, on } from '@ngrx/store';
import { ApplicationRolesActions } from './application-roles.actions';
import {
  ApplicationRolesState,
  initialApplicationRolesState,
  ApplicationRoleTableRow,
} from './application-roles.state';
import { IApplicationRoles } from '../../../../../core/models/ApplicationRolesModel';
import { ApplicationRoleStatus } from '../../../../../core/enums/ApplicationRoleStatusEnum';
import { ApplicationRoleType } from '../../../../../core/enums/ApplicationRoleTypeEnum';

export const applicationRolesReducer = createReducer(
  initialApplicationRolesState,

  // Set Application Context
  on(
    ApplicationRolesActions.setApplicationContext,
    (state, { applicationId, organizationId }): ApplicationRolesState => ({
      ...state,
      applicationId,
      organizationId,
    })
  ),

  // Load Roles
  on(
    ApplicationRolesActions.loadRoles,
    (state): ApplicationRolesState => ({
      ...state,
      isLoading: true,
      error: null,
    })
  ),

  on(
    ApplicationRolesActions.loadRolesSuccess,
    (state, { roles }): ApplicationRolesState => {
      const roleRows = buildRoleRows(roles);

      return {
        ...state,
        isLoading: false,
        roles,
        roleRows,
        filteredRoleRows: applyAllFilters(
          roleRows,
          state.searchTerm,
          state.statusFilter,
          state.roleTypeFilter
        ),
        error: null,
      };
    }
  ),

  on(
    ApplicationRolesActions.loadRolesFailure,
    (state, { error }): ApplicationRolesState => ({
      ...state,
      isLoading: false,
      error,
    })
  ),

  // Create Role
  on(
    ApplicationRolesActions.createRole,
    (state): ApplicationRolesState => ({
      ...state,
      isCreating: true,
      createError: null,
    })
  ),

  on(
    ApplicationRolesActions.createRoleSuccess,
    (state, { role }): ApplicationRolesState => {
      const updatedRoles = [...state.roles, role];
      const roleRows = buildRoleRows(updatedRoles);

      return {
        ...state,
        isCreating: false,
        roles: updatedRoles,
        roleRows,
        filteredRoleRows: applyAllFilters(
          roleRows,
          state.searchTerm,
          state.statusFilter,
          state.roleTypeFilter
        ),
        showCreateDialog: false,
        createError: null,
      };
    }
  ),

  on(
    ApplicationRolesActions.createRoleFailure,
    (state, { error }): ApplicationRolesState => ({
      ...state,
      isCreating: false,
      createError: error,
    })
  ),

  // Update Role
  on(
    ApplicationRolesActions.updateRole,
    (state): ApplicationRolesState => ({
      ...state,
      isUpdating: true,
      updateError: null,
    })
  ),

  on(
    ApplicationRolesActions.updateRoleSuccess,
    (state, { role }): ApplicationRolesState => {
      const updatedRoles = state.roles.map((r) =>
        r.applicationRoleId === role.applicationRoleId ? role : r
      );
      const roleRows = buildRoleRows(updatedRoles);

      return {
        ...state,
        isUpdating: false,
        roles: updatedRoles,
        roleRows,
        filteredRoleRows: applyAllFilters(
          roleRows,
          state.searchTerm,
          state.statusFilter,
          state.roleTypeFilter
        ),
        showEditDialog: false,
        selectedRole: null,
        updateError: null,
      };
    }
  ),

  on(
    ApplicationRolesActions.updateRoleFailure,
    (state, { error }): ApplicationRolesState => ({
      ...state,
      isUpdating: false,
      updateError: error,
    })
  ),

  // Deactivate Role
  on(
    ApplicationRolesActions.deactivateRole,
    (state): ApplicationRolesState => ({
      ...state,
      isUpdating: true,
      updateError: null,
    })
  ),

  on(
    ApplicationRolesActions.deactivateRoleSuccess,
    (state, { role }): ApplicationRolesState => {
      const updatedRoles = state.roles.map((r) =>
        r.applicationRoleId === role.applicationRoleId ? role : r
      );
      const roleRows = buildRoleRows(updatedRoles);

      return {
        ...state,
        isUpdating: false,
        roles: updatedRoles,
        roleRows,
        filteredRoleRows: applyAllFilters(
          roleRows,
          state.searchTerm,
          state.statusFilter,
          state.roleTypeFilter
        ),
        showEditDialog: false,
        selectedRole: null,
        updateError: null,
      };
    }
  ),

  on(
    ApplicationRolesActions.deactivateRoleFailure,
    (state, { error }): ApplicationRolesState => ({
      ...state,
      isUpdating: false,
      updateError: error,
    })
  ),

  // Delete Role
  on(
    ApplicationRolesActions.deleteRole,
    (state): ApplicationRolesState => ({
      ...state,
      isDeleting: true,
      deleteError: null,
    })
  ),

  on(
    ApplicationRolesActions.deleteRoleSuccess,
    (state, { applicationRoleId }): ApplicationRolesState => {
      const updatedRoles = state.roles.filter(
        (r) => r.applicationRoleId !== applicationRoleId
      );
      const roleRows = buildRoleRows(updatedRoles);

      return {
        ...state,
        isDeleting: false,
        roles: updatedRoles,
        roleRows,
        filteredRoleRows: applyAllFilters(
          roleRows,
          state.searchTerm,
          state.statusFilter,
          state.roleTypeFilter
        ),
        showEditDialog: false,
        selectedRole: null,
        deleteError: null,
      };
    }
  ),

  on(
    ApplicationRolesActions.deleteRoleFailure,
    (state, { error }): ApplicationRolesState => ({
      ...state,
      isDeleting: false,
      deleteError: error,
    })
  ),

  // Selection
  on(
    ApplicationRolesActions.selectRole,
    (state, { role }): ApplicationRolesState => ({
      ...state,
      selectedRole: role,
    })
  ),

  // Filters
  on(
    ApplicationRolesActions.setSearchTerm,
    (state, { searchTerm }): ApplicationRolesState => {
      const filteredRows = applyAllFilters(
        state.roleRows,
        searchTerm,
        state.statusFilter,
        state.roleTypeFilter
      );

      return {
        ...state,
        searchTerm,
        filteredRoleRows: filteredRows,
      };
    }
  ),

  on(
    ApplicationRolesActions.setStatusFilter,
    (state, { statusFilter }): ApplicationRolesState => {
      const filteredRows = applyAllFilters(
        state.roleRows,
        state.searchTerm,
        statusFilter,
        state.roleTypeFilter
      );

      return {
        ...state,
        statusFilter,
        filteredRoleRows: filteredRows,
      };
    }
  ),

  on(
    ApplicationRolesActions.setRoleTypeFilter,
    (state, { roleTypeFilter }): ApplicationRolesState => {
      const filteredRows = applyAllFilters(
        state.roleRows,
        state.searchTerm,
        state.statusFilter,
        roleTypeFilter
      );

      return {
        ...state,
        roleTypeFilter,
        filteredRoleRows: filteredRows,
      };
    }
  ),

  // Dialogs
  on(
    ApplicationRolesActions.openCreateDialog,
    (state): ApplicationRolesState => ({
      ...state,
      showCreateDialog: true,
      createError: null,
    })
  ),

  on(
    ApplicationRolesActions.closeCreateDialog,
    (state): ApplicationRolesState => ({
      ...state,
      showCreateDialog: false,
      createError: null,
    })
  ),

  on(
    ApplicationRolesActions.openEditDialog,
    (state, { role }): ApplicationRolesState => ({
      ...state,
      showEditDialog: true,
      selectedRole: role,
      updateError: null,
      deleteError: null,
    })
  ),

  on(
    ApplicationRolesActions.closeEditDialog,
    (state): ApplicationRolesState => ({
      ...state,
      showEditDialog: false,
      selectedRole: null,
      updateError: null,
      deleteError: null,
    })
  ),

  // Errors
  on(
    ApplicationRolesActions.clearErrors,
    (state): ApplicationRolesState => ({
      ...state,
      error: null,
      createError: null,
      updateError: null,
      deleteError: null,
    })
  ),

  // Reset
  on(
    ApplicationRolesActions.resetState,
    (): ApplicationRolesState => ({
      ...initialApplicationRolesState,
    })
  )
);

/**
 * Build role table rows from raw data
 * _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6_
 */
function buildRoleRows(roles: IApplicationRoles[]): ApplicationRoleTableRow[] {
  return roles.map((role) => ({
    role,
    roleTypeLabel: getRoleTypeLabel(role.roleType),
    statusLabel: getStatusLabel(role.status),
    lastActivity: formatLastActivity(role.updatedAt),
  }));
}

/**
 * Get human-readable label for role type
 */
function getRoleTypeLabel(roleType: string): string {
  const labels: Record<string, string> = {
    [ApplicationRoleType.Admin]: 'Admin',
    [ApplicationRoleType.User]: 'User',
    [ApplicationRoleType.Guest]: 'Guest',
    [ApplicationRoleType.Custom]: 'Custom',
    [ApplicationRoleType.Unknown]: 'Unknown',
  };
  return labels[roleType] || roleType;
}

/**
 * Get human-readable label for status
 */
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    [ApplicationRoleStatus.Active]: 'Active',
    [ApplicationRoleStatus.Inactive]: 'Inactive',
    [ApplicationRoleStatus.Deleted]: 'Deleted',
    [ApplicationRoleStatus.Pending]: 'Pending',
    [ApplicationRoleStatus.Rejected]: 'Rejected',
    [ApplicationRoleStatus.Unknown]: 'Unknown',
  };
  return labels[status] || status;
}

/**
 * Apply all filters to role rows
 * _Requirements: 8.5_
 */
function applyAllFilters(
  rows: ApplicationRoleTableRow[],
  searchTerm: string,
  statusFilter: string,
  roleTypeFilter: string
): ApplicationRoleTableRow[] {
  return rows.filter((row) => {
    const matchesSearch =
      !searchTerm ||
      row.role.roleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (row.role.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    const matchesStatus = !statusFilter || row.role.status === statusFilter;

    const matchesRoleType = !roleTypeFilter || row.role.roleType === roleTypeFilter;

    return matchesSearch && matchesStatus && matchesRoleType;
  });
}

/**
 * Format last activity as relative time
 */
function formatLastActivity(dateValue: string | Date | number | undefined): string {
  if (!dateValue) return 'Never';
  const date =
    typeof dateValue === 'number'
      ? new Date(dateValue * 1000)
      : dateValue instanceof Date
        ? dateValue
        : new Date(dateValue);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return diffMins + ' min ago';
  if (diffHours < 24) return diffHours + ' hour' + (diffHours > 1 ? 's' : '') + ' ago';
  if (diffDays < 7) return diffDays + ' day' + (diffDays > 1 ? 's' : '') + ' ago';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
