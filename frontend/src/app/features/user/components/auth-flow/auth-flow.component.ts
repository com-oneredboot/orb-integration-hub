// file: frontend/src/app/features/user/components/auth-flow/auth-flow.component.ts
// author: Corey Dale Peters
// date: 2022-12-20
// description: This file contains the Angular component that handles the authentication flow

// 3rd Party Imports
import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {Router} from '@angular/router';
import {Store} from '@ngrx/store';
import {map, Observable, Subject, take, takeUntil, tap} from 'rxjs';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { RouterModule } from '@angular/router';

import {v4 as uuidv4} from 'uuid';

// App Imports
import {AuthActions} from './store/auth.actions';
import {AuthState, AuthSteps} from './store/auth.state';
import * as fromAuth from './store/auth.selectors';
import { UsersCreateInput } from "../../../../core/models/UsersModel";
import {QRCodeToDataURLOptions} from "qrcode";
import {UserService} from "../../../../core/services/user.service";
import {CognitoService} from "../../../../core/services/cognito.service";
import { UserStatus } from "../../../../core/models/UserStatusEnum";
import { UserGroup } from "../../../../core/models/UserGroupEnum";


@Component({
  selector: 'app-auth-flow',
  templateUrl: './auth-flow.component.html',
  styleUrls: ['./auth-flow.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FontAwesomeModule,
    RouterModule
    // Add any shared components, directives, or pipes used in the template here
  ]
})
export class AuthFlowComponent implements OnInit, OnDestroy {

  // Store Selectors
  currentStep$: Observable<AuthSteps> = this.store.select(fromAuth.selectCurrentStep);
  currentUser$: Observable<any> = this.store.select(fromAuth.selectCurrentUser);
  isLoading$ = this.store.select(fromAuth.selectIsLoading);
  error$ = this.store.select(fromAuth.selectError);
  userExists$ = this.store.select(fromAuth.selectUserExists);
  needsMFA$ = this.store.select(fromAuth.selectNeedsMfa);
  mfaSetupDetails$ = this.store.select(fromAuth.selectMFADetails);
  phoneVerified$ = this.store.select(fromAuth.selectPhoneVerified);
  emailVerified$ = this.store.select(fromAuth.selectEmailVerified);
  debugMode$ = this.store.select(fromAuth.selectDebugMode);

  // UI State
  buttonText$!: Observable<string>;
  stepTitle$!: Observable<string>;

  authForm!: FormGroup;
  authSteps = AuthSteps;
  passwordVisible = false;
  qrCodeDataUrl: string | null = null;

  private destroy$ = new Subject<void>();

  passwordValidations = {
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecial: false
  };

