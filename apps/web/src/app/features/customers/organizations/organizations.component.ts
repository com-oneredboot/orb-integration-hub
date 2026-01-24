/**
 * Organizations Component
 * 
 * Main container for organizations list view.
 * Available only to CUSTOMER role users.
 * Uses create-on-click pattern - detail view is a separate route.
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Store } from '@ngrx/store';
import { Observable, of } from 'rxjs';

import { Organizations } from '../../../core/models/OrganizationsModel';
import { OrganizationsListComponent } from './components/organizations-list/organizations-list.component';
import * as fromUser from '../../user/store/user.selectors';
import { DebugPanelComponent, DebugContext } from '../../../shared/components/debug/debug-panel.component';
import { DebugLogEntry } from '../../../core/services/debug-log.service';

@Component({
  selector: 'app-organizations',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FontAwesomeModule,
    OrganizationsListComponent,
    DebugPanelComponent
  ],
  templateUrl: './organizations.component.html',
  styleUrls: ['./organizations.component.scss']
})
export class OrganizationsComponent implements OnInit {
  selectedOrganization: Organizations | null = null;
  debugMode$: Observable<boolean>;
  
  // Empty logs observable for debug panel
  debugLogs$: Observable<DebugLogEntry[]> = of([]);

  // Debug context getter for shared DebugPanelComponent
  get debugContext(): DebugContext {
    return {
      page: 'Organizations',
      additionalSections: [
        {
          title: 'Component State',
          data: {
            selectedOrganizationId: this.selectedOrganization?.organizationId || 'None',
            componentInitialized: true
          }
        }
      ]
    };
  }

  constructor(private store: Store) {
    this.debugMode$ = this.store.select(fromUser.selectDebugMode);
  }

  ngOnInit(): void {
    // Lifecycle hook - initialization handled by store selectors in constructor
    void 0; // Intentionally empty - initialization handled in constructor
  }

  onOrganizationSelected(organization: Organizations): void {
    this.selectedOrganization = organization;
  }
}