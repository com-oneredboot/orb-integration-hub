/**
 * Organizations List Component
 * 
 * Displays a list of organizations using the shared DataGridComponent.
 * Supports filtering, sorting, and selection.
 * Uses create-on-click pattern for new organizations.
 */

import { Component, OnInit, OnDestroy, Output, EventEmitter, Input, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil, map, take } from 'rxjs/operators';
import { StatusBadgeComponent } from '../../../../../shared/components/ui/status-badge.component';
import { BreadcrumbItem } from '../../../../../shared/components';
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

import { Organizations } from '../../../../../core/models/OrganizationsModel';
import { IUsers } from '../../../../../core/models/UsersModel';
import { OrganizationStatus } from '../../../../../core/enums/OrganizationStatusEnum';
import { OrganizationService } from '../../../../../core/services/organization.service';
import { UserService } from '../../../../../core/services/user.service';
import * as fromUser from '../../../../user/store/user.selectors';
import { OrganizationsActions } from '../../store/organizations.actions';
import * as fromOrganizations from '../../store/organizations.selectors';
import { OrganizationTableRow } from '../../store/organizations.state';

@Component({
  selector: 'app-organizations-list',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    FontAwesomeModule,
    StatusBadgeComponent,
    DataGridComponent
  ],
  templateUrl: './organizations-list.component.html',
  styleUrls: ['./organizations-list.component.scss']
})
export class OrganizationsListComponent implements OnInit, OnDestroy {
  @Output() organizationSelected = new EventEmitter<Organizations>();
  @Input() selectedOrganization: Organizations | null = null;

  // Template references for custom cells
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @ViewChild('orgInfoCell', { static: true }) orgInfoCell!: TemplateRef<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @ViewChild('statusCell', { static: true }) statusCell!: TemplateRef<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @ViewChild('roleCell', { static: true }) roleCell!: TemplateRef<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @ViewChild('memberCountCell', { static: true }) memberCountCell!: TemplateRef<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @ViewChild('appCountCell', { static: true }) appCountCell!: TemplateRef<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @ViewChild('lastActivityCell', { static: true }) lastActivityCell!: TemplateRef<any>;

  // User data
  currentUser$: Observable<IUsers | null>;
  
  // Organization data from store
  organizationRows$: Observable<OrganizationTableRow[]>;
  filteredOrganizationRows$: Observable<OrganizationTableRow[]>;
  isLoading$: Observable<boolean>;
  isCreatingNew$: Observable<boolean>;
  
  // Grid configuration
  columns: ColumnDefinition<OrganizationTableRow>[] = [];
  pageState: PageState = { ...DEFAULT_PAGE_STATE, pageSize: 10 };
  sortState: SortState | null = null;
  filterState: FilterState = {};
  
  // Create state
  isCreatingDraft = false;
  
  /**
   * Breadcrumb items for navigation
   * Shows: Organizations (current page)
   */
  get breadcrumbItems(): BreadcrumbItem[] {
    return [
      { label: 'Organizations', route: null }
    ];
  }
  
  private destroy$ = new Subject<void>();

