/**
 * Applications Component
 * 
 * Main container for applications management with master-detail layout.
 * Available only to CUSTOMER role users.
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { Applications } from '../../../core/models/ApplicationsModel';
import { ApplicationsListComponent } from './components/applications-list/applications-list.component';
import { ApplicationDetailComponent } from './components/application-detail/application-detail.component';

@Component({
  selector: 'app-applications',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ApplicationsListComponent,
    ApplicationDetailComponent
  ],
  template: `
    <div class="applications-page">
      
      <!-- Page Header -->
      <div class="applications-page__header">
        <div class="applications-page__header-content">
          <div class="applications-page__header-flex">
            <div class="applications-page__logo-section">
              <img src="../../../../../assets/onredboot-logo.jpg" alt="OneRedBoot Logo" class="applications-page__logo">
            </div>
            <div class="applications-page__text-section">
              <div class="applications-page__greeting">
                <div class="applications-page__icon-title">
                  <img src="../../../../../assets/hardhat.jpg" alt="Engineering" class="applications-page__icon">
                  <h1 class="applications-page__title">Applications</h1>
                </div>
                <p class="applications-page__subtitle">
                  Manage your applications, environments, and API configurations
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="applications-page__content">
        <div class="applications-page__layout">
          
          <!-- Applications List -->
          <div class="applications-page__list-panel">
            <app-applications-list
              [selectedApplication]="selectedApplication"
              (applicationSelected)="onApplicationSelected($event)">
            </app-applications-list>
          </div>

          <!-- Application Detail -->
          <div class="applications-page__detail-panel">
            <app-application-detail
              [application]="selectedApplication"
              [organizationName]="selectedApplicationOrganizationName"
              [environmentCount]="selectedApplicationEnvironmentCount"
              [apiCallsToday]="selectedApplicationApiCallsToday"
              [lastActivity]="selectedApplicationLastActivity">
            </app-application-detail>
          </div>

        </div>
      </div>
    </div>
  `,
  styleUrls: ['./applications.component.scss']
})
export class ApplicationsComponent implements OnInit {
  selectedApplication: Applications | null = null;
  selectedApplicationOrganizationName: string = '';
  selectedApplicationEnvironmentCount: number = 0;
  selectedApplicationApiCallsToday: number = 0;
  selectedApplicationLastActivity: string = '';

  constructor() {}

  ngOnInit(): void {
    // Component initialization
  }

  onApplicationSelected(application: Applications): void {
    this.selectedApplication = application;
    
    // TODO: Load actual application stats from service
    // For now, use mock data based on application
    this.loadApplicationStats(application);
  }

  private loadApplicationStats(application: Applications): void {
    // TODO: Replace with actual service calls
    // Mock data for demonstration
    switch (application.applicationId) {
      case 'app_1':
        this.selectedApplicationOrganizationName = 'Acme Corporation';
        this.selectedApplicationEnvironmentCount = 3;
        this.selectedApplicationApiCallsToday = 1247;
        this.selectedApplicationLastActivity = '2 hours ago';
        break;
      case 'app_2':
        this.selectedApplicationOrganizationName = 'Acme Corporation';
        this.selectedApplicationEnvironmentCount = 2;
        this.selectedApplicationApiCallsToday = 856;
        this.selectedApplicationLastActivity = '1 day ago';
        break;
      case 'app_3':
        this.selectedApplicationOrganizationName = 'Beta Industries';
        this.selectedApplicationEnvironmentCount = 4;
        this.selectedApplicationApiCallsToday = 2103;
        this.selectedApplicationLastActivity = '3 hours ago';
        break;
      default:
        this.selectedApplicationOrganizationName = '';
        this.selectedApplicationEnvironmentCount = 0;
        this.selectedApplicationApiCallsToday = 0;
        this.selectedApplicationLastActivity = 'Never';
    }
  }
}