/**
 * Edit Role Dialog Component
 *
 * Dialog for editing existing application roles.
 * Supports save, deactivate, and delete actions.
 *
 * @see .kiro/specs/application-roles-management/design.md
 * _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';

import { IApplicationRoles } from '../../../../../core/models/ApplicationRolesModel';
import { ApplicationRoleType } from '../../../../../core/enums/ApplicationRoleTypeEnum';
import { ApplicationRoleStatus } from '../../../../../core/enums/ApplicationRoleStatusEnum';
import { ApplicationRolesActions } from '../../store/application-roles/application-roles.actions';
import {
  selectIsUpdating,
  selectIsDeleting,
  selectUpdateError,
  selectDeleteError,
} from '../../store/application-roles/application-roles.selectors';

type DialogState = 'edit' | 'confirm-delete';

@Component({
  selector: 'app-edit-role-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FontAwesomeModule],
  templateUrl: './edit-role-dialog.component.html',
  styleUrls: ['./edit-role-dialog.component.scss'],
})
export class EditRoleDialogComponent implements OnInit, OnDestroy, OnChanges {
  @Input() role: IApplicationRoles | null = null;
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();

  // Store observables
  isUpdating$: Observable<boolean>;
  isDeleting$: Observable<boolean>;
  updateError$: Observable<string | null>;
  deleteError$: Observable<string | null>;

  // Dialog state
  dialogState: DialogState = 'edit';

  // Form
  form = this.fb.group({
    roleName: ['', [Validators.required, Validators.maxLength(100)]],
    roleType: [ApplicationRoleType.User as ApplicationRoleType, Validators.required],
    description: ['', Validators.maxLength(500)],
  });

  // Role type options
  roleTypes = [
    { value: ApplicationRoleType.Admin, label: 'Admin', icon: 'user-shield' },
    { value: ApplicationRoleType.User, label: 'User', icon: 'user' },
    { value: ApplicationRoleType.Guest, label: 'Guest', icon: 'user-clock' },
    { value: ApplicationRoleType.Custom, label: 'Custom', icon: 'user-cog' },
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private store: Store
  ) {
    this.isUpdating$ = this.store.select(selectIsUpdating);
    this.isDeleting$ = this.store.select(selectIsDeleting);
    this.updateError$ = this.store.select(selectUpdateError);
    this.deleteError$ = this.store.select(selectDeleteError);
  }

  ngOnInit(): void {
    this.populateForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['role'] && this.role) {
      this.populateForm();
      this.dialogState = 'edit';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private populateForm(): void {
    if (this.role) {
      this.form.patchValue({
        roleName: this.role.roleName || '',
        roleType: this.role.roleType || ApplicationRoleType.User,
        description: this.role.description || '',
      });
    }
  }

  onSave(): void {
    if (this.form.invalid || !this.role) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.value;
    this.store.dispatch(
      ApplicationRolesActions.updateRole({
        input: {
          applicationRoleId: this.role.applicationRoleId,
          roleName: formValue.roleName!,
          roleType: formValue.roleType!,
          description: formValue.description || undefined,
        },
      })
    );
  }

  onDeactivate(): void {
    if (!this.role) return;
    this.store.dispatch(
      ApplicationRolesActions.deactivateRole({
        applicationRoleId: this.role.applicationRoleId,
      })
    );
  }

  onDelete(): void {
    this.dialogState = 'confirm-delete';
  }

  onConfirmDelete(): void {
    if (!this.role) return;
    this.store.dispatch(
      ApplicationRolesActions.deleteRole({
        applicationRoleId: this.role.applicationRoleId,
      })
    );
  }

  onCancelDelete(): void {
    this.dialogState = 'edit';
  }

  onClose(): void {
    this.dialogState = 'edit';
    this.store.dispatch(ApplicationRolesActions.clearErrors());
    this.closed.emit();
  }

  // Computed properties
  get isActive(): boolean {
    return this.role?.status === ApplicationRoleStatus.Active;
  }

  get isInactive(): boolean {
    return this.role?.status === ApplicationRoleStatus.Inactive;
  }

  get canDeactivate(): boolean {
    return this.isActive;
  }

  get statusLabel(): string {
    if (!this.role) return '';
    switch (this.role.status) {
      case ApplicationRoleStatus.Active:
        return 'Active';
      case ApplicationRoleStatus.Inactive:
        return 'Inactive';
      case ApplicationRoleStatus.Pending:
        return 'Pending';
      case ApplicationRoleStatus.Deleted:
        return 'Deleted';
      default:
        return 'Unknown';
    }
  }

  get statusClass(): string {
    if (!this.role) return '';
    switch (this.role.status) {
      case ApplicationRoleStatus.Active:
        return 'active';
      case ApplicationRoleStatus.Inactive:
        return 'inactive';
      case ApplicationRoleStatus.Pending:
        return 'pending';
      case ApplicationRoleStatus.Deleted:
        return 'deleted';
      default:
        return 'unknown';
    }
  }

  // Form field helpers
  get roleNameError(): string | null {
    const control = this.form.get('roleName');
    if (control?.touched && control?.errors) {
      if (control.errors['required']) return 'Role name is required';
      if (control.errors['maxlength']) return 'Role name must be 100 characters or less';
    }
    return null;
  }

  get descriptionError(): string | null {
    const control = this.form.get('description');
    if (control?.touched && control?.errors) {
      if (control.errors['maxlength']) return 'Description must be 500 characters or less';
    }
    return null;
  }
}
