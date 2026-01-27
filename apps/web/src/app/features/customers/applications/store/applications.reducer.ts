/**
 * Applications Reducer
 *
 * Handles state changes for application management.
 * Follows the same patterns as OrganizationsReducer.
 *
 * @see .kiro/specs/applications-management/design.md
 * _Requirements: 5.1, 5.5_
 */

import { createReducer, on } from '@ngrx/store';
import { ApplicationsActions } from './applications.actions';
import {
  ApplicationsState,
  ApplicationTableRow,
  initialApplicationsState,
} from './applications.state';

export const applicationsReducer = createReducer(
  initialApplicationsState,

  // Load Applications
  on(
    ApplicationsActions.loadApplications,
    (state): ApplicationsState => ({
      ...state,
      isLoading: true,
      error: null,
    })
  ),

  on(
    ApplicationsActions.loadApplicationsSuccess,
    (state, { applications }): ApplicationsState => {
      // Convert applications to table rows (same pattern as organizations reducer)
      const applicationRows: ApplicationTableRow[] = applications.map((app) => ({
        application: app,
        organizationId: app.organizationId,
        organizationName: '', // Will be populated when we have org data
        environmentCount: app.environments?.length || 0,
        userRole: 'OWNER', // TODO: Get actual role from membership
        lastActivity: formatLastActivity(app.updatedAt)
      }));

      return {
        ...state,
        isLoading: false,
        applications,
        applicationRows,
        filteredApplicationRows: applicationRows,
        error: null,
      };
    }
  ),

  on(
    ApplicationsActions.loadApplicationsFailure,
    (state, { error }): ApplicationsState => ({
      ...state,
      isLoading: false,
      error,
    })
  ),

  // Load Single Application
  on(
    ApplicationsActions.loadApplication,
    (state): ApplicationsState => ({
      ...state,
      isLoading: true,
      error: null,
    })
  ),

  on(
    ApplicationsActions.loadApplicationSuccess,
    (state, { application }): ApplicationsState => ({
      ...state,
      isLoading: false,
      selectedApplication: application,
      error: null,
    })
  ),

  on(
    ApplicationsActions.loadApplicationFailure,
    (state, { error }): ApplicationsState => ({
      ...state,
      isLoading: false,
      error,
    })
  ),

  // Create Draft Application
  on(
    ApplicationsActions.createDraftApplication,
    (state): ApplicationsState => ({
      ...state,
      isCreatingNew: true,
      saveError: null,
    })
  ),

  on(
    ApplicationsActions.createDraftApplicationSuccess,
    (state, { application }): ApplicationsState => ({
      ...state,
      isCreatingNew: false,
      applications: [...state.applications, application],
      selectedApplication: application,
      lastCreatedApplication: application,
      saveError: null,
    })
  ),

  on(
    ApplicationsActions.createDraftApplicationFailure,
    (state, { error }): ApplicationsState => ({
      ...state,
      isCreatingNew: false,
      saveError: error,
    })
  ),

  // Create Application
  on(
    ApplicationsActions.createApplication,
    (state): ApplicationsState => ({
      ...state,
      isSaving: true,
      saveError: null,
    })
  ),

  on(
    ApplicationsActions.createApplicationSuccess,
    (state, { application }): ApplicationsState => {
      // Replace placeholder with actual application
      const updatedRows = state.applicationRows.map(row => {
        if (row.application.applicationId === 'new-app-placeholder') {
          return {
            ...row,
            application,
            lastActivity: formatLastActivity(application.updatedAt)
          };
        }
        return row;
      });

      // Also add to applications array if not already there
      const updatedApplications = state.applications.some(app => app.applicationId === application.applicationId)
        ? state.applications.map(app => app.applicationId === application.applicationId ? application : app)
        : [...state.applications, application];

      return {
        ...state,
        isSaving: false,
        isCreatingNew: false,
        isInCreateMode: false,
        applications: updatedApplications,
        applicationRows: updatedRows,
        filteredApplicationRows: updatedRows.filter(row => applyFilters(row, state.searchTerm, state.organizationFilter, state.statusFilter)),
        selectedApplication: application,
        lastCreatedApplication: application,
        saveError: null,
      };
    }
  ),

  on(
    ApplicationsActions.createApplicationFailure,
    (state, { error }): ApplicationsState => ({
      ...state,
      isSaving: false,
      saveError: error,
    })
  ),

  // Update Application
  on(
    ApplicationsActions.updateApplication,
    (state): ApplicationsState => ({
      ...state,
      isSaving: true,
      saveError: null,
    })
  ),

  on(
    ApplicationsActions.updateApplicationSuccess,
    (state, { application }): ApplicationsState => {
      // Update application in both arrays
      const updatedApplications = state.applications.map(app =>
        app.applicationId === application.applicationId ? application : app
      );

      const updatedRows = state.applicationRows.map(row =>
        row.application.applicationId === application.applicationId
          ? { ...row, application, lastActivity: formatLastActivity(application.updatedAt) }
          : row
      );

      return {
        ...state,
        isSaving: false,
        applications: updatedApplications,
        applicationRows: updatedRows,
        filteredApplicationRows: updatedRows.filter(row => applyFilters(row, state.searchTerm, state.organizationFilter, state.statusFilter)),
        selectedApplication:
          state.selectedApplication?.applicationId === application.applicationId
            ? application
            : state.selectedApplication,
        lastUpdatedApplication: application,
        saveError: null,
      };
    }
  ),

  on(
    ApplicationsActions.updateApplicationFailure,
    (state, { error }): ApplicationsState => ({
      ...state,
      isSaving: false,
      saveError: error,
    })
  ),

  // Delete Application
  on(
    ApplicationsActions.deleteApplication,
    (state): ApplicationsState => ({
      ...state,
      isDeleting: true,
      deleteError: null,
    })
  ),

  on(
    ApplicationsActions.deleteApplicationSuccess,
    (state, { applicationId }): ApplicationsState => {
      const updatedApplications = state.applications.filter(app => app.applicationId !== applicationId);
      const updatedRows = state.applicationRows.filter(row => row.application.applicationId !== applicationId);

      return {
        ...state,
        isDeleting: false,
        applications: updatedApplications,
        applicationRows: updatedRows,
        filteredApplicationRows: updatedRows.filter(row => applyFilters(row, state.searchTerm, state.organizationFilter, state.statusFilter)),
        selectedApplication:
          state.selectedApplication?.applicationId === applicationId
            ? null
            : state.selectedApplication,
        lastDeletedApplicationId: applicationId,
        deleteError: null,
      };
    }
  ),

  on(
    ApplicationsActions.deleteApplicationFailure,
    (state, { error }): ApplicationsState => ({
      ...state,
      isDeleting: false,
      deleteError: error,
    })
  ),

  // Selection Management
  on(
    ApplicationsActions.selectApplication,
    (state, { application }): ApplicationsState => ({
      ...state,
      selectedApplication: application,
    })
  ),

  // Create Mode Management
  on(
    ApplicationsActions.enterCreateMode,
    (state, { placeholderApplication }): ApplicationsState => {
      const placeholderRow: ApplicationTableRow = {
        application: placeholderApplication,
        organizationId: placeholderApplication.organizationId || '',
        organizationName: '',
        environmentCount: 0,
        userRole: 'OWNER',
        lastActivity: 'Just now'
      };

      const updatedRows = [placeholderRow, ...state.applicationRows];

      return {
        ...state,
        isInCreateMode: true,
        isCreatingNew: true,
        applicationRows: updatedRows,
        filteredApplicationRows: updatedRows.filter(row => applyFilters(row, state.searchTerm, state.organizationFilter, state.statusFilter)),
        selectedApplication: placeholderApplication,
      };
    }
  ),

  on(
    ApplicationsActions.exitCreateMode,
    (state): ApplicationsState => ({
      ...state,
      isInCreateMode: false,
      isCreatingNew: false,
    })
  ),

  on(
    ApplicationsActions.cancelCreateMode,
    (state): ApplicationsState => {
      // Remove placeholder from lists
      const updatedRows = state.applicationRows.filter(row => row.application.applicationId !== 'new-app-placeholder');

      return {
        ...state,
        isInCreateMode: false,
        isCreatingNew: false,
        applicationRows: updatedRows,
        filteredApplicationRows: updatedRows.filter(row => applyFilters(row, state.searchTerm, state.organizationFilter, state.statusFilter)),
        selectedApplication: null,
        saveError: null,
      };
    }
  ),

  // Filter Management
  on(
    ApplicationsActions.setSearchTerm,
    (state, { searchTerm }): ApplicationsState => {
      const filteredRows = state.applicationRows.filter(row =>
        applyFilters(row, searchTerm, state.organizationFilter, state.statusFilter)
      );

      return {
        ...state,
        searchTerm,
        filteredApplicationRows: filteredRows,
      };
    }
  ),

  on(
    ApplicationsActions.setOrganizationFilter,
    (state, { organizationFilter }): ApplicationsState => {
      const filteredRows = state.applicationRows.filter(row =>
        applyFilters(row, state.searchTerm, organizationFilter, state.statusFilter)
      );

      return {
        ...state,
        organizationFilter,
        filteredApplicationRows: filteredRows,
      };
    }
  ),

  on(
    ApplicationsActions.setStatusFilter,
    (state, { statusFilter }): ApplicationsState => {
      const filteredRows = state.applicationRows.filter(row =>
        applyFilters(row, state.searchTerm, state.organizationFilter, statusFilter)
      );

      return {
        ...state,
        statusFilter,
        filteredApplicationRows: filteredRows,
      };
    }
  ),

  on(
    ApplicationsActions.applyFilters,
    (state): ApplicationsState => {
      const filteredRows = state.applicationRows.filter(row =>
        applyFilters(row, state.searchTerm, state.organizationFilter, state.statusFilter)
      );

      return {
        ...state,
        filteredApplicationRows: filteredRows,
      };
    }
  ),

  // Application Rows Management
  on(
    ApplicationsActions.updateApplicationRows,
    (state, { applicationRows }): ApplicationsState => {
      const filteredRows = applicationRows.filter(row =>
        applyFilters(row, state.searchTerm, state.organizationFilter, state.statusFilter)
      );

      return {
        ...state,
        applicationRows,
        filteredApplicationRows: filteredRows,
      };
    }
  ),

  // Error Management
  on(
    ApplicationsActions.clearErrors,
    (state): ApplicationsState => ({
      ...state,
      error: null,
      saveError: null,
      deleteError: null,
    })
  ),

  on(
    ApplicationsActions.clearSaveError,
    (state): ApplicationsState => ({
      ...state,
      saveError: null,
    })
  ),

  on(
    ApplicationsActions.clearDeleteError,
    (state): ApplicationsState => ({
      ...state,
      deleteError: null,
    })
  ),

  // UI State Management
  on(
    ApplicationsActions.setLoading,
    (state, { isLoading }): ApplicationsState => ({
      ...state,
      isLoading,
    })
  ),

  on(
    ApplicationsActions.setSaving,
    (state, { isSaving }): ApplicationsState => ({
      ...state,
      isSaving,
    })
  ),

  on(
    ApplicationsActions.setDeleting,
    (state, { isDeleting }): ApplicationsState => ({
      ...state,
      isDeleting,
    })
  ),

  // Utility Actions
  on(
    ApplicationsActions.resetState,
    (): ApplicationsState => ({
      ...initialApplicationsState,
    })
  ),

  on(
    ApplicationsActions.refreshApplications,
    (state): ApplicationsState => ({
      ...state,
      isLoading: true,
      error: null,
    })
  )
);

// Helper function to apply filters
function applyFilters(
  row: ApplicationTableRow,
  searchTerm: string,
  organizationFilter: string,
  statusFilter: string
): boolean {
  const matchesSearch = !searchTerm ||
    row.application.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.application.applicationId.toLowerCase().includes(searchTerm.toLowerCase());

  const matchesOrganization = !organizationFilter ||
    row.organizationId === organizationFilter;

  const matchesStatus = !statusFilter ||
    row.application.status === statusFilter;

  return matchesSearch && matchesOrganization && matchesStatus;
}

// Helper function to format last activity as relative time
function formatLastActivity(dateValue: string | Date | number | undefined): string {
  if (!dateValue) return 'Never';
  const date = typeof dateValue === 'number' ? new Date(dateValue * 1000)
    : dateValue instanceof Date ? dateValue : new Date(dateValue);
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
