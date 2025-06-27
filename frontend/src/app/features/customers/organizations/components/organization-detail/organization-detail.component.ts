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
  templateUrl: './organization-detail.component.html',
  styleUrls: ['./organization-detail.component.scss']
})
export class OrganizationDetailComponent implements OnChanges {
  @Input() organization: Organizations | null = null;
  @Input() memberCount: number = 0;
  @Input() applicationCount: number = 0;

  // Tab management
  activeTab: string = 'overview';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['organization'] && this.organization) {
      console.log('Organization selected:', this.organization.name);
      // Reset to overview tab when organization changes
      this.activeTab = 'overview';
    }
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
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