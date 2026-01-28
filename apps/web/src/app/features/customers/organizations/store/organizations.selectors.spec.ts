/**
 * Organizations Selectors Unit Tests
 *
 * Unit tests for organizations selectors, focusing on the new
 * organization applications selectors for the Applications tab.
 */

import * as selectors from './organizations.selectors';
import { OrganizationsState, initialOrganizationsState } from './organizations.state';
import { IApplications } from '../../../../core/models/ApplicationsModel';
import { ApplicationStatus } from '../../../../core/enums/ApplicationStatusEnum';

describe('Organizations Selectors', () => {
  // Test data
  const mockApplication1: IApplications = {
    applicationId: 'app-1',
    name: 'Test App 1',
    organizationId: 'org-1',
    ownerId: 'user-1',
    status: ApplicationStatus.Active,
    apiKey: 'key-1',
    apiKeyNext: '',
    environments: ['PRODUCTION', 'STAGING'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockApplication2: IApplications = {
    applicationId: 'app-2',
    name: 'Test App 2',
    organizationId: 'org-1',
    ownerId: 'user-1',
    status: ApplicationStatus.Pending,
    apiKey: 'key-2',
    apiKeyNext: '',
    environments: ['DEVELOPMENT'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockApplication3: IApplications = {
    applicationId: 'app-3',
    name: 'Test App 3',
    organizationId: 'org-2',
    ownerId: 'user-2',
    status: ApplicationStatus.Active,
    apiKey: 'key-3',
    apiKeyNext: '',
    environments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('selectOrganizationApplications', () => {
    it('should return applications for a specific organization', () => {
      const state: OrganizationsState = {
        ...initialOrganizationsState,
        organizationApplications: {
          'org-1': [mockApplication1, mockApplication2],
          'org-2': [mockApplication3],
        },
      };

      const selector = selectors.selectOrganizationApplications('org-1');
      const result = selector.projector(state);

      expect(result).toEqual([mockApplication1, mockApplication2]);
      expect(result.length).toBe(2);
    });

    it('should return empty array for organization with no applications', () => {
      const state: OrganizationsState = {
        ...initialOrganizationsState,
        organizationApplications: {
          'org-1': [mockApplication1],
        },
      };

      const selector = selectors.selectOrganizationApplications('org-unknown');
      const result = selector.projector(state);

      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it('should return empty array when organizationApplications is empty', () => {
      const state: OrganizationsState = {
        ...initialOrganizationsState,
        organizationApplications: {},
      };

      const selector = selectors.selectOrganizationApplications('org-1');
      const result = selector.projector(state);

      expect(result).toEqual([]);
    });

    it('should handle null state gracefully', () => {
      const selector = selectors.selectOrganizationApplications('org-1');
      const result = selector.projector(null as unknown as OrganizationsState);

      expect(result).toEqual([]);
    });
  });

  describe('selectIsLoadingOrganizationApplications', () => {
    it('should return true when loading applications for organization', () => {
      const state: OrganizationsState = {
        ...initialOrganizationsState,
        loadingApplications: {
          'org-1': true,
          'org-2': false,
        },
      };

      const selector = selectors.selectIsLoadingOrganizationApplications('org-1');
      const result = selector.projector(state);

      expect(result).toBe(true);
    });

    it('should return false when not loading applications', () => {
      const state: OrganizationsState = {
        ...initialOrganizationsState,
        loadingApplications: {
          'org-1': false,
        },
      };

      const selector = selectors.selectIsLoadingOrganizationApplications('org-1');
      const result = selector.projector(state);

      expect(result).toBe(false);
    });

    it('should return false for organization not in loading map', () => {
      const state: OrganizationsState = {
        ...initialOrganizationsState,
        loadingApplications: {},
      };

      const selector = selectors.selectIsLoadingOrganizationApplications('org-unknown');
      const result = selector.projector(state);

      expect(result).toBe(false);
    });

    it('should handle null state gracefully', () => {
      const selector = selectors.selectIsLoadingOrganizationApplications('org-1');
      const result = selector.projector(null as unknown as OrganizationsState);

      expect(result).toBe(false);
    });
  });

  describe('selectOrganizationApplicationsError', () => {
    it('should return error message for organization', () => {
      const errorMessage = 'Failed to load applications';
      const state: OrganizationsState = {
        ...initialOrganizationsState,
        applicationsError: {
          'org-1': errorMessage,
          'org-2': null,
        },
      };

      const selector = selectors.selectOrganizationApplicationsError('org-1');
      const result = selector.projector(state);

      expect(result).toBe(errorMessage);
    });

    it('should return null when no error for organization', () => {
      const state: OrganizationsState = {
        ...initialOrganizationsState,
        applicationsError: {
          'org-1': null,
        },
      };

      const selector = selectors.selectOrganizationApplicationsError('org-1');
      const result = selector.projector(state);

      expect(result).toBeNull();
    });

    it('should return null for organization not in error map', () => {
      const state: OrganizationsState = {
        ...initialOrganizationsState,
        applicationsError: {},
      };

      const selector = selectors.selectOrganizationApplicationsError('org-unknown');
      const result = selector.projector(state);

      expect(result).toBeNull();
    });

    it('should handle null state gracefully', () => {
      const selector = selectors.selectOrganizationApplicationsError('org-1');
      const result = selector.projector(null as unknown as OrganizationsState);

      expect(result).toBeNull();
    });
  });

  describe('selectOrganizationApplicationCount', () => {
    it('should return correct count for organization with applications', () => {
      const applications = [mockApplication1, mockApplication2];
      const selector = selectors.selectOrganizationApplicationCount('org-1');
      const result = selector.projector(applications);

      expect(result).toBe(2);
    });

    it('should return 0 for organization with no applications', () => {
      const applications: IApplications[] = [];
      const selector = selectors.selectOrganizationApplicationCount('org-1');
      const result = selector.projector(applications);

      expect(result).toBe(0);
    });

    it('should return correct count for single application', () => {
      const applications = [mockApplication1];
      const selector = selectors.selectOrganizationApplicationCount('org-1');
      const result = selector.projector(applications);

      expect(result).toBe(1);
    });
  });

  describe('selectHasLoadedOrganizationApplications', () => {
    it('should return true when applications have been loaded', () => {
      const state: OrganizationsState = {
        ...initialOrganizationsState,
        organizationApplications: {
          'org-1': [mockApplication1],
        },
      };

      const selector = selectors.selectHasLoadedOrganizationApplications('org-1');
      const result = selector.projector(state);

      expect(result).toBe(true);
    });

    it('should return true even when loaded with empty array', () => {
      const state: OrganizationsState = {
        ...initialOrganizationsState,
        organizationApplications: {
          'org-1': [],
        },
      };

      const selector = selectors.selectHasLoadedOrganizationApplications('org-1');
      const result = selector.projector(state);

      expect(result).toBe(true);
    });

    it('should return false when applications have not been loaded', () => {
      const state: OrganizationsState = {
        ...initialOrganizationsState,
        organizationApplications: {},
      };

      const selector = selectors.selectHasLoadedOrganizationApplications('org-unknown');
      const result = selector.projector(state);

      expect(result).toBe(false);
    });

    it('should handle null state gracefully', () => {
      const selector = selectors.selectHasLoadedOrganizationApplications('org-1');
      const result = selector.projector(null as unknown as OrganizationsState);

      expect(result).toBe(false);
    });
  });
});
