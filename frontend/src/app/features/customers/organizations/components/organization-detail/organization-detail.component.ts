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
import { StatusBadgeComponent } from '../../../../../shared/components/ui/status-badge.component';

@Component({
  selector: 'app-organization-detail',
  standalone: true,
  imports: [
    CommonModule,
    FontAwesomeModule,
    StatusBadgeComponent
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

  // Status handling now uses global StatusBadgeComponent

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

  onDisableOrganization(): void {
    console.log('Disable organization:', this.organization?.name);
    // TODO: Implement organization disable functionality
  }

  onDeleteOrganization(): void {
    console.log('Delete organization:', this.organization?.name);
    // TODO: Implement organization delete functionality with confirmation
  }
}