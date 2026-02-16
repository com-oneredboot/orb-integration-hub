/**
 * Application Users List Component
 * 
 * Displays a list of users assigned to an application using the shared DataGridComponent.
 * Supports filtering, sorting, and user management (assign, unassign, edit roles).
 */

import { Component, OnInit, OnDestroy, Input, TemplateRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
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
import { ApplicationUsersActions } from '../../store/application-users/application-users.actions';
import * as fromApplicationUsers from '../../store/application-users/application-users.selectors';
import { ApplicationUserTableRow } from '../../store/application-users/application-users.state';

@Component({
  selector: 'app-application-users-list',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    FontAwesomeModule,
    DataGridComponent
  ],
  templateUrl: './application-users-list.component.html',
  styleUrls: ['./application-users-list.component.scss']
})
export class ApplicationUsersListComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() applicationId!: string;

  // Template references for custom cells
  @ViewChild('userInfoCell') userInfoCell!: TemplateRef<unknown>;
  @ViewChild('roleCell') roleCell!: TemplateRef<unknown>;
  @ViewChild('lastActivityCell') lastActivityCell!: TemplateRef<unknown>;
  @ViewChild('actionsCell') actionsCell!: TemplateRef<unknown>;

  // User data from store
  userRows$: Observable<ApplicationUserTableRow[]>;
  filteredUserRows$: Observable<ApplicationUserTableRow[]>;
  isLoading$: Observable<boolean>;
  
  // Grid configuration
  columns: ColumnDefinition<ApplicationUserTableRow>[] = [];
  pageState: PageState = { ...DEFAULT_PAGE_STATE, pageSize: 10 };
  sortState: SortState | null = null;
  filterState: FilterState = {};
  
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private store: Store
  ) {
    // Application Users selectors
    this.userRows$ = this.store.select(fromApplicationUsers.selectUserRows);
    this.filteredUserRows$ = this.store.select(fromApplicationUsers.selectFilteredUserRows);
    this.isLoading$ = this.store.select(fromApplicationUsers.selectIsLoading);
    
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
    console.debug('[ApplicationUsersListComponent] Initializing with applicationId:', this.applicationId);
    
    if (!this.applicationId) {
      console.error('[ApplicationUsersListComponent] No applicationId provided');
      return;
    }

    // Load application users
    this.store.dispatch(ApplicationUsersActions.loadApplicationUsers({ applicationId: this.applicationId }));
  }

  ngAfterViewInit(): void {
    // Configure columns after view init to ensure templates are available
    this.columns = [
      {
        field: 'user',
        header: 'User',
        sortable: true,
        filterable: true,
        filterType: 'text',
        cellTemplate: this.userInfoCell,
        width: '30%'
      },
      {
        field: 'roleAssignments',
        header: 'Roles',
        cellTemplate: this.roleCell,
        width: '40%'
      },
      {
        field: 'lastActivity',
        header: 'Last Activity',
        sortable: true,
        cellTemplate: this.lastActivityCell,
        width: '15%'
      },
      {
        field: 'actions',
        header: 'Actions',
        cellTemplate: this.actionsCell,
        width: '15%',
        align: 'right'
      }
    ];
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Grid event handlers
  onPageChange(event: PageChangeEvent): void {
    console.debug('[ApplicationUsersListComponent] Page changed:', event);
    this.pageState = {
      ...this.pageState,
      currentPage: event.page,
      pageSize: event.pageSize,
      totalPages: Math.ceil(this.pageState.totalItems / event.pageSize)
    };
  }

  onSortChange(event: SortChangeEvent): void {
    console.debug('[ApplicationUsersListComponent] Sort changed:', event);
    this.sortState = event.direction ? { field: event.field, direction: event.direction } : null;
  }

  onFilterChange(event: FilterChangeEvent): void {
    console.debug('[ApplicationUsersListComponent] Filter changed:', event);
    this.filterState = event.filters;
    
    // Dispatch filter actions to store
    const searchTerm = (event.filters['user'] as string) || '';
    this.store.dispatch(ApplicationUsersActions.setSearchTerm({ searchTerm }));
  }

  onResetGrid(): void {
    console.debug('[ApplicationUsersListComponent] Grid reset');
    this.pageState = { ...DEFAULT_PAGE_STATE, pageSize: 10 };
    this.sortState = null;
    this.filterState = {};
    this.store.dispatch(ApplicationUsersActions.setSearchTerm({ searchTerm: '' }));
    this.store.dispatch(ApplicationUsersActions.setRoleFilter({ roleFilter: '' }));
    this.store.dispatch(ApplicationUsersActions.setEnvironmentFilter({ environmentFilter: '' }));
  }

  onRowClick(row: ApplicationUserTableRow): void {
    console.debug('[ApplicationUsersListComponent] Row clicked:', row);
    // Navigate to user detail page
    this.router.navigate(['/customers/users', row.user.userId]);
  }

  // User management actions
  onAssignUser(): void {
    console.debug('[ApplicationUsersListComponent] Assign user clicked');
    // TODO: Open assign user dialog
  }

  onUnassignUser(userId: string): void {
    console.debug('[ApplicationUsersListComponent] Unassign user:', userId);
    // TODO: Show confirmation dialog, then dispatch unassign action
    this.store.dispatch(ApplicationUsersActions.unassignUserFromApplication({
      applicationId: this.applicationId,
      userId
    }));
  }

  onEditRole(userId: string, environmentId: string): void {
    console.debug('[ApplicationUsersListComponent] Edit role:', { userId, environmentId });
    // TODO: Open edit role dialog
  }

  // Helper methods
  getRoleClass(role: string): string {
    return role.toLowerCase().replace('_', '-');
  }

  getUserFullName(user: IUsers): string {
    return `${user.firstName} ${user.lastName}`;
  }
}
