// auth-flow.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthActions } from '../../store/auth.actions';
import * as fromAuth from '../../store/auth.selectors';
import { User, UserGroup } from '../../../../core/models/user.model';
import { AuthStep } from '../../store/auth.state';
import { v4 as uuidv4 } from 'uuid';


@Component({
  selector: 'app-auth-flow',
  templateUrl: './auth-flow.component.html',
  styleUrls: ['./auth-flow.component.scss']
})
export class AuthFlowComponent implements OnInit, OnDestroy {
  currentStep$ = this.store.select(fromAuth.selectCurrentStep);
  isLoading$ = this.store.select(fromAuth.selectIsLoading);
  error$ = this.store.select(fromAuth.selectAuthError);
  userExists$ = this.store.select(fromAuth.selectUserExists);
  needsMFA$ = this.store.select(fromAuth.selectNeedsMFA);
  mfaType$ = this.store.select(fromAuth.selectMFAType);
  mfaSetupDetails$ = this.store.select(fromAuth.selectMFASetupDetails);
  phoneVerificationId$ = this.store.select(fromAuth.selectPhoneVerificationId);

  authForm!: FormGroup;
  passwordVisible = false;
  AuthStep = AuthStep;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private router: Router
  ) {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.authForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      firstName: ['', [Validators.required, Validators.pattern(/^[a-zA-Z]+$/)]],
      lastName: ['', [Validators.required, Validators.pattern(/^[a-zA-Z]+$/)]],
      phoneNumber: ['', [
        Validators.required,
        Validators.pattern(/^\+[1-9]\d{1,14}$/)
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
      ]],
      verificationCode: ['', [Validators.pattern(/^\d{6}$/)]],
      mfaCode: ['', [Validators.pattern(/^\d{6}$/)]]
    });
  }

  ngOnInit(): void {
    // Check authentication store
    this.store.select(fromAuth.selectIsAuthenticated)
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAuth => {
        if (isAuth) {
          this.router.navigate(['/dashboard']);
        }
      });

    // Start with email step
    this.store.dispatch(AuthActions.resetAuthState());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async onSubmit(): Promise<void> {
    if (!this.authForm.valid) return;

    let currentStep: string;
    this.currentStep$.pipe(takeUntil(this.destroy$))
      .subscribe(step => currentStep = step);

    switch (currentStep) {
      case 'email':
        this.store.dispatch(AuthActions.checkEmail({
          email: this.authForm.get('email')?.value
        }));
        break;

      case 'password':
        let userExists: boolean;
        this.userExists$.pipe(takeUntil(this.destroy$))
          .subscribe(exists => userExists = exists);

        if (userExists) {
          this.store.dispatch(AuthActions.signIn({
            email: this.authForm.get('email')?.value,
            password: this.authForm.get('password')?.value
          }));
        } else {
          const newUser = {
            cognito_id: uuidv4(),
            email: this.authForm.get('email')?.value,
            first_name: this.authForm.get('firstName')?.value,
            last_name: this.authForm.get('lastName')?.value,
            phone_number: this.authForm.get('phoneNumber')?.value,
            groups: [UserGroup.USER],
            status: 'PENDING'
          } as User;

          this.store.dispatch(AuthActions.signUp({
            user: newUser,
            password: this.authForm.get('password')?.value
          }));
        }
        break;

      case 'phone':
        let verificationId: string | null;
        this.phoneVerificationId$.pipe(takeUntil(this.destroy$))
          .subscribe(id => verificationId = id);

        if (!verificationId) {
          this.store.dispatch(AuthActions.sendPhoneCode({
            phoneNumber: this.authForm.get('phoneNumber')?.value
          }));
        } else {
          this.store.dispatch(AuthActions.verifyPhone({
            code: this.authForm.get('verificationCode')?.value,
            verificationId
          }));
        }
        break;

      case 'mfa_setup':
        let mfaType: 'sms' | 'totp' | null;
        this.mfaType$.pipe(takeUntil(this.destroy$))
          .subscribe(type => mfaType = type);

        this.store.dispatch(AuthActions.setupMFA({
          type: mfaType || 'totp'
        }));
        break;

      case 'mfa_verify':
        this.store.dispatch(AuthActions.verifyMFA({
          code: this.authForm.get('mfaCode')?.value,
          rememberDevice: false
        }));
        break;
    }
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  getStepTitle(step: string): string {
    switch (step) {
      case 'email':
        return 'Sign In or Create Account';
      case 'password':
        return this.userExists$ ? 'Welcome Back' : 'Create Account';
      case 'phone':
        return 'Verify Your Phone';
      case 'mfa_setup':
        return 'Set Up Two-Factor Authentication';
      case 'mfa_verify':
        return 'Verify Identity';
      case 'complete':
        return 'Success';
      default:
        return 'Welcome';
    }
  }
}
