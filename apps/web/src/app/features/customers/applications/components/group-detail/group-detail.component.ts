/**
 * Group Detail Component
 *
 * Displays detailed information about a selected group.
 * Supports viewing/editing group info and managing members.
 *
 * @see .kiro/specs/application-access-management/design.md
 * _Requirements: 8.3, 8.4_
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { IApplicationGroups, ApplicationGroupsUpdateInput } from '../../../../../core/models/ApplicationGroupsModel';
import { IApplicationGroupUsers } from '../../../../../core/models/ApplicationGroupUsersModel';
import { ApplicationGroupStatus } from '../../../../../core/enums/ApplicationGroupStatusEnum';
import { GroupsActions } from '../../store/groups/groups.actions';
import {
  selectGroupMembers,
  selectIsLoadingMembers,
  selectIsSaving,
  selectSaveError,
  selectLastCreatedGroup,
  selectLastUpdatedGroup,
  selectMembersError,
} from '../../store/groups/groups.selectors';
import { GroupRoleAssignmentComponent } from '../group-role-assignment/group-role-assignment.component';

@Component({
  selector: 'app-group-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule, GroupRoleAssignmentComponent],
  templateUrl: './group-detail.component.html',
  styleUrls: ['./group-detail.component.scss'],
})
export class GroupDetailComponent implements OnChanges, OnDestroy {
  @Input() group: IApplicationGroups | null = null;
  @Input() applicationId!: string;
  @Input() isInCreateMode = false;

  @Output() groupSaved = new EventEmitter<IApplicationGroups>();
  @Output() groupDeleted = new EventEmitter<string>();
  @Output() createCancelled = new EventEmitter<void>();
  @Output() closeDetail = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  // Tab management
  activeTab = 'overview';

  // Edit mode
  isEditing = false;

  // Form data
  editForm = {
    name: '',
    description: '',
  };

  // Validation
  validationErrors = {
    name: '',
  };

  // Store observables
  members$: Observable<IApplicationGroupUsers[]>;
  isLoadingMembers$: Observable<boolean>;
  isSaving$: Observable<boolean>;
  saveError$: Observable<string | null>;
  membersError$: Observable<string | null>;

  constructor(private store: Store) {
    this.members$ = this.store.select(selectGroupMembers);
    this.isLoadingMembers$ = this.store.select(selectIsLoadingMembers);
    this.isSaving$ = this.store.select(selectIsSaving);
    this.saveError$ = this.store.select(selectSaveError);
    this.membersError$ = this.store.select(selectMembersError);

    // Listen for successful create
    this.store
      .select(selectLastCreatedGroup)
      .pipe(takeUntil(this.destroy$))
      .subscribe((lastCreated) => {
        if (lastCreated && this.isInCreateMode) {
          this.isEditing = false;
          this.groupSaved.emit(lastCreated);
        }
      });

    // Listen for successful update
    this.store
      .select(selectLastUpdatedGroup)
      .pipe(takeUntil(this.destroy$))
      .subscribe((lastUpdated) => {
        if (
          lastUpdated &&
          !this.isInCreateMode &&
          lastUpdated.applicationGroupId === this.group?.applicationGroupId
        ) {
          this.isEditing = false;
          this.groupSaved.emit(lastUpdated);
        }
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['group']) {
      if (this.group) {
        this.activeTab = 'overview';
        this.loadFormData();
        // Load members when group changes
        this.store.dispatch(
          GroupsActions.loadGroupMembers({ groupId: this.group.applicationGroupId })
        );
      }
    }

    if (changes['isInCreateMode']) {
      if (this.isInCreateMode) {
        this.isEditing = true;
        this.clearForm();
      } else if (!this.isInCreateMode && this.isEditing) {
        this.isEditing = false;
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadFormData(): void {
    if (this.group) {
      this.editForm = {
        name: this.group.name || '',
        description: this.group.description || '',
      };
    }
  }

  private clearForm(): void {
    this.editForm = {
      name: '',
      description: '',
    };
    this.clearValidationErrors();
  }

  private clearValidationErrors(): void {
    this.validationErrors = {
      name: '',
    };
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }


  formatDate(dateValue: string | Date | number | undefined): string {
    if (!dateValue) return 'N/A';
    const date =
      typeof dateValue === 'number'
        ? new Date(dateValue * 1000)
        : dateValue instanceof Date
          ? dateValue
          : new Date(dateValue);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  onEditGroup(): void {
    if (this.isEditing) return;
    this.isEditing = true;
    this.loadFormData();
  }

  onSaveGroup(): void {
    if (!this.validateForm()) {
      return;
    }

    if (this.isInCreateMode) {
      this.store.dispatch(
        GroupsActions.createGroup({
          input: {
            applicationId: this.applicationId,
            name: this.editForm.name.trim(),
            description: this.editForm.description?.trim() || '',
            status: ApplicationGroupStatus.Active,
          },
        })
      );
    } else {
      if (!this.group?.applicationGroupId) {
        console.error('Cannot update group: missing group ID');
        return;
      }

      const updateInput: Partial<ApplicationGroupsUpdateInput> = {
        applicationGroupId: this.group.applicationGroupId,
        name: this.editForm.name.trim(),
        description: this.editForm.description?.trim() || '',
      };

      this.store.dispatch(GroupsActions.updateGroup({ input: updateInput }));
    }
  }

  onCancelEdit(): void {
    this.isEditing = false;
    this.clearValidationErrors();
    this.store.dispatch(GroupsActions.clearSaveError());

    if (this.isInCreateMode) {
      this.clearForm();
      this.createCancelled.emit();
    } else {
      this.loadFormData();
    }
  }

  private validateForm(): boolean {
    this.clearValidationErrors();
    let isValid = true;

    if (!this.editForm.name.trim()) {
      this.validationErrors.name = 'Group name is required';
      isValid = false;
    } else if (this.editForm.name.trim().length < 2) {
      this.validationErrors.name = 'Group name must be at least 2 characters';
      isValid = false;
    } else if (this.editForm.name.trim().length > 100) {
      this.validationErrors.name = 'Group name cannot exceed 100 characters';
      isValid = false;
    }

    return isValid;
  }

  onDeleteGroup(): void {
    if (!this.group?.applicationGroupId) return;

    if (confirm(`Are you sure you want to delete the group "${this.group.name}"?`)) {
      this.store.dispatch(
        GroupsActions.deleteGroup({
          groupId: this.group.applicationGroupId,
          applicationId: this.applicationId,
        })
      );
      this.groupDeleted.emit(this.group.applicationGroupId);
    }
  }

  onClose(): void {
    this.closeDetail.emit();
  }

  onAddMember(): void {
    // TODO: Open member selection dialog
    console.log('Add member to group:', this.group?.name);
  }

  onRemoveMember(member: IApplicationGroupUsers): void {
    if (
      confirm(
        `Are you sure you want to remove this member from the group "${this.group?.name}"?`
      )
    ) {
      this.store.dispatch(
        GroupsActions.removeMemberFromGroup({
          membershipId: member.applicationGroupUserId,
        })
      );
    }
  }

  getStatusClass(status: ApplicationGroupStatus): string {
    switch (status) {
      case ApplicationGroupStatus.Active:
        return 'active';
      case ApplicationGroupStatus.Deleted:
        return 'deleted';
      default:
        return 'unknown';
    }
  }
}
