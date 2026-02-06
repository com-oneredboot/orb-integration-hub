/**
 * Organization Detail Page Component
 *
 * Standalone page for viewing/editing a single organization.
 * Handles both DRAFT (create) and ACTIVE (edit) modes based on organization status.
 * Uses the create-on-click pattern with NgRx store as single source of truth.
 *
 * @see .kiro/specs/store-centric-refactoring/design.md
 * _Requirements: 4.1, 4.2, 4.3, 4.4_
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { Observable, Subject, of } from 'rxjs';
import { takeUntil, map, filter } from 'rxjs/operators';

import { Organizations } from '../../../../../core/models/OrganizationsModel';
import { IApplications } from '../../../../../core/models/ApplicationsModel';
import { OrganizationStatus } from '../../../../../core/enums/OrganizationStatusEnum';
import { StatusBadgeComponent } from '../../../../../shared/components/ui/status-badge.component';
import { DebugPanelComponent, DebugContext } from '../../../../../shared/components/debug/debug-panel.component';
import { DebugLogEntry } from '../../../../../core/services/debug-log.service';
import { DangerZoneCardComponent } from '../../../../../shared/components/danger-zone-card/danger-zone-card.component';
import { BreadcrumbItem } from '../../../../../shared/components';
import { TabConfig } from '../../../../../shared/models/tab-config.model';
import { UserPageComponent } from '../../../../../layouts/pages/user-page/user-page.component';

// Store imports
import { OrganizationsActions } from '../../store/organizations.actions';
import * as fromOrganizations from '../../store/organizations.selectors';
import * as fromUser from '../../../../user/store/user.selectors';

@Component({
  selector: 'app-organization-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    FontAwesomeModule,
    StatusBadgeComponent,
    DebugPanelComponent,
    DangerZoneCardComponent,
    UserPageComponent
  ],
  templateUrl: './organization-detail-page.component.html',
  styleUrls: ['./organization-detail-page.component.scss']
})
export class OrganizationDetailPageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Store selectors - ALL data comes from store
  organization$: Observable<Organizations | null>;
  isLoading$: Observable<boolean>;
  isSaving$: Observable<boolean>;
  isDeleting$: Observable<boolean>;
  error$: Observable<string | null>;
  saveError$: Observable<string | null>;
  applications$: Observable<IApplications[]>;
  isLoadingApplications$: Observable<boolean>;
  applicationsError$: Observable<string | null>;
  applicationCount$: Observable<number>;
  debugMode$: Observable<boolean>;

  // Local state for template binding
  organization: Organizations | null = null;
  organizationId: string | null = null;
  loadError: string | null = null;

  // Mode detection
  isDraft = false;

  // Tab management using TabConfig
  tabs: TabConfig[] = [];
  activeTab = 'overview';
  private applicationsLoaded = false;

  // Form data (local UI state - allowed)
  editForm = {
    name: '',
    description: ''
  };

  // Validation (local UI state - allowed)
  validationErrors = {
    name: '',
    description: ''
  };

  // Debug
  debugLogs$: Observable<DebugLogEntry[]> = of([]);

  get debugContext(): DebugContext {
    return {
      page: 'OrganizationDetail',
      additionalSections: [
        {
          title: 'Organization',
          data: this.organization ? {
            organizationId: this.organization.organizationId,
            name: this.organization.name,
            status: this.organization.status,
            applicationCount: this.organization.applicationCount,
            isDraft: this.isDraft
          } : { status: 'Loading...' }
        },
        {
          title: 'Form State',
          data: {
            editForm: this.editForm,
            validationErrors: this.validationErrors
          }
        }
      ]
    };
  }

  /**
   * Breadcrumb items for navigation
   * Shows: Organizations > "Organization Name"
   * _Requirements: 2.1_
   */
  get breadcrumbItems(): BreadcrumbItem[] {
    return [
      { label: 'Organizations', route: '/customers/organizations' },
      { label: this.organization?.name || 'Loading...', route: null }
    ];
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private store: Store,
    private actions$: Actions
  ) {
    // Initialize store selectors
    this.organization$ = this.store.select(fromOrganizations.selectSelectedOrganization);
    this.isLoading$ = this.store.select(fromOrganizations.selectIsLoading);
    this.isSaving$ = this.store.select(fromOrganizations.selectIsSaving);
    this.isDeleting$ = this.store.select(fromOrganizations.selectIsDeleting);
    this.error$ = this.store.select(fromOrganizations.selectError);
    this.saveError$ = this.store.select(fromOrganizations.selectSaveError);
    this.debugMode$ = this.store.select(fromUser.selectDebugMode);

    // Initialize applications observables as empty - will be set when organizationId is known
    this.applications$ = of([]);
    this.isLoadingApplications$ = of(false);
    this.applicationsError$ = of(null);
    this.applicationCount$ = of(0);

    // Subscribe to organization changes to sync local state
    this.organization$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(organization => {
      if (organization) {
        this.organization = organization;
        this.isDraft = organization.status === OrganizationStatus.Pending;
        this.loadFormData();
        // Initialize applications observables for this organization
        this.initializeApplicationsObservables(organization.organizationId);
        // Initialize tabs with application count badge
        this.initializeTabs();
      }
    });

    // Subscribe to error changes
    this.error$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(error => {
      this.loadError = error;
    });

    // Listen for successful operations to navigate
    this.actions$.pipe(
      ofType(
        OrganizationsActions.updateOrganizationSuccess,
        OrganizationsActions.deleteOrganizationSuccess
      ),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.router.navigate(['/customers/organizations']);
    });
  }

  private initializeApplicationsObservables(organizationId: string): void {
    this.applications$ = this.store.select(fromOrganizations.selectOrganizationApplications(organizationId));
    this.isLoadingApplications$ = this.store.select(fromOrganizations.selectIsLoadingOrganizationApplications(organizationId));
    this.applicationsError$ = this.store.select(fromOrganizations.selectOrganizationApplicationsError(organizationId));
    this.applicationCount$ = this.store.select(fromOrganizations.selectOrganizationApplicationCount(organizationId));
  }

  /**
   * Initialize tabs with dynamic badges
   * Applications tab shows count badge
   */
  private initializeTabs(): void {
    this.applicationCount$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(count => {
      this.tabs = [
        { id: 'overview', label: 'Overview', icon: 'info-circle' },
        { id: 'security', label: 'Security', icon: 'shield-alt' },
        { id: 'stats', label: 'Stats', icon: 'chart-bar' },
        { id: 'applications', label: 'Applications', icon: 'rocket', badge: count || undefined },
        { id: 'danger', label: 'Danger Zone', icon: 'exclamation-triangle' }
      ];
    });
  }

  ngOnInit(): void {
    // Get organization ID from route
    this.route.paramMap.pipe(
      takeUntil(this.destroy$),
      map(params => params.get('id')),
      filter(id => !!id)
    ).subscribe(id => {
      this.organizationId = id;
      this.loadOrganization(id!);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadOrganization(id: string): void {
    // Dispatch action to load organization - effects handle service call
    this.store.dispatch(OrganizationsActions.loadOrganization({ organizationId: id }));
    // Reset applications loaded flag for new organization
    this.applicationsLoaded = false;
  }

  private loadFormData(): void {
    if (this.organization) {
      this.editForm = {
        name: this.organization.name || '',
        description: this.organization.description || ''
      };
    }
  }

  private clearValidationErrors(): void {
    this.validationErrors = {
      name: '',
      description: ''
    };
  }

  private validateForm(): boolean {
    this.clearValidationErrors();
    let isValid = true;

    // Name validation
    if (!this.editForm.name.trim()) {
      this.validationErrors.name = 'Organization name is required';
      isValid = false;
    } else if (this.editForm.name.trim().length < 2) {
      this.validationErrors.name = 'Organization name must be at least 2 characters';
      isValid = false;
    } else if (this.editForm.name.trim().length > 100) {
      this.validationErrors.name = 'Organization name cannot exceed 100 characters';
      isValid = false;
    } else if (!/^[a-zA-Z0-9\s\-'.]+$/.test(this.editForm.name.trim())) {
      this.validationErrors.name = 'Organization name contains invalid characters';
      isValid = false;
    }

    // Description validation (optional but with length limit)
    if (this.editForm.description && this.editForm.description.length > 500) {
      this.validationErrors.description = 'Description cannot exceed 500 characters';
      isValid = false;
    }

    return isValid;
  }

  onSave(): void {
    if (!this.validateForm() || !this.organization) {
      return;
    }

    // Determine the new status - if draft, activate it; otherwise keep current status
    const newStatus = this.isDraft ? OrganizationStatus.Active : this.organization.status;

    const updateData = {
      organizationId: this.organization.organizationId,
      name: this.editForm.name.trim(),
      description: this.editForm.description?.trim() || '',
      ownerId: this.organization.ownerId,
      status: newStatus,
      createdAt: this.organization.createdAt,
      kmsKeyId: this.organization.kmsKeyId,
      kmsKeyArn: this.organization.kmsKeyArn,
      kmsAlias: this.organization.kmsAlias
    };

    // Dispatch action - effects handle service call
    this.store.dispatch(OrganizationsActions.updateOrganization({ input: updateData }));
  }

  onCancel(): void {
    if (this.isDraft && this.organization) {
      // Delete the draft organization
      this.store.dispatch(OrganizationsActions.deleteOrganization({
        organizationId: this.organization.organizationId
      }));
    } else {
      // Just navigate back
      this.router.navigate(['/customers/organizations']);
    }
  }

  onDelete(): void {
    if (!this.organization) return;

    if (!confirm('Are you sure you want to delete this organization? This action cannot be undone.')) {
      return;
    }

    // Dispatch action - effects handle service call
    this.store.dispatch(OrganizationsActions.deleteOrganization({
      organizationId: this.organization.organizationId
    }));
  }

  /**
   * Reload applications for this organization
   */
  loadApplications(): void {
    if (this.organizationId) {
      this.store.dispatch(OrganizationsActions.loadOrganizationApplications({
        organizationId: this.organizationId
      }));
      this.applicationsLoaded = true;
    }
  }

  /**
   * Navigate to create a new application for this organization
   */
  onCreateApplication(): void {
    if (!this.organizationId) return;

    // Navigate to applications with organizationId pre-selected
    this.router.navigate(['/customers/applications'], {
      queryParams: { organizationId: this.organizationId, create: 'true' }
    });
  }

  /**
   * Navigate to application detail page
   */
  onApplicationClick(application: IApplications): void {
    this.router.navigate(['/customers/applications', application.applicationId]);
  }

  /**
   * Get environment count for display
   */
  getEnvironmentCount(application: IApplications): number {
    return application.environments?.length || 0;
  }

  formatDate(dateValue: string | Date | number | undefined): string {
    if (!dateValue) return 'N/A';
    // Handle Unix timestamp (number)
    const date = typeof dateValue === 'number'
      ? new Date(dateValue * 1000)
      : dateValue instanceof Date
        ? dateValue
        : new Date(dateValue);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Handle tab change event from TabNavigationComponent
   */
  onTabChange(tabId: string): void {
    this.activeTab = tabId;

    // Lazy load applications when tab is first selected
    if (tabId === 'applications' && !this.applicationsLoaded && this.organizationId) {
      this.loadApplications();
    }
  }
}
