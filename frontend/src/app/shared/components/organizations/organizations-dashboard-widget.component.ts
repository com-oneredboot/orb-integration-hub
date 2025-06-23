/**
 * Organizations Dashboard Widget Component
 * 
 * Simple widget for the user dashboard that displays organizations overview
 * with a call-to-action to navigate to the full applications management page.
 * Only shown for CUSTOMER users.
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Organizations } from '../../../core/models/OrganizationsModel';
import { Users } from '../../../core/models/UsersModel';
import { UserService } from '../../../core/services/user.service';
import { OrganizationUserRole } from '../../../core/models/OrganizationUserRoleEnum';

export interface OrganizationSummary {
  organization: Organizations;
  userRole: OrganizationUserRole | 'OWNER';
  isOwner: boolean;
  memberCount: number;
}

@Component({
  selector: 'app-organizations-dashboard-widget',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule],
  template: `
    <div class="org-widget" *ngIf="shouldShowWidget$ | async">
      
      <!-- Widget Header -->
      <div class="org-widget__header">
        <h2 class="org-widget__title">
          <fa-icon icon="building" class="org-widget__icon"></fa-icon>
          Your Organizations
        </h2>
        <button class="org-widget__action" 
                routerLink="/applications"
                type="button">
          <fa-icon icon="edit" class="org-widget__action-icon"></fa-icon>
          Edit Organizations
        </button>
      </div>

      <!-- Organizations Grid -->
      <div class="org-widget__content">
        <div class="org-widget__grid" *ngIf="organizationSummaries.length > 0; else emptyState">
          <div class="org-widget__card" 
               *ngFor="let summary of organizationSummaries; let i = index"
               [class.org-widget__card--more]="i >= maxDisplayCount"
               [style.display]="i >= maxDisplayCount ? 'none' : 'block'">
            
            <div class="org-widget__card-header">
              <h3 class="org-widget__card-name" [title]="summary.organization.name">
                {{ summary.organization.name }}
              </h3>
              <app-status-badge 
                [status]="summary.organization.status" 
                type="organization"
                [showIcon]="true"
                [showLabel]="false">
              </app-status-badge>
            </div>
            
            <div class="org-widget__card-role">
              <span class="role-badge role-badge--small" [class]="getRoleBadgeClass(summary)">
                <fa-icon [icon]="getRoleIcon(summary)" class="role-badge__icon"></fa-icon>
                {{ getRoleDisplayName(summary) }}
              </span>
            </div>
            
            <div class="org-widget__card-meta">
              <span class="org-widget__card-stat">
                <fa-icon icon="users" class="org-widget__card-stat-icon"></fa-icon>
                {{ summary.memberCount }} {{ summary.memberCount === 1 ? 'member' : 'members' }}
              </span>
            </div>
          </div>

          <!-- Show More Card -->
          <div class="org-widget__card org-widget__card--more" 
               *ngIf="organizationSummaries.length > maxDisplayCount">
            <div class="org-widget__card-more-content">
              <fa-icon icon="plus" class="org-widget__card-more-icon"></fa-icon>
              <span class="org-widget__card-more-text">
                +{{ organizationSummaries.length - maxDisplayCount }} more
              </span>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <ng-template #emptyState>
          <div class="org-widget__empty">
            <fa-icon icon="building" class="org-widget__empty-icon"></fa-icon>
            <p class="org-widget__empty-text">No organizations found</p>
            <button class="org-widget__empty-action" routerLink="/applications">
              Get Started
            </button>
          </div>
        </ng-template>
      </div>

      <!-- Widget Footer -->
      <div class="org-widget__footer">
        <p class="org-widget__footer-text">
          Manage your organizations, members, and applications
        </p>
      </div>
    </div>
  `,
  styleUrls: ['./organizations-dashboard-widget.component.scss']
})
export class OrganizationsDashboardWidgetComponent implements OnInit, OnDestroy {
  currentUser$: Observable<Users | null>;
  shouldShowWidget$: Observable<boolean>;
  organizationSummaries: OrganizationSummary[] = [];
  maxDisplayCount: number = 3;
  
  private destroy$ = new Subject<void>();

  constructor(
    private userService: UserService
  ) {
    this.currentUser$ = this.userService.currentUser$;
    this.shouldShowWidget$ = this.userService.isCustomer$;
  }

  ngOnInit(): void {
    // Only load organizations if user is a customer
    this.shouldShowWidget$
      .pipe(takeUntil(this.destroy$))
      .subscribe(shouldShow => {
        if (shouldShow) {
          this.loadOrganizationSummaries();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load organization summaries for the widget
   */
  private loadOrganizationSummaries(): void {
    // TODO: Replace with actual organization service call
    // For now, mock data to demonstrate the widget
    this.organizationSummaries = this.getMockOrganizationSummaries();
  }

  /**
   * Get mock organization summaries for demonstration
   * TODO: Replace with actual service call
   */
  private getMockOrganizationSummaries(): OrganizationSummary[] {
    return [
      {
        organization: {
          organizationId: 'org_1',
          name: 'Acme Corp',
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
        memberCount: 15
      },
      {
        organization: {
          organizationId: 'org_2',
          name: 'Beta Tech',
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
        memberCount: 8
      },
      {
        organization: {
          organizationId: 'org_3',
          name: 'DevCorp',
          description: 'Enterprise software solutions',
          ownerId: 'user_789',
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          kmsKeyId: 'key_3',
          kmsKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/key_3',
          kmsAlias: 'alias/org-3'
        },
        userRole: 'VIEWER',
        isOwner: false,
        memberCount: 25
      }
    ];
  }

  /**
   * Get role badge CSS class
   */
  getRoleBadgeClass(summary: OrganizationSummary): string {
    if (summary.isOwner) {
      return 'role-badge--owner';
    }
    
    switch (summary.userRole) {
      case OrganizationUserRole.ADMINISTRATOR:
        return 'role-badge--administrator';
      case OrganizationUserRole.VIEWER:
        return 'role-badge--viewer';
      default:
        return 'role-badge--unknown';
    }
  }

  /**
   * Get role icon
   */
  getRoleIcon(summary: OrganizationSummary): string {
    if (summary.isOwner) {
      return 'crown';
    }
    
    switch (summary.userRole) {
      case OrganizationUserRole.ADMINISTRATOR:
        return 'shield-alt';
      case OrganizationUserRole.VIEWER:
        return 'eye';
      default:
        return 'question-circle';
    }
  }

  /**
   * Get role display name
   */
  getRoleDisplayName(summary: OrganizationSummary): string {
    if (summary.isOwner) {
      return 'Owner';
    }
    
    switch (summary.userRole) {
      case OrganizationUserRole.ADMINISTRATOR:
        return 'Admin';
      case OrganizationUserRole.VIEWER:
        return 'Viewer';
      default:
        return 'Unknown';
    }
  }
}