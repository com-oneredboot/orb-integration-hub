/**
 * Applications List Component
 * 
 * Displays a list of applications with filtering and selection capabilities.
 * Uses radio button selection for master-detail pattern.
 */

import { Component, OnInit, OnDestroy, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Applications } from '../../../../../core/models/ApplicationsModel';
import { ApplicationStatus } from '../../../../../core/models/ApplicationStatusEnum';
import { Users } from '../../../../../core/models/UsersModel';
import { UserService } from '../../../../../core/services/user.service';

export interface ApplicationListRow {
  application: Applications;
  organizationName: string;
  environmentCount: number;
  userRole: string;
  lastActivity: string;
}

@Component({
  selector: 'app-applications-list',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    FontAwesomeModule
  ],
  template: `
    <div class="applications-list">
      
      <!-- Header -->
      <div class="applications-list__header">
        <div class="applications-list__title-section">
          <h2 class="applications-list__title">
            <fa-icon icon="rocket" class="applications-list__icon"></fa-icon>
            Applications
          </h2>
          <p class="applications-list__subtitle">
            Manage your applications and environments
          </p>
        </div>
        <div class="applications-list__actions">
          <button class="applications-list__action applications-list__action--primary"
                  (click)="onCreateApplication()">
            <fa-icon icon="plus" class="applications-list__action-icon"></fa-icon>
            Create Application
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="applications-list__filters">
        <div class="applications-list__filter-group">
          <label class="applications-list__filter-label">Search</label>
          <div class="applications-list__filter-input-group">
            <fa-icon icon="search" class="applications-list__filter-icon"></fa-icon>
            <input 
              type="text" 
              class="applications-list__filter-input"
              placeholder="Search applications..."
              [(ngModel)]="searchTerm"
              (input)="onSearchChange()">
          </div>
        </div>
        
        <div class="applications-list__filter-group">
          <label class="applications-list__filter-label">Organization</label>
          <select 
            class="applications-list__filter-select"
            [(ngModel)]="organizationFilter"
            (change)="onFilterChange()">
            <option value="">All Organizations</option>
            <option value="Acme Corporation">Acme Corporation</option>
            <option value="Beta Industries">Beta Industries</option>
            <option value="Gamma Solutions">Gamma Solutions</option>
          </select>
        </div>

        <div class="applications-list__filter-group">
          <label class="applications-list__filter-label">Role</label>
          <select 
            class="applications-list__filter-select"
            [(ngModel)]="roleFilter"
            (change)="onFilterChange()">
            <option value="">All Roles</option>
            <option value="OWNER">Owner</option>
            <option value="ADMINISTRATOR">Administrator</option>
            <option value="DEVELOPER">Developer</option>
            <option value="VIEWER">Viewer</option>
          </select>
        </div>
      </div>

      <!-- Applications Table -->
      <div class="applications-list__table">
        <div class="applications-list__table-container">
          <table class="applications-list__table-element">
            <thead>
              <tr>
                <th class="applications-list__table-header applications-list__table-header--select"></th>
                <th class="applications-list__table-header">Application</th>
                <th class="applications-list__table-header">Organization</th>
                <th class="applications-list__table-header">Environments</th>
                <th class="applications-list__table-header">Role</th>
                <th class="applications-list__table-header">Last Activity</th>
                <th class="applications-list__table-header applications-list__table-header--actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of filteredApplicationRows; trackBy: trackByApplicationId"
                  class="applications-list__table-row"
                  [class.applications-list__table-row--selected]="row.application.applicationId === selectedApplication?.applicationId">
                
                <!-- Radio Selection -->
                <td class="applications-list__table-cell applications-list__table-cell--select">
                  <input 
                    type="radio" 
                    name="selectedApplication"
                    class="applications-list__radio"
                    [value]="row.application.applicationId"
                    [checked]="row.application.applicationId === selectedApplication?.applicationId"
                    (change)="onApplicationSelected(row.application)">
                </td>
                
                <!-- Application Info -->
                <td class="applications-list__table-cell">
                  <div class="applications-list__app-info">
                    <div class="applications-list__app-name">{{ row.application.name }}</div>
                    <div class="applications-list__app-id">{{ row.application.applicationId }}</div>
                  </div>
                </td>
                
                <!-- Organization -->
                <td class="applications-list__table-cell">
                  <span class="applications-list__org-name">{{ row.organizationName }}</span>
                </td>
                
                <!-- Environment Count -->
                <td class="applications-list__table-cell">
                  <div class="applications-list__env-count">
                    <fa-icon icon="server" class="applications-list__env-icon"></fa-icon>
                    {{ row.environmentCount }}
                  </div>
                </td>
                
                <!-- Role -->
                <td class="applications-list__table-cell">
                  <span class="applications-list__role-badge applications-list__role-badge--{{ getRoleClass(row.userRole) }}">
                    {{ row.userRole }}
                  </span>
                </td>
                
                <!-- Last Activity -->
                <td class="applications-list__table-cell">
                  <span class="applications-list__last-activity">{{ row.lastActivity }}</span>
                </td>
                
                <!-- Actions -->
                <td class="applications-list__table-cell applications-list__table-cell--actions">
                  <div class="applications-list__table-actions">
                    <button class="applications-list__table-action applications-list__table-action--primary"
                            (click)="onManageApplication(row.application)"
                            title="Manage Application">
                      <fa-icon icon="cog"></fa-icon>
                    </button>
                    <button class="applications-list__table-action applications-list__table-action--secondary"
                            (click)="onViewApplication(row.application)"
                            title="View Details">
                      <fa-icon icon="eye"></fa-icon>
                    </button>
                  </div>
                </td>
              </tr>
              
              <!-- Loading State -->
              <tr *ngIf="isLoading" class="applications-list__table-row applications-list__table-row--loading">
                <td colspan="7" class="applications-list__table-cell applications-list__table-cell--loading">
                  <div class="applications-list__loading">
                    <fa-icon icon="spinner" class="applications-list__loading-icon fa-spin"></fa-icon>
                    Loading applications...
                  </div>
                </td>
              </tr>
              
              <!-- Empty State -->
              <tr *ngIf="!isLoading && filteredApplicationRows.length === 0" 
                  class="applications-list__table-row applications-list__table-row--empty">
                <td colspan="7" class="applications-list__table-cell applications-list__table-cell--empty">
                  <div class="applications-list__empty">
                    <fa-icon icon="rocket" class="applications-list__empty-icon"></fa-icon>
                    <p class="applications-list__empty-text">
                      {{ applicationRows.length === 0 ? 'No applications found' : 'No applications match your filters' }}
                    </p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `,
  styleUrls: ['./applications-list.component.scss']
})
export class ApplicationsListComponent implements OnInit, OnDestroy {
  @Output() applicationSelected = new EventEmitter<Applications>();
  @Input() selectedApplication: Applications | null = null;