  constructor(
    private fb: FormBuilder,
    private store: Store<{ auth: AuthState }>,
    private router: Router,
    private userService: UserService,
    private cognitoService: CognitoService
  ) {
    console.debug('AuthFlowComponent constructor');

    // Initialize the form
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
      emailCode: [''],
      mfaCode: [''],
      phoneCode: ['']
    });

    this.initializeForm();
    this.initializeUIState();
  }

  ngOnInit(): void {
    // Check for existing authentication session first
    this.checkExistingSession();
    
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
        if (step !== AuthSteps.COMPLETE) return;
        
        // If we reached the COMPLETE step, check if the user is valid
        // If all attributes are present, go to dashboard
        // Otherwise, go to profile page to complete required fields
        this.handleAuthComplete();
      });

    // current user
    this.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        console.debug('current user:', user);
      });

    this.mfaSetupDetails$
      .pipe(takeUntil(this.destroy$))
      .subscribe(async details => {
        // No need to define issuer here as it's now set in the CognitoService
        const QRCode = (await import('qrcode')).default;
        if (!details?.secretKey || !details?.qrCode) {
          return;
        }
        const qrUrl = details.setupUri?.toString() || '';
        const options = {
          width: 200,
          margin: 2,
          errorCorrectionLevel: 'M'
        } as QRCodeToDataURLOptions
        this.qrCodeDataUrl = await QRCode.toDataURL(qrUrl, options);
      });

    this.debugMode$.pipe().subscribe(debug => {
      console.debug('debugMode:', debug);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {

    // Logging
    console.debug('[onSubmit] called');
    if (!this.authForm.valid) {
      console.debug('[onSubmit] Form invalid:', this.authForm.errors);
      return;
    }

    // Form Submitted
    console.debug('[onSubmit] Form submitted', this.authForm.value);
    this.currentStep$
      .pipe(
        take(1),
        tap(step => console.debug('[onSubmit] Processing step:', step, 'Type:', typeof step, 'Enum:', this.authSteps[step])),
        takeUntil(this.destroy$))
      .subscribe(step => {
        const email = this.authForm.get('email')?.value;
        const password = this.authForm.get('password')?.value;
        const emailCode = this.authForm.get('emailCode')?.value;
        const mfaCode = this.authForm.get('mfaCode')?.value;
        console.debug('[onSubmit] Step processing values:', {
          step,
          stepName: this.authSteps[step],
          email,
          hasPassword: !!password,
          hasEmailCode: !!emailCode,
          hasMfaCode: !!mfaCode
        });
        switch (step) {
          case AuthSteps.EMAIL:
            console.debug('[onSubmit] Dispatching checkEmail action:', { email });
            this.store.dispatch(AuthActions.checkEmail({ email }));
            break;

          case AuthSteps.PASSWORD:
            if (!password) {
              console.error('[onSubmit] PASSWORD: password missing');
              return;
            }
            console.debug('[onSubmit] Dispatching verifyCognitoPassword:', { email, password });
            this.store.dispatch(AuthActions.verifyCognitoPassword({ email, password }));
            break;

          case AuthSteps.PASSWORD_SETUP:
            const userInput = {
              userId: uuidv4(),
              cognitoId: uuidv4(),
              email: this.authForm.value.email,
              firstName: this.authForm.value.firstName,
              lastName: this.authForm.value.lastName,
              phoneNumber: this.authForm.value.phoneNumber,
              groups: [UserGroup.USER],
              status: UserStatus.PENDING,
              createdAt: new Date().toISOString(),
              phoneVerified: false,
              emailVerified: false,
              updatedAt: new Date().toISOString()
            };
            if (!password) {
              console.error('[onSubmit] PASSWORD_SETUP: password missing');
              return;
            }
            console.debug('[onSubmit] Dispatching createUser:', { userInput, password });
            this.store.dispatch(AuthActions.createUser({input: userInput, password: password } ));
            break;

          case AuthSteps.EMAIL_VERIFY:
            if (!emailCode) {
              console.error('[onSubmit] EMAIL_VERIFY: emailCode missing');
              return;
            }
            console.debug('[onSubmit] Dispatching verifyEmail:', { email, emailCode });
            this.store.dispatch(AuthActions.verifyEmail({
              code: emailCode,
              email: email
            }));
            break;

          case AuthSteps.SIGNIN:
            if (!password) {
              console.error('[onSubmit] SIGNIN: password missing');
              return;
            }
            if (!email) {
              console.error('[onSubmit] SIGNIN: email missing');
              return;
            }

            console.debug('[onSubmit] Dispatching signIn:', { email, password });
            this.store.dispatch(AuthActions.signIn({
              email,
              password
            }));
            break;

          case AuthSteps.PHONE_SETUP:
            const setupPhoneNumber = this.authForm.get('phoneNumber')?.value;
            if (!setupPhoneNumber) {
              console.error('[onSubmit] PHONE_SETUP: phoneNumber missing');
              return;
            }
            console.debug('[onSubmit] Dispatching setupPhone:', { setupPhoneNumber });
            this.store.dispatch(AuthActions.setupPhone({ phoneNumber: setupPhoneNumber }));
            break;

          case AuthSteps.PHONE_VERIFY:
            const phoneCode = this.authForm.get('phoneCode')?.value;
            if (!phoneCode) {
              console.error('[onSubmit] PHONE_VERIFY: phoneCode missing');
              return;
            }
            console.debug('[onSubmit] Dispatching verifyPhone:', { phoneCode });
            this.store.dispatch(AuthActions.verifyPhone({ code: phoneCode }));
            break;

          case AuthSteps.MFA_SETUP:
            console.debug('[onSubmit] Dispatching needsMFASetup');
            this.store.dispatch(AuthActions.needsMFASetup());
            break;

          case AuthSteps.MFA_VERIFY:
            if(!mfaCode) {
              console.error('[onSubmit] MFA_VERIFY: mfaCode missing');
              return;
            }
            console.debug('[onSubmit] Dispatching needsMFA:', { mfaCode });
            this.store.dispatch(AuthActions.needsMFA( {code: mfaCode, rememberDevice: false}));
            break;

          default:
            console.error('[onSubmit] Unhandled step:', step, this.authSteps[step]);
        }
      });
  }

  checkPasswordValidations(password: string): void {
    this.passwordValidations = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecial: /[!@#$%^&*]/.test(password)
    };
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
    if (fieldName === 'password') {
      return this.getPasswordErrorMessage(control.errors);
    }
    return '';
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

    this.authForm.get('password')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(password => {
        if (password) {
          this.checkPasswordValidations(password);
        } else {
          this.resetPasswordValidations();
        }
      });
  }

  private updateValidators(step: AuthSteps): void {
    const emailControl = this.authForm.get('email');
    const passwordControl = this.authForm.get('password');
    const firstNameControl = this.authForm.get('firstName');
    const lastNameControl = this.authForm.get('lastName');
    const phoneNumberControl = this.authForm.get('phoneNumber');
    const phoneCodeControl = this.authForm.get('phoneCode');

    // Reset all validators first
    emailControl?.clearValidators();
    passwordControl?.clearValidators();
    firstNameControl?.clearValidators();
    lastNameControl?.clearValidators();
    phoneNumberControl?.clearValidators();
    phoneCodeControl?.clearValidators();

    // Set validators based on current step
    switch (step) {
      case AuthSteps.EMAIL:
        emailControl?.setValidators([
          Validators.required,
          Validators.email,
          Validators.pattern(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)
        ]);
        break;
      case AuthSteps.PASSWORD_SETUP:
        passwordControl?.setValidators([
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[-_!@#$%^&*])[A-Za-z\d\-_!@#$%^&*]{8,}$/)
        ]);
        break;
      case AuthSteps.PHONE_SETUP:
        phoneNumberControl?.setValidators([
          Validators.required,
          Validators.pattern(/^\+?[1-9]\d{1,14}$/) // E.164 format validation
        ]);
        break;
      case AuthSteps.PHONE_VERIFY:
        phoneCodeControl?.setValidators([
          Validators.required,
          Validators.pattern(/^\d{6}$/) // 6-digit code
        ]);
        break;
    }

    // Update form validation
    this.authForm.updateValueAndValidity();
  }

  private getPasswordErrorMessage(errors: any): string {
    if (errors?.pattern) {
      const missing = [];
      if (!this.passwordValidations.hasUppercase) missing.push('uppercase letter');
      if (!this.passwordValidations.hasLowercase) missing.push('lowercase letter');
      // etc...
      return `Password must include: ${missing.join(', ')}`;
    }
    return '';
  }

  private resetPasswordValidations(): void {
    this.passwordValidations = {
      minLength: false,
      hasUppercase: false,
      hasLowercase: false,
      hasNumber: false,
      hasSpecial: false
    };
  }
  
  /**
   * Handle the authentication complete step
   * If user has all required attributes, redirect to dashboard
   * Otherwise, redirect to profile page to complete required info
   */
  private handleAuthComplete(): void {
    console.debug('Handling auth complete');
    
    this.currentUser$
      .pipe(take(1))
      .subscribe(user => {
        if (!user) {
          console.warn('No user found, redirecting to profile');
          this.router.navigate(['/profile']);
          return;
        }
        
        // Check if phone verification is needed
        if (!user.phoneNumber) {
          console.debug('User is missing phone number, redirecting to phone setup');
          // Update the current step to phone setup
          this.store.dispatch(AuthActions.checkPhoneRequired());
          return;
        }
        
        // Step 7: Check if user has all required attributes
        const isValid = this.userService.isUserValid(user);
        console.debug('User validation:', { isValid, user });
        
        if (isValid) {
          // User is valid (has all required attributes), go to dashboard
          console.debug('User is valid, redirecting to dashboard');
          this.router.navigate(['/dashboard']);
        } else {
          // User is missing required attributes, go to profile
          console.debug('User is missing required attributes, redirecting to profile');
          this.router.navigate(['/profile']);
        }
      });
  }
  
  /**
   * Public method to check if a user is valid for templates
   * @param user The user to check
   * @returns True if the user has all required attributes, false otherwise
   */
  public isUserValid(user: any): boolean {
    return this.userService.isUserValid(user);
  }
  
  /**
   * Resend the verification code to the user's phone
   */
  public resendVerificationCode(): void {
    // Get the phone number from the form
    const phoneNumber = this.authForm.get('phoneNumber')?.value;
    
    if (!phoneNumber) {
      // We need to get the phone number from the current user
      this.currentUser$
        .pipe(take(1))
        .subscribe(user => {
          if (user?.phoneNumber) {
            this.store.dispatch(AuthActions.setupPhone({ phoneNumber: user.phoneNumber }));
          } else {
            // Display error
            this.store.dispatch(AuthActions.setupPhoneFailure({
              error: 'No phone number found. Please go back and enter your phone number.'
            }));
          }
        });
    } else {
      // Use the phone number from the form
      this.store.dispatch(AuthActions.setupPhone({ phoneNumber }));
    }
  }

  /**
   * Check for existing authentication session on component initialization
   * If user is already authenticated, redirect to dashboard
   */
  private async checkExistingSession(): Promise<void> {
    try {
      console.debug('[checkExistingSession] Checking for existing authentication session');
      
      const isAuthenticated = await this.cognitoService.checkIsAuthenticated();
      
      if (isAuthenticated) {
        console.debug('[checkExistingSession] User is already authenticated, getting profile');
        
        const profile = await this.cognitoService.getCognitoProfile();
        
        if (profile) {
          console.debug('[checkExistingSession] User profile found, redirecting to dashboard', profile);
          
          // User is authenticated and has a valid session, redirect to dashboard
          this.router.navigate(['/dashboard']);
          return;
        }
      }
      
      console.debug('[checkExistingSession] No existing session found, proceeding with auth flow');
    } catch (error) {
      console.debug('[checkExistingSession] Error checking existing session:', error);
      // If there's an error checking the session, proceed with normal auth flow
    }
  }

}
