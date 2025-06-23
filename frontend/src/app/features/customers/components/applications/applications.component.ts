/**
 * Applications Component
 * 
 * Main applications management page for CUSTOMER users.
 * Contains organizations widget at the top with space for future widgets.
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Organizations } from '../../../../core/models/OrganizationsModel';
import { Users } from '../../../../core/models/UsersModel';
import { UserService } from '../../../../core/services/user.service';
import { OrganizationTableComponent, OrganizationTableRow } from '../../../../shared/components/organizations/organization-table.component';

@Component({
  selector: 'app-applications',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    FontAwesomeModule,
    OrganizationTableComponent
  ],
  template: `
    <div class="applications-container">
      
      <!-- Page Header -->
      <div class="applications-header">
        <div class="applications-header__content">
          <div class="applications-header__flex-container">
            <div class="applications-header__logo-section">
              <img src="../../../../../assets/onredboot-logo.jpg" alt="OneRedBoot Logo" class="applications-header__logo">
            </div>
            <div class="applications-header__text-section">
              <div class="applications-header__greeting">
                <div class="applications-header__icon-title">
                  <img src="../../../../../assets/hardhat.jpg" alt="Engineering" class="applications-header__icon">
                  <h1 class="applications-header__title">Applications Management</h1>
                </div>
                <p class="applications-header__subtitle">
                  Manage your organizations, applications, and team members
                </p>
              </div>
            </div>
            <div class="applications-header__actions">
              <button class="applications-header__action applications-header__action--primary">
                <fa-icon icon="plus" class="applications-header__action-icon"></fa-icon>
                Create Application
              </button>
              <button class="applications-header__action applications-header__action--secondary">
                <fa-icon icon="cog" class="applications-header__action-icon"></fa-icon>
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content Area -->
      <div class="applications-content">
        
        <!-- Organizations Widget -->
        <div class="applications-widget applications-widget--organizations">
          <div class="applications-widget__header">
            <h2 class="applications-widget__title">
              <fa-icon icon="building" class="applications-widget__icon"></fa-icon>
              Organizations
            </h2>
            <button class="applications-widget__action" 
                    (click)="onCreateOrganization()">
              <fa-icon icon="plus" class="applications-widget__action-icon"></fa-icon>
              Create Organization
            </button>
          </div>
          
          <div class="applications-widget__content">
            <app-organization-table
              [rows]="organizationRows"
              [pageSize]="10"
              [showCreateButton]="false"
              [loading]="isLoading"
              (enterOrganization)="onEnterOrganization($event)"
              (manageOrganization)="onManageOrganization($event)"
              (viewOrganization)="onViewOrganization($event)">
            </app-organization-table>
          </div>
        </div>

        <!-- Future Widgets Container -->
        <div class="applications-widgets-container">
          
          <!-- Placeholder for future widgets -->
          <div class="applications-widget applications-widget--placeholder">
            <div class="applications-widget__header">
              <h2 class="applications-widget__title">
                <fa-icon icon="puzzle-piece" class="applications-widget__icon"></fa-icon>
                Coming Soon
              </h2>
            </div>
            <div class="applications-widget__content">
              <div class="applications-widget__placeholder-content">
                <fa-icon icon="tools" class="applications-widget__placeholder-icon"></fa-icon>
                <p class="applications-widget__placeholder-text">
                  Additional management tools will be available here soon.
                </p>
              </div>
            </div>
          </div>

          <!-- More placeholder widgets can be added here -->
          
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./applications.component.scss']
})
export class ApplicationsComponent implements OnInit, OnDestroy {
  currentUser$: Observable<Users | null>;
  organizationRows: OrganizationTableRow[] = [];
  isLoading: boolean = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private userService: UserService
  ) {
    this.currentUser$ = this.userService.currentUser$;
  }

  ngOnInit(): void {
    this.loadOrganizations();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load user's organizations
   */
  private loadOrganizations(): void {
    this.isLoading = true;
    
    // TODO: Replace with actual organization service call
    // For now, mock data to demonstrate the interface
    setTimeout(() => {
      this.organizationRows = this.getMockOrganizations();
      this.isLoading = false;
    }, 1000);
  }

  /**
   * Get mock organization data for demonstration
   * TODO: Replace with actual service call
   */
  private getMockOrganizations(): OrganizationTableRow[] {
    return [
      {
        organization: {
          organizationId: 'org_1',
          name: 'Acme Corporation',
          description: 'Leading software development company',
          ownerId: 'user_123',
          status: 'ACTIVE',
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
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          kmsKeyId: 'key_2',
          kmsKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/key_2',
          kmsAlias: 'alias/org-2'
        },
        userRole: 'ADMINISTRATOR',
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
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          kmsKeyId: 'key_3',
          kmsKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/key_3',
          kmsAlias: 'alias/org-3'
        },
        userRole: 'VIEWER',
        isOwner: false,
        memberCount: 25,
        applicationCount: 18
      }
    ];
  }

  /**
   * Handle enter organization action
   */
  onEnterOrganization(organization: Organizations): void {
    console.log('Entering organization:', organization.name);
    // TODO: Implement organization context switching
    // This would typically:
    // 1. Set the current organization context
    // 2. Navigate to organization dashboard
    // 3. Update user session with organization context
  }

  /**
   * Handle manage organization action
   */
  onManageOrganization(organization: Organizations): void {
    console.log('Managing organization:', organization.name);
    // TODO: Navigate to organization management page
    // e.g., /organizations/:id/settings
  }

  /**
   * Handle view organization action
   */
  onViewOrganization(organization: Organizations): void {
    console.log('Viewing organization:', organization.name);
    // TODO: Navigate to organization details page
    // e.g., /organizations/:id
  }

  /**
   * Handle create organization action
   */
  onCreateOrganization(): void {
    console.log('Creating new organization');
    // TODO: Navigate to organization creation page
    // e.g., /organizations/create
  }
}