/**
 * Organizations Reducer
 * 
 * Handles state changes for organization management
 */

import { createReducer, on } from '@ngrx/store';
import { OrganizationsActions } from './organizations.actions';
import { OrganizationsState, initialOrganizationsState, OrganizationTableRow } from './organizations.state';
import { Organizations } from '../../../../core/models/OrganizationsModel';
import { OrganizationStatus } from '../../../../core/models/OrganizationStatusEnum';

export const organizationsReducer = createReducer(
  initialOrganizationsState,

  // Load Organizations
  on(OrganizationsActions.loadOrganizations, (state): OrganizationsState => ({
    ...state,
    isLoading: true,
    error: null
  })),

  on(OrganizationsActions.loadOrganizationsSuccess, (state, { organizations }): OrganizationsState => {
    // Convert organizations to table rows with mock data for member/app counts
    const organizationRows: OrganizationTableRow[] = organizations.map((org, index) => ({
      organization: org,
      userRole: index === 0 ? 'OWNER' : 'ADMINISTRATOR', // Mock role data
      isOwner: index === 0,
      memberCount: Math.floor(Math.random() * 25) + 1, // Mock member count
      applicationCount: Math.floor(Math.random() * 20) + 1 // Mock app count
    }));

    return {
      ...state,
      isLoading: false,
      organizations,
      organizationRows,
      filteredOrganizationRows: organizationRows,
      error: null
    };
  }),

  on(OrganizationsActions.loadOrganizationsFailure, (state, { error }): OrganizationsState => ({
    ...state,
    isLoading: false,
    error
  })),

  // Create Organization
  on(OrganizationsActions.createOrganization, (state): OrganizationsState => ({
    ...state,
    isSaving: true,
    saveError: null
  })),

  on(OrganizationsActions.createOrganizationSuccess, (state, { organization }): OrganizationsState => {
    // Replace placeholder with actual organization
    const updatedRows = state.organizationRows.map(row => {
      if (row.organization.organizationId === 'new-org-placeholder') {
        return {
          ...row,
          organization,
          memberCount: 1, // User who created it
          applicationCount: 0
        };
      }
      return row;
    });

    // Also add to organizations array if not already there
    const updatedOrganizations = state.organizations.some(org => org.organizationId === organization.organizationId)
      ? state.organizations.map(org => org.organizationId === organization.organizationId ? organization : org)
      : [...state.organizations, organization];

    return {
      ...state,
      isSaving: false,
      isCreatingNew: false,
      isInCreateMode: false,
      organizations: updatedOrganizations,
      organizationRows: updatedRows,
      filteredOrganizationRows: updatedRows.filter(row => applyFilters(row, state.searchTerm, state.statusFilter, state.roleFilter)),
      selectedOrganization: organization,
      lastCreatedOrganization: organization,
      saveError: null
    };
  }),

  on(OrganizationsActions.createOrganizationFailure, (state, { error }): OrganizationsState => ({
    ...state,
    isSaving: false,
    saveError: error
  })),

  // Update Organization
  on(OrganizationsActions.updateOrganization, (state): OrganizationsState => ({
    ...state,
    isSaving: true,
    saveError: null
  })),

  on(OrganizationsActions.updateOrganizationSuccess, (state, { organization }): OrganizationsState => {
    // Update organization in both arrays
    const updatedOrganizations = state.organizations.map(org => 
      org.organizationId === organization.organizationId ? organization : org
    );

    const updatedRows = state.organizationRows.map(row => 
      row.organization.organizationId === organization.organizationId 
        ? { ...row, organization }
        : row
    );

    return {
      ...state,
      isSaving: false,
      organizations: updatedOrganizations,
      organizationRows: updatedRows,
      filteredOrganizationRows: updatedRows.filter(row => applyFilters(row, state.searchTerm, state.statusFilter, state.roleFilter)),
      selectedOrganization: state.selectedOrganization?.organizationId === organization.organizationId 
        ? organization 
        : state.selectedOrganization,
      lastUpdatedOrganization: organization,
      saveError: null
    };
  }),

  on(OrganizationsActions.updateOrganizationFailure, (state, { error }): OrganizationsState => ({
    ...state,
    isSaving: false,
    saveError: error
  })),

  // Delete Organization
  on(OrganizationsActions.deleteOrganization, (state): OrganizationsState => ({
    ...state,
    isDeleting: true,
    deleteError: null
  })),

  on(OrganizationsActions.deleteOrganizationSuccess, (state, { organizationId }): OrganizationsState => {
    const updatedOrganizations = state.organizations.filter(org => org.organizationId !== organizationId);
    const updatedRows = state.organizationRows.filter(row => row.organization.organizationId !== organizationId);

    return {
      ...state,
      isDeleting: false,
      organizations: updatedOrganizations,
      organizationRows: updatedRows,
      filteredOrganizationRows: updatedRows.filter(row => applyFilters(row, state.searchTerm, state.statusFilter, state.roleFilter)),
      selectedOrganization: state.selectedOrganization?.organizationId === organizationId ? null : state.selectedOrganization,
      lastDeletedOrganizationId: organizationId,
      deleteError: null
    };
  }),

  on(OrganizationsActions.deleteOrganizationFailure, (state, { error }): OrganizationsState => ({
    ...state,
    isDeleting: false,
    deleteError: error
  })),

  // Selection Management
  on(OrganizationsActions.selectOrganization, (state, { organization }): OrganizationsState => ({
    ...state,
    selectedOrganization: organization
  })),

  on(OrganizationsActions.setSelectedOrganizationMemberCount, (state, { memberCount }): OrganizationsState => ({
    ...state,
    selectedOrganizationMemberCount: memberCount
  })),

  on(OrganizationsActions.setSelectedOrganizationApplicationCount, (state, { applicationCount }): OrganizationsState => ({
    ...state,
    selectedOrganizationApplicationCount: applicationCount
  })),

  // Create Mode Management
  on(OrganizationsActions.enterCreateMode, (state, { placeholderOrganization }): OrganizationsState => {
    const placeholderRow: OrganizationTableRow = {
      organization: placeholderOrganization,
      userRole: 'OWNER',
      isOwner: true,
      memberCount: 0,
      applicationCount: 0
    };

    const updatedRows = [placeholderRow, ...state.organizationRows];

    return {
      ...state,
      isInCreateMode: true,
      isCreatingNew: true,
      organizationRows: updatedRows,
      filteredOrganizationRows: updatedRows.filter(row => applyFilters(row, state.searchTerm, state.statusFilter, state.roleFilter)),
      selectedOrganization: placeholderOrganization
    };
  }),

  on(OrganizationsActions.exitCreateMode, (state): OrganizationsState => ({
    ...state,
    isInCreateMode: false,
    isCreatingNew: false
  })),

  on(OrganizationsActions.cancelCreateMode, (state): OrganizationsState => {
    // Remove placeholder from lists
    const updatedRows = state.organizationRows.filter(row => row.organization.organizationId !== 'new-org-placeholder');

    return {
      ...state,
      isInCreateMode: false,
      isCreatingNew: false,
      organizationRows: updatedRows,
      filteredOrganizationRows: updatedRows.filter(row => applyFilters(row, state.searchTerm, state.statusFilter, state.roleFilter)),
      selectedOrganization: null,
      saveError: null
    };
  }),

  // Filter Management
  on(OrganizationsActions.setSearchTerm, (state, { searchTerm }): OrganizationsState => {
    const filteredRows = state.organizationRows.filter(row => 
      applyFilters(row, searchTerm, state.statusFilter, state.roleFilter)
    );

    return {
      ...state,
      searchTerm,
      filteredOrganizationRows: filteredRows
    };
  }),

  on(OrganizationsActions.setStatusFilter, (state, { statusFilter }): OrganizationsState => {
    const filteredRows = state.organizationRows.filter(row => 
      applyFilters(row, state.searchTerm, statusFilter, state.roleFilter)
    );

    return {
      ...state,
      statusFilter,
      filteredOrganizationRows: filteredRows
    };
  }),

  on(OrganizationsActions.setRoleFilter, (state, { roleFilter }): OrganizationsState => {
    const filteredRows = state.organizationRows.filter(row => 
      applyFilters(row, state.searchTerm, state.statusFilter, roleFilter)
    );

    return {
      ...state,
      roleFilter,
      filteredOrganizationRows: filteredRows
    };
  }),

  on(OrganizationsActions.applyFilters, (state): OrganizationsState => {
    const filteredRows = state.organizationRows.filter(row => 
      applyFilters(row, state.searchTerm, state.statusFilter, state.roleFilter)
    );

    return {
      ...state,
      filteredOrganizationRows: filteredRows
    };
  }),

  // Organization Rows Management
  on(OrganizationsActions.updateOrganizationRows, (state, { organizationRows }): OrganizationsState => {
    const filteredRows = organizationRows.filter(row => 
      applyFilters(row, state.searchTerm, state.statusFilter, state.roleFilter)
    );

    return {
      ...state,
      organizationRows,
      filteredOrganizationRows: filteredRows
    };
  }),

  on(OrganizationsActions.updateFilteredOrganizationRows, (state, { filteredRows }): OrganizationsState => ({
    ...state,
    filteredOrganizationRows: filteredRows
  })),

  // Error Management
  on(OrganizationsActions.clearErrors, (state): OrganizationsState => ({
    ...state,
    error: null,
    saveError: null,
    deleteError: null
  })),

  on(OrganizationsActions.clearSaveError, (state): OrganizationsState => ({
    ...state,
    saveError: null
  })),

  on(OrganizationsActions.clearDeleteError, (state): OrganizationsState => ({
    ...state,
    deleteError: null
  })),

  // UI State Management
  on(OrganizationsActions.setLoading, (state, { isLoading }): OrganizationsState => ({
    ...state,
    isLoading
  })),

  on(OrganizationsActions.setSaving, (state, { isSaving }): OrganizationsState => ({
    ...state,
    isSaving
  })),

  on(OrganizationsActions.setDeleting, (state, { isDeleting }): OrganizationsState => ({
    ...state,
    isDeleting
  })),

  // Utility Actions
  on(OrganizationsActions.resetState, (): OrganizationsState => ({
    ...initialOrganizationsState
  })),

  on(OrganizationsActions.refreshOrganizations, (state): OrganizationsState => ({
    ...state,
    isLoading: true,
    error: null
  }))
);

// Helper function to apply filters
function applyFilters(
  row: OrganizationTableRow,
  searchTerm: string,
  statusFilter: string,
  roleFilter: string
): boolean {
  const matchesSearch = !searchTerm || 
    row.organization.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.organization.organizationId.toLowerCase().includes(searchTerm.toLowerCase());
  
  const matchesStatus = !statusFilter || 
    row.organization.status === statusFilter;
  
  const matchesRole = !roleFilter || 
    row.userRole === roleFilter;
  
  return matchesSearch && matchesStatus && matchesRole;
}