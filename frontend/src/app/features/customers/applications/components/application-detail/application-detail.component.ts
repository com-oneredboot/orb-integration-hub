/**
 * Application Detail Component
 * 
 * Displays detailed information about a selected application.
 * Placeholder component for future application management features.
 */

import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { Applications } from '../../../../../core/models/ApplicationsModel';

@Component({
  selector: 'app-application-detail',
  standalone: true,
  imports: [
    CommonModule,
    FontAwesomeModule
  ],
  template: `
    <div class="application-detail" *ngIf="application; else emptyState">
      
      <!-- Header -->
      <div class="application-detail__header">
        <div class="application-detail__title-section">
          <h3 class="application-detail__title">
            <fa-icon icon="rocket" class="application-detail__icon"></fa-icon>
            {{ application.name }}
          </h3>
          <div class="application-detail__meta">
            <span class="application-detail__org-name">
              <fa-icon icon="building" class="application-detail__meta-icon"></fa-icon>
              {{ organizationName }}
            </span>
          </div>
        </div>
        <div class="application-detail__actions">
          <button class="application-detail__action application-detail__action--secondary"
                  (click)="onEditApplication()">
            <fa-icon icon="edit" class="application-detail__action-icon"></fa-icon>
            Edit
          </button>
          <button class="application-detail__action application-detail__action--primary"
                  (click)="onManageEnvironments()">
            <fa-icon icon="server" class="application-detail__action-icon"></fa-icon>
            Manage Environments
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="application-detail__content">
        
        <!-- Overview Section -->
        <div class="application-detail__section">
          <h4 class="application-detail__section-title">
            <fa-icon icon="info-circle" class="application-detail__section-icon"></fa-icon>
            Overview
          </h4>
          <div class="application-detail__section-content">
            <div class="application-detail__info-grid">
              <div class="application-detail__info-item">
                <label class="application-detail__info-label">Organization</label>
                <p class="application-detail__info-value">
                  {{ organizationName || 'Unknown Organization' }}
                </p>
              </div>
              <div class="application-detail__info-item">
                <label class="application-detail__info-label">Application ID</label>
                <p class="application-detail__info-value application-detail__info-value--code">
                  {{ application.applicationId }}
                </p>
              </div>
              <div class="application-detail__info-item">
                <label class="application-detail__info-label">Created</label>
                <p class="application-detail__info-value">
                  {{ formatDate(application.createdAt) }}
                </p>
              </div>
              <div class="application-detail__info-item">
                <label class="application-detail__info-label">Last Updated</label>
                <p class="application-detail__info-value">
                  {{ formatDate(application.updatedAt) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- API Configuration Section -->
        <div class="application-detail__section">
          <h4 class="application-detail__section-title">
            <fa-icon icon="key" class="application-detail__section-icon"></fa-icon>
            API Configuration
          </h4>
          <div class="application-detail__section-content">
            <div class="application-detail__info-grid">
              <div class="application-detail__info-item">
                <label class="application-detail__info-label">Current API Key</label>
                <div class="application-detail__api-key">
                  <span class="application-detail__info-value application-detail__info-value--code application-detail__info-value--masked">
                    {{ maskApiKey(application.apiKey) }}
                  </span>
                  <button class="application-detail__api-key-action"
                          (click)="onCopyApiKey()"
                          title="Copy API Key">
                    <fa-icon icon="copy"></fa-icon>
                  </button>
                  <button class="application-detail__api-key-action"
                          (click)="onRotateApiKey()"
                          title="Rotate API Key">
                    <fa-icon icon="sync-alt"></fa-icon>
                  </button>
                </div>
              </div>
              <div class="application-detail__info-item" *ngIf="application.apiKeyNext">
                <label class="application-detail__info-label">Next API Key (Staged)</label>
                <div class="application-detail__api-key">
                  <span class="application-detail__info-value application-detail__info-value--code application-detail__info-value--masked">
                    {{ maskApiKey(application.apiKeyNext) }}
                  </span>
                  <button class="application-detail__api-key-action"
                          (click)="onActivateNextKey()"
                          title="Activate Next Key">
                    <fa-icon icon="arrow-right"></fa-icon>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Stats Section -->
        <div class="application-detail__section">
          <h4 class="application-detail__section-title">
            <fa-icon icon="chart-bar" class="application-detail__section-icon"></fa-icon>
            Quick Stats
          </h4>
          <div class="application-detail__section-content">
            <div class="application-detail__stats-grid">
              <div class="application-detail__stat-card">
                <div class="application-detail__stat-icon">
                  <fa-icon icon="server" class="application-detail__stat-icon-element"></fa-icon>
                </div>
                <div class="application-detail__stat-content">
                  <span class="application-detail__stat-value">{{ environmentCount || 0 }}</span>
                  <span class="application-detail__stat-label">Environments</span>
                </div>
              </div>
              <div class="application-detail__stat-card">
                <div class="application-detail__stat-icon">
                  <fa-icon icon="code" class="application-detail__stat-icon-element"></fa-icon>
                </div>
                <div class="application-detail__stat-content">
                  <span class="application-detail__stat-value">{{ apiCallsToday || 0 }}</span>
                  <span class="application-detail__stat-label">API Calls Today</span>
                </div>
              </div>
              <div class="application-detail__stat-card">
                <div class="application-detail__stat-icon">
                  <fa-icon icon="clock" class="application-detail__stat-icon-element"></fa-icon>
                </div>
                <div class="application-detail__stat-content">
                  <span class="application-detail__stat-value">{{ lastActivity || 'Never' }}</span>
                  <span class="application-detail__stat-label">Last Activity</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Environments Preview -->
        <div class="application-detail__section">
          <h4 class="application-detail__section-title">
            <fa-icon icon="server" class="application-detail__section-icon"></fa-icon>
            Environments
          </h4>
          <div class="application-detail__section-content">
            <div class="application-detail__environments">
              <div class="application-detail__env-item" *ngFor="let env of mockEnvironments">
                <div class="application-detail__env-info">
                  <span class="application-detail__env-name">{{ env.name }}</span>
                  <span class="application-detail__env-status" 
                        [ngClass]="'application-detail__env-status--' + env.status.toLowerCase()">
                    {{ env.status }}
                  </span>
                </div>
                <div class="application-detail__env-actions">
                  <button class="application-detail__env-action" 
                          (click)="onViewEnvironment(env)"
                          title="View Environment">
                    <fa-icon icon="eye"></fa-icon>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Placeholder for Future Features -->
        <div class="application-detail__section application-detail__section--placeholder">
          <h4 class="application-detail__section-title">
            <fa-icon icon="plus-circle" class="application-detail__section-icon"></fa-icon>
            Coming Soon
          </h4>
          <div class="application-detail__section-content">
            <div class="application-detail__placeholder">
              <fa-icon icon="tools" class="application-detail__placeholder-icon"></fa-icon>
              <p class="application-detail__placeholder-text">
                Additional application management features will be available here soon.
              </p>
              <ul class="application-detail__placeholder-list">
                <li>Real-time API analytics and monitoring</li>
                <li>Environment-specific configuration management</li>
                <li>User access control and permissions</li>
                <li>Deployment history and rollback capabilities</li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Empty State -->
    <ng-template #emptyState>
      <div class="application-detail__empty">
        <div class="application-detail__empty-content">
          <fa-icon icon="rocket" class="application-detail__empty-icon"></fa-icon>
          <h3 class="application-detail__empty-title">Select an Application</h3>
          <p class="application-detail__empty-text">
            Choose an application from the list to view its details and manage settings.
          </p>
        </div>
      </div>
    </ng-template>
  `,
  styleUrls: ['./application-detail.component.scss']
})
export class ApplicationDetailComponent implements OnChanges {
  @Input() application: Applications | null = null;
  @Input() organizationName: string = '';
  @Input() environmentCount: number = 0;
  @Input() apiCallsToday: number = 0;
  @Input() lastActivity: string = '';

