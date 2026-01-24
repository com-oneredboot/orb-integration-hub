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
import { OrganizationStatus } from '../../../../../core/enums/OrganizationStatusEnum';
import { OrganizationService } from '../../../../../core/services/organization.service';
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
        }
      ]
    };
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private store: Store,
    private organizationService: OrganizationService
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
      next: (response) => {
        if (response.StatusCode === 200 && response.Data) {
          this.organization = response.Data;
          this.isDraft = this.organization.status === OrganizationStatus.Pending;
          this.loadFormData();
          this.isLoading = false;
        } else {
          this.loadError = response.Message || 'Organization not found';
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
      next: (response) => {
        this.isSaving = false;
        if (response.StatusCode === 200 && response.Data) {
          this.organization = response.Data;
          this.isDraft = this.organization.status === OrganizationStatus.Pending;
          
          // Refresh the organizations list in the store
          this.store.dispatch(OrganizationsActions.loadOrganizations());
          
          // Navigate back to list
          this.router.navigate(['/customers/organizations']);
        } else {
          this.saveError = response.Message || 'Failed to save organization';
        }
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
}
