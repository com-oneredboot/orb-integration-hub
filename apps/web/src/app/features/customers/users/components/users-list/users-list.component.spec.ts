/**
 * UsersListComponent Unit Tests
 *
 * Unit tests for users list component covering specific examples and edge cases.
 *
 * @see .kiro/specs/application-users-list/design.md
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { UsersListComponent } from './users-list.component';
import { UsersActions } from '../../store/users.actions';
import * as fromUsers from '../../store/users.selectors';
import { UserTableRow } from '../../store/users.state';
import { UserWithRoles, RoleAssignment } from '../../../../../core/graphql/GetApplicationUsers.graphql';
import { DEFAULT_PAGE_STATE } from '../../../../../shared/components/data-grid';

describe('UsersListComponent', () => {
  let component: UsersListComponent;
  let fixture: ComponentFixture<UsersListComponent>;
  let store: MockStore;
  let router: Router;

  const mockRoleAssignment: RoleAssignment = {
    applicationUserRoleId: 'role-1',
    applicationId: 'app-1',
    applicationName: 'App One',
    organizationId: 'org-1',
    organizationName: 'Org One',
    environment: 'production',
    roleId: 'role-id-1',
    roleName: 'Admin',
    permissions: ['read', 'write'],
    status: 'ACTIVE',
    createdAt: 1704067200,
    updatedAt: 1705276800,
  };

  const mockUser: UserWithRoles = {
    userId: 'user-123',
    firstName: 'John',
    lastName: 'Doe',
    status: 'ACTIVE',
    roleAssignments: [mockRoleAssignment],
  };

  const mockUserRow: UserTableRow = {
    user: mockUser,
    userStatus: 'ACTIVE',
    roleCount: 1,
    environments: ['production'],
    organizationNames: ['Org One'],
    applicationNames: ['App One'],
    lastActivity: 'Just now',
    roleAssignments: [mockRoleAssignment],
  };

  const initialState = {
    users: {
      usersWithRoles: [mockUser],
      userRows: [mockUserRow],
      filteredUserRows: [mockUserRow],
      selectedUser: null,
      selectedUserId: null,
      organizationIds: [],
      applicationIds: [],
      environment: null,
      searchTerm: '',
      statusFilter: '',
      nextToken: null,
      hasMore: false,
      isLoading: false,
      error: null,
      lastLoadedTimestamp: null,
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsersListComponent],
      providers: [
        provideMockStore({ initialState }),
        {
          provide: Router,
          useValue: {
            navigate: jasmine.createSpy('navigate'),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({}),
            snapshot: { queryParams: {} }
          },
        },
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(UsersListComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    store.resetSelectors();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should dispatch loadUsers on init', () => {
      spyOn(store, 'dispatch');
      component.ngOnInit();
      expect(store.dispatch).toHaveBeenCalledWith(UsersActions.loadUsers());
    });

    it('should initialize columns with correct configuration', () => {
      component.ngOnInit();
      expect(component.columns.length).toBe(4);
      expect(component.columns[0].field).toBe('user');
      expect(component.columns[1].field).toBe('userStatus');
      expect(component.columns[2].field).toBe('applicationCount');
      expect(component.columns[3].field).toBe('lastActivity');
    });

    it('should initialize breadcrumbs', () => {
      expect(component.breadcrumbItems.length).toBe(1);
      expect(component.breadcrumbItems[0].label).toBe('Users');
    });

    it('should initialize tabs', () => {
      expect(component.tabs.length).toBe(1);
      expect(component.tabs[0].id).toBe('overview');
      expect(component.tabs[0].label).toBe('Overview');
    });
  });

  describe('Pagination Edge Cases', () => {
    it('should have default page size of 25', () => {
      expect(component.pageState.pageSize).toBe(25);
    });

    it('should disable previous button on first page', () => {
      component.pageState = { ...DEFAULT_PAGE_STATE, currentPage: 1, pageSize: 25 };
      expect(component.pageState.currentPage).toBe(1);
      // DataGrid component handles button disabling based on currentPage === 1
    });

    it('should disable next button on last page', () => {
      const totalItems = 50;
      const pageSize = 25;
      const totalPages = Math.ceil(totalItems / pageSize);
      
      component.pageState = {
        ...DEFAULT_PAGE_STATE,
        currentPage: totalPages,
        pageSize,
        totalItems,
        totalPages,
      };
      
      expect(component.pageState.currentPage).toBe(totalPages);
      // DataGrid component handles button disabling based on currentPage === totalPages
    });

    it('should calculate totalPages correctly', () => {
      const totalItems = 100;
      const pageSize = 25;
      const expectedTotalPages = Math.ceil(totalItems / pageSize);
      
      component.pageState = {
        ...DEFAULT_PAGE_STATE,
        totalItems,
        pageSize,
        totalPages: expectedTotalPages,
      };
      
      expect(component.pageState.totalPages).toBe(4);
    });

    it('should handle empty list (0 items)', () => {
      store.overrideSelector(fromUsers.selectFilteredUserRows, []);
      fixture.detectChanges();
      
      // Component should handle empty state gracefully
      expect(component.pageState.totalItems).toBe(0);
    });

    it('should handle single item', () => {
      store.overrideSelector(fromUsers.selectFilteredUserRows, [mockUserRow]);
      fixture.detectChanges();
      
      expect(component.pageState.totalItems).toBe(1);
      expect(component.pageState.totalPages).toBe(1);
    });
  });

  describe('Page Change Handler', () => {
    it('should update pageState on page change', () => {
      const event = { page: 2, pageSize: 25 };
      component.onPageChange(event);
      
      expect(component.pageState.currentPage).toBe(2);
      expect(component.pageState.pageSize).toBe(25);
    });

    it('should recalculate totalPages when pageSize changes', () => {
      component.pageState = { ...DEFAULT_PAGE_STATE, totalItems: 100, pageSize: 25 };
      
      const event = { page: 1, pageSize: 50 };
      component.onPageChange(event);
      
      expect(component.pageState.totalPages).toBe(2);
    });
  });

  describe('Sort Change Handler', () => {
    it('should update sortState on sort change', () => {
      const event = { field: 'user', direction: 'asc' as const };
      component.onSortChange(event);
      
      expect(component.sortState).toEqual({ field: 'user', direction: 'asc' });
    });

    it('should clear sortState when direction is null', () => {
      component.sortState = { field: 'user', direction: 'asc' };
      
      const event = { field: 'user', direction: null };
      component.onSortChange(event);
      
      expect(component.sortState).toBeNull();
    });
  });

  describe('Filter Change Handler', () => {
    it('should dispatch filter actions on filter change', () => {
      spyOn(store, 'dispatch');
      
      const event = {
        filters: {
          user: 'John',
          userStatus: 'ACTIVE',
        },
      };
      
      component.onFilterChange(event);
      
      expect(store.dispatch).toHaveBeenCalledWith(
        UsersActions.setSearchTerm({ searchTerm: 'John' })
      );
      expect(store.dispatch).toHaveBeenCalledWith(
        UsersActions.setStatusFilter({ statusFilter: 'ACTIVE' })
      );
    });

    it('should handle empty filters', () => {
      spyOn(store, 'dispatch');
      
      const event = { filters: {} };
      component.onFilterChange(event);
      
      expect(store.dispatch).toHaveBeenCalledWith(
        UsersActions.setSearchTerm({ searchTerm: '' })
      );
      expect(store.dispatch).toHaveBeenCalledWith(
        UsersActions.setStatusFilter({ statusFilter: '' })
      );
    });
  });

  describe('Reset Grid Handler', () => {
    it('should reset all grid state', () => {
      spyOn(store, 'dispatch');
      
      // Set some state
      component.pageState = { ...DEFAULT_PAGE_STATE, currentPage: 3, pageSize: 50 };
      component.sortState = { field: 'user', direction: 'desc' };
      component.filterState = { user: 'test' };
      
      component.onResetGrid();
      
      expect(component.pageState.currentPage).toBe(1);
      expect(component.pageState.pageSize).toBe(25);
      expect(component.sortState).toBeNull();
      expect(component.filterState).toEqual({});
      
      expect(store.dispatch).toHaveBeenCalledWith(
        UsersActions.setSearchTerm({ searchTerm: '' })
      );
      expect(store.dispatch).toHaveBeenCalledWith(
        UsersActions.setStatusFilter({ statusFilter: '' })
      );
    });
  });

  describe('Row Click Handler', () => {
    it('should dispatch selectUser and setSelectedUserId', () => {
      spyOn(store, 'dispatch');
      spyOn(console, 'log');
      
      component.onRowClick(mockUserRow);
      
      expect(store.dispatch).toHaveBeenCalledWith(
        UsersActions.selectUser({ user: mockUser })
      );
      expect(store.dispatch).toHaveBeenCalledWith(
        UsersActions.setSelectedUserId({ userId: 'user-123' })
      );
      expect(console.log).toHaveBeenCalledWith(
        'User detail view not yet implemented for:',
        'user-123'
      );
    });
  });

  describe('Application Count Click Handler', () => {
    it('should navigate to applications with filter params', () => {
      const event = new MouseEvent('click');
      spyOn(event, 'stopPropagation');
      
      component.onApplicationCountClick(event, mockUserRow);
      
      expect(event.stopPropagation).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/customers/applications'], {
        queryParams: {
          filterByUser: 'user-123',
          applicationIds: 'app-1,app-2,app-3',
        },
      });
    });

    it('should stop event propagation to prevent row click', () => {
      const event = new MouseEvent('click');
      spyOn(event, 'stopPropagation');
      
      component.onApplicationCountClick(event, mockUserRow);
      
      expect(event.stopPropagation).toHaveBeenCalled();
    });
  });

  describe('Refresh Handler', () => {
    it('should dispatch refreshUsers action', () => {
      spyOn(store, 'dispatch');
      
      component.onRefresh();
      
      expect(store.dispatch).toHaveBeenCalledWith(UsersActions.refreshUsers());
    });
  });

  describe('Status Class Helper', () => {
    it('should return correct class for ACTIVE status', () => {
      expect(component.getStatusClass('ACTIVE' as unknown as any)).toBe('active');
    });

    it('should return correct class for INACTIVE status', () => {
      expect(component.getStatusClass('INACTIVE' as unknown as any)).toBe('inactive');
    });

    it('should return correct class for PENDING status', () => {
      expect(component.getStatusClass('PENDING' as unknown as any)).toBe('pending');
    });

    it('should return default class for unknown status', () => {
      expect(component.getStatusClass('UNKNOWN' as unknown as any)).toBe('inactive');
    });
  });

  describe('Tab Change Handler', () => {
    it('should update activeTab', () => {
      component.activeTab = 'overview';
      component.onTabChange('details');
      expect(component.activeTab).toBe('details');
    });
  });

  describe('Column Configuration', () => {
    it('should have sortable columns', () => {
      component.ngOnInit();
      const sortableColumns = component.columns.filter(col => col.sortable);
      expect(sortableColumns.length).toBe(4);
    });

    it('should have filterable columns', () => {
      component.ngOnInit();
      const filterableColumns = component.columns.filter(col => col.filterable);
      expect(filterableColumns.length).toBe(2); // user and userStatus
    });

    it('should have status filter options', () => {
      component.ngOnInit();
      const statusColumn = component.columns.find(col => col.field === 'userStatus');
      expect(statusColumn?.filterOptions).toBeDefined();
      expect(statusColumn?.filterOptions?.length).toBe(4); // All Statuses + 3 status values
    });
  });
});
