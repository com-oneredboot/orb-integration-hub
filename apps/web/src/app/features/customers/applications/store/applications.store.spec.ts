/**
 * Applications Store Unit Tests
 *
 * Tests for applications NgRx reducer and selectors.
 *
 * @see .kiro/specs/applications-management/design.md
 * _Requirements: 6.4_
 */

import { ApplicationsActions } from './applications.actions';
import { applicationsReducer } from './applications.reducer';
import {
  ApplicationsState,
  initialApplicationsState,
  ApplicationTableRow,
} from './applications.state';
import * as selectors from './applications.selectors';
import { IApplications } from '../../../../core/models/ApplicationsModel';
import { ApplicationStatus } from '../../../../core/enums/ApplicationStatusEnum';

// Mock application data
const mockApplication: IApplications = {
  applicationId: 'app-123',
  name: 'Test Application',
  organizationId: 'org-456',
  ownerId: 'user-789',
  status: ApplicationStatus.Active,
  apiKey: 'api-key-123',
  apiKeyNext: '',
  environments: ['PRODUCTION', 'STAGING'],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
};

const mockApplicationRow: ApplicationTableRow = {
  application: mockApplication,
  organizationId: 'org-456',
  organizationName: 'Test Organization',
  environmentCount: 2,
  userRole: 'OWNER',
  lastActivity: '2024-01-02',
};

