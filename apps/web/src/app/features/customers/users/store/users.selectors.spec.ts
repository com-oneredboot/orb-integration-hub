/**
 * Users Selectors Unit Tests
 *
 * Unit tests for users selectors.
 * Tests that selectors return correct state values and handle undefined state gracefully.
 *
 * @see .kiro/specs/application-users-list/design.md
 */

import {
  selectUsersState,
  selectUsers,
  selectApplicationUserRecords,
  selectUserRows,
  selectFilteredUserRows,
  selectSelectedUser,
  selectSelectedUserId,
  selectSearchTerm,
  selectStatusFilter,
  selectIsLoading,
  selectError,
  selectLastLoadedTimestamp,
  selectHasUsers,
  selectUserCount,
  selectFilteredUserCount,
  selectHasFiltersApplied,
  selectUserById,
  selectUserRowById,
} from './users.selectors';
import { UsersState, initialUsersState, UserTableRow } from './users.state';
import { IUsers } from '../../../../core/models/UsersModel';
import { IApplicationUsers } from '../../../../core/models/ApplicationUsersModel';
import { UserStatus } from '../../../../core/enums/UserStatusEnum';
import { ApplicationUserStatus } from '../../../../core/enums/ApplicationUserStatusEnum';

describe('Users Selectors', () => {
  // Mock data
  const mockUser1: IUsers = {
    userId: 'user-1',
    cognitoId: 'cognito-1',
    cognitoSub: 'sub-1',
    email: 'john@example.com',
    firstName: 'John',
    lastName: 'Doe',
    status: UserStatus.Active,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  };

  const mockUser2: IUsers = {
    userId: 'user-2',
    cognitoId: 'cognito-2',
    cognitoSub: 'sub-2',
    email: 'jane@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    status: UserStatus.Inactive,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-16'),
  };

  const mockApplicationUserRecord1: IApplicationUsers = {
    applicationUserId: 'app-user-1',
    userId: 'user-1',
    applicationId: 'app-1',
    status: ApplicationUserStatus.Active,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  };

  const mockApplicationUserRecord2: IApplicationUsers = {
    applicationUserId: 'app-user-2',
    userId: 'user-1',
    applicationId: 'app-2',
    status: ApplicationUserStatus.Active,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-16'),
  };

  const mockUserRow1: UserTableRow = {
    user: mockUser1,
    userStatus: UserStatus.Active,
    applicationCount: 2,
    applicationIds: ['app-1', 'app-2'],
    lastActivity: '1 day ago',
  };

  const mockUserRow2: UserTableRow = {
    user: mockUser2,
    userStatus: UserStatus.Inactive,
    applicationCount: 0,
    applicationIds: [],
    lastActivity: '2 days ago',
  };

  const mockState: UsersState = {
    users: [mockUser1, mockUser2],
    applicationUserRecords: [mockApplicationUserRecord1, mockApplicationUserRecord2],
    userRows: [mockUserRow1, mockUserRow2],
    filteredUserRows: [mockUserRow1],
    selectedUser: mockUser1,
    selectedUserId: 'user-1',
    searchTerm: 'john',
    statusFilter: 'ACTIVE',
    isLoading: false,
    error: null,
    lastLoadedTimestamp: 1234567890,
  };

  const mockAppState = {
    users: mockState,
  };

  describe('Feature Selector', () => {
    it('should select the users state', () => {
      const result = selectUsersState(mockAppState);
      expect(result).toEqual(mockState);
    });
  });

  describe('Core Data Selectors', () => {
    it('should select users', () => {
      const result = selectUsers(mockAppState);
      expect(result).toEqual([mockUser1, mockUser2]);
    });

    it('should return empty array when users is undefined', () => {
      const emptyAppState = { users: undefined };
      const result = selectUsers(emptyAppState);
      expect(result).toEqual([]);
    });

    it('should select applicationUserRecords', () => {
      const result = selectApplicationUserRecords(mockAppState);
      expect(result).toEqual([mockApplicationUserRecord1, mockApplicationUserRecord2]);
    });

    it('should return empty array when applicationUserRecords is undefined', () => {
      const emptyAppState = { users: undefined };
      const result = selectApplicationUserRecords(emptyAppState);
      expect(result).toEqual([]);
    });

    it('should select userRows', () => {
      const result = selectUserRows(mockAppState);
      expect(result).toEqual([mockUserRow1, mockUserRow2]);
    });

    it('should return empty array when userRows is undefined', () => {
      const emptyAppState = { users: undefined };
      const result = selectUserRows(emptyAppState);
      expect(result).toEqual([]);
    });

    it('should select filteredUserRows', () => {
      const result = selectFilteredUserRows(mockAppState);
      expect(result).toEqual([mockUserRow1]);
    });

    it('should return empty array when filteredUserRows is undefined', () => {
      const emptyAppState = { users: undefined };
      const result = selectFilteredUserRows(emptyAppState);
      expect(result).toEqual([]);
    });

    it('should select selectedUser', () => {
      const result = selectSelectedUser(mockAppState);
      expect(result).toEqual(mockUser1);
    });

    it('should return null when selectedUser is undefined', () => {
      const emptyAppState = { users: undefined };
      const result = selectSelectedUser(emptyAppState);
      expect(result).toBeNull();
    });

    it('should select selectedUserId', () => {
      const result = selectSelectedUserId(mockAppState);
      expect(result).toBe('user-1');
    });

    it('should return null when selectedUserId is undefined', () => {
      const emptyAppState = { users: undefined };
      const result = selectSelectedUserId(emptyAppState);
      expect(result).toBeNull();
    });
  });

  describe('Filter Selectors', () => {
    it('should select searchTerm', () => {
      const result = selectSearchTerm(mockAppState);
      expect(result).toBe('john');
    });

    it('should return empty string when searchTerm is undefined', () => {
      const emptyAppState = { users: undefined };
      const result = selectSearchTerm(emptyAppState);
      expect(result).toBe('');
    });

    it('should select statusFilter', () => {
      const result = selectStatusFilter(mockAppState);
      expect(result).toBe('ACTIVE');
    });

    it('should return empty string when statusFilter is undefined', () => {
      const emptyAppState = { users: undefined };
      const result = selectStatusFilter(emptyAppState);
      expect(result).toBe('');
    });
  });

  describe('Loading State Selectors', () => {
    it('should select isLoading', () => {
      const result = selectIsLoading(mockAppState);
      expect(result).toBe(false);
    });

    it('should return false when isLoading is undefined', () => {
      const emptyAppState = { users: undefined };
      const result = selectIsLoading(emptyAppState);
      expect(result).toBe(false);
    });

    it('should select isLoading as true', () => {
      const loadingAppState = {
        users: { ...mockState, isLoading: true },
      };
      const result = selectIsLoading(loadingAppState);
      expect(result).toBe(true);
    });
  });

  describe('Error Selectors', () => {
    it('should select error', () => {
      const errorAppState = {
        users: { ...mockState, error: 'Test error' },
      };
      const result = selectError(errorAppState);
      expect(result).toBe('Test error');
    });

    it('should return null when error is undefined', () => {
      const emptyAppState = { users: undefined };
      const result = selectError(emptyAppState);
      expect(result).toBeNull();
    });
  });

  describe('Operation State Selectors', () => {
    it('should select lastLoadedTimestamp', () => {
      const result = selectLastLoadedTimestamp(mockAppState);
      expect(result).toBe(1234567890);
    });

    it('should return null when lastLoadedTimestamp is undefined', () => {
      const emptyAppState = { users: undefined };
      const result = selectLastLoadedTimestamp(emptyAppState);
      expect(result).toBeNull();
    });
  });

  describe('Computed Selectors', () => {
    describe('selectHasUsers', () => {
      it('should return true when users exist', () => {
        const result = selectHasUsers(mockAppState);
        expect(result).toBe(true);
      });

      it('should return false when users array is empty', () => {
        const emptyAppState = {
          users: { ...mockState, users: [] },
        };
        const result = selectHasUsers(emptyAppState);
        expect(result).toBe(false);
      });
    });

    describe('selectUserCount', () => {
      it('should return the count of users', () => {
        const result = selectUserCount(mockAppState);
        expect(result).toBe(2);
      });

      it('should return 0 when users array is empty', () => {
        const emptyAppState = {
          users: { ...mockState, users: [] },
        };
        const result = selectUserCount(emptyAppState);
        expect(result).toBe(0);
      });
    });

    describe('selectFilteredUserCount', () => {
      it('should return the count of filtered users', () => {
        const result = selectFilteredUserCount(mockAppState);
        expect(result).toBe(1);
      });

      it('should return 0 when filteredUserRows array is empty', () => {
        const emptyAppState = {
          users: { ...mockState, filteredUserRows: [] },
        };
        const result = selectFilteredUserCount(emptyAppState);
        expect(result).toBe(0);
      });
    });

    describe('selectHasFiltersApplied', () => {
      it('should return true when searchTerm is set', () => {
        const result = selectHasFiltersApplied(mockAppState);
        expect(result).toBe(true);
      });

      it('should return true when statusFilter is set', () => {
        const appStateWithStatusFilter = {
          users: { ...mockState, searchTerm: '', statusFilter: 'ACTIVE' },
        };
        const result = selectHasFiltersApplied(appStateWithStatusFilter);
        expect(result).toBe(true);
      });

      it('should return false when no filters are set', () => {
        const appStateWithNoFilters = {
          users: { ...mockState, searchTerm: '', statusFilter: '' },
        };
        const result = selectHasFiltersApplied(appStateWithNoFilters);
        expect(result).toBe(false);
      });
    });
  });

  describe('Parameterized Selectors', () => {
    describe('selectUserById', () => {
      it('should return the user with matching userId', () => {
        const selector = selectUserById('user-1');
        const result = selector(mockAppState);
        expect(result).toEqual(mockUser1);
      });

      it('should return undefined when user is not found', () => {
        const selector = selectUserById('non-existent');
        const result = selector(mockAppState);
        expect(result).toBeUndefined();
      });

      it('should return undefined when users array is empty', () => {
        const emptyAppState = {
          users: { ...mockState, users: [] },
        };
        const selector = selectUserById('user-1');
        const result = selector(emptyAppState);
        expect(result).toBeUndefined();
      });
    });

    describe('selectUserRowById', () => {
      it('should return the user row with matching userId', () => {
        const selector = selectUserRowById('user-1');
        const result = selector(mockAppState);
        expect(result).toEqual(mockUserRow1);
      });

      it('should return undefined when user row is not found', () => {
        const selector = selectUserRowById('non-existent');
        const result = selector(mockAppState);
        expect(result).toBeUndefined();
      });

      it('should return undefined when userRows array is empty', () => {
        const emptyAppState = {
          users: { ...mockState, userRows: [] },
        };
        const selector = selectUserRowById('user-1');
        const result = selector(emptyAppState);
        expect(result).toBeUndefined();
      });
    });
  });

  describe('Selector Memoization', () => {
    it('should return the same reference when state has not changed', () => {
      const result1 = selectUsers(mockAppState);
      const result2 = selectUsers(mockAppState);
      expect(result1).toBe(result2);
    });

    it('should return a new reference when state has changed', () => {
      const result1 = selectUsers(mockAppState);
      const newAppState = {
        users: { ...mockState, users: [mockUser2] },
      };
      const result2 = selectUsers(newAppState);
      expect(result1).not.toBe(result2);
    });
  });

  describe('Graceful Handling of Undefined State', () => {
    it('should handle completely undefined state', () => {
      const undefinedAppState = { users: undefined };

      expect(selectUsers(undefinedAppState)).toEqual([]);
      expect(selectUserRows(undefinedAppState)).toEqual([]);
      expect(selectFilteredUserRows(undefinedAppState)).toEqual([]);
      expect(selectSelectedUser(undefinedAppState)).toBeNull();
      expect(selectSelectedUserId(undefinedAppState)).toBeNull();
      expect(selectSearchTerm(undefinedAppState)).toBe('');
      expect(selectStatusFilter(undefinedAppState)).toBe('');
      expect(selectIsLoading(undefinedAppState)).toBe(false);
      expect(selectError(undefinedAppState)).toBeNull();
      expect(selectLastLoadedTimestamp(undefinedAppState)).toBeNull();
    });

    it('should handle null state', () => {
      const nullAppState = { users: null as unknown as UsersState };

      expect(selectUsers(nullAppState)).toEqual([]);
      expect(selectUserRows(nullAppState)).toEqual([]);
      expect(selectFilteredUserRows(nullAppState)).toEqual([]);
      expect(selectSelectedUser(nullAppState)).toBeNull();
      expect(selectSelectedUserId(nullAppState)).toBeNull();
      expect(selectSearchTerm(nullAppState)).toBe('');
      expect(selectStatusFilter(nullAppState)).toBe('');
      expect(selectIsLoading(nullAppState)).toBe(false);
      expect(selectError(nullAppState)).toBeNull();
      expect(selectLastLoadedTimestamp(nullAppState)).toBeNull();
    });
  });
});
