/**
 * Application Roles Selectors
 *
 * Selectors for application roles state management.
 * Follows the Organizations/Environments store pattern as the canonical reference.
 *
 * @see .kiro/specs/application-roles-management/design.md
 * _Requirements: 8.1_
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ApplicationRolesState, initialApplicationRolesState } from './application-roles.state';
import { ApplicationRoleStatus } from '../../../../../core/enums/ApplicationRoleStatusEnum';

// Feature selector
export const selectApplicationRolesState =
  createFeatureSelector<ApplicationRolesState>('applicationRoles');

// Core data selectors
export const selectRoles = createSelector(
  selectApplicationRolesState,
  (state: ApplicationRolesState) => state?.roles ?? initialApplicationRolesState.roles
);

export const selectRoleRows = createSelector(
  selectApplicationRolesState,
  (state: ApplicationRolesState) => state?.roleRows ?? initialApplicationRolesState.roleRows
);

export const selectFilteredRoleRows = createSelector(
  selectApplicationRolesState,
  (state: ApplicationRolesState) =>
    state?.filteredRoleRows ?? initialApplicationRolesState.filteredRoleRows
);

export const selectSelectedRole = createSelector(
  selectApplicationRolesState,
  (state: ApplicationRolesState) =>
    state?.selectedRole ?? initialApplicationRolesState.selectedRole
);

// Context selectors
export const selectApplicationId = createSelector(
  selectApplicationRolesState,
  (state: ApplicationRolesState) =>
    state?.applicationId ?? initialApplicationRolesState.applicationId
);

export const selectOrganizationId = createSelector(
  selectApplicationRolesState,
  (state: ApplicationRolesState) =>
    state?.organizationId ?? initialApplicationRolesState.organizationId
);

// Filter selectors
export const selectSearchTerm = createSelector(
  selectApplicationRolesState,
  (state: ApplicationRolesState) => state?.searchTerm ?? initialApplicationRolesState.searchTerm
);

export const selectStatusFilter = createSelector(
  selectApplicationRolesState,
  (state: ApplicationRolesState) =>
    state?.statusFilter ?? initialApplicationRolesState.statusFilter
);

export const selectRoleTypeFilter = createSelector(
  selectApplicationRolesState,
  (state: ApplicationRolesState) =>
    state?.roleTypeFilter ?? initialApplicationRolesState.roleTypeFilter
);

// Loading state selectors
export const selectIsLoading = createSelector(
  selectApplicationRolesState,
  (state: ApplicationRolesState) => state?.isLoading ?? initialApplicationRolesState.isLoading
);

export const selectIsCreating = createSelector(
  selectApplicationRolesState,
  (state: ApplicationRolesState) => state?.isCreating ?? initialApplicationRolesState.isCreating
);

export const selectIsUpdating = createSelector(
  selectApplicationRolesState,
  (state: ApplicationRolesState) => state?.isUpdating ?? initialApplicationRolesState.isUpdating
);

export const selectIsDeleting = createSelector(
  selectApplicationRolesState,
  (state: ApplicationRolesState) => state?.isDeleting ?? initialApplicationRolesState.isDeleting
);

// Error selectors
export const selectError = createSelector(
  selectApplicationRolesState,
  (state: ApplicationRolesState) => state?.error ?? initialApplicationRolesState.error
);

export const selectCreateError = createSelector(
  selectApplicationRolesState,
  (state: ApplicationRolesState) => state?.createError ?? initialApplicationRolesState.createError
);

export const selectUpdateError = createSelector(
  selectApplicationRolesState,
  (state: ApplicationRolesState) => state?.updateError ?? initialApplicationRolesState.updateError
);

export const selectDeleteError = createSelector(
  selectApplicationRolesState,
  (state: ApplicationRolesState) => state?.deleteError ?? initialApplicationRolesState.deleteError
);

// Dialog selectors
export const selectShowCreateDialog = createSelector(
  selectApplicationRolesState,
  (state: ApplicationRolesState) =>
    state?.showCreateDialog ?? initialApplicationRolesState.showCreateDialog
);

export const selectShowEditDialog = createSelector(
  selectApplicationRolesState,
  (state: ApplicationRolesState) =>
    state?.showEditDialog ?? initialApplicationRolesState.showEditDialog
);

// Computed selectors
export const selectHasRoles = createSelector(selectRoleRows, (rows) => rows.length > 0);

export const selectRoleCount = createSelector(selectRoleRows, (rows) => rows.length);

export const selectActiveRoleCount = createSelector(selectRoles, (roles) =>
  roles.filter((r) => r.status === ApplicationRoleStatus.Active).length
);

export const selectFilteredRoleCount = createSelector(
  selectFilteredRoleRows,
  (filteredRows) => filteredRows.length
);

export const selectHasFiltersApplied = createSelector(
  selectSearchTerm,
  selectStatusFilter,
  selectRoleTypeFilter,
  (searchTerm, statusFilter, roleTypeFilter) =>
    !!searchTerm || !!statusFilter || !!roleTypeFilter
);
