/**
 * Application Detail Page Component
 *
 * Standalone page for viewing/editing a single application.
 * Handles both PENDING (create) and ACTIVE (edit) modes based on application status.
 * Uses the create-on-click pattern with real GraphQL operations.
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Store } from '@ngrx/store';
import { Observable, Subject, of } from 'rxjs';
import { takeUntil, map, filter, take } from 'rxjs/operators';

import { IApplications } from '../../../../../core/models/ApplicationsModel';
import { IOrganizations } from '../../../../../core/models/OrganizationsModel';
import { ApplicationStatus } from '../../../../../core/enums/ApplicationStatusEnum';
import { ApplicationService } from '../../../../../core/services/application.service';
import { OrganizationService } from '../../../../../core/services/organization.service';
import { StatusBadgeComponent } from '../../../../../shared/components/ui/status-badge.component';
import { DebugPanelComponent, DebugContext } from '../../../../../shared/components/debug/debug-panel.component';
import { DebugLogEntry } from '../../../../../core/services/debug-log.service';
import * as fromUser from '../../../../user/store/user.selectors';

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

  // Application data
  application: IApplications | null = null;
  applicationId: string | null = null;
  isLoading = true;
  loadError: string | null = null;

  // Organizations for dropdown
  organizations: IOrganizations[] = [];
  organizationsLoading = false;

  // Mode detection
  isDraft = false;

  // Form data
  editForm = {
    name: '',
    description: '',
    organizationId: ''
  };

  // Validation
  validationErrors = {
    name: '',
    description: '',
    organizationId: ''
  };

  // Save state
  isSaving = false;
  saveError: string | null = null;

  // Current user
  private currentUserId: string | null = null;

  // Debug
  debugMode$: Observable<boolean>;
  debugLogs$: Observable<DebugLogEntry[]> = of([]);

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
            validationErrors: this.validationErrors,
            isSaving: this.isSaving,
            organizationsCount: this.organizations.length
          }
        }
      ]
    };
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private store: Store,
    private applicationService: ApplicationService,
    private organizationService: OrganizationService
  ) {
    this.debugMode$ = this.store.select(fromUser.selectDebugMode);
  }

  ngOnInit(): void {
    // Get current user first, then load data
    this.store.select(fromUser.selectCurrentUser).pipe(
      take(1),
      filter(user => !!user)
    ).subscribe(user => {
      this.currentUserId = user!.userId;
      this.loadOrganizations();
    });

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

  private loadOrganizations(): void {
    if (!this.currentUserId) return;

    this.organizationsLoading = true;
    this.organizationService.getUserOrganizations(this.currentUserId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (connection) => {
        // Filter to only show ACTIVE organizations
        this.organizations = connection.items.filter(
          org => org.status === 'ACTIVE'
        );
        this.organizationsLoading = false;

        // Auto-select if only one organization
        if (this.organizations.length === 1 && !this.editForm.organizationId) {
          this.editForm.organizationId = this.organizations[0].organizationId;
        }
      },
      error: (error) => {
        console.error('[ApplicationDetail] Error loading organizations:', error);
        this.organizationsLoading = false;
      }
    });
  }

  private loadApplication(id: string): void {
    this.isLoading = true;
    this.loadError = null;

    // Check if this is a new draft (temp ID pattern)
    if (id.startsWith('new-')) {
      this.createDraftApplication();
      return;
    }

    // Load existing application
    this.applicationService.getApplication(id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (app) => {
        if (app) {
          this.application = app;
          this.isDraft = app.status === ApplicationStatus.Pending;
          this.loadFormData();
        } else {
          this.loadError = 'Application not found';
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('[ApplicationDetail] Error loading application:', error);
        this.loadError = error.message || 'Failed to load application';
        this.isLoading = false;
      }
    });
  }

  private createDraftApplication(): void {
    if (!this.currentUserId) {
      this.loadError = 'You must be signed in to create an application';
      this.isLoading = false;
      return;
    }

    // Wait for organizations to load, then create draft
    const checkOrgsAndCreate = () => {
      if (this.organizationsLoading) {
        setTimeout(checkOrgsAndCreate, 100);
        return;
      }

      // Auto-select organization if only one
      const orgId = this.organizations.length === 1 ? this.organizations[0].organizationId : '';

      this.applicationService.createDraft(this.currentUserId!, orgId).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (app) => {
          this.application = app;
          this.isDraft = true;
          this.applicationId = app.applicationId;

          // Update URL to real ID (replace temp ID)
          this.router.navigate(
            ['/customers/applications', app.applicationId],
            { replaceUrl: true }
          );

          this.loadFormData();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('[ApplicationDetail] Error creating draft:', error);
          this.loadError = error.message || 'Failed to create application';
          this.isLoading = false;
        }
      });
    };

    checkOrgsAndCreate();
  }

  private loadFormData(): void {
    if (this.application) {
      this.editForm = {
        name: this.application.name || '',
        description: '',
        organizationId: this.application.organizationId || ''
      };

      // Auto-select if only one organization and none selected
      if (!this.editForm.organizationId && this.organizations.length === 1) {
        this.editForm.organizationId = this.organizations[0].organizationId;
      }
    }
  }

  private clearValidationErrors(): void {
    this.validationErrors = {
      name: '',
      description: '',
      organizationId: ''
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

    return isValid;
  }

  onSave(): void {
    if (!this.validateForm() || !this.application) {
      return;
    }

    this.isSaving = true;
    this.saveError = null;

    const updateData = {
      applicationId: this.application.applicationId,
      name: this.editForm.name.trim(),
      organizationId: this.editForm.organizationId,
      status: this.isDraft ? ApplicationStatus.Active : this.application.status
    };

    console.debug('[ApplicationDetail] Saving application:', updateData);

    this.applicationService.updateApplication(updateData).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (updatedApp) => {
        console.debug('[ApplicationDetail] Application saved:', updatedApp);
        this.isSaving = false;
        this.router.navigate(['/customers/applications']);
      },
      error: (error) => {
        console.error('[ApplicationDetail] Error saving application:', error);
        this.saveError = error.message || 'Failed to save application';
        this.isSaving = false;
      }
    });
  }

  onCancel(): void {
    // If draft, delete it before navigating away
    if (this.isDraft && this.application) {
      this.applicationService.deleteApplication(this.application.applicationId).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          console.debug('[ApplicationDetail] Draft deleted on cancel');
          this.router.navigate(['/customers/applications']);
        },
        error: (error) => {
          console.error('[ApplicationDetail] Error deleting draft:', error);
          // Navigate anyway
          this.router.navigate(['/customers/applications']);
        }
      });
    } else {
      this.router.navigate(['/customers/applications']);
    }
  }

  onDelete(): void {
    if (!this.application) return;

    if (!confirm('Are you sure you want to delete this application? This action cannot be undone.')) {
      return;
    }

    this.isSaving = true;
    this.applicationService.deleteApplication(this.application.applicationId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        console.debug('[ApplicationDetail] Application deleted');
        this.router.navigate(['/customers/applications']);
      },
      error: (error) => {
        console.error('[ApplicationDetail] Error deleting application:', error);
        this.saveError = error.message || 'Failed to delete application';
        this.isSaving = false;
      }
    });
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
