// file: frontend/src/app/features/user/components/auth-flow/auth-flow.component.ts
// author: Corey Dale Peters
// date: 2022-12-20
// description: This file contains the Angular component that handles the authentication flow

// 3rd Party Imports
import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
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
import {InputValidationService} from "../../../../core/services/input-validation.service";
import {CustomValidators} from "../../../../core/validators/custom-validators";
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
    private route: ActivatedRoute,
    private userService: UserService,
    private cognitoService: CognitoService,
    private inputValidationService: InputValidationService
  ) {

    // Initialize the form with enhanced validation
    this.authForm = this.fb.group({
      email: ['', [
        Validators.required,
        CustomValidators.email(),
        CustomValidators.noDisposableEmail(),
        CustomValidators.noXSS()
      ]],
      // Make other fields not required initially
      firstName: ['', [
        CustomValidators.validateName('First name'),
        CustomValidators.noXSS()
      ]],
      lastName: ['', [
        CustomValidators.validateName('Last name'),
        CustomValidators.noXSS()
      ]],
      phoneNumber: ['', [
        CustomValidators.phoneNumber(),
        CustomValidators.noXSS()
      ]],
      password: ['', [
        CustomValidators.password(),
        CustomValidators.noXSS()
      ]],
      emailCode: ['', [
        CustomValidators.verificationCode(),
        CustomValidators.noXSS()
      ]],
      mfaCode: ['', [
        CustomValidators.verificationCode(),
        CustomValidators.noXSS()
      ]],
      phoneCode: ['', [
        CustomValidators.verificationCode(),
        CustomValidators.noXSS()
      ]]
    });

    this.initializeForm();
    this.initializeUIState();
  }

  ngOnInit(): void {
    // Always check existing session to load user data, but don't redirect
    this.loadUserSessionAndDetermineStep();
    
    // Handle unauthenticated users
    this.store.select(fromAuth.selectSessionActive)
      .pipe(takeUntil(this.destroy$))
      .subscribe(active => {
        if (!active) {
          // User is not authenticated, start from email step
          this.store.dispatch(AuthActions.setCurrentStep({ step: AuthSteps.EMAIL }));
        }
      });
    
    // Pure component - only update form validators when step changes
    this.currentStep$
      .pipe(takeUntil(this.destroy$))
      .subscribe(step => {
        console.log('[AuthFlow] Current step changed to:', step, 'AuthSteps.COMPLETE:', AuthSteps.COMPLETE);
        this.updateValidators(step);
        // Focus management and announcements for accessibility
        this.focusCurrentStepInput(step);
        this.announceStepChange(step);
        // Note: Redirects are handled by auth.effects.ts, not components
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

  }


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (!this.authForm.valid) {
      return;
    }

    this.currentStep$
      .pipe(
        take(1),
        takeUntil(this.destroy$))
      .subscribe(step => {
        const email = this.authForm.get('email')?.value;
        const password = this.authForm.get('password')?.value;
        const emailCode = this.authForm.get('emailCode')?.value;
        const mfaCode = this.authForm.get('mfaCode')?.value;
        switch (step) {
          case AuthSteps.EMAIL:
            this.store.dispatch(AuthActions.checkEmail({ email }));
            break;

          case AuthSteps.PASSWORD:
            if (!password) {
              return;
            }
            this.store.dispatch(AuthActions.verifyCognitoPassword({ email, password }));
            break;

          case AuthSteps.PASSWORD_SETUP:
            const userInput = {
              userId: uuidv4(),
              cognitoId: uuidv4(),
              cognitoSub: '', // Will be populated by user service with actual Cognito sub
              email: this.authForm.value.email,
              firstName: this.authForm.value.firstName,
              lastName: this.authForm.value.lastName,
              phoneNumber: this.authForm.value.phoneNumber,
              groups: [UserGroup.USER],
              status: UserStatus.PENDING,
              createdAt: new Date().toISOString(),
              phoneVerified: false,
              emailVerified: false,
              mfaEnabled: false,
              mfaSetupComplete: false,
              updatedAt: new Date().toISOString()
            };
            if (!password) {
              return;
            }
            this.store.dispatch(AuthActions.createUser({input: userInput, password: password } ));
            break;

          case AuthSteps.EMAIL_VERIFY:
            if (!emailCode) {
              return;
            }
            this.store.dispatch(AuthActions.verifyEmail({
              code: emailCode,
              email: email
            }));
            break;

          case AuthSteps.SIGNIN:
            if (!password) {
              return;
            }
            if (!email) {
              return;
            }
            this.store.dispatch(AuthActions.signIn({
              email,
              password
            }));
            break;

          case AuthSteps.PHONE_SETUP:
            const setupPhoneNumber = this.authForm.get('phoneNumber')?.value;
            if (!setupPhoneNumber) {
              return;
            }
            this.store.dispatch(AuthActions.setupPhone({ phoneNumber: setupPhoneNumber }));
            break;

          case AuthSteps.PHONE_VERIFY:
            const phoneCode = this.authForm.get('phoneCode')?.value;
            if (!phoneCode) {
              return;
            }
            this.store.dispatch(AuthActions.verifyPhone({ code: phoneCode }));
            break;

          case AuthSteps.MFA_SETUP:
            // First check Cognito MFA status to see if user record needs updating
            this.store.dispatch(AuthActions.checkMFAStatus());
            break;

          case AuthSteps.MFA_VERIFY:
            if(!mfaCode) {
              return;
            }
            this.store.dispatch(AuthActions.needsMFA( {code: mfaCode, rememberDevice: false}));
            break;

          default:
            break;
        }
      });
  }

  checkPasswordValidations(password: string): void {
    // Use the enhanced validation service for password checking
    const validation = this.inputValidationService.validatePassword(password);
    
    this.passwordValidations = {
      minLength: validation.criteria.minLength,
      hasUppercase: validation.criteria.hasUppercase,
      hasLowercase: validation.criteria.hasLowercase,
      hasNumber: validation.criteria.hasNumber,
      hasSpecial: validation.criteria.hasSpecial
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

    // Handle custom validator errors first
    const errors = control.errors;

    // Custom validator error messages
    if (errors['email']?.message) {
      return errors['email'].message;
    }
    if (errors['disposableEmail']?.message) {
      return errors['disposableEmail'].message;
    }
    if (errors['phoneNumber']?.message) {
      return errors['phoneNumber'].message;
    }
    if (errors['verificationCode']?.message) {
      return errors['verificationCode'].message;
    }
    if (errors['name']?.message) {
      return errors['name'].message;
    }
    if (errors['password']?.message) {
      return errors['password'].message;
    }
    if (errors['xss']?.message) {
      return errors['xss'].message;
    }
    if (errors['customLength']?.message) {
      return errors['customLength'].message;
    }
    if (errors['whitespace']?.message) {
      return errors['whitespace'].message;
    }
    if (errors['invalidDomain']?.message) {
      return errors['invalidDomain'].message;
    }

    // Fallback to legacy error handling
    if (errors['required']) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
    }
    if (errors['email']) {
      return 'Please enter a valid email address';
    }
    if (errors['minlength']) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be at least ${errors['minlength'].requiredLength} characters`;
    }
    if (errors['pattern']) {
      switch (fieldName) {
        case 'password':
          return 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';
        case 'phoneNumber':
          return 'Please enter a valid phone number starting with + and country code';
        case 'verificationCode':
        case 'mfaCode':
        case 'phoneCode':
        case 'emailCode':
          return 'Please enter a valid 6-digit code';
        default:
          return 'Please enter valid input';
      }
    }

    // Enhanced password validation
    if (fieldName === 'password' && errors) {
      return this.getPasswordErrorMessage(errors);
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
    const emailCodeControl = this.authForm.get('emailCode');
    const mfaCodeControl = this.authForm.get('mfaCode');

    // Reset all validators first
    emailControl?.clearValidators();
    passwordControl?.clearValidators();
    firstNameControl?.clearValidators();
    lastNameControl?.clearValidators();
    phoneNumberControl?.clearValidators();
    phoneCodeControl?.clearValidators();
    emailCodeControl?.clearValidators();
    mfaCodeControl?.clearValidators();

    // Set validators based on current step with enhanced validation
    switch (step) {
      case AuthSteps.EMAIL:
        emailControl?.setValidators([
          Validators.required,
          CustomValidators.email(),
          CustomValidators.noDisposableEmail(),
          CustomValidators.noXSS()
        ]);
        break;
      case AuthSteps.PASSWORD:
        passwordControl?.setValidators([
          Validators.required,
          CustomValidators.noXSS()
        ]);
        break;
      case AuthSteps.PASSWORD_SETUP:
        passwordControl?.setValidators([
          Validators.required,
          CustomValidators.password(),
          CustomValidators.noXSS()
        ]);
        firstNameControl?.setValidators([
          Validators.required,
          CustomValidators.validateName('First name'),
          CustomValidators.noXSS()
        ]);
        lastNameControl?.setValidators([
          Validators.required,
          CustomValidators.validateName('Last name'),
          CustomValidators.noXSS()
        ]);
        break;
      case AuthSteps.PHONE_SETUP:
        phoneNumberControl?.setValidators([
          Validators.required,
          CustomValidators.phoneNumber(),
          CustomValidators.noXSS()
        ]);
        break;
      case AuthSteps.PHONE_VERIFY:
        phoneCodeControl?.setValidators([
          Validators.required,
          CustomValidators.verificationCode(),
          CustomValidators.noXSS()
        ]);
        break;
      case AuthSteps.EMAIL_VERIFY:
        emailCodeControl?.setValidators([
          Validators.required,
          CustomValidators.verificationCode(),
          CustomValidators.noXSS()
        ]);
        break;
      case AuthSteps.MFA_VERIFY:
        mfaCodeControl?.setValidators([
          Validators.required,
          CustomValidators.verificationCode(),
          CustomValidators.noXSS()
        ]);
        break;
      case AuthSteps.MFA_SETUP:
        // For MFA setup, no specific field validation needed initially
        // User just needs to click submit to initiate setup
        // Clear all validators so form is valid
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
   * Get current step number for accessibility (5-step consolidated flow)
   */
  getCurrentStepNumber(currentStep: AuthSteps | null): number {
    if (!currentStep) return 1;
    
    const step = currentStep as AuthSteps;
    
    if (step === AuthSteps.EMAIL || step === AuthSteps.EMAIL_VERIFY) {
      return 1; // "Email Verification"
    }
    if (step === AuthSteps.PASSWORD || step === AuthSteps.PASSWORD_SETUP || step === AuthSteps.NAME_SETUP || step === AuthSteps.SIGNIN) {
      return 2; // "Password & Account Details"
    }
    if (step === AuthSteps.PHONE_SETUP || step === AuthSteps.PHONE_VERIFY) {
      return 3; // "Phone Verification"
    }
    if (step === AuthSteps.MFA_SETUP || step === AuthSteps.MFA_VERIFY) {
      return 4; // "Two-Factor Authentication"
    }
    if (step === AuthSteps.COMPLETE) {
      return 5; // "Complete"
    }
    
    return 1; // Default fallback
  }

  /**
   * Get step label for accessibility (5-step consolidated flow)
   */
  getStepLabel(step: AuthSteps | null): string {
    if (!step) return 'Step';
    
    const authStep = step as AuthSteps;
    
    if (authStep === AuthSteps.EMAIL || authStep === AuthSteps.EMAIL_VERIFY) {
      return 'Email Verification';
    }
    if (authStep === AuthSteps.PASSWORD || authStep === AuthSteps.PASSWORD_SETUP || authStep === AuthSteps.NAME_SETUP || authStep === AuthSteps.SIGNIN) {
      return 'Password & Account Details';
    }
    if (authStep === AuthSteps.PHONE_SETUP || authStep === AuthSteps.PHONE_VERIFY) {
      return 'Phone Verification';
    }
    if (authStep === AuthSteps.MFA_SETUP || authStep === AuthSteps.MFA_VERIFY) {
      return 'Two-Factor Authentication';
    }
    if (authStep === AuthSteps.COMPLETE) {
      return 'Complete';
    }
    
    return 'Step';
  }

  /**
   * Get progress step label by number for accessibility
   */
  getProgressStepLabel(stepNumber: number): string {
    switch (stepNumber) {
      case 1: return 'Email Verification';
      case 2: return 'Password & Account Details';
      case 3: return 'Phone Verification';
      case 4: return 'Two-Factor Authentication';
      case 5: return 'Complete';
      default: return 'Step';
    }
  }

  /**
   * Check if consolidated step is completed for accessibility
   */
  isStepCompleted(step: AuthSteps, currentStep: AuthSteps | null): boolean {
    if (!currentStep) return false;
    
    const stepNumber = this.getCurrentStepNumber(step);
    const currentStepNumber = this.getCurrentStepNumber(currentStep);
    
    return stepNumber < currentStepNumber;
  }

  /**
   * Focus the first input of the current step for keyboard users
   */
  private focusCurrentStepInput(step: AuthSteps): void {
    setTimeout(() => {
      let selector: string;
      switch (step) {
        case AuthSteps.EMAIL:
          selector = '#email-input';
          break;
        case AuthSteps.PASSWORD:
          selector = '#password-input';
          break;
        case AuthSteps.PASSWORD_SETUP:
          selector = '#password-setup-input';
          break;
        case AuthSteps.EMAIL_VERIFY:
          selector = '#email-code-input';
          break;
        case AuthSteps.NAME_SETUP:
          selector = '#first-name-input';
          break;
        case AuthSteps.PHONE_SETUP:
          selector = '#phone-input';
          break;
        case AuthSteps.PHONE_VERIFY:
          selector = '#phone-code-input';
          break;
        case AuthSteps.MFA_SETUP:
          selector = '#mfa-setup-input';
          break;
        case AuthSteps.MFA_VERIFY:
          selector = '#mfa-verify-input';
          break;
        default:
          return;
      }
      
      const element = document.querySelector(selector) as HTMLInputElement;
      if (element) {
        element.focus();
      }
    }, 100); // Small delay to ensure DOM is updated
  }

  /**
   * Announce step changes to screen readers
   */
  private announceStepChange(step: AuthSteps): void {
    const stepTitle = this.getStepLabel(step);
    const stepNumber = this.getCurrentStepNumber(step);
    
    // Create a temporary live region for announcements
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'assertive');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = `Step ${stepNumber} of 5: ${stepTitle}`;
    
    document.body.appendChild(announcement);
    
    // Remove the announcement after screen readers have had time to read it
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  /**
   * Load user session data without automatic redirects
   * Focus on determining the next verification step needed
   */
  private async loadUserSessionAndDetermineStep(): Promise<void> {
    try {
      // Check if signout query parameter is present
      const signoutParam = this.route.snapshot.queryParams['signout'];
      if (signoutParam === 'true') {
        try {
          // Dispatch signout action to clear auth state
          this.store.dispatch(AuthActions.signout());
          
          // Clear cognito session
          await this.cognitoService.signOut();
          
          // Clear browser storage
          localStorage.clear();
          sessionStorage.clear();
          
          // Remove signout parameter from URL without page reload
          this.router.navigate(['/authenticate'], { replaceUrl: true });
          
          return; // Stop here and show auth form
        } catch (signoutError) {
          console.error('[loadUserSessionAndDetermineStep] Error during forced signout:', signoutError);
          // Continue with normal flow even if signout fails
        }
      }
      
      const isAuthenticated = await this.cognitoService.checkIsAuthenticated();
      
      if (isAuthenticated) {
        // Always load user profile data regardless of authentication
        // The effects will handle determining the next verification step
        this.store.dispatch(AuthActions.refreshSession());
        return;
      }
      
      this.store.dispatch(AuthActions.setCurrentStep({ step: AuthSteps.EMAIL }));
    } catch (error) {
      // If there's an error checking the session, start with email step
      this.store.dispatch(AuthActions.setCurrentStep({ step: AuthSteps.EMAIL }));
    }
  }


}
