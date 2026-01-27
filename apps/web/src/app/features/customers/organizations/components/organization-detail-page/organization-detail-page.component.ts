/**
 * Organization Detail Page Component
 * 
 * Standalone page for viewing/editing a single organization.
 * Handles both DRAFT (create) and ACTIVE (edit) modes based on organization status.
 * Used with the create-on-click pattern.
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Store } from '@ngrx/store';
import { Observable, Subject, of } from 'rxjs';
import { takeUntil, map, filter, take } from 'rxjs/operators';

import { Organizations } from '../../../../../core/models/OrganizationsModel';
import { IApplications } from '../../../../../core/models/ApplicationsModel';
import { OrganizationStatus } from '../../../../../core/enums/OrganizationStatusEnum';
import { ApplicationStatus } from '../../../../../core/enums/ApplicationStatusEnum';
import { OrganizationService } from '../../../../../core/services/organization.service';
import { ApplicationService } from '../../../../../core/services/application.service';
import { OrganizationsActions } from '../../store/organizations.actions';
import * as fromUser from '../../../../user/store/user.selectors';
import { StatusBadgeComponent } from '../../../../../shared/components/ui/status-badge.component';
import { DebugPanelComponent, DebugContext } from '../../../../../shared/components/debug/debug-panel.component';
import { DebugLogEntry } from '../../../../../core/services/debug-log.service';

@Component({
  selector: 'app-organization-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    FontAwesomeModule,
    StatusBadgeComponent,
    DebugPanelComponent
  ],
  templateUrl: './organization-detail-page.component.html',
  styleUrls: ['./organization-detail-page.component.scss']
})
export class OrganizationDetailPageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Organization data
  organization: Organizations | null = null;
  organizationId: string | null = null;
  isLoading = true;
  loadError: string | null = null;
  
  // Mode detection
  isDraft = false;
  
  // Form data
  editForm = {
    name: '',
    description: ''
  };
  
  // Validation
  validationErrors = {
    name: '',
    description: ''
  };
  
  // Save state
  isSaving = false;
  saveError: string | null = null;
  
  // Applications section
  // _Requirements: 2.1, 2.4, 2.5, 2.9_
  applications: IApplications[] = [];
  isLoadingApplications = false;
  applicationsError: string | null = null;
  
  // Debug
  debugMode$: Observable<boolean>;
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
            validationErrors: this.validationErrors,
            isSaving: this.isSaving
          }
        },
        {
          title: 'Applications',
          data: {
            count: this.applications.length,
            isLoading: this.isLoadingApplications,
            error: this.applicationsError,
            applications: this.applications.map(a => ({ id: a.applicationId, name: a.name, status: a.status }))
          }
        }
      ]
    };
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private store: Store,
    private organizationService: OrganizationService,
    private applicationService: ApplicationService
  ) {
    this.debugMode$ = this.store.select(fromUser.selectDebugMode);
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
    this.isLoading = true;
    this.loadError = null;
    
    this.organizationService.getOrganization(id).pipe(
      take(1)
    ).subscribe({
      next: (organization) => {
        if (organization) {
          this.organization = organization;
          this.isDraft = this.organization.status === OrganizationStatus.Pending;
          this.loadFormData();
          this.isLoading = false;
          
          // Load applications for non-draft organizations
          // _Requirements: 2.1_
          if (!this.isDraft) {
            this.loadApplications();
          }
        } else {
          this.loadError = 'Organization not found';
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('[OrganizationDetailPage] Error loading organization:', error);
        this.loadError = error.message || 'Failed to load organization';
        this.isLoading = false;
      }
    });
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

    this.isSaving = true;
    this.saveError = null;

    // Determine the new status - if draft, activate it; otherwise keep current status
    const newStatus = this.isDraft ? OrganizationStatus.Active : this.organization.status;

    this.organizationService.updateOrganization({
      organizationId: this.organization.organizationId,
      name: this.editForm.name.trim(),
      description: this.editForm.description?.trim() || '',
      ownerId: this.organization.ownerId,
      status: newStatus,
      createdAt: this.organization.createdAt,
      kmsKeyId: this.organization.kmsKeyId,
      kmsKeyArn: this.organization.kmsKeyArn,
      kmsAlias: this.organization.kmsAlias
    }).pipe(
      take(1)
    ).subscribe({
      next: (organization) => {
        this.isSaving = false;
        this.organization = organization;
        this.isDraft = this.organization.status === OrganizationStatus.Pending;
        
        // Refresh the organizations list in the store
        this.store.dispatch(OrganizationsActions.loadOrganizations());
        
        // Navigate back to list
        this.router.navigate(['/customers/organizations']);
      },
      error: (error) => {
        console.error('[OrganizationDetailPage] Error saving organization:', error);
        this.isSaving = false;
        this.saveError = error.message || 'Failed to save organization';
      }
    });
  }

  onCancel(): void {
    if (this.isDraft && this.organization) {
      // Delete the draft organization
      this.organizationService.deleteOrganization(this.organization.organizationId).pipe(
        take(1)
      ).subscribe({
        next: () => {
          this.store.dispatch(OrganizationsActions.loadOrganizations());
          this.router.navigate(['/customers/organizations']);
        },
        error: (error) => {
          console.error('[OrganizationDetailPage] Error deleting draft:', error);
          // Navigate anyway - the draft will be cleaned up later
          this.router.navigate(['/customers/organizations']);
        }
      });
    } else {
      // Just navigate back
      this.router.navigate(['/customers/organizations']);
    }
  }

  onDelete(): void {
    if (!this.organization) return;
    
    // TODO: Add confirmation dialog
    if (!confirm('Are you sure you want to delete this organization? This action cannot be undone.')) {
      return;
    }

    this.organizationService.deleteOrganization(this.organization.organizationId).pipe(
      take(1)
    ).subscribe({
      next: () => {
        this.store.dispatch(OrganizationsActions.loadOrganizations());
        this.router.navigate(['/customers/organizations']);
      },
      error: (error) => {
        console.error('[OrganizationDetailPage] Error deleting organization:', error);
        this.saveError = error.message || 'Failed to delete organization';
      }
    });
  }

  formatDate(dateValue: string | Date | undefined): string {
    if (!dateValue) return 'N/A';
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Load applications for this organization
   * _Requirements: 2.1, 2.4_
   */
  loadApplications(): void {
    if (!this.organizationId || this.isDraft) {
      return;
    }

    this.isLoadingApplications = true;
    this.applicationsError = null;

    this.applicationService.getApplicationsByOrganization(this.organizationId).pipe(
      take(1)
    ).subscribe({
      next: (connection) => {
        // Filter out PENDING applications (drafts)
        this.applications = connection.items.filter(
          app => app.status !== ApplicationStatus.Pending
        );
        this.isLoadingApplications = false;
        
        // Sync application count if it differs
        // _Requirements: 2.9_
        this.syncApplicationCount();
      },
      error: (error) => {
        console.error('[OrganizationDetailPage] Error loading applications:', error);
        this.applicationsError = error.message || 'Failed to load applications';
        this.isLoadingApplications = false;
      }
    });
  }

  /**
   * Sync application count with actual count
   * _Requirements: 2.9, 2.10, 2.11_
   */
  private syncApplicationCount(): void {
    if (!this.organization) return;
    
    const actualCount = this.applications.length;
    const storedCount = this.organization.applicationCount ?? 0;
    
    if (actualCount !== storedCount) {
      console.debug('[OrganizationDetailPage] Syncing application count:', storedCount, '->', actualCount);
      this.organizationService.updateOrganization({
        ...this.organization,
        applicationCount: actualCount
      }).pipe(take(1)).subscribe({
        next: (updated) => {
          this.organization = updated;
        },
        error: (error) => {
          console.error('[OrganizationDetailPage] Error syncing application count:', error);
        }
      });
    }
  }

  /**
   * Navigate to create a new application for this organization
   * _Requirements: 2.5_
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
   * _Requirements: 2.8_
   */
  onApplicationClick(application: IApplications): void {
    this.router.navigate(['/customers/applications', application.applicationId]);
  }

  /**
   * Get environment count for display
   * _Requirements: 2.3_
   */
  getEnvironmentCount(application: IApplications): number {
    return application.environments?.length || 0;
  }
}
