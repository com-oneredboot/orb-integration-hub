// file: apps/web/src/app/features/user/components/auth-flow/components/password/password.component.ts
// author: Corey Dale Peters
// date: 2025-03-07
// description: Password component for the authentication flow

// 3rd Party Imports
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable, Subject, takeUntil } from 'rxjs';

// App Imports
import { AuthActions } from '../.../../store/user.actions';
import { AuthState } from '../.../../store/user.state';
import * as fromAuth from '../.../../store/user.selectors';

@Component({
  selector: 'app-password',
  templateUrl: './password.component.html',
  styleUrls: ['./password.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class PasswordComponent implements OnInit, OnDestroy {
  @Input() error: string | null = null;
  @Input() isLoading = false;

  passwordForm!: FormGroup;
  passwordVisible = false;
  userExists$: Observable<boolean>;
  email$: Observable<string>;

  passwordValidations = {
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecial: false
  };

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private store: Store<{ auth: AuthState }>
  ) {
    this.userExists$ = this.store.select(fromAuth.selectUserExists);
    this.email$ = this.store.select(fromAuth.selectCurrentEmail);
  }

  ngOnInit(): void {
    this.passwordForm = this.fb.group({
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[-_!@#$%^&*])[A-Za-z\d\-_!@#$%^&*]{8,}$/)
      ]]
    });

    // Monitor password for validation
    this.passwordForm.get('password')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(password => {
        if (password) {
          this.checkPasswordValidations(password);
        } else {
          this.resetPasswordValidations();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (!this.passwordForm.valid) {
      return;
    }

    const password = this.passwordForm.get('password')?.value;
    
    this.email$.pipe(takeUntil(this.destroy$)).subscribe(email => {
      if (!email) {
        console.error('No email found in state');
        return;
      }
      
      this.userExists$.pipe(takeUntil(this.destroy$)).subscribe(userExists => {
        if (userExists) {
          // Existing user
          this.store.dispatch(AuthActions.verifyCognitoPassword({ email, password }));
        } else {
          // New user, setup password
          this.store.dispatch(AuthActions.setupPassword({ password }));
        }
      });
    });
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.passwordForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  getErrorMessage(fieldName: string): string {
    const control = this.passwordForm.get(fieldName);
    if (!control || !control.errors) return '';

    if (control.errors['required']) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
    }
    if (control.errors['minlength']) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be at least ${control.errors['minlength'].requiredLength} characters`;
    }
    if (control.errors['pattern']) {
      return 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';
    }
    return '';
  }

  checkPasswordValidations(password: string): void {
    this.passwordValidations = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecial: /[-_!@#$%^&*]/.test(password)
    };
  }

  resetPasswordValidations(): void {
    this.passwordValidations = {
      minLength: false,
      hasUppercase: false,
      hasLowercase: false,
      hasNumber: false,
      hasSpecial: false
    };
  }
}