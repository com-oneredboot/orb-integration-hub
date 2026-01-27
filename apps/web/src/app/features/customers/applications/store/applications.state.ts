/**
 * Applications State
 *
 * Defines the state structure for application management.
 * Follows the same patterns as OrganizationsState.
 *
 * @see .kiro/specs/applications-management/design.md
 * _Requirements: 5.1, 5.2_
 */

import { IApplications } from '../../../../core/models/ApplicationsModel';

/**
 * Represents a row in the applications table with enriched data
 */
export interface ApplicationTableRow {
  application: IApplications;
  organizationId: string;
  organizationName: string;
  environmentCount: number;
  userRole: string;
  lastActivity: string;
}

/**
 * NgRx state for applications feature
 */
export interface ApplicationsState {
  // Core application data
  applications: IApplications[];
  applicationRows: ApplicationTableRow[];
  filteredApplicationRows: ApplicationTableRow[];
  selectedApplication: IApplications | null;

  // UI State
  isInCreateMode: boolean;
  isCreatingNew: boolean;

  // Filter state
  searchTerm: string;
  organizationFilter: string;
  statusFilter: string;

  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  isDeleting: boolean;

  // Error states
  error: string | null;
  saveError: string | null;
  deleteError: string | null;

  // Operation states
  lastCreatedApplication: IApplications | null;
  lastUpdatedApplication: IApplications | null;
  lastDeletedApplicationId: string | null;
}

/**
 * Initial state for applications feature
 */
export const initialApplicationsState: ApplicationsState = {
  // Core application data
  applications: [],
  applicationRows: [],
  filteredApplicationRows: [],
  selectedApplication: null,

  // UI State
  isInCreateMode: false,
  isCreatingNew: false,

  // Filter state
  searchTerm: '',
  organizationFilter: '',
  statusFilter: '',

  // Loading states
  isLoading: false,
  isSaving: false,
  isDeleting: false,

  // Error states
  error: null,
  saveError: null,
  deleteError: null,

  // Operation states
  lastCreatedApplication: null,
  lastUpdatedApplication: null,
  lastDeletedApplicationId: null,
};
