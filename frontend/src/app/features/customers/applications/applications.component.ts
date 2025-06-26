/**
 * Applications Component
 * 
 * Main container for applications management with master-detail layout.
 * Available only to CUSTOMER role users.
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { Applications } from '../../../core/models/ApplicationsModel';
import { ApplicationsListComponent } from './components/applications-list/applications-list.component';
import { ApplicationDetailComponent } from './components/application-detail/application-detail.component';

@Component({
  selector: 'app-applications',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FontAwesomeModule,
    ApplicationsListComponent,
    ApplicationDetailComponent
  ],
  templateUrl: './applications.component.html',
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