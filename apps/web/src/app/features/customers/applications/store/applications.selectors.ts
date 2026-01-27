/**
 * Applications Selectors
 *
 * Selectors for application state management.
 * Follows the same patterns as OrganizationsSelectors.
 *
 * @see .kiro/specs/applications-management/design.md
 * _Requirements: 5.2, 5.4_
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ApplicationsState, initialApplicationsState } from './applications.state';

// Feature selector
export const selectApplicationsState =
  createFeatureSelector<ApplicationsState>('applications');

// Core data selectors
export const selectApplications = createSelector(
  selectApplicationsState,
  (state: ApplicationsState) =>
    state?.applications ?? initialApplicationsState.applications
);

export const selectApplicationRows = createSelector(
  selectApplicationsState,
  (state: ApplicationsState) =>
    state?.applicationRows ?? initialApplicationsState.applicationRows
);

export const selectSelectedApplication = createSelector(
  selectApplicationsState,
  (state: ApplicationsState) =>
    state?.selectedApplication ?? initialApplicationsState.selectedApplication
);

// Filter selectors
export const selectSearchTerm = createSelector(
  selectApplicationsState,
  (state: ApplicationsState) =>
    state?.searchTerm ?? initialApplicationsState.searchTerm
);

export const selectOrganizationFilter = createSelector(
  selectApplicationsState,
  (state: ApplicationsState) =>
    state?.organizationFilter ?? initialApplicationsState.organizationFilter
);

export const selectStatusFilter = createSelector(
  selectApplicationsState,
  (state: ApplicationsState) =>
    state?.statusFilter ?? initialApplicationsState.statusFilter
);

// Filtered applications selector (applies all filters)
export const selectFilteredApplicationRows = createSelector(
  selectApplicationRows,
  selectSearchTerm,
  selectOrganizationFilter,
  selectStatusFilter,
  (applicationRows, searchTerm, organizationFilter, statusFilter) => {
    let filtered = applicationRows;

    // Apply search term filter (case-insensitive name search)
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter((row) =>
        row.application.name.toLowerCase().includes(lowerSearch)
      );
    }

    // Apply organization filter
    if (organizationFilter) {
      filtered = filtered.filter(
        (row) => row.organizationId === organizationFilter
      );
    }

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(
        (row) => row.application.status === statusFilter
      );
    }

    return filtered;
  }
);

// UI state selectors
export const selectIsInCreateMode = createSelector(
  selectApplicationsState,
  (state: ApplicationsState) =>
    state?.isInCreateMode ?? initialApplicationsState.isInCreateMode
);

export const selectIsCreatingNew = createSelector(
  selectApplicationsState,
  (state: ApplicationsState) =>
    state?.isCreatingNew ?? initialApplicationsState.isCreatingNew
);

// Loading state selectors
export const selectIsLoading = createSelector(
  selectApplicationsState,
  (state: ApplicationsState) =>
    state?.isLoading ?? initialApplicationsState.isLoading
);

export const selectIsSaving = createSelector(
  selectApplicationsState,
  (state: ApplicationsState) =>
    state?.isSaving ?? initialApplicationsState.isSaving
);

export const selectIsDeleting = createSelector(
  selectApplicationsState,
  (state: ApplicationsState) =>
    state?.isDeleting ?? initialApplicationsState.isDeleting
);

// Error selectors
export const selectError = createSelector(
  selectApplicationsState,
  (state: ApplicationsState) =>
    state?.error ?? initialApplicationsState.error
);

export const selectSaveError = createSelector(
  selectApplicationsState,
  (state: ApplicationsState) =>
    state?.saveError ?? initialApplicationsState.saveError
);

export const selectDeleteError = createSelector(
  selectApplicationsState,
  (state: ApplicationsState) =>
    state?.deleteError ?? initialApplicationsState.deleteError
);

// Operation result selectors
export const selectLastCreatedApplication = createSelector(
  selectApplicationsState,
  (state: ApplicationsState) =>
    state?.lastCreatedApplication ?? initialApplicationsState.lastCreatedApplication
);

export const selectLastUpdatedApplication = createSelector(
  selectApplicationsState,
  (state: ApplicationsState) =>
    state?.lastUpdatedApplication ?? initialApplicationsState.lastUpdatedApplication
);

export const selectLastDeletedApplicationId = createSelector(
  selectApplicationsState,
  (state: ApplicationsState) =>
    state?.lastDeletedApplicationId ?? initialApplicationsState.lastDeletedApplicationId
);

// Computed selectors
export const selectHasApplications = createSelector(
  selectApplications,
  (applications) => applications.length > 0
);

export const selectApplicationCount = createSelector(
  selectApplications,
  (applications) => applications.length
);

export const selectFilteredApplicationCount = createSelector(
  selectFilteredApplicationRows,
  (filteredRows) => filteredRows.length
);

export const selectHasFiltersApplied = createSelector(
  selectSearchTerm,
  selectOrganizationFilter,
  selectStatusFilter,
  (searchTerm, organizationFilter, statusFilter) =>
    !!searchTerm || !!organizationFilter || !!statusFilter
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

// Application by ID selector (memoized)
export const selectApplicationById = (applicationId: string) =>
  createSelector(selectApplications, (applications) =>
    applications.find((app) => app.applicationId === applicationId)
  );

// Application row by ID selector (memoized)
export const selectApplicationRowById = (applicationId: string) =>
  createSelector(selectApplicationRows, (applicationRows) =>
    applicationRows.find(
      (row) => row.application.applicationId === applicationId
    )
  );
