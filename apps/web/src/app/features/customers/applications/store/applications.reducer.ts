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
    (state, { applications }): ApplicationsState => ({
      ...state,
      isLoading: false,
      applications,
      // Note: applicationRows will be updated by the effect dispatching updateApplicationRows
      // or can be derived via selectors
      error: null,
    })
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
      // Check if application already exists (update) or is new (add)
      const exists = state.applications.some(
        (app) => app.applicationId === application.applicationId
      );
      const updatedApplications = exists
        ? state.applications.map((app) =>
            app.applicationId === application.applicationId ? application : app
          )
        : [...state.applications, application];

      return {
        ...state,
        isSaving: false,
        isCreatingNew: false,
        isInCreateMode: false,
        applications: updatedApplications,
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
      const updatedApplications = state.applications.map((app) =>
        app.applicationId === application.applicationId ? application : app
      );

      const updatedRows = state.applicationRows.map((row) =>
        row.application.applicationId === application.applicationId
          ? { ...row, application }
          : row
      );

      return {
        ...state,
        isSaving: false,
        applications: updatedApplications,
        applicationRows: updatedRows,
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
      const updatedApplications = state.applications.filter(
        (app) => app.applicationId !== applicationId
      );
      const updatedRows = state.applicationRows.filter(
        (row) => row.application.applicationId !== applicationId
      );

      return {
        ...state,
        isDeleting: false,
        applications: updatedApplications,
        applicationRows: updatedRows,
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
    (state, { placeholderApplication }): ApplicationsState => ({
      ...state,
      isInCreateMode: true,
      isCreatingNew: true,
      selectedApplication: placeholderApplication,
    })
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
    (state): ApplicationsState => ({
      ...state,
      isInCreateMode: false,
      isCreatingNew: false,
      selectedApplication: null,
      saveError: null,
    })
  ),

  // Filter Management
  on(
    ApplicationsActions.setSearchTerm,
    (state, { searchTerm }): ApplicationsState => ({
      ...state,
      searchTerm,
    })
  ),

  on(
    ApplicationsActions.setOrganizationFilter,
    (state, { organizationFilter }): ApplicationsState => ({
      ...state,
      organizationFilter,
    })
  ),

  on(
    ApplicationsActions.setStatusFilter,
    (state, { statusFilter }): ApplicationsState => ({
      ...state,
      statusFilter,
    })
  ),

  on(ApplicationsActions.applyFilters, (state): ApplicationsState => state),

  // Application Rows Management
  on(
    ApplicationsActions.updateApplicationRows,
    (state, { applicationRows }): ApplicationsState => ({
      ...state,
      applicationRows,
    })
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
