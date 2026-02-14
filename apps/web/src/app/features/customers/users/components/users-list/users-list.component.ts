/**
 * Users List Component
 * 
 * Displays a list of users assigned to applications using the shared DataGridComponent.
 * Supports filtering, sorting, and navigation to application details.
 * Follows the Organizations pattern for NgRx store management.
 */

import { Component, OnInit, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import { StatusBadgeComponent } from '../../../../../shared/components/ui/status-badge.component';
import {
  DataGridComponent,
  ColumnDefinition,
  PageState,
  SortState,
  FilterState,
  PageChangeEvent,
  SortChangeEvent,
  FilterChangeEvent,
  DEFAULT_PAGE_STATE
} from '../../../../../shared/components/data-grid';

import { UserStatus } from '../../../../../core/enums/UserStatusEnum';
import { UsersActions } from '../../store/users.actions';
import * as fromUsers from '../../store/users.selectors';
import { UserTableRow } from '../../store/users.state';
import { UserPageComponent } from '../../../../../layouts/pages/user-page/user-page.component';
import { BreadcrumbItem } from '../../../../../shared/components';
import { TabConfig } from '../../../../../shared/models/tab-config.model';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [
    CommonModule,
    FontAwesomeModule,
    StatusBadgeComponent,
    DataGridComponent,
    UserPageComponent
  ],
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.scss']
})
export class UsersListComponent implements OnInit, OnDestroy {
  // UserPageComponent configuration
  breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Users', route: null }
  ];

  tabs: TabConfig[] = [
    { id: 'overview', label: 'Overview', icon: 'fas fa-list' }
  ];

  activeTab = 'overview';

  // Template references for custom cells
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @ViewChild('userInfoCell', { static: true }) userInfoCell!: TemplateRef<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @ViewChild('statusCell', { static: true }) statusCell!: TemplateRef<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @ViewChild('roleCountCell', { static: true }) roleCountCell!: TemplateRef<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @ViewChild('environmentsCell', { static: true }) environmentsCell!: TemplateRef<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @ViewChild('organizationsCell', { static: true }) organizationsCell!: TemplateRef<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @ViewChild('applicationsCell', { static: true }) applicationsCell!: TemplateRef<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @ViewChild('lastActivityCell', { static: true }) lastActivityCell!: TemplateRef<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @ViewChild('expandedRowCell', { static: true }) expandedRowCell!: TemplateRef<any>;

  // User data from store
  userRows$: Observable<UserTableRow[]>;
  filteredUserRows$: Observable<UserTableRow[]>;
  isLoading$: Observable<boolean>;
  error$: Observable<string | null>;
  hasMore$: Observable<boolean>;

  // Expanded rows tracking
  expandedUserIds = new Set<string>();

  // Grid configuration
  columns: ColumnDefinition<UserTableRow>[] = [];
  pageState: PageState = { ...DEFAULT_PAGE_STATE, pageSize: 25 };
  sortState: SortState | null = null;
  filterState: FilterState = {};

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private store: Store
  ) {
    // User selectors
    this.userRows$ = this.store.select(fromUsers.selectUserRows);
    this.filteredUserRows$ = this.store.select(fromUsers.selectFilteredUserRows);
    this.isLoading$ = this.store.select(fromUsers.selectIsLoading);
    this.error$ = this.store.select(fromUsers.selectError);
    this.hasMore$ = this.store.select(fromUsers.selectHasMore);

    // Update page state when data changes
    this.filteredUserRows$.pipe(
      takeUntil(this.destroy$),
      map(rows => rows.length)
    ).subscribe(totalItems => {
      this.pageState = {
        ...this.pageState,
        totalItems,
        totalPages: Math.ceil(totalItems / this.pageState.pageSize)
      };
    });
  }

  ngOnInit(): void {
    // Initialize columns with templates
    this.initializeColumns();

    /**
     * Route-Based Filter Initialization (Property 11)
     * 
     * Automatically applies filters from URL query parameters to the store.
     * This enables deep-linking to filtered views:
     * - /customers/users?organizationIds=org1,org2 → filter by organizations
     * - /customers/users?applicationIds=app1 → filter by applications
     * - /customers/users?environment=PRODUCTION → filter by environment
     * 
     * The store dispatches trigger the Lambda query with these filters applied.
     */
    this.route.queryParams.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      // Extract organizationIds from query params (comma-separated)
      if (params['organizationIds']) {
        const orgIds = params['organizationIds'].split(',');
        this.store.dispatch(UsersActions.setOrganizationFilter({ organizationIds: orgIds }));
      }

      // Extract applicationIds from query params (comma-separated)
      if (params['applicationIds']) {
        const appIds = params['applicationIds'].split(',');
        this.store.dispatch(UsersActions.setApplicationFilter({ applicationIds: appIds }));
      }

      // Extract environment from query params (single value)
      if (params['environment']) {
        this.store.dispatch(UsersActions.setEnvironmentFilter({ environment: params['environment'] }));
      }
    });

    // Load users from the store
    this.store.dispatch(UsersActions.loadUsers());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeColumns(): void {
    this.columns = [
      {
        field: 'user',
        header: 'User',
        sortable: true,
        filterable: true,
        cellTemplate: this.userInfoCell,
        width: '20%'
      },
      {
        field: 'userStatus',
        header: 'Status',
        sortable: true,
        filterable: true,
        filterType: 'select',
        filterOptions: [
          { value: '', label: 'All Statuses' },
          { value: 'ACTIVE', label: 'Active' },
          { value: 'INACTIVE', label: 'Inactive' },
          { value: 'PENDING', label: 'Pending' }
        ],
        cellTemplate: this.statusCell,
        width: '10%'
      },
      {
        field: 'roleCount',
        header: 'Roles',
        sortable: true,
        cellTemplate: this.roleCountCell,
        width: '10%',
        align: 'center'
      },
      {
        field: 'environments',
        header: 'Environments',
        sortable: false,
        cellTemplate: this.environmentsCell,
        width: '15%'
      },
      {
        field: 'organizationNames',
        header: 'Organizations',
        sortable: false,
        cellTemplate: this.organizationsCell,
        width: '15%'
      },
      {
        field: 'applicationNames',
        header: 'Applications',
        sortable: false,
        cellTemplate: this.applicationsCell,
        width: '15%'
      },
      {
        field: 'lastActivity',
        header: 'Last Updated',
        sortable: true,
        cellTemplate: this.lastActivityCell,
        width: '15%'
      }
    ];
  }

  // Grid event handlers
  onPageChange(event: PageChangeEvent): void {
    this.pageState = {
      ...this.pageState,
      currentPage: event.page,
      pageSize: event.pageSize,
      totalPages: Math.ceil(this.pageState.totalItems / event.pageSize)
    };
  }

  onSortChange(event: SortChangeEvent): void {
    if (event.direction) {
      this.sortState = { field: event.field, direction: event.direction };
    } else {
      this.sortState = null;
    }
    // TODO: Dispatch sort action to store for server-side sorting
  }

  onFilterChange(event: FilterChangeEvent): void {
    this.filterState = event.filters;

    // Dispatch filter actions to store
    const searchTerm = (event.filters['user'] as string) || '';
    const statusFilter = (event.filters['userStatus'] as string) || '';

    this.store.dispatch(UsersActions.setSearchTerm({ searchTerm }));
    this.store.dispatch(UsersActions.setStatusFilter({ statusFilter }));
  }

  onResetGrid(): void {
    this.pageState = { ...DEFAULT_PAGE_STATE, pageSize: 25 };
    this.sortState = null;
    this.filterState = {};

    // Clear store filters
    this.store.dispatch(UsersActions.setSearchTerm({ searchTerm: '' }));
    this.store.dispatch(UsersActions.setStatusFilter({ statusFilter: '' }));
  }

  /**
   * User Expansion Toggle (Property 10: PII Exclusion)
   * 
   * Toggles the expanded state for a user row. When expanded, shows role
   * assignment details. The expanded view intentionally excludes email
   * addresses and other PII - only showing userId, name, and role information.
   */
  onRowClick(row: UserTableRow): void {
    // Toggle expanded state for this user
    if (this.expandedUserIds.has(row.user.userId)) {
      this.expandedUserIds.delete(row.user.userId);
    } else {
      this.expandedUserIds.add(row.user.userId);
    }
  }

  isRowExpanded(userId: string): boolean {
    return this.expandedUserIds.has(userId);
  }

  onLoadMore(): void {
    this.store.dispatch(UsersActions.loadMoreUsers());
  }

  /**
   * Navigate to Applications List Filtered by User
   * 
   * Extracts unique application IDs from the user's role assignments
   * and navigates to the applications list with those IDs as a filter.
   * This enables the "click on application count" interaction pattern.
   */
  onApplicationCountClick(event: Event, row: UserTableRow): void {
    // Stop event propagation to prevent row click (expansion toggle)
    event.stopPropagation();

    // Extract unique application IDs from role assignments
    const applicationIds = Array.from(new Set(
      row.roleAssignments.map((role: { applicationId: string }) => role.applicationId)
    ));

    // Navigate to applications list filtered by this user's applications
    this.router.navigate(['/customers/applications'], {
      queryParams: {
        filterByUser: row.user.userId,
        applicationIds: applicationIds.join(',')
      }
    });
  }

  onRefresh(): void {
    this.store.dispatch(UsersActions.refreshUsers());
  }

  onRetry(): void {
    this.store.dispatch(UsersActions.loadUsers());
  }

  getStatusClass(status: UserStatus): string {
    switch (status) {
      case UserStatus.Active:
        return 'active';
      case UserStatus.Inactive:
        return 'inactive';
      case UserStatus.Pending:
        return 'pending';
      default:
        return 'inactive';
    }
  }

  /**
   * Handle tab change from UserPageComponent
   */
  onTabChange(tabId: string): void {
    this.activeTab = tabId;
  }
}
