/**
 * Organization Detail Component
 * 
 * Displays detailed information about a selected organization.
 * Placeholder component for future organization management features.
 */

import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Organizations } from '../../../../../core/models/OrganizationsModel';
import { OrganizationStatus } from '../../../../../core/models/OrganizationStatusEnum';
import { OrganizationsActions } from '../../store/organizations.actions';
import * as fromOrganizations from '../../store/organizations.selectors';

@Component({
  selector: 'app-organization-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FontAwesomeModule
  ],
  templateUrl: './organization-detail.component.html',
  styleUrls: ['./organization-detail.component.scss']
})
export class OrganizationDetailComponent implements OnChanges, OnDestroy {
  @Input() organization: Organizations | null = null;
  @Input() memberCount: number = 0;
  @Input() applicationCount: number = 0;
  @Input() isInCreateMode: boolean = false;

  // Output events
  @Output() organizationSaved = new EventEmitter<Organizations>();
  @Output() organizationDeleted = new EventEmitter<string>();
  @Output() createCancelled = new EventEmitter<void>();

  // Lifecycle management
  private destroy$ = new Subject<void>();

  // Tab management
  activeTab: string = 'overview';
  
  // Edit mode (handles both create and edit scenarios)
  isEditing: boolean = false;
  
  // Form data
  editForm = {
    name: '',
    description: ''
  };
  
  // Validation
  validationErrors = {
    name: ''
  };

  // Loading and error states from store
  isSaving$: Observable<boolean>;
  saveError$: Observable<string | null>;

  constructor(private store: Store) {
    // Initialize store observables
    this.isSaving$ = this.store.select(fromOrganizations.selectIsSaving);
    this.saveError$ = this.store.select(fromOrganizations.selectSaveError);
    
    // Listen for successful operations to emit events and exit edit mode
    this.store.select(fromOrganizations.selectLastCreatedOrganization).pipe(
      takeUntil(this.destroy$)
    ).subscribe(lastCreated => {
      if (lastCreated && this.isInCreateMode) {
        this.isEditing = false;
        this.organizationSaved.emit(lastCreated);
      }
    });

    this.store.select(fromOrganizations.selectLastUpdatedOrganization).pipe(
      takeUntil(this.destroy$)
    ).subscribe(lastUpdated => {
      if (lastUpdated && !this.isInCreateMode && lastUpdated.organizationId === this.organization?.organizationId) {
        this.isEditing = false;
        this.organizationSaved.emit(lastUpdated);
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['organization']) {
      if (this.organization) {
        console.log('Organization selected:', this.organization.name);
        // Reset to overview tab when organization changes
        this.activeTab = 'overview';
        // Load form data
        this.loadFormData();
      }
    }
    
    // Handle create mode by automatically entering edit mode
    if (changes['isInCreateMode']) {
      if (this.isInCreateMode) {
        this.isEditing = true;
        this.clearForm();
      } else if (!this.isInCreateMode && this.isEditing) {
        // Exiting create mode, stop editing
        this.isEditing = false;
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadFormData(): void {
    if (this.organization) {
      this.editForm = {
        name: this.organization.name || '',
        description: this.organization.description || ''
      };
    }
  }

  private clearForm(): void {
    this.editForm = {
      name: '',
      description: ''
    };
    this.clearValidationErrors();
  }

  private clearValidationErrors(): void {
    this.validationErrors = {
      name: ''
    };
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  // Status handling now uses global StatusBadgeComponent

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  onEditOrganization(): void {
    if (this.isEditing) return; // Already in edit mode
    
    this.isEditing = true;
    this.loadFormData();
    console.log('Edit organization:', this.organization?.name);
  }

  onSaveOrganization(): void {
    if (!this.validateForm()) {
      return;
    }

    if (this.isInCreateMode) {
      // Create new organization
      this.store.dispatch(OrganizationsActions.createOrganization({
        input: {
          name: this.editForm.name.trim(),
          description: this.editForm.description?.trim() || '',
          status: OrganizationStatus.ACTIVE
        }
      }));
    } else {
      // Update existing organization
      if (!this.organization?.organizationId) {
        console.error('Cannot update organization: missing organization ID');
        return;
      }

      this.store.dispatch(OrganizationsActions.updateOrganization({
        input: {
          organizationId: this.organization.organizationId,
          name: this.editForm.name.trim(),
          description: this.editForm.description?.trim() || '',
          ownerId: this.organization.ownerId,
          status: this.organization.status,
          createdAt: this.organization.createdAt,
          kmsKeyId: this.organization.kmsKeyId,
          kmsKeyArn: this.organization.kmsKeyArn,
          kmsAlias: this.organization.kmsAlias
        }
      }));
    }

    // Listen for successful operations to emit events and exit edit mode
    this.store.select(fromOrganizations.selectLastCreatedOrganization).pipe(
      takeUntil(this.destroy$)
    ).subscribe(lastCreated => {
      if (lastCreated && this.isInCreateMode) {
        this.isEditing = false;
        this.organizationSaved.emit(lastCreated);
      }
    });

    this.store.select(fromOrganizations.selectLastUpdatedOrganization).pipe(
      takeUntil(this.destroy$)
    ).subscribe(lastUpdated => {
      if (lastUpdated && !this.isInCreateMode && lastUpdated.organizationId === this.organization?.organizationId) {
        this.isEditing = false;
        this.organizationSaved.emit(lastUpdated);
      }
    });
  }

  onCancelEdit(): void {
    this.isEditing = false;
    this.clearValidationErrors();
    
    // Clear save errors from store
    this.store.dispatch(OrganizationsActions.clearSaveError());
    
    if (this.isInCreateMode) {
      // In create mode, clear the form since there's no original data
      this.clearForm();
      console.debug('Cancelling organization creation');
      this.createCancelled.emit();
    } else {
      // In edit mode, reset form to original data
      this.loadFormData();
      console.debug('Cancelling organization edit');
    }
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
      // Note: We'll add description validation error display if needed
      isValid = false;
    }

    return isValid;
  }

  onManageMembers(): void {
    console.log('Manage members for:', this.organization?.name);
    // TODO: Navigate to member management page
  }

  onDisableOrganization(): void {
    console.log('Disable organization:', this.organization?.name);
    // TODO: Implement organization disable functionality
  }

  onDeleteOrganization(): void {
    console.log('Delete organization:', this.organization?.name);
    // TODO: Implement organization delete functionality with confirmation
  }
}