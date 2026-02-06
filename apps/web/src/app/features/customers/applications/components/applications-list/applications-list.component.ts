/**
 * Applications List Component
 *
 * Displays a list of applications with filtering and selection capabilities.
 * Uses create-on-click pattern for new applications.
 * Uses NgRx store as single source of truth (store-first pattern).
 *
 * @see .kiro/specs/store-centric-refactoring/design.md
 * _Requirements: 2.1, 2.2, 2.3, 2.4_
 */

import { Component, OnInit, OnDestroy, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Store } from '@ngrx/store';
import { Observable, Subject, of } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { StatusBadgeComponent } from '../../../../../shared/components/ui/status-badge.component';
import { BreadcrumbItem } from '../../../../../shared/components';
import { TabConfig } from '../../../../../shared/models/tab-config.model';
import { UserPageComponent } from '../../../../../layouts/pages/user-page/user-page.component';
import { DebugPanelComponent, DebugContext } from '../../../../../shared/components/debug/debug-panel.component';
import { DebugLogEntry } from '../../../../../core/services/debug-log.service';

import { IApplications } from '../../../../../core/models/ApplicationsModel';
import { IOrganizations } from '../../../../../core/models/OrganizationsModel';
import { ApplicationsActions } from '../../store/applications.actions';
import * as fromApplications from '../../store/applications.selectors';
import * as fromOrganizations from '../../../organizations/store/organizations.selectors';
import * as fromUser from '../../../../user/store/user.selectors';
import { ApplicationTableRow } from '../../store/applications.state';

@Component({
  selector: 'app-applications-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FontAwesomeModule,
    StatusBadgeComponent,
    UserPageComponent,
    DebugPanelComponent
  ],
  templateUrl: './applications-list.component.html',
  styleUrls: ['./applications-list.component.scss']
})
export class ApplicationsListComponent implements OnInit, OnDestroy {
  @Output() applicationSelected = new EventEmitter<IApplications>();
  @Input() selectedApplication: IApplications | null = null;

  // Hero configuration
  heroTitle = 'Applications Management';
  heroSubtitle = 'Applications are the core of your integration platform. Each application has its own API keys, environments, and configuration.';

  // Tab configuration for page-layout-standardization
  tabs: TabConfig[] = [
    { id: 'overview', label: 'Overview', icon: 'fas fa-list' }
  ];
  activeTab = 'overview';

  // Debug
  debugMode$: Observable<boolean>;
  debugLogs$: Observable<DebugLogEntry[]> = of([]);

  get debugContext(): DebugContext {
    return {
      page: 'ApplicationsList',
      additionalSections: [
        {
          title: 'Filters',
          data: {
            searchTerm: this.searchTerm,
            organizationFilter: this.organizationFilter,
            statusFilter: this.statusFilter
          }
        }
      ]
    };
  }

  // Store selectors - ALL data comes from store
  applicationRows$: Observable<ApplicationTableRow[]>;
  filteredApplicationRows$: Observable<ApplicationTableRow[]>;
  isLoading$: Observable<boolean>;
  isCreatingNew$: Observable<boolean>;
  organizations$: Observable<IOrganizations[]>;
  searchTerm$: Observable<string>;
  organizationFilter$: Observable<string>;
  statusFilter$: Observable<string>;

  // Local UI state for form binding (synced with store)
  searchTerm = '';
  organizationFilter = '';
  statusFilter = '';

  /**
   * Breadcrumb items for navigation
   * Shows: Applications (current page)
   */
  get breadcrumbItems(): BreadcrumbItem[] {
    return [
      { label: 'Applications', route: null }
    ];
  }

  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Initialize store selectors
    this.applicationRows$ = this.store.select(fromApplications.selectApplicationRows);
    this.filteredApplicationRows$ = this.store.select(fromApplications.selectFilteredApplicationRows);
    this.isLoading$ = this.store.select(fromApplications.selectIsLoading);
    this.isCreatingNew$ = this.store.select(fromApplications.selectIsCreatingNew);
    this.organizations$ = this.store.select(fromOrganizations.selectOrganizations);
    this.searchTerm$ = this.store.select(fromApplications.selectSearchTerm);
    this.organizationFilter$ = this.store.select(fromApplications.selectOrganizationFilter);
    this.statusFilter$ = this.store.select(fromApplications.selectStatusFilter);
    this.debugMode$ = this.store.select(fromUser.selectDebugMode);

    // Sync local form state with store
    this.searchTerm$.pipe(takeUntil(this.destroy$)).subscribe(term => this.searchTerm = term);
    this.organizationFilter$.pipe(takeUntil(this.destroy$)).subscribe(filter => this.organizationFilter = filter);
    this.statusFilter$.pipe(takeUntil(this.destroy$)).subscribe(filter => this.statusFilter = filter);
  }

  ngOnInit(): void {
    // Check for organization filter from query params
    // _Requirements: 1.4_
    this.route.queryParams.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      if (params['organizationId']) {
        this.store.dispatch(ApplicationsActions.setOrganizationFilter({
          organizationFilter: params['organizationId']
        }));
      }
    });

    // Dispatch load action - effects handle service call
    this.store.dispatch(ApplicationsActions.loadApplications());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackByApplicationId(_index: number, row: ApplicationTableRow): string {
    return row.application.applicationId;
  }

  onSearchChange(): void {
    // Dispatch action - reducer updates state
    this.store.dispatch(ApplicationsActions.setSearchTerm({ searchTerm: this.searchTerm }));
  }

  onFilterChange(): void {
    // Dispatch filter actions - reducer updates state
    this.store.dispatch(ApplicationsActions.setOrganizationFilter({
      organizationFilter: this.organizationFilter
    }));
    this.store.dispatch(ApplicationsActions.setStatusFilter({
      statusFilter: this.statusFilter
    }));
  }

  getRoleClass(role: string): string {
    return role.toLowerCase().replace('_', '-');
  }

  onApplicationSelected(application: IApplications): void {
    this.store.dispatch(ApplicationsActions.selectApplication({ application }));
    this.applicationSelected.emit(application);
  }

  onRowClick(application: IApplications): void {
    this.router.navigate(['/customers/applications', application.applicationId]);
  }

  onCreateApplication(): void {
    // Create-on-click pattern: navigate to detail page with temp ID
    // The detail page will handle creating the draft
    const tempId = 'new-' + Date.now();
    this.router.navigate(['/customers/applications', tempId]);
  }

  /**
   * Handle tab change from TabNavigationComponent
   * Empty for single-tab page (Overview only)
   */
  onTabChange(tabId: string): void {
    this.activeTab = tabId;
  }
}
