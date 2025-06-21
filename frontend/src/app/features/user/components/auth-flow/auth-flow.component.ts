// file: frontend/src/app/features/user/components/auth-flow/auth-flow.component.ts
// author: Corey Dale Peters
// date: 2022-12-20
// description: This file contains the Angular component that handles the authentication flow

// 3rd Party Imports
import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {Store} from '@ngrx/store';
import {map, Observable, Subject, take, takeUntil, tap, filter} from 'rxjs';
import {Location} from '@angular/common';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { RouterModule } from '@angular/router';
import { AuthErrorBoundaryComponent } from './components/auth-error-boundary.component';

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
    RouterModule,
    AuthErrorBoundaryComponent
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

  // History management
  public stepHistory: AuthSteps[] = [];
  private isNavigatingBack = false;

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
    private location: Location,
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
    // Initialize browser history management
    this.initializeHistoryManagement();
    
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
      .pipe(
        takeUntil(this.destroy$),
        filter(step => !!step)
      )
      .subscribe(step => {
        this.updateValidators(step);
        // Ensure form validation state is properly updated
        this.authForm.updateValueAndValidity({ emitEvent: true });
        // Track step history for navigation
        this.trackStepHistory(step);
        // Update browser history
        this.updateBrowserHistory(step);
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
   * Get current step number for accessibility (4-step consolidated flow)
   */
  getCurrentStepNumber(currentStep: AuthSteps | null): number {
    if (!currentStep) return 1;
    
    const step = currentStep as AuthSteps;
    
    if (step === AuthSteps.EMAIL || step === AuthSteps.EMAIL_VERIFY) {
      return 1; // "Email Verification"
    }
    if (step === AuthSteps.PASSWORD || step === AuthSteps.PASSWORD_SETUP || step === AuthSteps.NAME_SETUP || step === AuthSteps.SIGNIN || step === AuthSteps.PHONE_SETUP || step === AuthSteps.PHONE_VERIFY) {
      return 2; // "Identity & Contact Setup"
    }
    if (step === AuthSteps.MFA_SETUP || step === AuthSteps.MFA_VERIFY) {
      return 3; // "Security Verification"
    }
    if (step === AuthSteps.COMPLETE) {
      return 4; // "Complete"
    }
    
    return 1; // Default fallback
  }

  /**
   * Get step label for accessibility (4-step consolidated flow)
   */
  getStepLabel(step: AuthSteps | null): string {
    if (!step) return 'Step';
    
    const authStep = step as AuthSteps;
    
    if (authStep === AuthSteps.EMAIL || authStep === AuthSteps.EMAIL_VERIFY) {
      return 'Email Verification';
    }
    if (authStep === AuthSteps.PASSWORD || authStep === AuthSteps.PASSWORD_SETUP || authStep === AuthSteps.NAME_SETUP || authStep === AuthSteps.SIGNIN || authStep === AuthSteps.PHONE_SETUP || authStep === AuthSteps.PHONE_VERIFY) {
      return 'Identity & Contact Setup';
    }
    if (authStep === AuthSteps.MFA_SETUP || authStep === AuthSteps.MFA_VERIFY) {
      return 'Security Verification';
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
      case 2: return 'Identity & Contact Setup';
      case 3: return 'Security Verification';
      case 4: return 'Complete';
      case 5: return 'Complete'; // Fallback for any edge cases
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
    announcement.textContent = `Step ${stepNumber} of 4: ${stepTitle}`;
    
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

  /**
   * Initialize browser history management for auth flow navigation
   */
  private initializeHistoryManagement(): void {
    // Listen for browser back/forward button
    window.addEventListener('popstate', (event) => {
      if (event.state && event.state.authStep) {
        this.isNavigatingBack = true;
        this.store.dispatch(AuthActions.setCurrentStep({ step: event.state.authStep }));
        
        // Reset flag after state change
        setTimeout(() => {
          this.isNavigatingBack = false;
        }, 100);
      }
    });
  }

  /**
   * Track step history for navigation purposes
   */
  private trackStepHistory(step: AuthSteps): void {
    if (!this.isNavigatingBack) {
      // Only add to history if we're not navigating back
      const lastStep = this.stepHistory[this.stepHistory.length - 1];
      if (lastStep !== step) {
        this.stepHistory.push(step);
        
        // Limit history to prevent memory issues
        if (this.stepHistory.length > 10) {
          this.stepHistory.shift();
        }
      }
    }
  }

  /**
   * Update browser history with current step
   */
  private updateBrowserHistory(step: AuthSteps): void {
    if (!this.isNavigatingBack) {
      const url = this.router.url.split('?')[0]; // Remove query params
      const state = { authStep: step };
      const title = this.getStepLabel(step);
      
      // Push new state to browser history
      window.history.pushState(state, title, url);
    }
  }

  /**
   * Navigate back to previous step (if available and safe)
   */
  public navigateBack(): void {
    const currentStepIndex = this.stepHistory.length - 1;
    const previousStepIndex = currentStepIndex - 1;
    
    if (previousStepIndex >= 0) {
      const previousStep = this.stepHistory[previousStepIndex];
      
      // Only allow back navigation for safe steps
      if (this.isStepNavigationSafe(previousStep)) {
        this.isNavigatingBack = true;
        this.stepHistory.pop(); // Remove current step
        
        // Clear any form errors before navigation
        this.clearFormErrors();
        
        this.store.dispatch(AuthActions.setCurrentStep({ step: previousStep }));
        this.location.back();
        
        // Reset flag and update validators
        setTimeout(() => {
          this.isNavigatingBack = false;
          this.updateValidators(previousStep);
          // Ensure form recognizes the new validation state
          this.authForm.updateValueAndValidity({ emitEvent: true });
        }, 150);
      }
    }
  }

  /**
   * Navigate to a specific step (for breadcrumb navigation)
   */
  public navigateToStep(targetStep: AuthSteps): void {
    if (this.isStepNavigationSafe(targetStep)) {
      this.isNavigatingBack = true;
      
      // Remove steps after the target step from history
      const targetIndex = this.stepHistory.indexOf(targetStep);
      if (targetIndex >= 0) {
        this.stepHistory = this.stepHistory.slice(0, targetIndex + 1);
      }
      
      // Clear any form errors before navigation
      this.clearFormErrors();
      
      this.store.dispatch(AuthActions.setCurrentStep({ step: targetStep }));
      
      // Reset flag and update validators
      setTimeout(() => {
        this.isNavigatingBack = false;
        this.updateValidators(targetStep);
        // Ensure form recognizes the new validation state
        this.authForm.updateValueAndValidity({ emitEvent: true });
      }, 150);
    }
  }

  /**
   * Check if navigation back to a step is safe (non-destructive)
   */
  public isStepNavigationSafe(step: AuthSteps): boolean {
    const destructiveSteps = [
      AuthSteps.EMAIL_VERIFY,
      AuthSteps.PHONE_VERIFY,
      AuthSteps.MFA_VERIFY,
      AuthSteps.COMPLETE
    ];
    
    return !destructiveSteps.includes(step);
  }

  /**
   * Check if back navigation is available
   */
  public canNavigateBack(): boolean {
    const currentStepIndex = this.stepHistory.length - 1;
    const previousStepIndex = currentStepIndex - 1;
    
    if (previousStepIndex >= 0) {
      const previousStep = this.stepHistory[previousStepIndex];
      return this.isStepNavigationSafe(previousStep);
    }
    
    return false;
  }

  /**
   * Start over the authentication flow
   */
  public startOver(): void {
    // Clear step history
    this.stepHistory = [];
    
    // Clear form data and reset validation state
    this.authForm.reset();
    this.clearFormErrors();
    
    // Clear auth state and start from beginning
    this.store.dispatch(AuthActions.signout());
    this.store.dispatch(AuthActions.setCurrentStep({ step: AuthSteps.EMAIL }));
    
    // Update validators for the email step and ensure form is properly reset
    setTimeout(() => {
      this.updateValidators(AuthSteps.EMAIL);
      this.authForm.updateValueAndValidity({ emitEvent: true });
    }, 50);
    
    // Update browser history
    const url = this.router.url.split('?')[0];
    window.history.replaceState({ authStep: AuthSteps.EMAIL }, 'Sign In', url);
  }

  /**
   * Handle error boundary retry action
   */
  public onErrorRetry(): void {
    // Retry the current form submission
    if (this.authForm.valid) {
      this.onSubmit();
    } else {
      // If form is invalid, focus the first invalid field
      this.focusFirstInvalidField();
    }
  }

  /**
   * Handle error boundary go back action
   */
  public onErrorGoBack(): void {
    this.navigateBack();
  }

  /**
   * Handle error boundary start over action  
   */
  public onErrorStartOver(): void {
    this.startOver();
  }

  /**
   * Focus the first invalid field for error recovery
   */
  private focusFirstInvalidField(): void {
    const formElement = document.querySelector('.auth-flow__form');
    if (formElement) {
      const firstInvalidField = formElement.querySelector('.auth-flow__input-group-field--error') as HTMLElement;
      if (firstInvalidField) {
        firstInvalidField.focus();
      }
    }
  }

  /**
   * Clear form errors and reset field states for navigation
   */
  private clearFormErrors(): void {
    // Mark all fields as untouched to reset validation display
    Object.keys(this.authForm.controls).forEach(key => {
      const control = this.authForm.get(key);
      if (control) {
        control.markAsUntouched();
        control.markAsPristine();
        // Clear any existing errors to prevent stuck validation state
        control.setErrors(null);
      }
    });
  }

  /**
   * Get user-friendly error message for error boundary
   */
  public getErrorBoundaryMessage(error: string | null): string {
    if (!error) return '';
    
    // Map technical errors to user-friendly messages
    const errorMap: { [key: string]: string } = {
      'UserNotFoundException': 'No account found with this email address. Please check your email or create a new account.',
      'NotAuthorizedException': 'Invalid email or password. Please check your credentials and try again.',
      'CodeMismatchException': 'The verification code is incorrect. Please check the code and try again.',
      'CodeExpiredException': 'The verification code has expired. Please request a new code.',
      'UserNotConfirmedException': 'Your account needs to be verified. Please check your email for a verification code.',
      'TooManyRequestsException': 'Too many attempts. Please wait a moment before trying again.',
      'InvalidParameterException': 'Please check your input and try again.',
      'ResourceNotFoundException': 'Service temporarily unavailable. Please try again later.',
      'NetworkError': 'Please check your internet connection and try again.',
      'user is already logged in': 'You are already signed in. Please refresh the page or sign out first.'
    };

    // Check for exact matches first
    if (errorMap[error]) {
      return errorMap[error];
    }

    // Check for partial matches
    for (const [key, message] of Object.entries(errorMap)) {
      if (error.toLowerCase().includes(key.toLowerCase())) {
        return message;
      }
    }

    // Default user-friendly message
    return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
  }

  /**
   * Check if current error allows retry
   */
  public canRetryError(error: string | null): boolean {
    if (!error) return false;
    
    const nonRetryableErrors = [
      'UserNotFoundException',
      'UserNotConfirmedException'
    ];
    
    return !nonRetryableErrors.some(nonRetryable => 
      error.toLowerCase().includes(nonRetryable.toLowerCase())
    );
  }


}
