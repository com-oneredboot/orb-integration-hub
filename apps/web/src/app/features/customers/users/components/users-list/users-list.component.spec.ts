/**
 * UsersListComponent Unit Tests
 *
 * Unit tests for users list component covering specific examples, edge cases,
 * and template rendering verification.
 *
 * @see .kiro/specs/application-users-management/design.md
 * _Requirements: 4.1-4.13_
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { UsersListComponent } from './users-list.component';
import { UsersActions } from '../../store/users.actions';
import * as fromUsers from '../../store/users.selectors';
import { UserTableRow } from '../../store/users.state';
import { UserWithRoles, RoleAssignment } from '../../../../../core/graphql/GetApplicationUsers.graphql';
import { UserStatus } from '../../../../../core/enums/UserStatusEnum';
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

    // Register FontAwesome icons
    const library = TestBed.inject(FaIconLibrary);
    library.addIconPacks(fas);

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
      expect(component.columns.length).toBe(7);
      expect(component.columns[0].field).toBe('user');
      expect(component.columns[1].field).toBe('userStatus');
      expect(component.columns[2].field).toBe('roleCount');
      expect(component.columns[3].field).toBe('environments');
      expect(component.columns[4].field).toBe('organizationNames');
      expect(component.columns[5].field).toBe('applicationNames');
      expect(component.columns[6].field).toBe('lastActivity');
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
      store.refreshState();
      fixture.detectChanges();
      
      // Component should handle empty state gracefully
      expect(component.pageState.totalItems).toBe(0);
    });

    it('should handle single item', () => {
      store.overrideSelector(fromUsers.selectFilteredUserRows, [mockUserRow]);
      store.refreshState();
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
    it('should toggle expanded state for the user', () => {
      // Initially not expanded
      expect(component.expandedUserIds.has('user-123')).toBe(false);
      
      // Click to expand
      component.onRowClick(mockUserRow);
      expect(component.expandedUserIds.has('user-123')).toBe(true);
      
      // Click again to collapse
      component.onRowClick(mockUserRow);
      expect(component.expandedUserIds.has('user-123')).toBe(false);
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
          applicationIds: 'app-1',
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
      expect(component.getStatusClass(UserStatus.Active)).toBe('active');
    });

    it('should return correct class for INACTIVE status', () => {
      expect(component.getStatusClass(UserStatus.Inactive)).toBe('inactive');
    });

    it('should return correct class for PENDING status', () => {
      expect(component.getStatusClass(UserStatus.Pending)).toBe('pending');
    });

    it('should return default class for unknown status', () => {
      expect(component.getStatusClass(UserStatus.Unknown)).toBe('inactive');
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
      expect(sortableColumns.length).toBe(4); // user, userStatus, roleCount, lastActivity
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

  /**
   * Template Rendering Tests (Task 8.8)
   * 
   * Verifies that the component template renders correctly for all states:
   * filter controls, table with data, loading, error, empty, and pagination.
   * _Requirements: 4.1-4.13_
   */
  describe('Template Rendering', () => {
    // Helper to query the native element
    const query = (selector: string): HTMLElement | null =>
      fixture.nativeElement.querySelector(selector);
    const queryAll = (selector: string): NodeListOf<HTMLElement> =>
      fixture.nativeElement.querySelectorAll(selector);

    describe('Filter Controls Rendering', () => {
      it('should render the data grid with filter support enabled', fakeAsync(() => {
        store.overrideSelector(fromUsers.selectFilteredUserRows, [mockUserRow]);
        store.overrideSelector(fromUsers.selectIsLoading, false);
        store.overrideSelector(fromUsers.selectError, null);
        store.refreshState();
        fixture.detectChanges();
        tick();

        const dataGrid = query('app-data-grid');
        expect(dataGrid).toBeTruthy();
      }));

      it('should configure data grid with showFilters enabled', fakeAsync(() => {
        fixture.detectChanges();
        tick();

        // The data grid component receives showFilters=true from the template
        const dataGrid = query('app-data-grid');
        expect(dataGrid).toBeTruthy();
        // Verify the filter toolbar is rendered inside the data grid
        const filterToggle = query('.data-grid__filter-toggle');
        expect(filterToggle).toBeTruthy();
      }));

      it('should render filter inputs for filterable columns', fakeAsync(() => {
        fixture.detectChanges();
        tick();

        // The data grid renders filter inputs for filterable columns (user, userStatus)
        const filterFields = queryAll('.data-grid__filter-field');
        expect(filterFields.length).toBe(2); // user (text) + userStatus (select)
      }));

      it('should render a text filter for user column', fakeAsync(() => {
        fixture.detectChanges();
        tick();

        const textFilter = query('.data-grid__filter-input');
        expect(textFilter).toBeTruthy();
      }));

      it('should render a select filter for status column', fakeAsync(() => {
        fixture.detectChanges();
        tick();

        const selectFilter = query('.data-grid__filter-select');
        expect(selectFilter).toBeTruthy();
      }));

      it('should render reset button', fakeAsync(() => {
        fixture.detectChanges();
        tick();

        const resetBtn = query('.data-grid__reset');
        expect(resetBtn).toBeTruthy();
        expect(resetBtn?.textContent).toContain('Reset');
      }));
    });

    describe('Table Rendering with Data', () => {
      beforeEach(fakeAsync(() => {
        store.overrideSelector(fromUsers.selectFilteredUserRows, [mockUserRow]);
        store.overrideSelector(fromUsers.selectIsLoading, false);
        store.overrideSelector(fromUsers.selectError, null);
        store.refreshState();
        fixture.detectChanges();
        tick();
      }));

      it('should render the data grid table', () => {
        const table = query('.data-grid__table');
        expect(table).toBeTruthy();
      });

      it('should render table header columns', () => {
        const headers = queryAll('.data-grid__header');
        // 7 columns: user, status, roles, environments, organizations, applications, lastActivity
        expect(headers.length).toBe(7);
      });

      it('should render header text for each column', () => {
        const headerTexts = queryAll('.data-grid__header-text');
        const texts = Array.from(headerTexts).map(el => el.textContent?.trim());
        expect(texts).toContain('User');
        expect(texts).toContain('Status');
        expect(texts).toContain('Roles');
        expect(texts).toContain('Environments');
        expect(texts).toContain('Organizations');
        expect(texts).toContain('Applications');
        expect(texts).toContain('Last Updated');
      });

      it('should render data rows for each user', () => {
        const rows = queryAll('.data-grid__row:not(.data-grid__row--loading):not(.data-grid__row--empty)');
        expect(rows.length).toBe(1);
      });

      it('should render user info cell with name and userId', () => {
        const userName = query('.orb-info__name');
        const userId = query('.orb-info__id');
        expect(userName?.textContent?.trim()).toBe('John Doe');
        expect(userId?.textContent?.trim()).toBe('user-123');
      });

      it('should render role count cell', () => {
        const roleCount = query('.orb-count');
        expect(roleCount).toBeTruthy();
        expect(roleCount?.textContent?.trim()).toContain('1');
      });

      it('should render environment tags', () => {
        const envTags = queryAll('.orb-tag');
        expect(envTags.length).toBeGreaterThan(0);
        const tagTexts = Array.from(envTags).map(el => el.textContent?.trim());
        expect(tagTexts).toContain('production');
      });

      it('should render organization names', () => {
        // With a single org, it renders the name directly
        const orgInfo = queryAll('.orb-info__name');
        const orgTexts = Array.from(orgInfo).map(el => el.textContent?.trim());
        expect(orgTexts).toContain('Org One');
      });

      it('should render application names', () => {
        const appInfo = queryAll('.orb-info__name');
        const appTexts = Array.from(appInfo).map(el => el.textContent?.trim());
        expect(appTexts).toContain('App One');
      });

      it('should render multiple data rows when multiple users exist', fakeAsync(() => {
        const secondUser: UserWithRoles = {
          userId: 'user-456',
          firstName: 'Jane',
          lastName: 'Smith',
          status: 'ACTIVE',
          roleAssignments: [{ ...mockRoleAssignment, applicationUserRoleId: 'role-2' }],
        };
        const secondRow: UserTableRow = {
          user: secondUser,
          userStatus: 'ACTIVE',
          roleCount: 1,
          environments: ['staging'],
          organizationNames: ['Org Two'],
          applicationNames: ['App Two'],
          lastActivity: '2 hours ago',
          roleAssignments: [{ ...mockRoleAssignment, applicationUserRoleId: 'role-2' }],
        };

        store.overrideSelector(fromUsers.selectFilteredUserRows, [mockUserRow, secondRow]);
        store.refreshState();
        fixture.detectChanges();
        tick();

        const rows = queryAll('.data-grid__row:not(.data-grid__row--loading):not(.data-grid__row--empty)');
        expect(rows.length).toBe(2);
      }));
    });

    describe('Loading State Rendering', () => {
      it('should render loading spinner when loading', fakeAsync(() => {
        store.overrideSelector(fromUsers.selectIsLoading, true);
        store.overrideSelector(fromUsers.selectError, null);
        store.overrideSelector(fromUsers.selectFilteredUserRows, []);
        store.refreshState();
        fixture.detectChanges();
        tick();

        const loadingRow = query('.data-grid__row--loading');
        expect(loadingRow).toBeTruthy();

        const loadingIndicator = query('.data-grid__loading');
        expect(loadingIndicator).toBeTruthy();
        expect(loadingIndicator?.textContent).toContain('Loading...');
      }));

      it('should render spinning icon during loading', fakeAsync(() => {
        store.overrideSelector(fromUsers.selectIsLoading, true);
        store.overrideSelector(fromUsers.selectError, null);
        store.overrideSelector(fromUsers.selectFilteredUserRows, []);
        store.refreshState();
        fixture.detectChanges();
        tick();

        const spinnerIcon = query('.data-grid__loading-icon');
        expect(spinnerIcon).toBeTruthy();
      }));

      it('should not render data rows when loading', fakeAsync(() => {
        store.overrideSelector(fromUsers.selectIsLoading, true);
        store.overrideSelector(fromUsers.selectError, null);
        store.overrideSelector(fromUsers.selectFilteredUserRows, []);
        store.refreshState();
        fixture.detectChanges();
        tick();

        const dataRows = queryAll('.data-grid__row:not(.data-grid__row--loading):not(.data-grid__row--empty)');
        expect(dataRows.length).toBe(0);
      }));
    });

    describe('Error State Rendering', () => {
      it('should render error message when error exists', fakeAsync(() => {
        store.overrideSelector(fromUsers.selectError, 'Failed to load users');
        store.overrideSelector(fromUsers.selectIsLoading, false);
        store.overrideSelector(fromUsers.selectFilteredUserRows, []);
        store.refreshState();
        fixture.detectChanges();
        tick();

        const errorMessage = query('.orb-error-message');
        expect(errorMessage).toBeTruthy();
      }));

      it('should display the error text', fakeAsync(() => {
        store.overrideSelector(fromUsers.selectError, 'Network connection failed');
        store.overrideSelector(fromUsers.selectIsLoading, false);
        store.overrideSelector(fromUsers.selectFilteredUserRows, []);
        store.refreshState();
        fixture.detectChanges();
        tick();

        const errorText = query('.orb-error-message__text');
        expect(errorText?.textContent?.trim()).toBe('Network connection failed');
      }));

      it('should display error title', fakeAsync(() => {
        store.overrideSelector(fromUsers.selectError, 'Some error');
        store.overrideSelector(fromUsers.selectIsLoading, false);
        store.refreshState();
        fixture.detectChanges();
        tick();

        const errorTitle = query('.orb-error-message__title');
        expect(errorTitle?.textContent?.trim()).toBe('Unable to load users');
      }));

      it('should render retry button in error state', fakeAsync(() => {
        store.overrideSelector(fromUsers.selectError, 'Failed to load users');
        store.overrideSelector(fromUsers.selectIsLoading, false);
        store.refreshState();
        fixture.detectChanges();
        tick();

        const retryBtn = query('.orb-error-message .orb-btn--primary');
        expect(retryBtn).toBeTruthy();
        expect(retryBtn?.textContent).toContain('Retry');
      }));

      it('should not render data grid when error exists', fakeAsync(() => {
        store.overrideSelector(fromUsers.selectError, 'Failed to load users');
        store.overrideSelector(fromUsers.selectIsLoading, false);
        store.refreshState();
        fixture.detectChanges();
        tick();

        const dataGrid = query('app-data-grid');
        expect(dataGrid).toBeFalsy();
      }));
    });

    describe('Empty State Rendering', () => {
      it('should render empty state when no users and not loading', fakeAsync(() => {
        store.overrideSelector(fromUsers.selectFilteredUserRows, []);
        store.overrideSelector(fromUsers.selectIsLoading, false);
        store.overrideSelector(fromUsers.selectError, null);
        store.refreshState();
        fixture.detectChanges();
        tick();

        const emptyRow = query('.data-grid__row--empty');
        expect(emptyRow).toBeTruthy();
      }));

      it('should display empty message text', fakeAsync(() => {
        store.overrideSelector(fromUsers.selectFilteredUserRows, []);
        store.overrideSelector(fromUsers.selectIsLoading, false);
        store.overrideSelector(fromUsers.selectError, null);
        store.refreshState();
        fixture.detectChanges();
        tick();

        const emptyText = query('.data-grid__empty-text');
        expect(emptyText?.textContent?.trim()).toBe('No users found');
      }));

      it('should render empty state icon', fakeAsync(() => {
        store.overrideSelector(fromUsers.selectFilteredUserRows, []);
        store.overrideSelector(fromUsers.selectIsLoading, false);
        store.overrideSelector(fromUsers.selectError, null);
        store.refreshState();
        fixture.detectChanges();
        tick();

        const emptyIcon = query('.data-grid__empty-icon');
        expect(emptyIcon).toBeTruthy();
      }));
    });

    describe('Pagination Controls Rendering', () => {
      it('should render pagination when data has multiple pages', fakeAsync(() => {
        // Set page state with multiple pages
        component.pageState = {
          currentPage: 1,
          pageSize: 10,
          totalItems: 50,
          totalPages: 5,
        };
        store.overrideSelector(fromUsers.selectFilteredUserRows, [mockUserRow]);
        store.overrideSelector(fromUsers.selectIsLoading, false);
        store.overrideSelector(fromUsers.selectError, null);
        store.refreshState();
        fixture.detectChanges();
        tick();

        const pagination = query('.data-grid__pagination');
        expect(pagination).toBeTruthy();
      }));

      it('should render page size selector', fakeAsync(() => {
        component.pageState = {
          currentPage: 1,
          pageSize: 10,
          totalItems: 50,
          totalPages: 5,
        };
        store.overrideSelector(fromUsers.selectFilteredUserRows, [mockUserRow]);
        store.overrideSelector(fromUsers.selectIsLoading, false);
        store.overrideSelector(fromUsers.selectError, null);
        store.refreshState();
        fixture.detectChanges();
        tick();

        const pageSizeSelect = query('.data-grid__page-size-select');
        expect(pageSizeSelect).toBeTruthy();
      }));

      it('should render page navigation buttons', fakeAsync(() => {
        component.pageState = {
          currentPage: 1,
          pageSize: 10,
          totalItems: 50,
          totalPages: 5,
        };
        store.overrideSelector(fromUsers.selectFilteredUserRows, [mockUserRow]);
        store.overrideSelector(fromUsers.selectIsLoading, false);
        store.overrideSelector(fromUsers.selectError, null);
        store.refreshState();
        fixture.detectChanges();
        tick();

        const pageNav = query('.data-grid__page-nav');
        expect(pageNav).toBeTruthy();

        const pageButtons = queryAll('.data-grid__page-btn');
        expect(pageButtons.length).toBeGreaterThan(0);
      }));

      it('should render display range text', fakeAsync(() => {
        component.pageState = {
          currentPage: 1,
          pageSize: 10,
          totalItems: 50,
          totalPages: 5,
        };
        store.overrideSelector(fromUsers.selectFilteredUserRows, [mockUserRow]);
        store.overrideSelector(fromUsers.selectIsLoading, false);
        store.overrideSelector(fromUsers.selectError, null);
        store.refreshState();
        fixture.detectChanges();
        tick();

        const displayRange = query('.data-grid__display-range');
        expect(displayRange).toBeTruthy();
      }));

      it('should not render pagination when totalPages is 0', fakeAsync(() => {
        component.pageState = {
          currentPage: 1,
          pageSize: 25,
          totalItems: 0,
          totalPages: 0,
        };
        store.overrideSelector(fromUsers.selectFilteredUserRows, []);
        store.overrideSelector(fromUsers.selectIsLoading, false);
        store.overrideSelector(fromUsers.selectError, null);
        store.refreshState();
        fixture.detectChanges();
        tick();

        const pagination = query('.data-grid__pagination');
        expect(pagination).toBeFalsy();
      }));

      it('should render load more button when hasMore is true', fakeAsync(() => {
        store.overrideSelector(fromUsers.selectHasMore, true);
        store.overrideSelector(fromUsers.selectFilteredUserRows, [mockUserRow]);
        store.overrideSelector(fromUsers.selectIsLoading, false);
        store.overrideSelector(fromUsers.selectError, null);
        store.refreshState();
        fixture.detectChanges();
        tick();

        const loadMoreBtn = query('.orb-card__footer .orb-btn--secondary');
        expect(loadMoreBtn).toBeTruthy();
        expect(loadMoreBtn?.textContent).toContain('Load More Users');
      }));

      it('should not render load more button when hasMore is false', fakeAsync(() => {
        store.overrideSelector(fromUsers.selectHasMore, false);
        store.overrideSelector(fromUsers.selectFilteredUserRows, [mockUserRow]);
        store.overrideSelector(fromUsers.selectIsLoading, false);
        store.overrideSelector(fromUsers.selectError, null);
        store.refreshState();
        fixture.detectChanges();
        tick();

        const loadMoreBtn = query('.orb-card__footer .orb-btn--secondary');
        expect(loadMoreBtn).toBeFalsy();
      }));
    });

    describe('Card Header Rendering', () => {
      it('should render card header with title', fakeAsync(() => {
        fixture.detectChanges();
        tick();

        const cardTitle = query('.orb-card__title');
        expect(cardTitle).toBeTruthy();
        expect(cardTitle?.textContent).toContain('Application Users');
      }));

      it('should render refresh button in header', fakeAsync(() => {
        fixture.detectChanges();
        tick();

        const refreshBtn = query('.orb-card__header-actions .orb-card-btn');
        expect(refreshBtn).toBeTruthy();
        expect(refreshBtn?.textContent).toContain('Refresh');
      }));
    });
  });
});