  currentUser$: Observable<Users | null>;
  applicationRows: ApplicationListRow[] = [];
  filteredApplicationRows: ApplicationListRow[] = [];
  isLoading: boolean = false;
  
  // Filters
  searchTerm: string = '';
  organizationFilter: string = '';
  roleFilter: string = '';
  
  private destroy$ = new Subject<void>();

  constructor(
    private userService: UserService
  ) {
    this.currentUser$ = this.userService.getCurrentUser$();
  }

  ngOnInit(): void {
    this.loadApplications();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadApplications(): void {
    this.isLoading = true;
    
    // TODO: Replace with actual application service call
    setTimeout(() => {
      this.applicationRows = this.getMockApplications();
      this.applyFilters();
      this.isLoading = false;
    }, 1000);
  }

  private getMockApplications(): ApplicationListRow[] {
    return [
      {
        application: {
          applicationId: 'app_1',
          organizationId: 'org_1',
          name: 'Customer Portal',
          ownerId: 'user_123',
          status: ApplicationStatus.ACTIVE,
          apiKey: 'ak_live_123...',
          apiKeyNext: '',
          environments: [],
          // environments: ['prod', 'staging', 'dev'], // TODO: Fix environments type
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        organizationName: 'Acme Corporation',
        environmentCount: 3,
        userRole: 'OWNER',
        lastActivity: '2 hours ago'
      },
      {
        application: {
          applicationId: 'app_2',
          organizationId: 'org_1',
          name: 'Admin Dashboard',
          ownerId: 'user_123',
          status: ApplicationStatus.ACTIVE,
          apiKey: 'ak_live_456...',
          apiKeyNext: '',
          environments: [],
          // environments: ['prod', 'staging'], // TODO: Fix environments type
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        organizationName: 'Acme Corporation',
        environmentCount: 2,
        userRole: 'ADMINISTRATOR',
        lastActivity: '1 day ago'
      },
      {
        application: {
          applicationId: 'app_3',
          organizationId: 'org_2',
          name: 'Mobile App Backend',
          ownerId: 'user_456',
          status: ApplicationStatus.ACTIVE,
          apiKey: 'ak_live_789...',
          apiKeyNext: '',
          environments: [],
          // environments: ['prod', 'staging', 'dev', 'testing'], // TODO: Fix environments type
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        organizationName: 'Beta Industries',
        environmentCount: 4,
        userRole: 'DEVELOPER',
        lastActivity: '3 hours ago'
      }
    ];
  }

  trackByApplicationId(index: number, row: ApplicationListRow): string {
    return row.application.applicationId;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  private applyFilters(): void {
    this.filteredApplicationRows = this.applicationRows.filter(row => {
      const matchesSearch = !this.searchTerm || 
        row.application.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        row.application.applicationId.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesOrganization = !this.organizationFilter || 
        row.organizationName === this.organizationFilter;
      
      const matchesRole = !this.roleFilter || 
        row.userRole === this.roleFilter;
      
      return matchesSearch && matchesOrganization && matchesRole;
    });
  }

  getRoleClass(role: string): string {
    return role.toLowerCase().replace('_', '-');
  }

  onApplicationSelected(application: Applications): void {
    this.applicationSelected.emit(application);
  }

  onManageApplication(application: Applications): void {
    console.log('Managing application:', application.name);
    // TODO: Navigate to application management page
  }

  onViewApplication(application: Applications): void {
    this.onApplicationSelected(application);
  }

  onCreateApplication(): void {
    console.log('Creating new application');
    // TODO: Navigate to application creation page
  }
}