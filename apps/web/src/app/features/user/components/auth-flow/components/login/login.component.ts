// file: apps/web/src/app/features/user/components/auth-flow/components/login/login.component.ts
// author: Corey Dale Peters
// date: 2025-03-07
// description: Login component for the authentication flow

// 3rd Party Imports
import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';

// App Imports
import { AuthActions } from '../.../../store/user.actions';
import { AuthState } from '../.../../store/user.state';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class LoginComponent implements OnInit {
  @Input() error: string | null = null;
  @Input() isLoading = false;

  loginForm!: FormGroup;
  forgotPassword = false;

  constructor(
    private fb: FormBuilder,
    private store: Store<{ auth: AuthState }>
  ) { }

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [
        Validators.required,
        Validators.email,
        Validators.pattern(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)
      ]]
    });
  }

  onSubmit(): void {
    if (!this.loginForm.valid) {
      return;
    }

    const email = this.loginForm.get('email')?.value;

    if (this.forgotPassword) {
      this.store.dispatch(AuthActions.initiatePasswordReset({ email }));
    } else {
      this.store.dispatch(AuthActions.checkEmail({ email }));
    }
  }

  toggleForgotPassword(): void {
    this.forgotPassword = !this.forgotPassword;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  getErrorMessage(fieldName: string): string {
    const control = this.loginForm.get(fieldName);
    if (!control || !control.errors) return '';

    if (control.errors['required']) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
    }
    if (control.errors['email'] || control.errors['pattern']) {
      return 'Please enter a valid email address';
    }
    return '';
  }
}