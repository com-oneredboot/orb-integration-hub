/**
 * Application Detail Page Component
 *
 * Standalone page for viewing/editing a single application.
 * Handles both PENDING (create) and ACTIVE (edit) modes based on application status.
 * Uses the create-on-click pattern with NgRx store as single source of truth.
 *
 * @see .kiro/specs/store-centric-refactoring/design.md
 * _Requirements: 3.1, 3.2, 3.3, 3.4_
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { Observable, Subject, of } from 'rxjs';
import { takeUntil, map, filter, take } from 'rxjs/operators';

import { IApplications } from '../../../../../core/models/ApplicationsModel';
import { IOrganizations } from '../../../../../core/models/OrganizationsModel';
import { ApplicationStatus } from '../../../../../core/enums/ApplicationStatusEnum';
import { StatusBadgeComponent } from '../../../../../shared/components/ui/status-badge.component';
import { DebugPanelComponent, DebugContext } from '../../../../../shared/components/debug/debug-panel.component';
import { DebugLogEntry } from '../../../../../core/services/debug-log.service';

// Store imports
import { ApplicationsActions } from '../../store/applications.actions';
import * as fromApplications from '../../store/applications.selectors';
import * as fromOrganizations from '../../../organizations/store/organizations.selectors';
import * as fromUser from '../../../../user/store/user.selectors';
import { OrganizationsActions } from '../../../organizations/store/organizations.actions';

@Component({
  selector: 'app-application-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    FontAwesomeModule,
    StatusBadgeComponent,
    DebugPanelComponent
  ],
  templateUrl: './application-detail-page.component.html',
  styleUrls: ['./application-detail-page.component.scss']
})
export class ApplicationDetailPageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Store selectors - ALL data comes from store
  application$: Observable<IApplications | null>;
  isLoading$: Observable<boolean>;
  isSaving$: Observable<boolean>;
  error$: Observable<string | null>;
  saveError$: Observable<string | null>;
  organizations$: Observable<IOrganizations[]>;
  debugMode$: Observable<boolean>;

  // Local state for template binding
  application: IApplications | null = null;
  applicationId: string | null = null;
  loadError: string | null = null;

  // Mode detection
  isDraft = false;

  // Form data (local UI state - allowed)
  editForm = {
    name: '',
    description: '',
    organizationId: '',
    environments: [] as string[]
  };

  // Validation (local UI state - allowed)
  validationErrors = {
    name: '',
    description: '',
    organizationId: '',
    environments: ''
  };

  // Available environments for selection
  readonly availableEnvironments = [
    { value: 'PRODUCTION', label: 'Production', description: 'Live production environment' },
    { value: 'STAGING', label: 'Staging', description: 'Pre-production testing' },
    { value: 'DEVELOPMENT', label: 'Development', description: 'Development and debugging' },
    { value: 'TEST', label: 'Test', description: 'Automated testing' },
    { value: 'PREVIEW', label: 'Preview', description: 'Feature previews and demos' }
  ];

  // Debug
  debugLogs$: Observable<DebugLogEntry[]> = of([]);

  // Current user ID for draft creation
  private currentUserId: string | null = null;

  get debugContext(): DebugContext {
    return {
      page: 'ApplicationDetail',
      additionalSections: [
        {
          title: 'Application',
          data: this.application ? {
            applicationId: this.application.applicationId,
            name: this.application.name,
            organizationId: this.application.organizationId,
            status: this.application.status,
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private store: Store,
    private actions$: Actions
  ) {
    // Initialize store selectors
    this.application$ = this.store.select(fromApplications.selectSelectedApplication);
    this.isLoading$ = this.store.select(fromApplications.selectIsLoading);
    this.isSaving$ = this.store.select(fromApplications.selectIsSaving);
    this.error$ = this.store.select(fromApplications.selectError);
    this.saveError$ = this.store.select(fromApplications.selectSaveError);
    this.organizations$ = this.store.select(fromOrganizations.selectOrganizations);
    this.debugMode$ = this.store.select(fromUser.selectDebugMode);

    // Subscribe to application changes to sync local state
    this.application$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(app => {
      if (app) {
        this.application = app;
        this.isDraft = app.status === ApplicationStatus.Pending;
        this.loadFormData();
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
        ApplicationsActions.updateApplicationSuccess,
        ApplicationsActions.deleteApplicationSuccess
      ),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.router.navigate(['/customers/applications']);
    });

    // Listen for draft creation success to update URL
    this.actions$.pipe(
      ofType(ApplicationsActions.createDraftApplicationSuccess),
      takeUntil(this.destroy$)
    ).subscribe(action => {
      this.applicationId = action.application.applicationId;
      this.router.navigate(
        ['/customers/applications', action.application.applicationId],
        { replaceUrl: true }
      );
    });
  }

  ngOnInit(): void {
    // Get current user ID for draft creation
    this.store.select(fromUser.selectCurrentUser).pipe(
      take(1),
      filter(user => !!user)
    ).subscribe(user => {
      this.currentUserId = user!.userId;
    });

    // Ensure organizations are loaded
    this.store.dispatch(OrganizationsActions.loadOrganizations());

    // Get application ID from route
    this.route.paramMap.pipe(
      takeUntil(this.destroy$),
      map(params => params.get('id')),
      filter(id => !!id)
    ).subscribe(id => {
      this.applicationId = id;
      this.loadApplication(id!);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadApplication(id: string): void {
    // Check if this is a new draft (temp ID pattern)
    if (id.startsWith('new-')) {
      this.createDraftApplication();
      return;
    }

    // Dispatch action to load application - effects handle service call
    this.store.dispatch(ApplicationsActions.loadApplication({ applicationId: id }));
  }

  private createDraftApplication(): void {
    if (!this.currentUserId) {
      this.loadError = 'You must be signed in to create an application';
      return;
    }

    // Wait for organizations to be available, then dispatch create draft action
    this.organizations$.pipe(
      filter(orgs => orgs.length > 0),
      take(1)
    ).subscribe(organizations => {
      // Auto-select organization if only one
      const orgId = organizations.length === 1 ? organizations[0].organizationId : '';

      // Dispatch action - effects handle service call
      this.store.dispatch(ApplicationsActions.createDraftApplication({
        ownerId: this.currentUserId!,
        organizationId: orgId
      }));
    });
  }

  private loadFormData(): void {
    if (this.application) {
      this.editForm = {
        name: this.application.name || '',
        description: this.application.description || '',
        organizationId: this.application.organizationId || '',
        environments: [...(this.application.environments || [])]
      };
    }
  }

  onEnvironmentToggle(env: string): void {
    const index = this.editForm.environments.indexOf(env);
    if (index === -1) {
      this.editForm.environments.push(env);
    } else {
      this.editForm.environments.splice(index, 1);
    }
    // Clear validation error when user makes a selection
    if (this.editForm.environments.length > 0) {
      this.validationErrors.environments = '';
    }
  }

  isEnvironmentSelected(env: string): boolean {
    return this.editForm.environments.includes(env);
  }

  private clearValidationErrors(): void {
    this.validationErrors = {
      name: '',
      description: '',
      organizationId: '',
      environments: ''
    };
  }

  private validateForm(): boolean {
    this.clearValidationErrors();
    let isValid = true;

    // Name validation
    if (!this.editForm.name.trim()) {
      this.validationErrors.name = 'Application name is required';
      isValid = false;
    } else if (this.editForm.name.trim().length < 2) {
      this.validationErrors.name = 'Application name must be at least 2 characters';
      isValid = false;
    } else if (this.editForm.name.trim().length > 100) {
      this.validationErrors.name = 'Application name cannot exceed 100 characters';
      isValid = false;
    }

    // Organization validation
    if (!this.editForm.organizationId) {
      this.validationErrors.organizationId = 'Please select an organization';
      isValid = false;
    }

    // Description validation (optional but with length limit)
    if (this.editForm.description && this.editForm.description.length > 500) {
      this.validationErrors.description = 'Description cannot exceed 500 characters';
      isValid = false;
    }

    // Environment validation - at least one required
    if (this.editForm.environments.length === 0) {
      this.validationErrors.environments = 'At least one environment must be selected';
      isValid = false;
    }

    return isValid;
  }

  onSave(): void {
    if (!this.validateForm() || !this.application) {
      return;
    }

    const updateData = {
      applicationId: this.application.applicationId,
      name: this.editForm.name.trim(),
      description: this.editForm.description.trim(),
      organizationId: this.editForm.organizationId,
      status: this.isDraft ? ApplicationStatus.Active : this.application.status,
      environments: this.editForm.environments
    };

    // Dispatch action - effects handle service call
    this.store.dispatch(ApplicationsActions.updateApplication({ input: updateData }));
  }

  onCancel(): void {
    // If draft, delete it before navigating away
    if (this.isDraft && this.application) {
      this.store.dispatch(ApplicationsActions.deleteApplication({
        applicationId: this.application.applicationId
      }));
    } else {
      this.router.navigate(['/customers/applications']);
    }
  }

  onDelete(): void {
    if (!this.application) return;

    if (!confirm('Are you sure you want to delete this application? This action cannot be undone.')) {
      return;
    }

    // Dispatch action - effects handle service call
    this.store.dispatch(ApplicationsActions.deleteApplication({
      applicationId: this.application.applicationId
    }));
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
}
