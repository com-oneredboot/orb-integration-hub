/**
 * Organizations Selectors
 * 
 * Selectors for organization state management
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { OrganizationsState, initialOrganizationsState } from './organizations.state';

// Feature selector
export const selectOrganizationsState = createFeatureSelector<OrganizationsState>('organizations');

// Core data selectors
export const selectOrganizations = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state?.organizations ?? initialOrganizationsState.organizations
);

export const selectOrganizationRows = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state?.organizationRows ?? initialOrganizationsState.organizationRows
);

export const selectFilteredOrganizationRows = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state?.filteredOrganizationRows ?? initialOrganizationsState.filteredOrganizationRows
);

export const selectSelectedOrganization = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state?.selectedOrganization ?? initialOrganizationsState.selectedOrganization
);

export const selectSelectedOrganizationMemberCount = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state?.selectedOrganizationMemberCount ?? initialOrganizationsState.selectedOrganizationMemberCount
);

export const selectSelectedOrganizationApplicationCount = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state?.selectedOrganizationApplicationCount ?? initialOrganizationsState.selectedOrganizationApplicationCount
);

// UI state selectors
export const selectIsInCreateMode = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state?.isInCreateMode ?? initialOrganizationsState.isInCreateMode
);

export const selectIsCreatingNew = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state?.isCreatingNew ?? initialOrganizationsState.isCreatingNew
);

// Filter selectors
export const selectSearchTerm = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state?.searchTerm ?? initialOrganizationsState.searchTerm
);

export const selectStatusFilter = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state?.statusFilter ?? initialOrganizationsState.statusFilter
);

export const selectRoleFilter = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state?.roleFilter ?? initialOrganizationsState.roleFilter
);

// Loading state selectors
export const selectIsLoading = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state?.isLoading ?? initialOrganizationsState.isLoading
);

export const selectIsSaving = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state?.isSaving ?? initialOrganizationsState.isSaving
);

export const selectIsDeleting = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state?.isDeleting ?? initialOrganizationsState.isDeleting
);

// Error selectors
export const selectError = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state?.error ?? initialOrganizationsState.error
);

export const selectSaveError = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state?.saveError ?? initialOrganizationsState.saveError
);

export const selectDeleteError = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state?.deleteError ?? initialOrganizationsState.deleteError
);

// Operation result selectors
export const selectLastCreatedOrganization = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state?.lastCreatedOrganization ?? initialOrganizationsState.lastCreatedOrganization
);

export const selectLastUpdatedOrganization = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state?.lastUpdatedOrganization ?? initialOrganizationsState.lastUpdatedOrganization
);

export const selectLastDeletedOrganizationId = createSelector(
  selectOrganizationsState,
  (state: OrganizationsState) => state?.lastDeletedOrganizationId ?? initialOrganizationsState.lastDeletedOrganizationId
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