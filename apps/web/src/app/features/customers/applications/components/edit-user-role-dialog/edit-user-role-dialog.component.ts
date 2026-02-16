/**
 * Edit User Role Dialog Component
 *
 * Dialog for changing a user's role for a specific environment.
 * Uses reactive forms with validation and dispatches store actions.
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';

import { IApplicationRoles } from '../../../../../core/models/ApplicationRolesModel';
import { ApplicationUsersActions, RoleUpdate } from '../../store/application-users/application-users.actions';
import {
  selectIsUpdatingRole,
  selectRoleUpdateError,
} from '../../store/application-users/application-users.selectors';

@Component({
  selector: 'app-edit-user-role-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FontAwesomeModule],
  templateUrl: './edit-user-role-dialog.component.html',
  styleUrls: ['./edit-user-role-dialog.component.scss'],
})
export class EditUserRoleDialogComponent implements OnInit, OnDestroy {
  @Input() applicationId!: string;
  @Input() userId!: string;
  @Input() userName = '';
  @Input() environmentId!: string;
  @Input() environmentName = '';
  @Input() currentRoleId = '';
  @Input() availableRoles: IApplicationRoles[] = [];
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  // Store observables
  isUpdatingRole$: Observable<boolean>;
  roleUpdateError$: Observable<string | null>;

  // Form
  form = this.fb.group({
    roleId: ['', Validators.required]
  });

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private store: Store
  ) {
    this.isUpdatingRole$ = this.store.select(selectIsUpdatingRole);
    this.roleUpdateError$ = this.store.select(selectRoleUpdateError);
  }

  ngOnInit(): void {
    // Set current role when dialog opens
    if (this.isOpen && this.currentRoleId) {
      this.form.patchValue({ roleId: this.currentRoleId });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.value;
    const update: RoleUpdate = {
      userId: this.userId,
      environmentId: this.environmentId,
      roleId: formValue.roleId!
    };

    this.store.dispatch(
      ApplicationUsersActions.updateUserRole({
        applicationId: this.applicationId,
        update
      })
    );
  }

  onClose(): void {
    this.resetForm();
    this.store.dispatch(ApplicationUsersActions.clearRoleUpdateError());
    this.closed.emit();
  }

  private resetForm(): void {
    this.form.reset({ roleId: this.currentRoleId });
  }

  // Form field helpers
  get roleIdError(): string | null {
    const control = this.form.get('roleId');
    if (control?.touched && control?.errors) {
      if (control?.errors['required']) return 'Role selection is required';
    }
    return null;
  }

  getRoleName(roleId: string): string {
    const role = this.availableRoles.find(r => r.roleId === roleId);
    return role?.roleName || roleId;
  }
}