  constructor(
    private userService: UserService,
    private organizationService: OrganizationService,
    private router: Router,
    private store: Store
  ) {
    // User selectors
    this.currentUser$ = this.store.select(fromUser.selectCurrentUser);
    
    // Organization selectors
    this.organizationRows$ = this.store.select(fromOrganizations.selectOrganizationRows);
    this.filteredOrganizationRows$ = this.store.select(fromOrganizations.selectFilteredOrganizationRows);
    this.isLoading$ = this.store.select(fromOrganizations.selectIsLoading);
    this.isCreatingNew$ = this.store.select(fromOrganizations.selectIsCreatingNew);
    
    // Update page state when data changes
    this.filteredOrganizationRows$.pipe(
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
    
    // Load organizations from the store
    this.store.dispatch(OrganizationsActions.loadOrganizations());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeColumns(): void {
    this.columns = [
      {
        field: 'organization',
        header: 'Organization',
        sortable: true,
        filterable: true,
        cellTemplate: this.orgInfoCell,
        width: '25%'
      },
      {
        field: 'organization',
        header: 'Status',
        sortable: true,
        filterable: true,
        filterType: 'select',
        filterOptions: [
          { value: 'ACTIVE', label: 'Active' },
          { value: 'INACTIVE', label: 'Inactive' },
          { value: 'PENDING', label: 'Pending' },
          { value: 'SUSPENDED', label: 'Suspended' }
        ],
        cellTemplate: this.statusCell,
        width: '12%'
      },
      {
        field: 'userRole',
        header: 'Role',
        sortable: true,
        filterable: true,
        filterType: 'select',
        filterOptions: [
          { value: 'OWNER', label: 'Owner' },
          { value: 'EMPLOYEE', label: 'Employee' },
          { value: 'CUSTOMER', label: 'Customer' }
        ],
        cellTemplate: this.roleCell,
        width: '12%'
      },
      {
        field: 'memberCount',
        header: 'Members',
        sortable: true,
        cellTemplate: this.memberCountCell,
        width: '12%',
        hideOnMobile: true
      },
      {
        field: 'applicationCount',
        header: 'Applications',
        sortable: true,
        cellTemplate: this.appCountCell,
        width: '12%',
        hideOnMobile: true
      },
      {
        field: 'lastActivity',
        header: 'Last Activity',
        sortable: true,
        cellTemplate: this.lastActivityCell,
        width: '15%',
        hideOnMobile: true
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
    const searchTerm = (event.filters['organization'] as string) || '';
    const statusFilter = (event.filters['status'] as string) || '';
    const roleFilter = (event.filters['userRole'] as string) || '';
    
    this.store.dispatch(OrganizationsActions.setSearchTerm({ searchTerm }));
    this.store.dispatch(OrganizationsActions.setStatusFilter({ statusFilter }));
    this.store.dispatch(OrganizationsActions.setRoleFilter({ roleFilter }));
  }

  onResetGrid(): void {
    this.pageState = { ...DEFAULT_PAGE_STATE, pageSize: 10 };
    this.sortState = null;
    this.filterState = {};
    
    // Clear store filters
    this.store.dispatch(OrganizationsActions.setSearchTerm({ searchTerm: '' }));
    this.store.dispatch(OrganizationsActions.setStatusFilter({ statusFilter: '' }));
    this.store.dispatch(OrganizationsActions.setRoleFilter({ roleFilter: '' }));
  }

  onRowClick(row: OrganizationTableRow): void {
    // Navigate to detail page using create-on-click pattern
    this.router.navigate(['/customers/organizations', row.organization.organizationId]);
  }

  onOrganizationSelected(organization: Organizations): void {
    this.store.dispatch(OrganizationsActions.selectOrganization({ organization }));
    this.organizationSelected.emit(organization);
  }

  onCreateOrganization(): void {
    console.debug('[OrganizationsList] Create organization clicked');
    
    // Check if user is a customer
    this.currentUser$.pipe(take(1)).subscribe(user => {
      console.debug('[OrganizationsList] Current user:', user);
      console.debug('[OrganizationsList] User groups:', user?.groups);
      console.debug('[OrganizationsList] Groups type:', typeof user?.groups, Array.isArray(user?.groups));
      console.debug('[OrganizationsList] isUserCustomer result:', this.userService.isUserCustomer(user));
      
      if (!user?.userId) {
        console.warn('[OrganizationsList] No user ID available');
        return;
      }
      
      // Allow CUSTOMER or OWNER to create organizations
      const canCreate = user.groups?.includes('CUSTOMER') || user.groups?.includes('OWNER');
      console.debug('[OrganizationsList] canCreate:', canCreate);
      
      if (!canCreate) {
        console.warn('[OrganizationsList] User does not have CUSTOMER or OWNER group - cannot create organization');
        console.warn('[OrganizationsList] Available groups:', user.groups);
        return;
      }
      
      if (this.isCreatingDraft) {
        console.debug('[OrganizationsList] Already creating a draft');
        return;
      }
      
      // Create-on-click: Create draft and navigate to detail page
      this.isCreatingDraft = true;
      console.debug('[OrganizationsList] Creating draft organization for user:', user.userId);
      
      this.organizationService.createDraft(user.userId).pipe(take(1)).subscribe({
        next: (organization) => {
          this.isCreatingDraft = false;
          console.debug('[OrganizationsList] Draft created:', organization.organizationId);
          // Navigate to the detail page with the new organization ID
          this.router.navigate(['/customers/organizations', organization.organizationId]);
        },
        error: (error) => {
          this.isCreatingDraft = false;
          console.error('[OrganizationsList] Error creating draft:', error);
        }
      });
    });
  }

  getRoleClass(role: string): string {
    return role.toLowerCase().replace('_', '-');
  }

  getStatusClass(status: OrganizationStatus): string {
    switch (status) {
      case OrganizationStatus.Active:
        return 'active';
      case OrganizationStatus.Inactive:
        return 'inactive';
      case OrganizationStatus.Pending:
        return 'pending';
      default:
        return 'inactive';
    }
  }

  /**
   * Handle click on application count cell
   * Navigates to applications list filtered by organization
   * _Requirements: 1.4_
   */
  onApplicationCountClick(event: Event, row: OrganizationTableRow): void {
    event.stopPropagation(); // Prevent row click navigation
    this.router.navigate(['/customers/applications'], {
      queryParams: { organizationId: row.organization.organizationId }
    });
  }
}
