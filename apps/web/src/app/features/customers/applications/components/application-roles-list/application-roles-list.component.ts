/**
 * Application Roles List Component
 *
 * Displays a list of roles for an application using the shared DataGridComponent.
 * Supports filtering, sorting, and CRUD operations via dialogs.
 * Uses NgRx store as single source of truth.
 *
 * @see .kiro/specs/application-roles-management/design.md
 * _Requirements: 4.1, 4.7, 8.1, 8.2, 8.4_
 */

import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
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
  DEFAULT_PAGE_STATE,
} from '../../../../../shared/components/data-grid';

import { ApplicationRolesActions } from '../../store/application-roles/application-roles.actions';
import * as fromApplicationRoles from '../../store/application-roles/application-roles.selectors';
import { ApplicationRoleTableRow } from '../../store/application-roles/application-roles.state';
import { IApplicationRoles } from '../../../../../core/models/ApplicationRolesModel';
import { ApplicationRoleStatus } from '../../../../../core/enums/ApplicationRoleStatusEnum';
import { ApplicationRoleType } from '../../../../../core/enums/ApplicationRoleTypeEnum';
import { CreateRoleDialogComponent } from '../create-role-dialog/create-role-dialog.component';
import { EditRoleDialogComponent } from '../edit-role-dialog/edit-role-dialog.component';

@Component({
  selector: 'app-application-roles-list',
  standalone: true,
  imports: [
    CommonModule,
    FontAwesomeModule,
    DataGridComponent,
    CreateRoleDialogComponent,
    EditRoleDialogComponent,
  ],
  templateUrl: './application-roles-list.component.html',
  styleUrls: ['./application-roles-list.component.scss'],
})
export class ApplicationRolesListComponent implements OnInit, OnDestroy {
  @Input() applicationId: string | null = null;
  @Input() organizationId: string | null = null;

  // Template references for custom cells
  @ViewChild('roleInfoCell', { static: true }) roleInfoCell!: TemplateRef<unknown>;
  @ViewChild('roleTypeCell', { static: true }) roleTypeCell!: TemplateRef<unknown>;
  @ViewChild('descriptionCell', { static: true }) descriptionCell!: TemplateRef<unknown>;
  @ViewChild('statusCell', { static: true }) statusCell!: TemplateRef<unknown>;
  @ViewChild('lastActivityCell', { static: true }) lastActivityCell!: TemplateRef<unknown>;

  // Store selectors
  roleRows$: Observable<ApplicationRoleTableRow[]>;
  filteredRoleRows$: Observable<ApplicationRoleTableRow[]>;
  isLoading$: Observable<boolean>;
  error$: Observable<string | null>;
  showCreateDialog$: Observable<boolean>;
  showEditDialog$: Observable<boolean>;
  selectedRole$: Observable<IApplicationRoles | null>;

  // Grid configuration
  columns: ColumnDefinition<ApplicationRoleTableRow>[] = [];
  pageState: PageState = { ...DEFAULT_PAGE_STATE, pageSize: 10 };
  sortState: SortState | null = null;
  filterState: FilterState = {};

  private destroy$ = new Subject<void>();

  // Role type icon mapping
  readonly roleTypeIcons: Record<string, string> = {
    [ApplicationRoleType.Admin]: 'user-shield',
    [ApplicationRoleType.User]: 'user',
    [ApplicationRoleType.Guest]: 'user-clock',
    [ApplicationRoleType.Custom]: 'user-cog',
    [ApplicationRoleType.Unknown]: 'question-circle',
  };

  constructor(private store: Store) {
    // Initialize store selectors
    this.roleRows$ = this.store.select(fromApplicationRoles.selectRoleRows);
    this.filteredRoleRows$ = this.store.select(fromApplicationRoles.selectFilteredRoleRows);
    this.isLoading$ = this.store.select(fromApplicationRoles.selectIsLoading);
    this.error$ = this.store.select(fromApplicationRoles.selectError);
    this.showCreateDialog$ = this.store.select(fromApplicationRoles.selectShowCreateDialog);
    this.showEditDialog$ = this.store.select(fromApplicationRoles.selectShowEditDialog);
    this.selectedRole$ = this.store.select(fromApplicationRoles.selectSelectedRole);

    // Update page state when data changes
    this.filteredRoleRows$
      .pipe(
        takeUntil(this.destroy$),
        map((rows) => rows.length)
      )
      .subscribe((totalItems) => {
        this.pageState = {
          ...this.pageState,
          totalItems,
          totalPages: Math.ceil(totalItems / this.pageState.pageSize),
        };
      });
  }

