/**
 * Organizations List Component
 * 
 * Displays a list of organizations with filtering and selection capabilities.
 * Uses radio button selection for master-detail pattern.
 */

import { Component, OnInit, OnDestroy, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Organizations } from '../../../../../core/models/OrganizationsModel';
import { Users } from '../../../../../core/models/UsersModel';
import { OrganizationStatus } from '../../../../../core/models/OrganizationStatusEnum';
import { OrganizationUserRole } from '../../../../../core/models/OrganizationUserRoleEnum';
import { UserService } from '../../../../../core/services/user.service';
import { OrganizationTableComponent, OrganizationTableRow } from '../../../../../shared/components/organizations/organization-table.component';

@Component({
  selector: 'app-organizations-list',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    FontAwesomeModule,
    OrganizationTableComponent
  ],
  template: `
    <div class="organizations-list">
      
      <!-- Header -->
      <div class="organizations-list__header">
        <div class="organizations-list__title-section">
          <h2 class="organizations-list__title">
            <fa-icon icon="building" class="organizations-list__icon"></fa-icon>
            Organizations
          </h2>
          <p class="organizations-list__subtitle">
            Manage your organizations and team access
          </p>
        </div>
        <div class="organizations-list__actions">
          <button class="organizations-list__action organizations-list__action--primary"
                  (click)="onCreateOrganization()">
            <fa-icon icon="plus" class="organizations-list__action-icon"></fa-icon>
            Create Organization
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="organizations-list__filters">
        <div class="organizations-list__filter-group">
          <label class="organizations-list__filter-label">Search</label>
          <div class="organizations-list__filter-input-group">
            <fa-icon icon="search" class="organizations-list__filter-icon"></fa-icon>
            <input 
              type="text" 
              class="organizations-list__filter-input"
              placeholder="Search organizations..."
              [(ngModel)]="searchTerm"
              (input)="onSearchChange()">
          </div>
        </div>
        
        <div class="organizations-list__filter-group">
          <label class="organizations-list__filter-label">Status</label>
          <select 
            class="organizations-list__filter-select"
            [(ngModel)]="statusFilter"
            (change)="onFilterChange()">
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="PENDING">Pending</option>
          </select>
        </div>

        <div class="organizations-list__filter-group">
          <label class="organizations-list__filter-label">Role</label>
          <select 
            class="organizations-list__filter-select"
            [(ngModel)]="roleFilter"
            (change)="onFilterChange()">
            <option value="">All Roles</option>
            <option value="OWNER">Owner</option>
            <option value="ADMINISTRATOR">Administrator</option>
            <option value="MEMBER">Member</option>
            <option value="VIEWER">Viewer</option>
          </select>
        </div>
      </div>

      <!-- Organizations Table -->
      <div class="organizations-list__table">
        <app-organization-table
          [rows]="filteredOrganizationRows"
          [pageSize]="10"
          [showCreateButton]="false"
          [loading]="isLoading"
          [selectionMode]="'radio'"
          [selectedOrganization]="selectedOrganization"
          (enterOrganization)="onEnterOrganization($event)"
          (manageOrganization)="onManageOrganization($event)"
          (viewOrganization)="onViewOrganization($event)"
          (organizationSelected)="onOrganizationSelected($event)">
        </app-organization-table>
      </div>

    </div>
  `,
  styleUrls: ['./organizations-list.component.scss']
})
export class OrganizationsListComponent implements OnInit, OnDestroy {
  @Output() organizationSelected = new EventEmitter<Organizations>();
  @Input() selectedOrganization: Organizations | null = null;

  currentUser$: Observable<Users | null>;
  organizationRows: OrganizationTableRow[] = [];
  filteredOrganizationRows: OrganizationTableRow[] = [];
  isLoading: boolean = false;
  
  // Filters
  searchTerm: string = '';
  statusFilter: string = '';
  roleFilter: string = '';
  
  private destroy$ = new Subject<void>();

  constructor(
    private userService: UserService
  ) {
    this.currentUser$ = this.userService.getCurrentUser$();
  }

  ngOnInit(): void {
    this.loadOrganizations();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadOrganizations(): void {
    this.isLoading = true;
    
    // TODO: Replace with actual organization service call
    setTimeout(() => {
      this.organizationRows = this.getMockOrganizations();
      this.applyFilters();
      this.isLoading = false;
    }, 1000);
  }

  private getMockOrganizations(): OrganizationTableRow[] {
    return [
      {
        organization: {
          organizationId: 'org_1',
          name: 'Acme Corporation',
          description: 'Leading software development company',
          ownerId: 'user_123',
          status: OrganizationStatus.ACTIVE,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          kmsKeyId: 'key_1',
          kmsKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/key_1',
          kmsAlias: 'alias/org-1'
        },
        userRole: 'OWNER',
        isOwner: true,
        memberCount: 15,
        applicationCount: 12
      },
      {
        organization: {
          organizationId: 'org_2',
          name: 'Beta Industries',
          description: 'Technology consulting firm',
          ownerId: 'user_456',
          status: OrganizationStatus.ACTIVE,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          kmsKeyId: 'key_2',
          kmsKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/key_2',
          kmsAlias: 'alias/org-2'
        },
        userRole: OrganizationUserRole.ADMINISTRATOR,
        isOwner: false,
        memberCount: 8,
        applicationCount: 5
      },
      {
        organization: {
          organizationId: 'org_3',
          name: 'Gamma Solutions',
          description: 'Enterprise software solutions',
          ownerId: 'user_789',
          status: OrganizationStatus.ACTIVE,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          kmsKeyId: 'key_3',
          kmsKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/key_3',
          kmsAlias: 'alias/org-3'
        },
        userRole: OrganizationUserRole.VIEWER,
        isOwner: false,
        memberCount: 25,
        applicationCount: 18
      }
    ];
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  private applyFilters(): void {
    this.filteredOrganizationRows = this.organizationRows.filter(row => {
      const matchesSearch = !this.searchTerm || 
        row.organization.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        row.organization.description?.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesStatus = !this.statusFilter || 
        row.organization.status === this.statusFilter;
      
      const matchesRole = !this.roleFilter || 
        row.userRole === this.roleFilter;
      
      return matchesSearch && matchesStatus && matchesRole;
    });
  }

  onOrganizationSelected(organization: Organizations): void {
    this.organizationSelected.emit(organization);
  }

  onEnterOrganization(organization: Organizations): void {
    console.log('Entering organization:', organization.name);
    // TODO: Implement organization context switching
  }

  onManageOrganization(organization: Organizations): void {
    console.log('Managing organization:', organization.name);
    // TODO: Navigate to organization management page
  }

  onViewOrganization(organization: Organizations): void {
    this.onOrganizationSelected(organization);
  }

  onCreateOrganization(): void {
    console.log('Creating new organization');
    // TODO: Navigate to organization creation page
  }
}