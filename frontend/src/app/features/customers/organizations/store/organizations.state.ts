/**
 * Organizations State
 * 
 * Defines the state structure for organization management
 */

import { Organizations } from '../../../../core/models/OrganizationsModel';

export interface OrganizationTableRow {
  organization: Organizations;
  userRole: string;
  isOwner: boolean;
  memberCount: number;
  applicationCount: number;
}

export interface OrganizationsState {
  // Core organization data
  organizations: Organizations[];
  organizationRows: OrganizationTableRow[];
  selectedOrganization: Organizations | null;
  selectedOrganizationMemberCount: number;
  selectedOrganizationApplicationCount: number;

  // UI State
  isInCreateMode: boolean;
  isCreatingNew: boolean;
  
  // Filter state
  searchTerm: string;
  statusFilter: string;
  roleFilter: string;
  filteredOrganizationRows: OrganizationTableRow[];

  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  isDeleting: boolean;

  // Error states
  error: string | null;
  saveError: string | null;
  deleteError: string | null;

  // Operation states
  lastCreatedOrganization: Organizations | null;
  lastUpdatedOrganization: Organizations | null;
  lastDeletedOrganizationId: string | null;
}

export const initialOrganizationsState: OrganizationsState = {
  // Core organization data
  organizations: [],
  organizationRows: [],
  selectedOrganization: null,
  selectedOrganizationMemberCount: 0,
  selectedOrganizationApplicationCount: 0,

  // UI State
  isInCreateMode: false,
  isCreatingNew: false,
  
  // Filter state
  searchTerm: '',
  statusFilter: '',
  roleFilter: '',
  filteredOrganizationRows: [],

  // Loading states
  isLoading: false,
  isSaving: false,
  isDeleting: false,

  // Error states
  error: null,
  saveError: null,
  deleteError: null,

  // Operation states
  lastCreatedOrganization: null,
  lastUpdatedOrganization: null,
  lastDeletedOrganizationId: null
};