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

export interface OrganizationTableRow {
  organization: Organizations;
  userRole: string;
  isOwner: boolean;
  memberCount: number;
  applicationCount: number;
}

@Component({
  selector: 'app-organizations-list',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    FontAwesomeModule
  ],
  templateUrl: './organizations-list.component.html',
  styleUrls: ['./organizations-list.component.scss']
})
export class OrganizationsListComponent implements OnInit, OnDestroy {
  @Output() organizationSelected = new EventEmitter<Organizations>();
  @Input() selectedOrganization: Organizations | null = null;

  currentUser$: Observable<Users | null>;
  organizationRows: OrganizationTableRow[] = [];
  isLoading: boolean = false;
  
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
      },
      {
        organization: {
          organizationId: 'no_org',
          name: 'No Organization',
          description: 'Work without an organization context',
          ownerId: '',
          status: OrganizationStatus.ACTIVE,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          kmsKeyId: '',
          kmsKeyArn: '',
          kmsAlias: ''
        },
        userRole: 'NONE' as any,
        isOwner: false,
        memberCount: 0,
        applicationCount: 0
      }
    ];
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

  trackByOrganizationId(_index: number, row: OrganizationTableRow): string {
    return row.organization.organizationId;
  }

  getRoleClass(role: string): string {
    return role.toLowerCase().replace('_', '-');
  }

  getStatusClass(status: OrganizationStatus): string {
    switch (status) {
      case OrganizationStatus.ACTIVE:
        return 'active';
      case OrganizationStatus.INACTIVE:
        return 'inactive';
      case OrganizationStatus.PENDING:
        return 'pending';
      default:
        return 'inactive';
    }
  }
}