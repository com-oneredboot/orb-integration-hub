/**
 * Organization Table Component
 * 
 * Displays organizations in a table format with sorting, filtering,
 * and role-based actions. Responsive design with mobile card fallback.
 */

import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { FormsModule } from '@angular/forms';
import { StatusBadgeComponent } from '../ui/status-badge.component';
import { Organizations } from '../../../core/models/OrganizationsModel';
import { OrganizationUserRole } from '../../../core/models/OrganizationUserRoleEnum';
import { OrganizationStatus } from '../../../core/models/OrganizationStatusEnum';

export interface OrganizationTableRow {
  organization: Organizations;
  userRole: OrganizationUserRole | 'OWNER';
  isOwner: boolean;
  memberCount: number;
  applicationCount: number;
}

export type SortColumn = 'name' | 'role' | 'status' | 'members' | 'apps' | 'updated';
export type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-organization-table',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule, FormsModule, StatusBadgeComponent],
  template: `
    <div class="org-table-container">
      
      <!-- Table Header Controls -->
      <div class="org-table__controls">
        <div class="org-table__search">
          <input type="text"
                 class="org-table__search-input"
                 placeholder="Search organizations..."
                 [(ngModel)]="searchTerm"
                 (input)="applyFilters()">
          <fa-icon icon="search" class="org-table__search-icon"></fa-icon>
        </div>
        
        <div class="org-table__filters">
          <select class="org-table__filter"
                  [(ngModel)]="statusFilter"
                  (change)="applyFilters()">
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
          
          <select class="org-table__filter"
                  [(ngModel)]="roleFilter"
                  (change)="applyFilters()">
            <option value="">All Roles</option>
            <option value="OWNER">Owner</option>
            <option value="ADMINISTRATOR">Administrator</option>
            <option value="VIEWER">Viewer</option>
          </select>
        </div>
      </div>

      <!-- Desktop Table View -->
      <div class="org-table__wrapper org-table__wrapper--desktop">
        <table class="org-table" *ngIf="filteredRows.length > 0">
          <thead class="org-table__header">
            <tr class="org-table__header-row">
              <th class="org-table__th org-table__th--name" 
                  [class.org-table__th--sortable]="true"
                  (click)="sort('name')">
                <span class="org-table__th-content">
                  Organization
                  <fa-icon [icon]="getSortIcon('name')" 
                           class="org-table__sort-icon"
                           *ngIf="sortColumn === 'name'"></fa-icon>
                </span>
              </th>
              <th class="org-table__th org-table__th--role"
                  [class.org-table__th--sortable]="true"
                  (click)="sort('role')">
                <span class="org-table__th-content">
                  Your Role
                  <fa-icon [icon]="getSortIcon('role')" 
                           class="org-table__sort-icon"
                           *ngIf="sortColumn === 'role'"></fa-icon>
                </span>
              </th>
              <th class="org-table__th org-table__th--status"
                  [class.org-table__th--sortable]="true"
                  (click)="sort('status')">
                <span class="org-table__th-content">
                  Status
                  <fa-icon [icon]="getSortIcon('status')" 
                           class="org-table__sort-icon"
                           *ngIf="sortColumn === 'status'"></fa-icon>
                </span>
              </th>
              <th class="org-table__th org-table__th--members"
                  [class.org-table__th--sortable]="true"
                  (click)="sort('members')">
                <span class="org-table__th-content">
                  Members
                  <fa-icon [icon]="getSortIcon('members')" 
                           class="org-table__sort-icon"
                           *ngIf="sortColumn === 'members'"></fa-icon>
                </span>
              </th>
              <th class="org-table__th org-table__th--apps"
                  [class.org-table__th--sortable]="true"
                  (click)="sort('apps')">
                <span class="org-table__th-content">
                  Apps
                  <fa-icon [icon]="getSortIcon('apps')" 
                           class="org-table__sort-icon"
                           *ngIf="sortColumn === 'apps'"></fa-icon>
                </span>
              </th>
              <th class="org-table__th org-table__th--actions">
                <span class="org-table__th-content">Actions</span>
              </th>
            </tr>
          </thead>
          
          <tbody class="org-table__body">
            <tr class="org-table__row" 
                *ngFor="let row of paginatedRows; trackBy: trackByOrgId"
                [class.org-table__row--inactive]="row.organization.status !== 'ACTIVE'"
                [class.org-table__row--selected]="selectionMode === 'radio' && selectedOrganization?.organizationId === row.organization.organizationId"
                [class.org-table__row--clickable]="selectionMode === 'radio'"
                (click)="onRowClick(row)">
              
              <!-- Radio Selection -->
              <td class="org-table__td org-table__td--select" *ngIf="selectionMode === 'radio'">
                <input type="radio" 
                       name="selectedOrganization"
                       class="org-table__radio"
                       [value]="row.organization.organizationId"
                       [checked]="selectedOrganization?.organizationId === row.organization.organizationId"
                       (change)="onOrganizationSelected(row.organization)"
                       (click)="$event.stopPropagation()">
              </td>
              
              <!-- Organization Name -->
              <td class="org-table__td org-table__td--name">
                <div class="org-table__name-cell">
                  <span class="org-table__org-name" [title]="row.organization.name">
                    {{ row.organization.name }}
                  </span>
                  <span class="org-table__org-description" 
                        *ngIf="row.organization.description"
                        [title]="row.organization.description">
                    {{ row.organization.description }}
                  </span>
                </div>
              </td>
              
              <!-- User Role -->
              <td class="org-table__td org-table__td--role">
                <span class="role-badge" 
                      [class]="getRoleBadgeClass(row)"
                      [title]="getRoleDescription(row)">
                  <fa-icon [icon]="getRoleIcon(row)" class="role-badge__icon"></fa-icon>
                  {{ getRoleDisplayName(row) }}
                </span>
              </td>
              
              <!-- Status -->
              <td class="org-table__td org-table__td--status">
                <app-status-badge 
                  [status]="row.organization.status" 
                  type="organization"
                  [showIcon]="true"
                  [showLabel]="true">
                </app-status-badge>
              </td>
              
              <!-- Member Count -->
              <td class="org-table__td org-table__td--members">
                <span class="org-table__count">{{ row.memberCount }}</span>
              </td>
              
              <!-- Application Count -->
              <td class="org-table__td org-table__td--apps">
                <span class="org-table__count">{{ row.applicationCount }}</span>
              </td>
              
              <!-- Actions -->
              <td class="org-table__td org-table__td--actions">
                <div class="org-table__actions">
                  <button class="org-table__action org-table__action--primary" 
                          [disabled]="!canEnterOrganization(row)"
                          [title]="getEnterButtonTitle(row)"
                          (click)="onEnterOrganization(row)">
                    <fa-icon icon="sign-in-alt" class="org-table__action-icon"></fa-icon>
                    Enter
                  </button>
                  
                  <button class="org-table__action org-table__action--secondary"
                          [title]="'Manage organization settings'"
                          *ngIf="canManageOrganization(row)"
                          (click)="onManageOrganization(row)">
                    <fa-icon icon="cog" class="org-table__action-icon"></fa-icon>
                    Manage
                  </button>
                  
                  <button class="org-table__action org-table__action--secondary"
                          [title]="'View organization details'"
                          (click)="onViewOrganization(row)">
                    <fa-icon icon="eye" class="org-table__action-icon"></fa-icon>
                    View
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Card View -->
      <div class="org-table__wrapper org-table__wrapper--mobile">
        <div class="org-table__mobile-list" *ngIf="filteredRows.length > 0">
          <div class="org-table__mobile-card" 
               *ngFor="let row of paginatedRows; trackBy: trackByOrgId"
               [class.org-table__mobile-card--inactive]="row.organization.status !== 'ACTIVE'">
            
            <div class="org-table__mobile-header">
              <h3 class="org-table__mobile-name">{{ row.organization.name }}</h3>
              <app-status-badge 
                [status]="row.organization.status" 
                type="organization"
                [showIcon]="true"
                [showLabel]="false">
              </app-status-badge>
            </div>
            
            <div class="org-table__mobile-role">
              <span class="role-badge" [class]="getRoleBadgeClass(row)">
                <fa-icon [icon]="getRoleIcon(row)" class="role-badge__icon"></fa-icon>
                {{ getRoleDisplayName(row) }}
              </span>
            </div>
            
            <div class="org-table__mobile-meta">
              <span class="org-table__mobile-stat">
                <fa-icon icon="users" class="org-table__mobile-stat-icon"></fa-icon>
                {{ row.memberCount }} {{ row.memberCount === 1 ? 'member' : 'members' }}
              </span>
              <span class="org-table__mobile-stat">
                <fa-icon icon="cube" class="org-table__mobile-stat-icon"></fa-icon>
                {{ row.applicationCount }} {{ row.applicationCount === 1 ? 'app' : 'apps' }}
              </span>
            </div>
            
            <div class="org-table__mobile-actions">
              <button class="org-table__mobile-action org-table__mobile-action--primary" 
                      [disabled]="!canEnterOrganization(row)"
                      (click)="onEnterOrganization(row)">
                <fa-icon icon="sign-in-alt" class="org-table__mobile-action-icon"></fa-icon>
                Enter
              </button>
              
              <button class="org-table__mobile-action org-table__mobile-action--secondary"
                      *ngIf="canManageOrganization(row)"
                      (click)="onManageOrganization(row)">
                <fa-icon icon="cog" class="org-table__mobile-action-icon"></fa-icon>
                Manage
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div class="org-table__empty" *ngIf="filteredRows.length === 0">
        <div class="org-table__empty-content">
          <fa-icon icon="building" class="org-table__empty-icon"></fa-icon>
          <h3 class="org-table__empty-title">
            {{ searchTerm || statusFilter || roleFilter ? 'No organizations found' : 'No organizations yet' }}
          </h3>
          <p class="org-table__empty-text">
            {{ getEmptyStateMessage() }}
          </p>
          <button class="org-table__empty-action" 
                  *ngIf="showCreateButton && !searchTerm && !statusFilter && !roleFilter"
                  (click)="onCreateOrganization()">
            <fa-icon icon="plus" class="org-table__empty-action-icon"></fa-icon>
            Create Your First Organization
          </button>
        </div>
      </div>

      <!-- Pagination -->
      <div class="org-table__pagination" *ngIf="totalPages > 1">
        <div class="org-table__pagination-info">
          Showing {{ getDisplayRange() }} of {{ filteredRows.length }} organizations
        </div>
        
        <div class="org-table__pagination-controls">
          <button class="org-table__pagination-btn" 
                  [disabled]="currentPage === 1"
                  (click)="goToPage(currentPage - 1)">
            <fa-icon icon="chevron-left"></fa-icon>
          </button>
          
          <span class="org-table__pagination-pages">
            <button *ngFor="let page of getVisiblePages()" 
                    class="org-table__pagination-page"
                    [class.org-table__pagination-page--active]="page === currentPage"
                    (click)="goToPage(page)">
              {{ page }}
            </button>
          </span>
          
          <button class="org-table__pagination-btn" 
                  [disabled]="currentPage === totalPages"
                  (click)="goToPage(currentPage + 1)">
            <fa-icon icon="chevron-right"></fa-icon>
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./organization-table.component.scss']
})
export class OrganizationTableComponent implements OnInit, OnChanges {
  @Input() rows: OrganizationTableRow[] = [];
  @Input() pageSize: number = 10;
  @Input() showCreateButton: boolean = true;
  @Input() loading: boolean = false;
  @Input() selectionMode: 'none' | 'radio' = 'none';
  @Input() selectedOrganization: Organizations | null = null;

  @Output() enterOrganization = new EventEmitter<Organizations>();
  @Output() manageOrganization = new EventEmitter<Organizations>();
  @Output() viewOrganization = new EventEmitter<Organizations>();
  @Output() createOrganization = new EventEmitter<void>();
  @Output() organizationSelected = new EventEmitter<Organizations>();

  // Filtering and search
  searchTerm: string = '';
  statusFilter: string = '';
  roleFilter: string = '';
  filteredRows: OrganizationTableRow[] = [];

  // Sorting
  sortColumn: SortColumn = 'name';
  sortDirection: SortDirection = 'asc';

  // Pagination
  currentPage: number = 1;
  totalPages: number = 1;
  paginatedRows: OrganizationTableRow[] = [];

  ngOnInit(): void {
    this.applyFilters();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rows']) {
      this.applyFilters();
    }
  }

  /**
   * Apply search and filter criteria
   */
  applyFilters(): void {
    let filtered = [...this.rows];

    // Apply search filter
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(row =>
        row.organization.name.toLowerCase().includes(term) ||
        row.organization.description?.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (this.statusFilter) {
      filtered = filtered.filter(row => row.organization.status === this.statusFilter);
    }

    // Apply role filter
    if (this.roleFilter) {
      if (this.roleFilter === 'OWNER') {
        filtered = filtered.filter(row => row.isOwner);
      } else {
        filtered = filtered.filter(row => row.userRole === this.roleFilter);
      }
    }

    this.filteredRows = filtered;
    this.applySorting();
    this.updatePagination();
  }

  /**
   * Apply current sorting
   */
  applySorting(): void {
    this.filteredRows.sort((a, b) => {
      let comparison = 0;

      switch (this.sortColumn) {
        case 'name':
          comparison = a.organization.name.localeCompare(b.organization.name);
          break;
        case 'role':
          const aRole = a.isOwner ? 'OWNER' : a.userRole;
          const bRole = b.isOwner ? 'OWNER' : b.userRole;
          comparison = aRole.localeCompare(bRole);
          break;
        case 'status':
          comparison = a.organization.status.localeCompare(b.organization.status);
          break;
        case 'members':
          comparison = a.memberCount - b.memberCount;
          break;
        case 'apps':
          comparison = a.applicationCount - b.applicationCount;
          break;
        case 'updated':
          comparison = new Date(a.organization.updatedAt).getTime() - new Date(b.organization.updatedAt).getTime();
          break;
      }

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Sort by column
   */
  sort(column: SortColumn): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.applySorting();
    this.updatePagination();
  }

  /**
   * Get sort icon for column
   */
  getSortIcon(column: SortColumn): string {
    if (this.sortColumn !== column) return 'sort';
    return this.sortDirection === 'asc' ? 'sort-up' : 'sort-down';
  }

  /**
   * Update pagination
   */
  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredRows.length / this.pageSize);
    this.currentPage = Math.min(this.currentPage, this.totalPages || 1);
    this.updatePaginatedRows();
  }

  /**
   * Update paginated rows for current page
   */
  updatePaginatedRows(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedRows = this.filteredRows.slice(start, end);
  }

  /**
   * Go to specific page
   */
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedRows();
    }
  }

  /**
   * Get visible page numbers for pagination
   */
  getVisiblePages(): number[] {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, this.currentPage - delta); 
         i <= Math.min(this.totalPages - 1, this.currentPage + delta); 
         i++) {
      range.push(i);
    }

    if (this.currentPage - delta > 2) {
      rangeWithDots.push(1, -1);
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (this.currentPage + delta < this.totalPages - 1) {
      rangeWithDots.push(-1, this.totalPages);
    } else {
      rangeWithDots.push(this.totalPages);
    }

    return rangeWithDots.filter(page => page > 0);
  }

  /**
   * Get display range text
   */
  getDisplayRange(): string {
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(start + this.pageSize - 1, this.filteredRows.length);
    return `${start}-${end}`;
  }

  /**
   * Event handlers
   */
  onEnterOrganization(row: OrganizationTableRow): void {
    if (this.canEnterOrganization(row)) {
      this.enterOrganization.emit(row.organization);
    }
  }

  onManageOrganization(row: OrganizationTableRow): void {
    this.manageOrganization.emit(row.organization);
  }

  onViewOrganization(row: OrganizationTableRow): void {
    this.viewOrganization.emit(row.organization);
  }

  onCreateOrganization(): void {
    this.createOrganization.emit();
  }

  /**
   * Permission checks
   */
  canEnterOrganization(row: OrganizationTableRow): boolean {
    return row.organization.status === OrganizationStatus.ACTIVE;
  }

  canManageOrganization(row: OrganizationTableRow): boolean {
    return row.isOwner || row.userRole === OrganizationUserRole.ADMINISTRATOR;
  }

  /**
   * Display helpers
   */
  getRoleBadgeClass(row: OrganizationTableRow): string {
    if (row.isOwner) return 'role-badge--owner';
    
    switch (row.userRole) {
      case OrganizationUserRole.ADMINISTRATOR:
        return 'role-badge--administrator';
      case OrganizationUserRole.VIEWER:
        return 'role-badge--viewer';
      default:
        return 'role-badge--unknown';
    }
  }

  getRoleIcon(row: OrganizationTableRow): string {
    if (row.isOwner) return 'crown';
    
    switch (row.userRole) {
      case OrganizationUserRole.ADMINISTRATOR:
        return 'shield-alt';
      case OrganizationUserRole.VIEWER:
        return 'eye';
      default:
        return 'question-circle';
    }
  }

  getRoleDisplayName(row: OrganizationTableRow): string {
    if (row.isOwner) return 'Owner';
    
    switch (row.userRole) {
      case OrganizationUserRole.ADMINISTRATOR:
        return 'Administrator';
      case OrganizationUserRole.VIEWER:
        return 'Viewer';
      default:
        return 'Unknown';
    }
  }

  getRoleDescription(row: OrganizationTableRow): string {
    if (row.isOwner) return 'Organization owner with full control';
    
    switch (row.userRole) {
      case OrganizationUserRole.ADMINISTRATOR:
        return 'Can manage applications and invite users';
      case OrganizationUserRole.VIEWER:
        return 'Read-only access to organization data';
      default:
        return 'Role permissions unknown';
    }
  }

  getEnterButtonTitle(row: OrganizationTableRow): string {
    if (!this.canEnterOrganization(row)) {
      switch (row.organization.status) {
        case OrganizationStatus.PENDING:
          return 'Organization setup is pending';
        case OrganizationStatus.SUSPENDED:
          return 'Organization is suspended';
        case OrganizationStatus.INACTIVE:
          return 'Organization is inactive';
        default:
          return 'Cannot enter organization';
      }
    }
    return `Enter ${row.organization.name}`;
  }

  getEmptyStateMessage(): string {
    if (this.searchTerm || this.statusFilter || this.roleFilter) {
      return 'Try adjusting your search or filter criteria.';
    }
    return "You're not a member of any organizations yet. Create one to get started!";
  }

  /**
   * Track by function for performance
   */
  trackByOrgId(_index: number, row: OrganizationTableRow): string {
    return row.organization.organizationId;
  }

  /**
   * Handle row click events
   */
  onRowClick(row: OrganizationTableRow): void {
    if (this.selectionMode === 'radio') {
      this.onOrganizationSelected(row.organization);
    } else {
      this.onViewOrganization(row);
    }
  }

  /**
   * Handle organization selection for radio mode
   */
  onOrganizationSelected(organization: Organizations): void {
    this.organizationSelected.emit(organization);
  }
}