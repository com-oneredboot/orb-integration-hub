/**
 * Create Role Dialog Component
 *
 * Dialog for creating new application roles.
 * Uses reactive forms with validation and dispatches store actions.
 *
 * @see .kiro/specs/application-roles-management/design.md
 * _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
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

import { ApplicationRoleType } from '../../../../../core/enums/ApplicationRoleTypeEnum';
import { ApplicationRolesActions } from '../../store/application-roles/application-roles.actions';
import {
  selectIsCreating,
  selectCreateError,
} from '../../store/application-roles/application-roles.selectors';

@Component({
  selector: 'app-create-role-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FontAwesomeModule],
  templateUrl: './create-role-dialog.component.html',
  styleUrls: ['./create-role-dialog.component.scss'],
})
export class CreateRoleDialogComponent implements OnInit, OnDestroy {
  @Input() applicationId!: string;
  @Input() organizationId!: string;
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  // Store observables
  isCreating$: Observable<boolean>;
  createError$: Observable<string | null>;

  // Form
  form = this.fb.group({
    roleName: ['', [Validators.required, Validators.maxLength(100)]],
    roleType: [ApplicationRoleType.User, Validators.required],
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
    this.isCreating$ = this.store.select(selectIsCreating);
    this.createError$ = this.store.select(selectCreateError);
  }

  ngOnInit(): void {
    // Reset form when dialog opens
    if (this.isOpen) {
      this.resetForm();
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
    this.store.dispatch(
      ApplicationRolesActions.createRole({
        input: {
          applicationId: this.applicationId,
          organizationId: this.organizationId,
          roleName: formValue.roleName!,
          roleType: formValue.roleType!,
          description: formValue.description || undefined,
        },
      })
    );
  }

  onClose(): void {
    this.resetForm();
    this.store.dispatch(ApplicationRolesActions.clearErrors());
    this.closed.emit();
  }

  private resetForm(): void {
    this.form.reset({
      roleName: '',
      roleType: ApplicationRoleType.User,
      description: '',
    });
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
