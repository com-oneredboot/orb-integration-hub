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
import { StatusBadgeComponent } from '../../../../../shared/components/ui/status-badge.component';

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
    FontAwesomeModule,
    StatusBadgeComponent
  ],
  templateUrl: './applications-list.component.html',
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
          applicationId: 'app_001',
          organizationId: 'org_1',
          name: 'Customer Portal',
          ownerId: 'user_123',
          status: ApplicationStatus.ACTIVE,
          apiKey: 'ak_live_cp_84f3d2a1...',
          apiKeyNext: '',
          environments: [],
          createdAt: Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000),
          updatedAt: Math.floor((Date.now() - 2 * 60 * 60 * 1000) / 1000)
        },
        organizationName: 'Acme Corporation',
        environmentCount: 3,
        userRole: 'OWNER',
        lastActivity: '2 hours ago'
      },
      {
        application: {
          applicationId: 'app_002',
          organizationId: 'org_1',
          name: 'Admin Dashboard',
          ownerId: 'user_123',
          status: ApplicationStatus.ACTIVE,
          apiKey: 'ak_live_ad_2b8f5c47...',
          apiKeyNext: '',
          environments: [],
          createdAt: Math.floor((Date.now() - 15 * 24 * 60 * 60 * 1000) / 1000),
          updatedAt: Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000)
        },
        organizationName: 'Acme Corporation',
        environmentCount: 2,
        userRole: 'ADMINISTRATOR',
        lastActivity: '1 day ago'
      },
      {
        application: {
          applicationId: 'app_003',
          organizationId: 'org_2',
          name: 'Mobile App Backend',
          ownerId: 'user_456',
          status: ApplicationStatus.ACTIVE,
          apiKey: 'ak_live_mb_7c9e1f33...',
          apiKeyNext: '',
          environments: [],
          createdAt: Math.floor((Date.now() - 45 * 24 * 60 * 60 * 1000) / 1000),
          updatedAt: Math.floor((Date.now() - 3 * 60 * 60 * 1000) / 1000)
        },
        organizationName: 'Beta Industries',
        environmentCount: 4,
        userRole: 'DEVELOPER',
        lastActivity: '3 hours ago'
      },
      {
        application: {
          applicationId: 'app_004',
          organizationId: 'org_1',
          name: 'E-Commerce API',
          ownerId: 'user_789',
          status: ApplicationStatus.ACTIVE,
          apiKey: 'ak_live_ec_4d6b8e91...',
          apiKeyNext: '',
          environments: [],
          createdAt: Math.floor((Date.now() - 60 * 24 * 60 * 60 * 1000) / 1000),
          updatedAt: Math.floor((Date.now() - 6 * 60 * 60 * 1000) / 1000)
        },
        organizationName: 'Acme Corporation',
        environmentCount: 5,
        userRole: 'DEVELOPER',
        lastActivity: '6 hours ago'
      },
      {
        application: {
          applicationId: 'app_005',
          organizationId: 'org_3',
          name: 'Analytics Service',
          ownerId: 'user_321',
          status: ApplicationStatus.ACTIVE,
          apiKey: 'ak_live_as_9f2c5b67...',
          apiKeyNext: '',
          environments: [],
          createdAt: Math.floor((Date.now() - 20 * 24 * 60 * 60 * 1000) / 1000),
          updatedAt: Math.floor((Date.now() - 4 * 60 * 60 * 1000) / 1000)
        },
        organizationName: 'Gamma Solutions',
        environmentCount: 3,
        userRole: 'ADMINISTRATOR',
        lastActivity: '4 hours ago'
      },
      {
        application: {
          applicationId: 'app_006',
          organizationId: 'org_2',
          name: 'Payment Gateway',
          ownerId: 'user_654',
          status: ApplicationStatus.ACTIVE,
          apiKey: 'ak_live_pg_1a3e7f42...',
          apiKeyNext: '',
          environments: [],
          createdAt: Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000),
          updatedAt: Math.floor((Date.now() - 12 * 60 * 60 * 1000) / 1000)
        },
        organizationName: 'Beta Industries',
        environmentCount: 6,
        userRole: 'OWNER',
        lastActivity: '12 hours ago'
      },
      {
        application: {
          applicationId: 'app_007',
          organizationId: 'org_3',
          name: 'Notification Service',
          ownerId: 'user_987',
          status: ApplicationStatus.ACTIVE,
          apiKey: 'ak_live_ns_5e8d2c76...',
          apiKeyNext: '',
          environments: [],
          createdAt: Math.floor((Date.now() - 10 * 24 * 60 * 60 * 1000) / 1000),
          updatedAt: Math.floor((Date.now() - 30 * 60 * 1000) / 1000)
        },
        organizationName: 'Gamma Solutions',
        environmentCount: 2,
        userRole: 'VIEWER',
        lastActivity: '30 minutes ago'
      },
      {
        application: {
          applicationId: 'app_008',
          organizationId: 'org_1',
          name: 'Inventory Management',
          ownerId: 'user_147',
          status: ApplicationStatus.ACTIVE,
          apiKey: 'ak_live_im_8b4f6a92...',
          apiKeyNext: '',
          environments: [],
          createdAt: Math.floor((Date.now() - 75 * 24 * 60 * 60 * 1000) / 1000),
          updatedAt: Math.floor((Date.now() - 18 * 60 * 60 * 1000) / 1000)
        },
        organizationName: 'Acme Corporation',
        environmentCount: 4,
        userRole: 'DEVELOPER',
        lastActivity: '18 hours ago'
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