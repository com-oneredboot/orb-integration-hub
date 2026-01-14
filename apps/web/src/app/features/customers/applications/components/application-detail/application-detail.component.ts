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
  templateUrl: './application-detail.component.html',
  styleUrls: ['./application-detail.component.scss']
})
export class ApplicationDetailComponent implements OnChanges {
  @Input() application: Applications | null = null;
  @Input() organizationName = '';
  @Input() environmentCount = 0;
  @Input() apiCallsToday = 0;
  @Input() lastActivity = '';

  // Tab management
  activeTab = 'overview';

  mockEnvironments = [
    { name: 'Production', status: 'ACTIVE' },
    { name: 'Staging', status: 'ACTIVE' },
    { name: 'Development', status: 'ACTIVE' }
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['application'] && this.application) {
      console.log('Application selected:', this.application.name);
      // Reset to overview tab when application changes
      this.activeTab = 'overview';
    }
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  formatDate(dateValue: string | Date): string {
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    return date.toLocaleDateString('en-US', {
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

  onDisableApplication(): void {
    console.log('Disable application:', this.application?.name);
    // TODO: Implement application disable functionality
  }

  onDeleteApplication(): void {
    console.log('Delete application:', this.application?.name);
    // TODO: Implement application delete functionality with confirmation
  }
}