describe('Applications Store', () => {
  describe('Reducer', () => {
    describe('Initial State', () => {
      it('should return the initial state', () => {
        const action = { type: 'Unknown' };
        const state = applicationsReducer(undefined, action);

        expect(state).toEqual(initialApplicationsState);
      });
    });

    describe('Load Applications', () => {
      it('should set isLoading to true on loadApplications', () => {
        const action = ApplicationsActions.loadApplications();
        const state = applicationsReducer(initialApplicationsState, action);

        expect(state.isLoading).toBe(true);
        expect(state.error).toBeNull();
      });

      it('should set applications and isLoading to false on loadApplicationsSuccess', () => {
        const applications = [mockApplication];
        const action = ApplicationsActions.loadApplicationsSuccess({ applications });
        const state = applicationsReducer(
          { ...initialApplicationsState, isLoading: true },
          action
        );

        expect(state.isLoading).toBe(false);
        expect(state.applications).toEqual(applications);
        expect(state.error).toBeNull();
      });

      it('should set error and isLoading to false on loadApplicationsFailure', () => {
        const error = 'Failed to load applications';
        const action = ApplicationsActions.loadApplicationsFailure({ error });
        const state = applicationsReducer(
          { ...initialApplicationsState, isLoading: true },
          action
        );

        expect(state.isLoading).toBe(false);
        expect(state.error).toBe(error);
      });
    });

    describe('Create Draft Application', () => {
      it('should set isCreatingNew to true on createDraftApplication', () => {
        const action = ApplicationsActions.createDraftApplication({
          ownerId: 'user-123',
          organizationId: 'org-456',
        });
        const state = applicationsReducer(initialApplicationsState, action);

        expect(state.isCreatingNew).toBe(true);
        expect(state.saveError).toBeNull();
      });

      it('should add application and set selectedApplication on createDraftApplicationSuccess', () => {
        const action = ApplicationsActions.createDraftApplicationSuccess({
          application: mockApplication,
        });
        const state = applicationsReducer(
          { ...initialApplicationsState, isCreatingNew: true },
          action
        );

        expect(state.isCreatingNew).toBe(false);
        expect(state.applications).toContain(mockApplication);
        expect(state.selectedApplication).toEqual(mockApplication);
        expect(state.lastCreatedApplication).toEqual(mockApplication);
      });

      it('should set saveError on createDraftApplicationFailure', () => {
        const error = 'Failed to create draft';
        const action = ApplicationsActions.createDraftApplicationFailure({ error });
        const state = applicationsReducer(
          { ...initialApplicationsState, isCreatingNew: true },
          action
        );

        expect(state.isCreatingNew).toBe(false);
        expect(state.saveError).toBe(error);
      });
    });

    describe('Update Application', () => {
      it('should set isSaving to true on updateApplication', () => {
        const action = ApplicationsActions.updateApplication({
          input: { applicationId: 'app-123', name: 'Updated Name' },
        });
        const state = applicationsReducer(initialApplicationsState, action);

        expect(state.isSaving).toBe(true);
        expect(state.saveError).toBeNull();
      });

      it('should update application in state on updateApplicationSuccess', () => {
        const updatedApp = { ...mockApplication, name: 'Updated Name' };
        const initialState: ApplicationsState = {
          ...initialApplicationsState,
          applications: [mockApplication],
          isSaving: true,
        };
        const action = ApplicationsActions.updateApplicationSuccess({
          application: updatedApp,
        });
        const state = applicationsReducer(initialState, action);

        expect(state.isSaving).toBe(false);
        expect(state.applications[0].name).toBe('Updated Name');
        expect(state.lastUpdatedApplication).toEqual(updatedApp);
      });

      it('should set saveError on updateApplicationFailure', () => {
        const error = 'Failed to update';
        const action = ApplicationsActions.updateApplicationFailure({ error });
        const state = applicationsReducer(
          { ...initialApplicationsState, isSaving: true },
          action
        );

        expect(state.isSaving).toBe(false);
        expect(state.saveError).toBe(error);
      });
    });

    describe('Delete Application', () => {
      it('should set isDeleting to true on deleteApplication', () => {
        const action = ApplicationsActions.deleteApplication({
          applicationId: 'app-123',
          organizationId: 'org-123',
        });
        const state = applicationsReducer(initialApplicationsState, action);

        expect(state.isDeleting).toBe(true);
        expect(state.deleteError).toBeNull();
      });

      it('should remove application from state on deleteApplicationSuccess', () => {
        const initialState: ApplicationsState = {
          ...initialApplicationsState,
          applications: [mockApplication],
          isDeleting: true,
        };
        const action = ApplicationsActions.deleteApplicationSuccess({
          applicationId: 'app-123',
          organizationId: 'org-123',
        });
        const state = applicationsReducer(initialState, action);

        expect(state.isDeleting).toBe(false);
        expect(state.applications.length).toBe(0);
        expect(state.lastDeletedApplicationId).toBe('app-123');
      });

      it('should set deleteError on deleteApplicationFailure', () => {
        const error = 'Failed to delete';
        const action = ApplicationsActions.deleteApplicationFailure({ error });
        const state = applicationsReducer(
          { ...initialApplicationsState, isDeleting: true },
          action
        );

        expect(state.isDeleting).toBe(false);
        expect(state.deleteError).toBe(error);
      });
    });

    describe('Selection Management', () => {
      it('should set selectedApplication on selectApplication', () => {
        const action = ApplicationsActions.selectApplication({
          application: mockApplication,
        });
        const state = applicationsReducer(initialApplicationsState, action);

        expect(state.selectedApplication).toEqual(mockApplication);
      });

      it('should clear selectedApplication when null is passed', () => {
        const initialState: ApplicationsState = {
          ...initialApplicationsState,
          selectedApplication: mockApplication,
        };
        const action = ApplicationsActions.selectApplication({ application: null });
        const state = applicationsReducer(initialState, action);

        expect(state.selectedApplication).toBeNull();
      });
    });

    describe('Filter Management', () => {
      it('should set searchTerm on setSearchTerm', () => {
        const action = ApplicationsActions.setSearchTerm({ searchTerm: 'test' });
        const state = applicationsReducer(initialApplicationsState, action);

        expect(state.searchTerm).toBe('test');
      });

      it('should set organizationFilter on setOrganizationFilter', () => {
        const action = ApplicationsActions.setOrganizationFilter({
          organizationFilter: 'org-123',
        });
        const state = applicationsReducer(initialApplicationsState, action);

        expect(state.organizationFilter).toBe('org-123');
      });

      it('should set statusFilter on setStatusFilter', () => {
        const action = ApplicationsActions.setStatusFilter({
          statusFilter: 'ACTIVE',
        });
        const state = applicationsReducer(initialApplicationsState, action);

        expect(state.statusFilter).toBe('ACTIVE');
      });
    });

    describe('Error Management', () => {
      it('should clear all errors on clearErrors', () => {
        const initialState: ApplicationsState = {
          ...initialApplicationsState,
          error: 'load error',
          saveError: 'save error',
          deleteError: 'delete error',
        };
        const action = ApplicationsActions.clearErrors();
        const state = applicationsReducer(initialState, action);

        expect(state.error).toBeNull();
        expect(state.saveError).toBeNull();
        expect(state.deleteError).toBeNull();
      });
    });

    describe('Reset State', () => {
      it('should reset to initial state on resetState', () => {
        const modifiedState: ApplicationsState = {
          ...initialApplicationsState,
          applications: [mockApplication],
          isLoading: true,
          error: 'some error',
        };
        const action = ApplicationsActions.resetState();
        const state = applicationsReducer(modifiedState, action);

        expect(state).toEqual(initialApplicationsState);
      });
    });
  });

  describe('Selectors', () => {
    const mockState: ApplicationsState = {
      ...initialApplicationsState,
      applications: [mockApplication],
      applicationRows: [mockApplicationRow],
      filteredApplicationRows: [mockApplicationRow],
      selectedApplication: mockApplication,
      searchTerm: 'test',
      organizationFilter: 'org-456',
      statusFilter: 'ACTIVE',
      isLoading: false,
      error: 'test error',
    };

    describe('selectApplications', () => {
      it('should return applications array', () => {
        const result = selectors.selectApplications.projector(mockState);
        expect(result).toEqual([mockApplication]);
      });

      it('should return empty array when state is null', () => {
        const result = selectors.selectApplications.projector(null as unknown as ApplicationsState);
        expect(result).toEqual([]);
      });
    });

    describe('selectSelectedApplication', () => {
      it('should return selected application', () => {
        const result = selectors.selectSelectedApplication.projector(mockState);
        expect(result).toEqual(mockApplication);
      });
    });

    describe('selectFilteredApplicationRows', () => {
      it('should return filtered application rows from state', () => {
        const stateWithFiltered = {
          ...mockState,
          filteredApplicationRows: [mockApplicationRow],
        };
        const result = selectors.selectFilteredApplicationRows.projector(stateWithFiltered);
        expect(result.length).toBe(1);
        expect(result[0].application.name).toBe('Test Application');
      });

      it('should return empty array when state has no filtered rows', () => {
        const stateWithEmpty = {
          ...mockState,
          filteredApplicationRows: [],
        };
        const result = selectors.selectFilteredApplicationRows.projector(stateWithEmpty);
        expect(result).toEqual([]);
      });

      it('should return initial state when state is null', () => {
        const result = selectors.selectFilteredApplicationRows.projector(null as unknown as ApplicationsState);
        expect(result).toEqual([]);
      });
    });

    describe('selectIsLoading', () => {
      it('should return isLoading state', () => {
        const result = selectors.selectIsLoading.projector(mockState);
        expect(result).toBe(false);
      });
    });

    describe('selectError', () => {
      it('should return error state', () => {
        const result = selectors.selectError.projector(mockState);
        expect(result).toBe('test error');
      });
    });

    describe('selectHasFiltersApplied', () => {
      it('should return true when any filter is applied', () => {
        expect(selectors.selectHasFiltersApplied.projector('search', '', '')).toBe(true);
        expect(selectors.selectHasFiltersApplied.projector('', 'org', '')).toBe(true);
        expect(selectors.selectHasFiltersApplied.projector('', '', 'status')).toBe(true);
      });

      it('should return false when no filters are applied', () => {
        expect(selectors.selectHasFiltersApplied.projector('', '', '')).toBe(false);
      });
    });

    describe('selectHasAnyError', () => {
      it('should return true when any error exists', () => {
        expect(selectors.selectHasAnyError.projector('error', null, null)).toBe(true);
        expect(selectors.selectHasAnyError.projector(null, 'save', null)).toBe(true);
        expect(selectors.selectHasAnyError.projector(null, null, 'delete')).toBe(true);
      });

      it('should return false when no errors exist', () => {
        expect(selectors.selectHasAnyError.projector(null, null, null)).toBe(false);
      });
    });

    describe('selectApplicationById', () => {
      it('should return application by ID', () => {
        const selector = selectors.selectApplicationById('app-123');
        const result = selector.projector([mockApplication]);
        expect(result).toEqual(mockApplication);
      });

      it('should return undefined when application not found', () => {
        const selector = selectors.selectApplicationById('non-existent');
        const result = selector.projector([mockApplication]);
        expect(result).toBeUndefined();
      });
    });
  });
});
