import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {Router} from '@angular/router';
import {Store} from '@ngrx/store';
import {map, Observable, Subject, takeUntil} from 'rxjs';

import {AuthActions} from '../../store/auth.actions';
import {AuthSteps} from '../../store/auth.state';
import * as fromAuth from '../../store/auth.selectors';

@Component({
  selector: 'app-auth-flow',
  templateUrl: './auth-flow.component.html',
  styleUrls: ['./auth-flow.component.scss'],
  standalone: false
})
export class AuthFlowComponent implements OnInit, OnDestroy {
  // Store Selectors
  currentStep$: Observable<AuthSteps> = this.store.select(fromAuth.selectCurrentStep);
  isLoading$ = this.store.select(fromAuth.selectIsLoading);
  error$ = this.store.select(fromAuth.selectError);
  userExists$ = this.store.select(fromAuth.selectUserExists);
  needsMFA$ = this.store.select(fromAuth.selectNeedsMfa);
  mfaType$ = this.store.select(fromAuth.selectMfaType);
  mfaSetupDetails$ = this.store.select(fromAuth.selectMFAPreferences);
  mfaEnabled$ = this.store.select(fromAuth.selectMFAEnabled);
  phoneVerified$ = this.store.select(fromAuth.selectPhoneVerified);
  emailVerified$ = this.store.select(fromAuth.selectEmailVerified);
  debugMode$ = this.store.select(fromAuth.selectDebugMode);

  // UI State
  buttonText$!: Observable<string>;
  stepTitle$!: Observable<string>;