  ngOnInit(): void {
    // Initialize columns with templates
    this.initializeColumns();

    // Load roles if applicationId is provided
    if (this.applicationId) {
      this.store.dispatch(
        ApplicationRolesActions.setApplicationContext({
          applicationId: this.applicationId,
          organizationId: this.organizationId || '',
        })
      );
      this.store.dispatch(
        ApplicationRolesActions.loadRoles({ applicationId: this.applicationId })
      );
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeColumns(): void {
    this.columns = [
      {
        field: 'roleName',
        header: 'Role',
        sortable: true,
        filterable: true,
        cellTemplate: this.roleInfoCell,
        width: '25%',
      },
      {
        field: 'roleTypeLabel',
        header: 'Type',
        sortable: true,
        filterable: true,
        filterType: 'select',
        filterOptions: [
          { value: ApplicationRoleType.Admin, label: 'Admin' },
          { value: ApplicationRoleType.User, label: 'User' },
          { value: ApplicationRoleType.Guest, label: 'Guest' },
          { value: ApplicationRoleType.Custom, label: 'Custom' },
        ],
        cellTemplate: this.roleTypeCell,
        width: '15%',
      },
      {
        field: 'description',
        header: 'Description',
        sortable: false,
        cellTemplate: this.descriptionCell,
        width: '30%',
      },
      {
        field: 'statusLabel',
        header: 'Status',
        sortable: true,
        filterable: true,
        filterType: 'select',
        filterOptions: [
          { value: ApplicationRoleStatus.Active, label: 'Active' },
          { value: ApplicationRoleStatus.Inactive, label: 'Inactive' },
          { value: ApplicationRoleStatus.Pending, label: 'Pending' },
        ],
        cellTemplate: this.statusCell,
        width: '12%',
      },
      {
        field: 'lastActivity',
        header: 'Last Updated',
        sortable: true,
        cellTemplate: this.lastActivityCell,
        width: '18%',
        hideOnMobile: true,
      },
    ];
  }

  // Grid event handlers
  onPageChange(event: PageChangeEvent): void {
    this.pageState = {
      ...this.pageState,
      currentPage: event.page,
      pageSize: event.pageSize,
      totalPages: Math.ceil(this.pageState.totalItems / event.pageSize),
    };
  }

  onSortChange(event: SortChangeEvent): void {
    if (event.direction) {
      this.sortState = { field: event.field, direction: event.direction };
    } else {
      this.sortState = null;
    }
  }

  onFilterChange(event: FilterChangeEvent): void {
    this.filterState = event.filters;

    // Dispatch filter actions to store
    const searchTerm = (event.filters['roleName'] as string) || '';
    const statusFilter = (event.filters['statusLabel'] as string) || '';
    const roleTypeFilter = (event.filters['roleTypeLabel'] as string) || '';

    this.store.dispatch(ApplicationRolesActions.setSearchTerm({ searchTerm }));
    this.store.dispatch(ApplicationRolesActions.setStatusFilter({ statusFilter }));
    this.store.dispatch(ApplicationRolesActions.setRoleTypeFilter({ roleTypeFilter }));
  }

  onResetGrid(): void {
    this.pageState = { ...DEFAULT_PAGE_STATE, pageSize: 10 };
    this.sortState = null;
    this.filterState = {};

    // Clear store filters
    this.store.dispatch(ApplicationRolesActions.setSearchTerm({ searchTerm: '' }));
    this.store.dispatch(ApplicationRolesActions.setStatusFilter({ statusFilter: '' }));
    this.store.dispatch(ApplicationRolesActions.setRoleTypeFilter({ roleTypeFilter: '' }));
  }

  onRowClick(row: ApplicationRoleTableRow): void {
    // Open edit dialog for the selected role
    this.store.dispatch(ApplicationRolesActions.openEditDialog({ role: row.role }));
  }

  onCreateRole(): void {
    // Open create dialog
    this.store.dispatch(ApplicationRolesActions.openCreateDialog());
  }

  onCreateDialogClosed(): void {
    this.store.dispatch(ApplicationRolesActions.closeCreateDialog());
  }

  onEditDialogClosed(): void {
    this.store.dispatch(ApplicationRolesActions.closeEditDialog());
  }

  // Helper methods
  getRoleTypeIcon(roleType: string): string {
    return this.roleTypeIcons[roleType] || 'user';
  }

  getRoleTypeClass(roleType: string): string {
    switch (roleType) {
      case ApplicationRoleType.Admin:
        return 'admin';
      case ApplicationRoleType.User:
        return 'user';
      case ApplicationRoleType.Guest:
        return 'guest';
      case ApplicationRoleType.Custom:
        return 'custom';
      default:
        return 'unknown';
    }
  }

  getStatusBadgeType(status: string): string {
    switch (status) {
      case ApplicationRoleStatus.Active:
        return 'success';
      case ApplicationRoleStatus.Inactive:
        return 'warning';
      case ApplicationRoleStatus.Pending:
        return 'info';
      case ApplicationRoleStatus.Deleted:
        return 'danger';
      default:
        return 'secondary';
    }
  }
}
