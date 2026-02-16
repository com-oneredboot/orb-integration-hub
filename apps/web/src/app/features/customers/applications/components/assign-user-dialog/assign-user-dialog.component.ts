/**
 * Assign User Dialog Component
 *
 * Dialog for assigning users to an application with initial role selections.
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
import { ReactiveFormsModule, FormBuilder, Validators, FormArray, FormGroup } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';

import { IUsers } from '../../../../../core/models/UsersModel';
import { IEnvironments } from '../../../../../core/models/EnvironmentsModel';
import { IApplicationRoles } from '../../../../../core/models/ApplicationRolesModel';
import { ApplicationUsersActions, UserAssignment } from '../../store/application-users/application-users.actions';
import {
  selectIsAssigning,
  selectAssignError,
} from '../../store/application-users/application-users.selectors';

@Component({
  selector: 'app-assign-user-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FontAwesomeModule],
  templateUrl: './assign-user-dialog.component.html',
  styleUrls: ['./assign-user-dialog.component.scss'],
})
export class AssignUserDialogComponent implements OnInit, OnDestroy {
  @Input() applicationId!: string;
  @Input() environments: IEnvironments[] = [];
  @Input() availableUsers: IUsers[] = [];
  @Input() availableRoles: IApplicationRoles[] = [];
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();
  @Output() assigned = new EventEmitter<void>();

  // Store observables
  isAssigning$: Observable<boolean>;
  assignError$: Observable<string | null>;

  // Form
  form = this.fb.group({
    userId: ['', Validators.required],
    environmentRoles: this.fb.array([])
  });

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private store: Store
  ) {
    this.isAssigning$ = this.store.select(selectIsAssigning);
    this.assignError$ = this.store.select(selectAssignError);
  }

  ngOnInit(): void {
    // Reset form when dialog opens
    if (this.isOpen) {
      this.resetForm();
      this.initializeEnvironmentRoles();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get environmentRoles(): FormArray {
    return this.form.get('environmentRoles') as FormArray;
  }

  private initializeEnvironmentRoles(): void {
    // Clear existing
    while (this.environmentRoles.length) {
      this.environmentRoles.removeAt(0);
    }

    // Add a form group for each environment
    this.environments.forEach(env => {
      this.environmentRoles.push(
        this.fb.group({
          environmentId: [env.environmentId],
          environmentName: [env.name],
          roleId: ['', Validators.required]
        })
      );
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.value;
    const assignment: UserAssignment = {
      userId: formValue.userId!,
      environmentRoles: (formValue.environmentRoles || [])
        .filter((er: any) => er.roleId) // Only include environments with roles selected
        .map((er: any) => ({
          environmentId: er.environmentId,
          roleId: er.roleId
        }))
    };

    this.store.dispatch(
      ApplicationUsersActions.assignUserToApplication({
        applicationId: this.applicationId,
        assignment
      })
    );
  }

  onClose(): void {
    this.resetForm();
    this.store.dispatch(ApplicationUsersActions.clearAssignError());
    this.closed.emit();
  }

  private resetForm(): void {
    this.form.reset({
      userId: '',
      environmentRoles: []
    });
  }

  // Form field helpers
  get userIdError(): string | null {
    const control = this.form.get('userId');
    if (control?.touched && control?.errors) {
      if (control.errors['required']) return 'User selection is required';
    }
    return null;
  }

  getUserFullName(user: IUsers): string {
    return `${user.firstName} ${user.lastName}`;
  }

  getRolesForEnvironment(environmentId: string): IApplicationRoles[] {
    // In a real implementation, roles might be filtered by environment
    // For now, return all available roles
    return this.availableRoles;
  }
}
