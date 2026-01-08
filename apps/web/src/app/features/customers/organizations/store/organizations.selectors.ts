/**
 * Organizations Selectors
 * 
 * Selectors for organization state management
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { OrganizationsState } from './organizations.state';

// Feature selector
export const selectOrganizationsState = createFeatureSelector<OrganizationsState>('organizations');

// Core data selectors
export const selectOrganizations = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state.organizations
);

export const selectOrganizationRows = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state.organizationRows
);

export const selectFilteredOrganizationRows = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state.filteredOrganizationRows
);

export const selectSelectedOrganization = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state.selectedOrganization
);

export const selectSelectedOrganizationMemberCount = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state.selectedOrganizationMemberCount
);

export const selectSelectedOrganizationApplicationCount = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state.selectedOrganizationApplicationCount
);

// UI state selectors
export const selectIsInCreateMode = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state.isInCreateMode
);

export const selectIsCreatingNew = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state.isCreatingNew
);

// Filter selectors
export const selectSearchTerm = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state.searchTerm
);

export const selectStatusFilter = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state.statusFilter
);

export const selectRoleFilter = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state.roleFilter
);

// Loading state selectors
export const selectIsLoading = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state.isLoading
);

export const selectIsSaving = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state.isSaving
);

export const selectIsDeleting = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state.isDeleting
);

// Error selectors
export const selectError = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state.error
);

export const selectSaveError = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state.saveError
);

export const selectDeleteError = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state.deleteError
);

// Operation result selectors
export const selectLastCreatedOrganization = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state.lastCreatedOrganization
);

export const selectLastUpdatedOrganization = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state.lastUpdatedOrganization
);

export const selectLastDeletedOrganizationId = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state.lastDeletedOrganizationId
);

// Computed selectors
export const selectHasOrganizations = createSelector(
  selectOrganizations,
  (organizations) => organizations.length > 0
);

export const selectOrganizationCount = createSelector(
  selectOrganizations,
  (organizations) => organizations.length
);

export const selectFilteredOrganizationCount = createSelector(
  selectFilteredOrganizationRows,
  (filteredRows) => filteredRows.length
);

export const selectHasFiltersApplied = createSelector(
  selectSearchTerm,
  selectStatusFilter,
  selectRoleFilter,
  (searchTerm, statusFilter, roleFilter) => 
    !!searchTerm || !!statusFilter || !!roleFilter
);

export const selectIsAnyOperationInProgress = createSelector(
  selectIsLoading,
  selectIsSaving,
  selectIsDeleting,
  (isLoading, isSaving, isDeleting) => isLoading || isSaving || isDeleting
);

export const selectHasAnyError = createSelector(
  selectError,
  selectSaveError,
  selectDeleteError,
  (error, saveError, deleteError) => !!error || !!saveError || !!deleteError
);

// Organization by ID selector (memoized)
export const selectOrganizationById = (organizationId: string) => createSelector(
  selectOrganizations,
  (organizations) => organizations.find(org => org.organizationId === organizationId)
);

// Organization row by ID selector (memoized)
export const selectOrganizationRowById = (organizationId: string) => createSelector(
  selectOrganizationRows,
  (organizationRows) => organizationRows.find(row => row.organization.organizationId === organizationId)
);