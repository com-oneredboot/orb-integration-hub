/**
 * Organizations Component
 * 
 * Main container for organizations management with master-detail layout.
 * Available only to CUSTOMER role users.
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

import { Organizations } from '../../../core/models/OrganizationsModel';
import { OrganizationsListComponent } from './components/organizations-list/organizations-list.component';
import { OrganizationDetailComponent } from './components/organization-detail/organization-detail.component';
import * as fromUser from '../../user/store/user.selectors';

@Component({
  selector: 'app-organizations',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FontAwesomeModule,
    OrganizationsListComponent,
    OrganizationDetailComponent
  ],
  templateUrl: './organizations.component.html',
  styleUrls: ['./organizations.component.scss']
})
export class OrganizationsComponent implements OnInit {
  selectedOrganization: Organizations | null = null;
  selectedOrganizationMemberCount: number = 0;
  selectedOrganizationApplicationCount: number = 0;
  isInCreateMode: boolean = false;
  debugMode$: Observable<boolean>;

  constructor(private store: Store) {
    this.debugMode$ = this.store.select(fromUser.selectDebugMode);
  }

  ngOnInit(): void {
    // Component initialization
  }

  onOrganizationSelected(organization: Organizations): void {
    this.selectedOrganization = organization;
    this.isInCreateMode = false; // Exit create mode on normal selection
    
    // TODO: Load actual member and application counts from service
    // For now, use mock data based on organization
    this.loadOrganizationStats(organization);
  }

  onCreateModeRequested(organization: Organizations): void {
    this.selectedOrganization = organization;
    this.isInCreateMode = true;
    this.selectedOrganizationMemberCount = 0;
    this.selectedOrganizationApplicationCount = 0;
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