/**
 * Organizations Component
 * 
 * Main container for organizations management with master-detail layout.
 * Available only to CUSTOMER role users.
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { Organizations } from '../../../core/models/OrganizationsModel';
import { OrganizationsListComponent } from './components/organizations-list/organizations-list.component';
import { OrganizationDetailComponent } from './components/organization-detail/organization-detail.component';

@Component({
  selector: 'app-organizations',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    OrganizationsListComponent,
    OrganizationDetailComponent
  ],
  template: `
    <div class="organizations-page">
      
      <!-- Page Header -->
      <div class="organizations-page__header">
        <div class="organizations-page__header-content">
          <div class="organizations-page__header-flex">
            <div class="organizations-page__logo-section">
              <img src="../../../../../assets/onredboot-logo.jpg" alt="OneRedBoot Logo" class="organizations-page__logo">
            </div>
            <div class="organizations-page__text-section">
              <div class="organizations-page__greeting">
                <div class="organizations-page__icon-title">
                  <img src="../../../../../assets/hardhat.jpg" alt="Engineering" class="organizations-page__icon">
                  <h1 class="organizations-page__title">Organizations</h1>
                </div>
                <p class="organizations-page__subtitle">
                  Manage your organizations, teams, and access controls
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="organizations-page__content">
        <div class="organizations-page__layout">
          
          <!-- Organizations List -->
          <div class="organizations-page__list-panel">
            <app-organizations-list
              [selectedOrganization]="selectedOrganization"
              (organizationSelected)="onOrganizationSelected($event)">
            </app-organizations-list>
          </div>

          <!-- Organization Detail -->
          <div class="organizations-page__detail-panel">
            <app-organization-detail
              [organization]="selectedOrganization"
              [memberCount]="selectedOrganizationMemberCount"
              [applicationCount]="selectedOrganizationApplicationCount">
            </app-organization-detail>
          </div>

        </div>
      </div>
    </div>
  `,
  styleUrls: ['./organizations.component.scss']
})
export class OrganizationsComponent implements OnInit {
  selectedOrganization: Organizations | null = null;
  selectedOrganizationMemberCount: number = 0;
  selectedOrganizationApplicationCount: number = 0;

  constructor() {}

  ngOnInit(): void {
    // Component initialization
  }

  onOrganizationSelected(organization: Organizations): void {
    this.selectedOrganization = organization;
    
    // TODO: Load actual member and application counts from service
    // For now, use mock data based on organization
    this.loadOrganizationStats(organization);
  }

  private loadOrganizationStats(organization: Organizations): void {
    // TODO: Replace with actual service calls
    // Mock data for demonstration
    switch (organization.organizationId) {
      case 'org_1':
        this.selectedOrganizationMemberCount = 15;
        this.selectedOrganizationApplicationCount = 12;
        break;
      case 'org_2':
        this.selectedOrganizationMemberCount = 8;
        this.selectedOrganizationApplicationCount = 5;
        break;
      case 'org_3':
        this.selectedOrganizationMemberCount = 25;
        this.selectedOrganizationApplicationCount = 18;
        break;
      default:
        this.selectedOrganizationMemberCount = 0;
        this.selectedOrganizationApplicationCount = 0;
    }
  }
}