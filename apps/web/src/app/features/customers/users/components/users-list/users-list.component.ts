/**
 * Users List Component
 * 
 * Displays a list of users assigned to applications using the shared DataGridComponent.
 * Supports filtering, sorting, and navigation to application details.
 * Follows the Organizations pattern for NgRx store management.
 */

import { Component, OnInit, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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

import { IUsers } from '../../../../../core/models/UsersModel';
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
  @ViewChild('applicationCountCell', { static: true }) applicationCountCell!: TemplateRef<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @ViewChild('lastActivityCell', { static: true }) lastActivityCell!: TemplateRef<any>;

  // User data from store
  userRows$: Observable<UserTableRow[]>;
  filteredUserRows$: Observable<UserTableRow[]>;
  isLoading$: Observable<boolean>;
  error$: Observable<string | null>;

  // Grid configuration
  columns: ColumnDefinition<UserTableRow>[] = [];
  pageState: PageState = { ...DEFAULT_PAGE_STATE, pageSize: 25 };
  sortState: SortState | null = null;
  filterState: FilterState = {};

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private store: Store
  ) {
    // User selectors
    this.userRows$ = this.store.select(fromUsers.selectUserRows);
    this.filteredUserRows$ = this.store.select(fromUsers.selectFilteredUserRows);
    this.isLoading$ = this.store.select(fromUsers.selectIsLoading);
    this.error$ = this.store.select(fromUsers.selectError);

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
        width: '30%'
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
        width: '15%'
      },
      {
        field: 'applicationCount',
        header: 'Applications',
        sortable: true,
        cellTemplate: this.applicationCountCell,
        width: '15%',
        align: 'center'
      },
      {
        field: 'lastActivity',
        header: 'Last Updated',
        sortable: true,
        cellTemplate: this.lastActivityCell,
        width: '20%'
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

  onRowClick(row: UserTableRow): void {
    // Store selected user for future navigation
    this.store.dispatch(UsersActions.selectUser({ user: row.user }));
    this.store.dispatch(UsersActions.setSelectedUserId({ userId: row.user.userId }));
    
    // Display message that detail view is not yet implemented
    console.log('User detail view not yet implemented for:', row.user.userId);
    // TODO: Navigate to user detail page when implemented
    // this.router.navigate(['/customers/users', row.user.userId]);
  }

  onApplicationCountClick(event: Event, row: UserTableRow): void {
    // Stop event propagation to prevent row click
    event.stopPropagation();

    // Navigate to applications list filtered by this user's applications
    this.router.navigate(['/customers/applications'], {
      queryParams: {
        filterByUser: row.user.userId,
        applicationIds: row.applicationIds.join(',')
      }
    });
  }

  onRefresh(): void {
    this.store.dispatch(UsersActions.refreshUsers());
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
