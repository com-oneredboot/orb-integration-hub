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
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

import { Applications } from '../../../core/models/ApplicationsModel';
import { ApplicationsListComponent } from './components/applications-list/applications-list.component';
import { ApplicationDetailComponent } from './components/application-detail/application-detail.component';
import * as fromUser from '../../user/store/user.selectors';

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
  selectedApplicationOrganizationName = '';
  selectedApplicationEnvironmentCount = 0;
  selectedApplicationApiCallsToday = 0;
  selectedApplicationLastActivity = '';
  totalApplications = 8; // Will be updated when applications are loaded
  debugMode$: Observable<boolean>;

  constructor(private store: Store) {
    this.debugMode$ = this.store.select(fromUser.selectDebugMode);
  }

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
      case 'app_001':
        this.selectedApplicationOrganizationName = 'Acme Corporation';
        this.selectedApplicationEnvironmentCount = 3;
        this.selectedApplicationApiCallsToday = 1247;
        this.selectedApplicationLastActivity = '2 hours ago';
        break;
      case 'app_002':
        this.selectedApplicationOrganizationName = 'Acme Corporation';
        this.selectedApplicationEnvironmentCount = 2;
        this.selectedApplicationApiCallsToday = 856;
        this.selectedApplicationLastActivity = '1 day ago';
        break;
      case 'app_003':
        this.selectedApplicationOrganizationName = 'Beta Industries';
        this.selectedApplicationEnvironmentCount = 4;
        this.selectedApplicationApiCallsToday = 2103;
        this.selectedApplicationLastActivity = '3 hours ago';
        break;
      case 'app_004':
        this.selectedApplicationOrganizationName = 'Acme Corporation';
        this.selectedApplicationEnvironmentCount = 5;
        this.selectedApplicationApiCallsToday = 3250;
        this.selectedApplicationLastActivity = '6 hours ago';
        break;
      case 'app_005':
        this.selectedApplicationOrganizationName = 'Gamma Solutions';
        this.selectedApplicationEnvironmentCount = 3;
        this.selectedApplicationApiCallsToday = 892;
        this.selectedApplicationLastActivity = '4 hours ago';
        break;
      case 'app_006':
        this.selectedApplicationOrganizationName = 'Beta Industries';
        this.selectedApplicationEnvironmentCount = 6;
        this.selectedApplicationApiCallsToday = 5621;
        this.selectedApplicationLastActivity = '12 hours ago';
        break;
      case 'app_007':
        this.selectedApplicationOrganizationName = 'Gamma Solutions';
        this.selectedApplicationEnvironmentCount = 2;
        this.selectedApplicationApiCallsToday = 1834;
        this.selectedApplicationLastActivity = '30 minutes ago';
        break;
      case 'app_008':
        this.selectedApplicationOrganizationName = 'Acme Corporation';
        this.selectedApplicationEnvironmentCount = 4;
        this.selectedApplicationApiCallsToday = 742;
        this.selectedApplicationLastActivity = '18 hours ago';
        break;
      default:
        this.selectedApplicationOrganizationName = '';
        this.selectedApplicationEnvironmentCount = 0;
        this.selectedApplicationApiCallsToday = 0;
        this.selectedApplicationLastActivity = 'Never';
    }
  }
}