  authForm!: FormGroup;
  authSteps = AuthSteps;
  passwordVisible = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private router: Router
  ) {
    this.initializeForm();
    this.initializeUIState();
  }

  private initializeUIState(): void {
    // Initialize derived observables
    this.buttonText$ = this.deriveButtonText();
    this.stepTitle$ = this.deriveStepTitle();
  }

  private deriveButtonText(): Observable<string> {
    return this.currentStep$.pipe(
      map(step => {
        switch (step) {
          case AuthSteps.EMAIL:
            return 'Next';
          case AuthSteps.PHONE_VERIFY:
          case AuthSteps.EMAIL_VERIFY:
          case AuthSteps.MFA_VERIFY:
            return 'Verify';
          default:
            return 'Submit';
        }
      })
    );
  }

  private deriveStepTitle(): Observable<string> {
    return this.currentStep$.pipe(
      map(step => {
        switch (step) {
          case AuthSteps.EMAIL:
            return 'Sign In or Create Account';
          case AuthSteps.PASSWORD:
            return this.userExists$ ? 'Enter Password' : 'Create Account';
          case AuthSteps.PHONE_SETUP:
            return 'Setup Phone';
          case AuthSteps.MFA_SETUP:
            return 'Set Up Two-Factor Authentication';
          case AuthSteps.EMAIL_VERIFY:
            return 'Submit Email Verification Code';
          case AuthSteps.PHONE_VERIFY:
            return 'Submit Phone Verification Code';
          case AuthSteps.MFA_VERIFY:
            return 'Submit MFA Verification Code';
          default:
            return 'Welcome';
        }
      })
    );
  }

  private initializeForm(): void {
    this.authForm = this.fb.group({
      email: ['', [
        Validators.required,
        Validators.email,
        Validators.pattern(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)
      ]],
      // Make other fields not required initially
      firstName: [''],
      lastName: [''],
      phoneNumber: [''],
      password: [''],
      verificationCode: [''],
      mfaCode: ['']
    });
  }

  private updateValidators(step: AuthSteps): void {
    const emailControl = this.authForm.get('email');
    const passwordControl = this.authForm.get('password');
    const firstNameControl = this.authForm.get('firstName');
    const lastNameControl = this.authForm.get('lastName');
    const phoneNumberControl = this.authForm.get('phoneNumber');

    // Reset all validators first
    emailControl?.clearValidators();
    passwordControl?.clearValidators();
    firstNameControl?.clearValidators();
    lastNameControl?.clearValidators();
    phoneNumberControl?.clearValidators();

    // Set validators based on current step
    switch (step) {
      case AuthSteps.EMAIL:
        emailControl?.setValidators([
          Validators.required,
          Validators.email,
          Validators.pattern(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)
        ]);
        break;
      // Add other cases for different steps
    }

    // Update form validation
    this.authForm.updateValueAndValidity();
  }

  ngOnInit(): void {
    // Redirect if session is active
    this.store.select(fromAuth.selectSessionActive)
      .pipe(takeUntil(this.destroy$))
      .subscribe(active => {
        if (active) {
          this.router.navigate(['/dashboard']);
        }
      });
    this.currentStep$
      .pipe(takeUntil(this.destroy$))
      .subscribe(step => {
        this.updateValidators(step);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    console.debug('Form validity:', this.authForm.valid);
    console.debug('Form errors:', this.authForm.errors);
    console.debug('Email field validity:', this.authForm.get('email')?.valid);
    console.debug('Email field errors:', this.authForm.get('email')?.errors);

    if (!this.authForm.valid) return;

    console.debug('Form submitted', this.authForm.value);
    if (!this.authForm.valid) {
      console.debug('Form invalid:', this.authForm.errors);
      return;
    }

    this.currentStep$
      .pipe(takeUntil(this.destroy$))
      .subscribe(step => {
        console.debug('Current step:', step);
        if (step === AuthSteps.EMAIL) {
          const email = this.authForm.get('email')?.value;
          console.debug('Dispatching checkEmail action with:', email);
          this.store.dispatch(AuthActions.checkEmail({ email }));
        }
      });
  }
  private handleEmailStep(): void {
    const email = this.authForm.get('email')?.value;
    if (email) {
      this.store.dispatch(AuthActions.checkEmail({ email }));
    }
  }

  private handlePasswordStep(): void {
    const formValue = this.authForm.value;
    this.userExists$
      .pipe(takeUntil(this.destroy$))
      .subscribe(exists => {
        if (exists) {
          this.store.dispatch(AuthActions.signin({
            email: formValue.email,
            password: formValue.password
          }));
        } else {
          this.store.dispatch(AuthActions.register({
            email: formValue.email,
            password: formValue.password,
            firstName: formValue.firstName,
            lastName: formValue.lastName
          }));
        }
      });
  }

  private handlePhoneSetupStep(): void {
    const phoneNumber = this.authForm.get('phoneNumber')?.value;
    const verificationCode = this.authForm.get('verificationCode')?.value;

    if (phoneNumber) {
      if (verificationCode) {
        this.store.dispatch(AuthActions.verifyPhoneCode({
          phoneNumber,
          code: verificationCode
        }));
      } else {
        this.store.dispatch(AuthActions.sendPhoneCodeVerification({
          phoneNumber
        }));
      }
    }
  }

  private handlePhoneVerifyStep(): void {
    const phoneNumber = this.authForm.get('phoneNumber')?.value;
    const verificationCode = this.authForm.get('verificationCode')?.value;

    if (phoneNumber && verificationCode) {
      this.store.dispatch(AuthActions.verifyPhoneCode({
        phoneNumber,
        code: verificationCode
      }));
    }
  }

  private handleMFASetupStep(): void {
    this.mfaType$
      .pipe(takeUntil(this.destroy$))
      .subscribe(mfaType => {
        if (mfaType) {
          this.store.dispatch(AuthActions.setupMFA({
            mfaType
          }));
        }
      });
  }

  private handleMFAVerifyStep(): void {
    const code = this.authForm.get('mfaCode')?.value;
    if (code) {
      this.store.dispatch(AuthActions.verifyMFA({ code }));
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.authForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  getErrorMessage(fieldName: string): string {
    const control = this.authForm.get(fieldName);
    if (!control || !control.errors) return '';

    if (control.errors['required']) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
    }
    if (control.errors['email']) {
      return 'Please enter a valid email address';
    }
    if (control.errors['minlength']) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be at least ${control.errors['minlength'].requiredLength} characters`;
    }
    if (control.errors['pattern']) {
      switch (fieldName) {
        case 'password':
          return 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';
        case 'phoneNumber':
          return 'Please enter a valid phone number starting with + and country code';
        case 'verificationCode':
        case 'mfaCode':
          return 'Please enter a valid 6-digit code';
        default:
          return 'Please enter valid input';
      }
    }
    return '';
  }
}
