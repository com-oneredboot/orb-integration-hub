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