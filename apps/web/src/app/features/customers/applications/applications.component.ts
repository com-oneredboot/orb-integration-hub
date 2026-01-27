/**
 * Applications Component
 * 
 * Main container for applications management.
 * Available only to CUSTOMER role users.
 * Uses create-on-click pattern - detail view is a separate route.
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Store } from '@ngrx/store';
import { Observable, of } from 'rxjs';

import { Applications } from '../../../core/models/ApplicationsModel';
import { ApplicationsListComponent } from './components/applications-list/applications-list.component';
import * as fromUser from '../../user/store/user.selectors';
import { DebugPanelComponent, DebugContext } from '../../../shared/components/debug/debug-panel.component';
import { DebugLogEntry } from '../../../core/services/debug-log.service';

@Component({
  selector: 'app-applications',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FontAwesomeModule,
    ApplicationsListComponent,
    DebugPanelComponent
  ],
  templateUrl: './applications.component.html',
  styleUrls: ['./applications.component.scss']
})
export class ApplicationsComponent implements OnInit {
  selectedApplication: Applications | null = null;
  debugMode$: Observable<boolean>;
  
  // Empty logs observable for debug panel
  debugLogs$: Observable<DebugLogEntry[]> = of([]);

  // Debug context getter for shared DebugPanelComponent
  get debugContext(): DebugContext {
    return {
      page: 'Applications',
      additionalSections: [
        {
          title: 'Component State',
          data: {
            selectedApplicationId: this.selectedApplication?.applicationId || 'None',
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

  onApplicationSelected(application: Applications): void {
    this.selectedApplication = application;
  }
}