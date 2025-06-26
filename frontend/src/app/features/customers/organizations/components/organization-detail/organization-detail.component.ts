/**
 * Organization Detail Component
 * 
 * Displays detailed information about a selected organization.
 * Placeholder component for future organization management features.
 */

import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { Organizations } from '../../../../../core/models/OrganizationsModel';
import { OrganizationStatus } from '../../../../../core/models/OrganizationStatusEnum';

@Component({
  selector: 'app-organization-detail',
  standalone: true,
  imports: [
    CommonModule,
    FontAwesomeModule
  ],
  template: `
    <div class="organization-detail" *ngIf="organization; else emptyState">
      
      <!-- Header -->
      <div class="organization-detail__header">
        <div class="organization-detail__title-section">
          <h3 class="organization-detail__title">
            <fa-icon icon="building" class="organization-detail__icon"></fa-icon>
            {{ organization.name }}
          </h3>
          <div class="organization-detail__status">
            <span class="organization-detail__status-badge" 
                  [ngClass]="'organization-detail__status-badge--' + getStatusClass(organization.status)">
              <fa-icon [icon]="getStatusIcon(organization.status)" 
                       class="organization-detail__status-icon"></fa-icon>
              {{ organization.status }}
            </span>
          </div>
        </div>
        <div class="organization-detail__actions">
          <button class="organization-detail__action organization-detail__action--secondary"
                  (click)="onEditOrganization()">
            <fa-icon icon="edit" class="organization-detail__action-icon"></fa-icon>
            Edit
          </button>
          <button class="organization-detail__action organization-detail__action--primary"
                  (click)="onManageMembers()">
            <fa-icon icon="users" class="organization-detail__action-icon"></fa-icon>
            Manage Members
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="organization-detail__content">
        
        <!-- Overview Section -->
        <div class="organization-detail__section">
          <h4 class="organization-detail__section-title">
            <fa-icon icon="info-circle" class="organization-detail__section-icon"></fa-icon>
            Overview
          </h4>
          <div class="organization-detail__section-content">
            <div class="organization-detail__info-grid">
              <div class="organization-detail__info-item">
                <label class="organization-detail__info-label">Description</label>
                <p class="organization-detail__info-value">
                  {{ organization.description || 'No description provided' }}
                </p>
              </div>
              <div class="organization-detail__info-item">
                <label class="organization-detail__info-label">Organization ID</label>
                <p class="organization-detail__info-value organization-detail__info-value--code">
                  {{ organization.organizationId }}
                </p>
              </div>
              <div class="organization-detail__info-item">
                <label class="organization-detail__info-label">Created</label>
                <p class="organization-detail__info-value">
                  {{ formatDate(organization.createdAt) }}
                </p>
              </div>
              <div class="organization-detail__info-item">
                <label class="organization-detail__info-label">Last Updated</label>
                <p class="organization-detail__info-value">
                  {{ formatDate(organization.updatedAt) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Security Section -->
        <div class="organization-detail__section">
          <h4 class="organization-detail__section-title">
            <fa-icon icon="shield-alt" class="organization-detail__section-icon"></fa-icon>
            Security
          </h4>
          <div class="organization-detail__section-content">
            <div class="organization-detail__info-grid">
              <div class="organization-detail__info-item">
                <label class="organization-detail__info-label">Encryption Key ID</label>
                <p class="organization-detail__info-value organization-detail__info-value--code">
                  {{ organization.kmsKeyId }}
                </p>
              </div>
              <div class="organization-detail__info-item">
                <label class="organization-detail__info-label">Key Alias</label>
                <p class="organization-detail__info-value organization-detail__info-value--code">
                  {{ organization.kmsAlias }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Stats Section -->
        <div class="organization-detail__section">
          <h4 class="organization-detail__section-title">
            <fa-icon icon="chart-bar" class="organization-detail__section-icon"></fa-icon>
            Quick Stats
          </h4>
          <div class="organization-detail__section-content">
            <div class="organization-detail__stats-grid">
              <div class="organization-detail__stat-card">
                <div class="organization-detail__stat-icon">
                  <fa-icon icon="users" class="organization-detail__stat-icon-element"></fa-icon>
                </div>
                <div class="organization-detail__stat-content">
                  <span class="organization-detail__stat-value">{{ memberCount || 0 }}</span>
                  <span class="organization-detail__stat-label">Members</span>
                </div>
              </div>
              <div class="organization-detail__stat-card">
                <div class="organization-detail__stat-icon">
                  <fa-icon icon="rocket" class="organization-detail__stat-icon-element"></fa-icon>
                </div>
                <div class="organization-detail__stat-content">
                  <span class="organization-detail__stat-value">{{ applicationCount || 0 }}</span>
                  <span class="organization-detail__stat-label">Applications</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Placeholder for Future Features -->
        <div class="organization-detail__section organization-detail__section--placeholder">
          <h4 class="organization-detail__section-title">
            <fa-icon icon="plus-circle" class="organization-detail__section-icon"></fa-icon>
            Coming Soon
          </h4>
          <div class="organization-detail__section-content">
            <div class="organization-detail__placeholder">
              <fa-icon icon="tools" class="organization-detail__placeholder-icon"></fa-icon>
              <p class="organization-detail__placeholder-text">
                Additional organization management features will be available here soon.
              </p>
              <ul class="organization-detail__placeholder-list">
                <li>Member management and invitations</li>
                <li>Application access control</li>
                <li>Audit logs and activity history</li>
                <li>Organization settings and preferences</li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Empty State -->
    <ng-template #emptyState>
      <div class="organization-detail__empty">
        <div class="organization-detail__empty-content">
          <fa-icon icon="building" class="organization-detail__empty-icon"></fa-icon>
          <h3 class="organization-detail__empty-title">Select an Organization</h3>
          <p class="organization-detail__empty-text">
            Choose an organization from the list to view its details and manage settings.
          </p>
        </div>
      </div>
    </ng-template>
  `,
  styleUrls: ['./organization-detail.component.scss']
})
export class OrganizationDetailComponent implements OnChanges {
  @Input() organization: Organizations | null = null;
  @Input() memberCount: number = 0;
  @Input() applicationCount: number = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['organization'] && this.organization) {
      console.log('Organization selected:', this.organization.name);
    }
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

  getStatusIcon(status: OrganizationStatus): string {
    switch (status) {
      case OrganizationStatus.ACTIVE:
        return 'check-circle';
      case OrganizationStatus.INACTIVE:
        return 'times-circle';
      case OrganizationStatus.PENDING:
        return 'clock';
      default:
        return 'question-circle';
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  onEditOrganization(): void {
    console.log('Edit organization:', this.organization?.name);
    // TODO: Navigate to organization edit page
  }

  onManageMembers(): void {
    console.log('Manage members for:', this.organization?.name);
    // TODO: Navigate to member management page
  }
}