  mockEnvironments = [
    { name: 'Production', status: 'ACTIVE' },
    { name: 'Staging', status: 'ACTIVE' },
    { name: 'Development', status: 'ACTIVE' }
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['application'] && this.application) {
      console.log('Application selected:', this.application.name);
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

  maskApiKey(apiKey: string): string {
    if (!apiKey) return '';
    const prefix = apiKey.substring(0, 8);
    const suffix = apiKey.substring(apiKey.length - 4);
    return `${prefix}...${suffix}`;
  }

  onEditApplication(): void {
    console.log('Edit application:', this.application?.name);
    // TODO: Navigate to application edit page
  }

  onManageEnvironments(): void {
    console.log('Manage environments for:', this.application?.name);
    // TODO: Navigate to environment management page
  }

  onCopyApiKey(): void {
    if (this.application?.apiKey) {
      navigator.clipboard.writeText(this.application.apiKey);
      console.log('API key copied to clipboard');
      // TODO: Show toast notification
    }
  }

  onRotateApiKey(): void {
    console.log('Rotate API key for:', this.application?.name);
    // TODO: Implement API key rotation
  }

  onActivateNextKey(): void {
    console.log('Activate next API key for:', this.application?.name);
    // TODO: Implement next key activation
  }

  onViewEnvironment(environment: any): void {
    console.log('View environment:', environment.name);
    // TODO: Navigate to environment details
  }
}