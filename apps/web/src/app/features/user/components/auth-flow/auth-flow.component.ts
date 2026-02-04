// file: apps/web/src/app/features/user/components/auth-flow/auth-flow.component.ts
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
import { DomSanitizer } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faExclamationTriangle, faRedo, faSync } from '@fortawesome/free-solid-svg-icons';
import { RouterModule } from '@angular/router';


// App Imports
import {UserActions} from '../../store/user.actions';
import {UserState} from '../../store/user.state';
import { AuthStep } from '../../../../core/enums/AuthStepEnum';
import * as fromUser from '../../store/user.selectors';
import {QRCodeToDataURLOptions} from "qrcode";
import {UserService} from "../../../../core/services/user.service";
import {CognitoService} from "../../../../core/services/cognito.service";
import {InputValidationService} from "../../../../core/services/input-validation.service";
import {RateLimitingService} from "../../../../core/services/rate-limiting.service";
import {AppErrorHandlerService} from "../../../../core/services/error-handler.service";
import {DebugLogService, DebugLogEntry} from "../../../../core/services/debug-log.service";

import {CustomValidators} from "../../../../core/validators/custom-validators";
import { UserStatus } from "../../../../core/enums/UserStatusEnum";
import { UserGroup } from "../../../../core/enums/UserGroupEnum";
import { IUsers } from "../../../../core/models/UsersModel";
import { sanitizeEmail } from "../../../../core/utils/log-sanitizer";
import { VerificationCodeInputComponent } from "../../../../shared/components/verification-code-input/verification-code-input.component";
import { DebugPanelComponent, DebugContext } from "../../../../shared/components/debug/debug-panel.component";


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
    VerificationCodeInputComponent,
    DebugPanelComponent
  ]
})
export class AuthFlowComponent implements OnInit, OnDestroy {

  // Store Selectors
  currentStep$: Observable<AuthStep> = this.store.select(fromUser.selectCurrentStep);
  currentUser$: Observable<IUsers | null> = this.store.select(fromUser.selectCurrentUser);
  currentEmail$: Observable<string> = this.store.select(fromUser.selectCurrentEmail);
  isLoading$ = this.store.select(fromUser.selectIsLoading);
  error$ = this.store.select(fromUser.selectError);
  userExists$ = this.store.select(fromUser.selectUserExists);
  needsMFA$ = this.store.select(fromUser.selectNeedsMfa);
  mfaSetupDetails$ = this.store.select(fromUser.selectMFADetails);
  phoneVerified$ = this.store.select(fromUser.selectPhoneVerified);
  emailVerified$ = this.store.select(fromUser.selectEmailVerified);
  debugMode$ = this.store.select(fromUser.selectDebugMode);
  recoveryMessage$ = this.store.select(fromUser.selectRecoveryMessage);

  // Debug log state
  debugLogs$: Observable<DebugLogEntry[]>;

  // Debug context getter for shared DebugPanelComponent
  get debugContext(): DebugContext {
    return {
      page: 'AuthFlow',
      formState: {
        valid: this.authForm?.valid,
        pristine: this.authForm?.pristine,
        touched: this.authForm?.touched,
        values: this.authForm?.value ? {
          ...this.authForm.value,
          password: this.authForm.value.password ? '[REDACTED]' : ''
        } : {},
        errors: this.authForm?.errors
      }
    };
  }

  // UI State
  buttonText$!: Observable<string>;
  stepTitle$!: Observable<string>;
  
  // Real-time validation state
  public showValidationErrors = false;
  private validationDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  public fieldFocusStates: Record<string, boolean> = {};

  // Touch interaction state
  public isTouchDevice = false;
  public isLandscapeMode = false;
  private touchStartY = 0;
  private lastTouchTime = 0;

  // Loading and skeleton states
  public isStepTransitioning = false;
  public validationLoadingStates: Record<string, boolean> = {};
  public qrCodeLoading = false;
  public buttonProgress = 0;
  public showSkeletonScreens = false;
  public loadingMessage = '';
  
  // Skeleton screen visibility states
  public skeletonStates = {
    form: false,
    qrCode: false,
    progress: false,
    validation: false
  };

  // Success state for WCAG status messages
  public showSuccessMessage = false;
  public successMessage = '';

  // Rate limiting and brute force protection state
  public rateLimitActive = false;
  public rateLimitMessage: string | null = null;
  public remainingAttempts = 0;
  public nextAttemptAllowedAt = 0;
  public isUnderAttack = false;

  // Error handling and recovery state
  public hasInitializationError = false;
  public initializationErrorMessage: string | null = null;
  public canRetryInitialization = true;

  // Font Awesome icons for error boundaries
  faExclamationTriangle = faExclamationTriangle;
  faRedo = faRedo;
  faSync = faSync;

  // Window reference for template
  window = window;

  authForm!: FormGroup;
  authSteps = AuthStep;
  passwordVisible = false;
  qrCodeDataUrl: string | null = null;

  // Form control getters for shared verification code component
  get emailCodeControl() {
    return this.authForm.get('emailCode') as import('@angular/forms').FormControl;
  }
  
  get mfaCodeControl() {
    return this.authForm.get('mfaCode') as import('@angular/forms').FormControl;
  }
  
  get phoneCodeControl() {
    return this.authForm.get('phoneCode') as import('@angular/forms').FormControl;
  }

  // History management
  public stepHistory: AuthStep[] = [];
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
    private store: Store<{ user: UserState }>,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private userService: UserService,
    private cognitoService: CognitoService,
    private inputValidationService: InputValidationService,
    private rateLimitingService: RateLimitingService,
    private errorHandler: AppErrorHandlerService,
    private sanitizer: DomSanitizer,
    private debugLogService: DebugLogService
  ) {

    // Initialize debug logs observable
    this.debugLogs$ = this.debugLogService.logs$;

    // Initialize the form with enhanced validation
    this.authForm = this.fb.group({
      email: ['', [
        Validators.required,
        CustomValidators.email(),
        CustomValidators.noDisposableEmail(),
        CustomValidators.noXSS(this.sanitizer)
      ]],
      // Make other fields not required initially
      firstName: ['', [
        CustomValidators.validateName('First name'),
        CustomValidators.noXSS(this.sanitizer)
      ]],
      lastName: ['', [
        CustomValidators.validateName('Last name'),
        CustomValidators.noXSS(this.sanitizer)
      ]],
      phoneNumber: ['', [
        CustomValidators.phoneNumber(),
        CustomValidators.noXSS(this.sanitizer)
      ]],
      password: ['', [
        CustomValidators.password(),
        CustomValidators.noXSS(this.sanitizer)
      ]],
      emailCode: ['', [
        CustomValidators.verificationCode(),
        CustomValidators.noXSS(this.sanitizer)
      ]],
      mfaCode: ['', [
        CustomValidators.verificationCode(),
        CustomValidators.noXSS(this.sanitizer)
      ]],
      phoneCode: ['', [
        CustomValidators.verificationCode(),
        CustomValidators.noXSS(this.sanitizer)
      ]]
    });

    this.initializeForm();
    this.initializeUIState();
    this.initializeRealTimeValidation();
  }

  ngOnInit(): void {
    try {
      // Initialize all systems with error boundaries
      this.initializeAuthFlowSafely();
    } catch (error) {
      this.handleInitializationError(error, 'ngOnInit');
    }
  }

  /**
   * Initialize auth flow with comprehensive error handling
   */
  private async initializeAuthFlowSafely(): Promise<void> {
    try {
      // Initialize rate limiting and brute force protection
      await this.initializeRateLimitingSafely();
      
      // Initialize browser history management
      await this.initializeHistoryManagementSafely();
      
      // Initialize touch optimizations
      await this.initializeTouchOptimizationsSafely();
      
      // Always check existing session to load user data, but don't redirect
      await this.loadUserSessionAndDetermineStepSafely();

      // Set up reactive subscriptions with error boundaries
      this.setupReactiveSubscriptionsSafely();

      // Mark initialization as successful
      this.hasInitializationError = false;
      this.initializationErrorMessage = null;
      
    } catch (error) {
      this.handleInitializationError(error, 'initializeAuthFlowSafely');
    }
  }

  /**
   * Initialize rate limiting with error handling
   */
  private async initializeRateLimitingSafely(): Promise<void> {
    try {
      // Test rate limiting service availability
      await this.rateLimitingService.isAttemptAllowed('test@example.com', 'email_check');
      this.rateLimitActive = true;
      
      console.debug('[AuthFlowComponent] Rate limiting initialized successfully');
    } catch (error) {
      const errorId = this.errorHandler.captureSecurityError(
        'initializeRateLimiting',
        error,
        'AuthFlowComponent'
      );
      
      this.rateLimitActive = false;
      this.rateLimitMessage = 'Rate limiting initialization failed';
      
      console.warn('[AuthFlowComponent] Rate limiting initialization failed:', errorId);
    }
  }

  /**
   * Initialize browser history management with error handling
   */
  private async initializeHistoryManagementSafely(): Promise<void> {
    try {
      // Set up browser history state
      const currentStep = await this.currentStep$.pipe(take(1)).toPromise();
      
      // Initialize step history
      this.stepHistory = [currentStep || AuthStep.Email];
      
      // Set up popstate listener for browser back/forward
      window.addEventListener('popstate', this.handleBrowserNavigation.bind(this));
      
      console.debug('[AuthFlowComponent] History management initialized successfully');
    } catch (error) {
      const errorId = this.errorHandler.captureError({
        type: 'system',
        severity: 'low',
        message: 'Browser history management initialization failed',
        component: 'AuthFlowComponent',
        operation: 'initializeHistoryManagement',
        error,
        recoverable: true
      });
      
      // Fallback to basic navigation
      this.stepHistory = [AuthStep.Email];
      
      console.warn('[AuthFlowComponent] History management initialization failed:', errorId);
    }
  }

  /**
   * Initialize touch optimizations with error handling
   */
  private async initializeTouchOptimizationsSafely(): Promise<void> {
    try {
      // Detect touch device
      this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      if (this.isTouchDevice) {
        // Set up touch event listeners
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
        
        // Detect orientation changes
        window.addEventListener('orientationchange', this.handleOrientationChange.bind(this));
        
        // Initial orientation check
        this.isLandscapeMode = window.innerWidth > window.innerHeight;
      }
      
      console.debug('[AuthFlowComponent] Touch optimizations initialized successfully');
    } catch (error) {
      const errorId = this.errorHandler.captureError({
        type: 'system',
        severity: 'low',
        message: 'Touch optimizations initialization failed',
        component: 'AuthFlowComponent',
        operation: 'initializeTouchOptimizations',
        error,
        recoverable: true
      });
      
      // Fallback to desktop mode
      this.isTouchDevice = false;
      this.isLandscapeMode = false;
      
      console.warn('[AuthFlowComponent] Touch optimizations initialization failed:', errorId);
    }
  }

  /**
   * Load user session and determine initial step with error handling
   */
  private async loadUserSessionAndDetermineStepSafely(): Promise<void> {
    try {
      // Check if user is already authenticated
      const sessionActive = await this.store.select(fromUser.selectSessionActive).pipe(take(1)).toPromise();
      
      if (sessionActive) {
        // User has active session, get current user data
        const currentUser = await this.store.select(fromUser.selectCurrentUser).pipe(take(1)).toPromise();
        
        if (currentUser?.email) {
          // Pre-populate email field
          this.authForm.patchValue({ email: currentUser.email });
          
          // Determine appropriate step based on user state
          // Note: NAME_SETUP, PHONE_SETUP, PHONE_VERIFY are now handled on profile page
          let nextStep = AuthStep.Complete;
          
          if (!currentUser.emailVerified) {
            nextStep = AuthStep.EmailVerify;
          } else if (!currentUser.mfaEnabled) {
            nextStep = AuthStep.MfaSetup;
          }
          
          this.store.dispatch(UserActions.setCurrentStep({ step: nextStep }));
        }
      } else {
        // No active session, start from email step
        this.store.dispatch(UserActions.setCurrentStep({ step: AuthStep.Email }));
      }
      
      console.debug('[AuthFlowComponent] User session loaded and step determined successfully');
    } catch (error) {
      const errorId = this.errorHandler.captureAuthError(
        'loadUserSessionAndDetermineStep',
        error,
        'AuthFlowComponent',
        undefined,
        ['Refresh page', 'Clear browser cache', 'Try again']
      );
      
      // Fallback to email step
      this.store.dispatch(UserActions.setCurrentStep({ step: AuthStep.Email }));
      
      console.warn('[AuthFlowComponent] User session loading failed:', errorId);
    }
  }

  /**
   * Handle initialization errors with user-friendly recovery options
   */
  private handleInitializationError(error: unknown, operation: string): void {
    const errorId = this.errorHandler.captureError({
      type: 'system',
      severity: 'high',
      message: `Initialization failed in ${operation}`,
      userMessage: 'The authentication system failed to initialize properly. Please try refreshing the page.',
      component: 'AuthFlowComponent',
      operation,
      error,
      recoverable: true,
      recoveryActions: [
        'Refresh page',
        'Clear browser cache', 
        'Try incognito/private mode',
        'Contact support if problem persists'
      ]
    });
    
    this.hasInitializationError = true;
    this.initializationErrorMessage = 'Authentication system initialization failed. Please refresh the page to try again.';
    this.canRetryInitialization = true;
    
    console.error('[AuthFlowComponent] Initialization error:', errorId);
  }

  /**
   * Retry initialization after error
   */
  public async retryInitialization(): Promise<void> {
    try {
      this.hasInitializationError = false;
      this.initializationErrorMessage = null;
      this.canRetryInitialization = false;
      
      await this.initializeAuthFlowSafely();
      
      this.canRetryInitialization = true;
    } catch (error) {
      this.handleInitializationError(error, 'retryInitialization');
    }
  }

  /**
   * Handle browser navigation events
   */
  private handleBrowserNavigation(_event: PopStateEvent): void {
    try {
      // Handle browser back/forward buttons
      if (this.stepHistory.length > 1) {
        this.isNavigatingBack = true;
        const previousStep = this.stepHistory[this.stepHistory.length - 2];
        this.store.dispatch(UserActions.setCurrentStep({ step: previousStep }));
        this.stepHistory.pop();
      }
    } catch (error) {
      this.errorHandler.captureError({
        type: 'system',
        severity: 'low',
        message: 'Browser navigation handling failed',
        component: 'AuthFlowComponent',
        operation: 'handleBrowserNavigation',
        error
      });
    }
  }

  /**
   * Handle touch start events
   */
  private handleTouchStart(event: TouchEvent): void {
    try {
      this.touchStartY = event.touches[0].clientY;
      this.lastTouchTime = Date.now();
    } catch (error) {
      this.errorHandler.captureError({
        type: 'system',
        severity: 'low',
        message: 'Touch start handling failed',
        component: 'AuthFlowComponent',
        operation: 'handleTouchStart',
        error
      });
    }
  }

  /**
   * Handle touch end events
   */
  private handleTouchEnd(event: TouchEvent): void {
    try {
      const touchEndY = event.changedTouches[0].clientY;
      const touchDuration = Date.now() - this.lastTouchTime;
      const touchDistance = Math.abs(touchEndY - this.touchStartY);
      
      // Detect swipe gestures for form navigation
      if (touchDuration < 500 && touchDistance > 50) {
        if (touchEndY < this.touchStartY) {
          // Swipe up - could trigger next step
          this.handleSwipeUp();
        } else {
          // Swipe down - could trigger previous step
          this.handleSwipeDown();
        }
      }
    } catch (error) {
      this.errorHandler.captureError({
        type: 'system',
        severity: 'low',
        message: 'Touch end handling failed',
        component: 'AuthFlowComponent',
        operation: 'handleTouchEnd',
        error
      });
    }
  }

  /**
   * Handle orientation changes
   */
  private handleOrientationChange(): void {
    try {
      setTimeout(() => {
        this.isLandscapeMode = window.innerWidth > window.innerHeight;
      }, 100);
    } catch (error) {
      this.errorHandler.captureError({
        type: 'system',
        severity: 'low',
        message: 'Orientation change handling failed',
        component: 'AuthFlowComponent',
        operation: 'handleOrientationChange',
        error
      });
    }
  }

  /**
   * Handle swipe up gesture
   */
  private handleSwipeUp(): void {
    try {
      // Could be used to advance to next step if form is valid
      if (this.authForm.valid) {
        this.onSubmit();
      }
    } catch (error) {
      this.errorHandler.captureError({
        type: 'user',
        severity: 'low',
        message: 'Swipe up gesture handling failed',
        component: 'AuthFlowComponent',
        operation: 'handleSwipeUp',
        error
      });
    }
  }

  /**
   * Handle swipe down gesture
   */
  private handleSwipeDown(): void {
    try {
      // Could be used to go back to previous step
      this.goToPreviousStep();
    } catch (error) {
      this.errorHandler.captureError({
        type: 'user',
        severity: 'low',
        message: 'Swipe down gesture handling failed',
        component: 'AuthFlowComponent',
        operation: 'handleSwipeDown',
        error
      });
    }
  }

  /**
   * Set up reactive subscriptions with error handling
   */
  private setupReactiveSubscriptionsSafely(): void {
    try {
      // Handle unauthenticated users
      this.store.select(fromUser.selectSessionActive)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (active) => {
            try {
              if (!active) {
                // User is not authenticated, start from email step
                this.store.dispatch(UserActions.setCurrentStep({ step: AuthStep.Email }));
              }
            } catch (error) {
              this.errorHandler.captureAuthError('handleSessionActive', error, 'AuthFlowComponent');
            }
          },
          error: (error) => {
            this.errorHandler.captureAuthError('selectSessionActive', error, 'AuthFlowComponent');
          }
        });
      
      // Pure component - only update form validators when step changes
      this.currentStep$
        .pipe(
          takeUntil(this.destroy$),
          filter(step => !!step)
        )
        .subscribe({
          next: (step) => {
            try {
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
            } catch (error) {
              this.errorHandler.captureError({
                type: 'system',
                severity: 'medium',
                message: 'Error updating form validators',
                component: 'AuthFlowComponent',
                operation: 'updateValidators',
                error
              });
            }
          },
          error: (error) => {
            this.errorHandler.captureError({
              type: 'system',
              severity: 'high',
              message: 'Error in step change subscription',
              component: 'AuthFlowComponent',
              operation: 'currentStep$',
              error
            });
          }
        });

      // Handle MFA setup details with error boundaries
      this.mfaSetupDetails$
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: async (details) => {
            try {
              if (!details?.secretKey || !details?.qrCode) {
                return;
              }
              
              // Dynamic import with error handling
              const QRCode = (await import('qrcode')).default;
              const qrUrl = details.setupUri?.toString() || '';
              const options = {
                width: 200,
                margin: 2,
                errorCorrectionLevel: 'M'
              } as QRCodeToDataURLOptions;
              
              this.qrCodeDataUrl = await QRCode.toDataURL(qrUrl, options);
            } catch (error) {
              this.errorHandler.captureError({
                type: 'system',
                severity: 'medium',
                message: 'Failed to generate QR code',
                userMessage: 'Unable to generate QR code. Please try refreshing the page.',
                component: 'AuthFlowComponent',
                operation: 'generateQRCode',
                error,
                recoverable: true,
                recoveryActions: ['Refresh page', 'Try manual MFA setup', 'Contact support']
              });
            }
          },
          error: (error) => {
            this.errorHandler.captureError({
              type: 'authentication',
              severity: 'medium',
              message: 'Error in MFA setup subscription',
              component: 'AuthFlowComponent',
              operation: 'mfaSetupDetails$',
              error
            });
          }
        });
        
    } catch (error) {
      this.errorHandler.captureError({
        type: 'system',
        severity: 'high',
        message: 'Failed to setup reactive subscriptions',
        component: 'AuthFlowComponent',
        operation: 'setupReactiveSubscriptions',
        error
      });
    }
  }


  ngOnDestroy(): void {
    if (this.validationDebounceTimer) {
      clearTimeout(this.validationDebounceTimer);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  async onSubmit(): Promise<void> {
    try {
      if (!this.authForm.valid) {
        return;
      }

      // Get current step and email for rate limiting
      const currentStep = await this.currentStep$.pipe(take(1)).toPromise();
      let email = this.authForm.get('email')?.value;
      
      // If no email in form, try to get from current user
      if (!email) {
        const currentUser = await this.currentUser$.pipe(take(1)).toPromise();
        email = currentUser?.email;
      }
      
      // Only apply rate limiting if we have both step and email
      if (currentStep && email) {
        // Check rate limiting before processing form submission
        const rateLimitCheck = await this.checkRateLimiting(email, currentStep);
        if (!rateLimitCheck.allowed) {
          console.warn('[AuthFlowComponent] Form submission blocked by rate limiting');
          this.handleRateLimitBlocked(rateLimitCheck.delayMs, rateLimitCheck.reason);
          return;
        }
    } else {
      // Log debug message for missing data but don't block submission
      console.debug('[AuthFlowComponent] Rate limiting skipped - missing email or step data', {
        hasEmail: !!email,
        hasStep: !!currentStep,
        step: currentStep
      });
    }

    this.currentStep$
      .pipe(
        take(1),
        takeUntil(this.destroy$))
      .subscribe(async step => {
        const formEmail = this.authForm.get('email')?.value;
        const password = this.authForm.get('password')?.value;
        const emailCode = this.authForm.get('emailCode')?.value;
        const mfaCode = this.authForm.get('mfaCode')?.value;
        
        // Get email from store as fallback (important for EMAIL_VERIFY step)
        const storeEmail = await this.currentEmail$.pipe(take(1)).toPromise();
        const email = formEmail || storeEmail;
        
        switch (step) {
          case AuthStep.Email:
            // Use smartCheck for intelligent routing based on Cognito + DynamoDB state
            this.store.dispatch(UserActions.smartCheck({ email }));
            break;

          case AuthStep.Password:
          case AuthStep.PasswordVerify:
            if (!password) {
              return;
            }
            this.store.dispatch(UserActions.verifyCognitoPassword({ email, password }));
            break;

          case AuthStep.PasswordSetup:
            if (!password) {
              return;
            }
            this.createUserWithCognito(password);
            break;

          case AuthStep.EmailVerify:
            if (!emailCode) {
              return;
            }
            if (!email) {
              console.error('[AuthFlowComponent] No email available for verification');
              this.store.dispatch(UserActions.verifyEmailFailure({ 
                error: 'Email address not found. Please start over.' 
              }));
              return;
            }
            console.debug('[AuthFlowComponent] Dispatching verifyEmail', { email: sanitizeEmail(email), codeLength: emailCode?.length });
            this.store.dispatch(UserActions.verifyEmail({
              code: emailCode,
              email: email
            }));
            break;

          case AuthStep.Signin:
            if (!password) {
              return;
            }
            if (!email) {
              return;
            }
            this.store.dispatch(UserActions.signIn({
              email,
              password
            }));
            break;

          case AuthStep.MfaSetup:
            // User has scanned QR code and entered TOTP code - verify it
            if(!mfaCode) {
              return;
            }
            // Use the same MFA verification as MFA_VERIFY - confirmSignIn handles both
            this.store.dispatch(UserActions.needsMFA({ code: mfaCode, rememberDevice: false }));
            break;

          case AuthStep.MfaVerify:
            if(!mfaCode) {
              return;
            }
            this.store.dispatch(UserActions.needsMFA( {code: mfaCode, rememberDevice: false}));
            break;

          default:
            break;
        }
      });
    } catch (error) {
      const email = this.authForm.get('email')?.value || 'unknown';
      const errorId = this.errorHandler.captureAuthError(
        'onSubmit',
        error,
        'AuthFlowComponent',
        email,
        ['Try again', 'Refresh page', 'Contact support']
      );
      
      console.error('[AuthFlowComponent] Form submission error:', errorId);
      
      // Show user-friendly error
      this.store.dispatch(UserActions.smartCheckFailure({ 
        error: 'An error occurred while processing your request. Please try again.' 
      }));
    }
  }

  checkPasswordValidations(password: string): void {
    try {
      // Use the enhanced validation service for password checking
      const validation = this.inputValidationService.validatePassword(password);
      
      this.passwordValidations = {
        minLength: validation.criteria.minLength,
        hasUppercase: validation.criteria.hasUppercase,
        hasLowercase: validation.criteria.hasLowercase,
        hasNumber: validation.criteria.hasNumber,
        hasSpecial: validation.criteria.hasSpecial
      };
    } catch (error) {
      this.errorHandler.captureValidationError(
        'checkPasswordValidations',
        error,
        'AuthFlowComponent',
        'password'
      );
      
      // Fallback to basic validation
      this.passwordValidations = {
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /\d/.test(password),
        hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password)
      };
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    try {
      const field = this.authForm.get(fieldName);
      return field ? field.invalid && (field.dirty || field.touched) : false;
    } catch (error) {
      this.errorHandler.captureValidationError(
        'isFieldInvalid',
        error,
        'AuthFlowComponent',
        fieldName
      );
      return false;
    }
  }

  togglePasswordVisibility(): void {
    try {
      this.passwordVisible = !this.passwordVisible;
    } catch (error) {
      this.errorHandler.captureError({
        type: 'user',
        severity: 'low',
        message: 'Password visibility toggle failed',
        component: 'AuthFlowComponent',
        operation: 'togglePasswordVisibility',
        error
      });
    }
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
    try {
      // Initialize derived observables
      this.buttonText$ = this.deriveButtonText();
      this.stepTitle$ = this.deriveStepTitle();
    } catch (error) {
      this.errorHandler.captureError({
        type: 'system',
        severity: 'medium',
        message: 'UI state initialization failed',
        component: 'AuthFlowComponent',
        operation: 'initializeUIState',
        error
      });
    }
  }

  private deriveButtonText(): Observable<string> {
    return this.currentStep$.pipe(
      map(step => {
        switch (step) {
          case AuthStep.Email:
            return 'Next';
          case AuthStep.EmailVerify:
          case AuthStep.MfaVerify:
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
          case AuthStep.Email:
            return 'Sign In or Create Account';
          case AuthStep.Password:
            return this.userExists$ ? 'Enter Password' : 'Create Account';
          case AuthStep.Signin:
            return 'Sign In';
          case AuthStep.MfaSetup:
            return 'Set Up Two-Factor Authentication';
          case AuthStep.EmailVerify:
            return 'Submit Email Verification Code';
          case AuthStep.MfaVerify:
            return 'Submit MFA Verification Code';
          default:
            return 'Welcome';
        }
      })
    );
  }

  private initializeForm(): void {
    try {
      this.authForm.get('password')?.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (password) => {
            try {
              if (password) {
                this.checkPasswordValidations(password);
              } else {
                this.resetPasswordValidations();
              }
            } catch (error) {
              this.errorHandler.captureValidationError(
                'passwordValueChange',
                error,
                'AuthFlowComponent',
                'password'
              );
            }
          },
          error: (error) => {
            this.errorHandler.captureValidationError(
              'passwordValueChanges',
              error,
              'AuthFlowComponent',
              'password'
            );
          }
        });
    } catch (error) {
      this.errorHandler.captureError({
        type: 'system',
        severity: 'medium',
        message: 'Form initialization failed',
        component: 'AuthFlowComponent',
        operation: 'initializeForm',
        error
      });
    }
  }

  private updateValidators(step: AuthStep): void {
    try {
      const emailControl = this.authForm.get('email');
      const passwordControl = this.authForm.get('password');
      const firstNameControl = this.authForm.get('firstName');
      const lastNameControl = this.authForm.get('lastName');
      const phoneNumberControl = this.authForm.get('phoneNumber');
      const phoneCodeControl = this.authForm.get('phoneCode');
      const emailCodeControl = this.authForm.get('emailCode');
      const mfaCodeControl = this.authForm.get('mfaCode');

    // Reset all validators first and update each control
    emailControl?.clearValidators();
    emailControl?.updateValueAndValidity({ emitEvent: false });
    passwordControl?.clearValidators();
    passwordControl?.updateValueAndValidity({ emitEvent: false });
    firstNameControl?.clearValidators();
    firstNameControl?.updateValueAndValidity({ emitEvent: false });
    lastNameControl?.clearValidators();
    lastNameControl?.updateValueAndValidity({ emitEvent: false });
    phoneNumberControl?.clearValidators();
    phoneNumberControl?.updateValueAndValidity({ emitEvent: false });
    phoneCodeControl?.clearValidators();
    phoneCodeControl?.updateValueAndValidity({ emitEvent: false });
    emailCodeControl?.clearValidators();
    emailCodeControl?.updateValueAndValidity({ emitEvent: false });
    mfaCodeControl?.clearValidators();
    mfaCodeControl?.updateValueAndValidity({ emitEvent: false });

    // Set validators based on current step with enhanced validation
    switch (step) {
      case AuthStep.Email:
        emailControl?.setValidators([
          Validators.required,
          CustomValidators.email(),
          CustomValidators.noDisposableEmail(),
          CustomValidators.noXSS(this.sanitizer)
        ]);
        emailControl?.updateValueAndValidity({ emitEvent: false });
        break;
      case AuthStep.Password:
      case AuthStep.Signin:
        passwordControl?.setValidators([
          Validators.required,
          CustomValidators.noXSS(this.sanitizer)
        ]);
        passwordControl?.updateValueAndValidity({ emitEvent: false });
        break;
      case AuthStep.PasswordSetup:
        passwordControl?.setValidators([
          Validators.required,
          CustomValidators.password(),
          CustomValidators.noXSS(this.sanitizer)
        ]);
        passwordControl?.updateValueAndValidity({ emitEvent: false });
        firstNameControl?.setValidators([
          Validators.required,
          CustomValidators.validateName('First name'),
          CustomValidators.noXSS(this.sanitizer)
        ]);
        firstNameControl?.updateValueAndValidity({ emitEvent: false });
        lastNameControl?.setValidators([
          Validators.required,
          CustomValidators.validateName('Last name'),
          CustomValidators.noXSS(this.sanitizer)
        ]);
        lastNameControl?.updateValueAndValidity({ emitEvent: false });
        break;
      case AuthStep.EmailVerify:
        emailCodeControl?.setValidators([
          Validators.required,
          CustomValidators.verificationCode(),
          CustomValidators.noXSS(this.sanitizer)
        ]);
        emailCodeControl?.updateValueAndValidity({ emitEvent: false });
        break;
      case AuthStep.MfaVerify:
        mfaCodeControl?.setValidators([
          Validators.required,
          CustomValidators.verificationCode(),
          CustomValidators.noXSS(this.sanitizer)
        ]);
        mfaCodeControl?.updateValueAndValidity({ emitEvent: false });
        break;
      case AuthStep.MfaSetup:
        // For MFA setup, no specific field validation needed initially
        // User just needs to click submit to initiate setup
        // Clear all validators so form is valid
        break;
    }

      // Update form validation
      this.authForm.updateValueAndValidity();
    } catch (error) {
      this.errorHandler.captureValidationError(
        'updateValidators',
        error,
        'AuthFlowComponent',
        `step-${step}`
      );
    }
  }

  private getPasswordErrorMessage(errors: { pattern?: boolean } | null): string {
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
   * Initialize real-time validation with smart error display
   */
  private initializeRealTimeValidation(): void {
    try {
      // Listen to all form control value changes for smart validation
      Object.keys(this.authForm.controls).forEach(fieldName => {
        const control = this.authForm.get(fieldName);
        if (control) {
          // Real-time validation with debouncing
          control.valueChanges
            .pipe(
              takeUntil(this.destroy$),
              tap(() => {
                try {
                  // Clear existing timer
                  if (this.validationDebounceTimer) {
                    clearTimeout(this.validationDebounceTimer);
                  }
                  
                  // Set new timer for delayed validation
                  this.validationDebounceTimer = setTimeout(() => {
                    this.validateFieldRealTime(fieldName);
                  }, 500); // 500ms delay for real-time validation
                } catch (error) {
                  this.errorHandler.captureValidationError(
                    'validateFieldRealTime',
                    error,
                    'AuthFlowComponent',
                    fieldName
                  );
                }
              })
            )
            .subscribe({
              error: (error) => {
                this.errorHandler.captureValidationError(
                  'valueChanges',
                  error,
                  'AuthFlowComponent',
                  fieldName
                );
              }
            });
          
          // Track focus states for better UX
          control.statusChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                try {
                  // Enable validation display after user interaction
                  if (control.dirty || control.touched) {
                    this.showValidationErrors = true;
                  }
                } catch (error) {
                  this.errorHandler.captureValidationError(
                    'statusChanges',
                    error,
                    'AuthFlowComponent',
                    fieldName
                  );
                }
              },
              error: (error) => {
                this.errorHandler.captureValidationError(
                  'statusChanges',
                  error,
                  'AuthFlowComponent',
                  fieldName
                );
              }
            });
        }
      });
    } catch (error) {
      this.errorHandler.captureError({
        type: 'system',
        severity: 'medium',
        message: 'Real-time validation initialization failed',
        component: 'AuthFlowComponent',
        operation: 'initializeRealTimeValidation',
        error
      });
    }
  }

  /**
   * Initialize rate limiting and brute force protection
   */
  private initializeRateLimiting(): void {
    console.debug('[AuthFlowComponent] Initializing rate limiting protection');
    
    // Monitor for attack status changes
    this.currentUser$.pipe(
      takeUntil(this.destroy$),
      filter(user => !!user?.email)
    ).subscribe(user => {
      if (user?.email) {
        this.isUnderAttack = this.rateLimitingService.isUnderAttack(user.email);
        if (this.isUnderAttack) {
          console.warn('[AuthFlowComponent] Account under attack detected:', user.email);
        }
      }
    });
  }

  /**
   * Check rate limiting for current step and identifier
   */
  private async checkRateLimiting(
    identifier: string, 
    step: AuthStep
  ): Promise<{ allowed: boolean; delayMs: number; reason?: string }> {
    try {
    // Map auth steps to rate limiting attempt types
    const attemptTypeMap: Partial<Record<AuthStep, string | null>> = {
      [AuthStep.Email]: 'email_check',
      [AuthStep.Password]: 'password_verify',
      [AuthStep.PasswordSetup]: null, // No rate limiting for setup
      [AuthStep.EmailVerify]: null, // No rate limiting for email verification
      [AuthStep.MfaSetup]: null, // No rate limiting for MFA setup
      [AuthStep.MfaVerify]: 'mfa_verify',
      [AuthStep.Signin]: 'password_verify',
      [AuthStep.PasswordReset]: 'password_verify',
      [AuthStep.PasswordResetVerify]: null,
      [AuthStep.PasswordResetConfirm]: 'password_verify',
      [AuthStep.Complete]: null
    };

    const attemptType = attemptTypeMap[step];
    
    // No rate limiting for certain steps
    if (!attemptType) {
      return { allowed: true, delayMs: 0 };
    }

    type AttemptType = 'email_check' | 'password_verify' | 'mfa_verify';
      return await this.rateLimitingService.isAttemptAllowed(
        identifier, 
        attemptType as AttemptType
      );
    } catch (error) {
      const errorId = this.errorHandler.captureSecurityError(
        'checkRateLimiting',
        error,
        'AuthFlowComponent',
        identifier
      );
      
      console.warn('[AuthFlowComponent] Rate limiting check failed:', errorId);
      
      // Fallback to allowing the attempt to avoid blocking legitimate users
      return { allowed: true, delayMs: 0, reason: 'Rate limiting check failed' };
    }
  }

  /**
   * Handle rate limit blocked submission
   */
  private handleRateLimitBlocked(delayMs: number, reason?: string): void {
    try {
      this.rateLimitActive = true;
      this.rateLimitMessage = reason || 'Too many attempts. Please wait before trying again.';
      
      // Calculate remaining time
      this.nextAttemptAllowedAt = Date.now() + delayMs;
      
      // Start countdown timer
      this.startRateLimitCountdown(delayMs);
      
      // Show error to user
      this.store.dispatch(UserActions.smartCheckFailure({ 
        error: this.rateLimitMessage 
      }));
      
      console.warn('[AuthFlowComponent] Rate limit active:', {
        delayMs,
        reason,
        nextAttemptAt: new Date(this.nextAttemptAllowedAt).toLocaleTimeString()
      });
    } catch (error) {
      this.errorHandler.captureSecurityError(
        'handleRateLimitBlocked',
        error,
        'AuthFlowComponent'
      );
    }
  }

  /**
   * Start countdown timer for rate limit
   */
  private startRateLimitCountdown(delayMs: number): void {
    const endTime = Date.now() + delayMs;
    
    const updateCountdown = () => {
      const now = Date.now();
      const remaining = endTime - now;
      
      if (remaining <= 0) {
        // Rate limit expired
        this.rateLimitActive = false;
        this.rateLimitMessage = null;
        this.nextAttemptAllowedAt = 0;
        console.debug('[AuthFlowComponent] Rate limit expired - attempts allowed');
        return;
      }
      
      // Update remaining time message
      const seconds = Math.ceil(remaining / 1000);
      this.rateLimitMessage = `Too many attempts. Try again in ${seconds} seconds.`;
      
      // Schedule next update
      setTimeout(updateCountdown, 1000);
    };
    
    // Start countdown
    updateCountdown();
  }

  /**
   * Record authentication attempt result for rate limiting
   */
  private recordAuthAttempt(
    identifier: string, 
    step: AuthStep, 
    success: boolean
  ): void {
    // Map auth steps to rate limiting attempt types
    const attemptTypeMap: Partial<Record<AuthStep, string | null>> = {
      [AuthStep.Email]: 'email_check',
      [AuthStep.Password]: 'password_verify',
      [AuthStep.PasswordSetup]: null,
      [AuthStep.EmailVerify]: null,
      [AuthStep.MfaSetup]: null,
      [AuthStep.MfaVerify]: 'mfa_verify',
      [AuthStep.Signin]: 'password_verify',
      [AuthStep.PasswordReset]: 'password_verify',
      [AuthStep.PasswordResetVerify]: null,
      [AuthStep.PasswordResetConfirm]: 'password_verify',
      [AuthStep.Complete]: null
    };

    const attemptType = attemptTypeMap[step];
    
    if (attemptType) {
      type AttemptType = 'email_check' | 'password_verify' | 'mfa_verify';
      this.rateLimitingService.recordAttempt(
        identifier,
        attemptType as AttemptType,
        success,
        navigator.userAgent
      );
      
      console.debug('[AuthFlowComponent] Recorded auth attempt:', {
        identifier: identifier.substring(0, 5) + '***', // Partial logging for privacy
        step,
        success,
        attemptType
      });
    }
  }
  
  
  /**
   * Handle field focus for better validation UX
   */
  public onFieldFocus(fieldName: string): void {
    this.fieldFocusStates[fieldName] = true;
    
    // Clear field errors on focus to reduce visual noise
    const control = this.authForm.get(fieldName);
    if (control && control.errors) {
      // Temporarily hide errors while user is typing
      this.clearFieldError(fieldName);
    }
  }
  
  /**
   * Handle field blur for validation timing
   */
  public onFieldBlur(fieldName: string): void {
    const control = this.authForm.get(fieldName);
    if (control) {
      // Mark as touched and validate on blur
      control.markAsTouched();
      control.updateValueAndValidity({ emitEvent: true });
      this.showValidationErrors = true;
    }
  }
  
  /**
   * Clear validation error for specific field temporarily
   */
  private clearFieldError(fieldName: string): void {
    const control = this.authForm.get(fieldName);
    if (control) {
      // Store original errors
      const originalErrors = control.errors;
      
      // Clear errors temporarily
      control.setErrors(null);
      
      // Restore errors after a short delay if field is still invalid
      setTimeout(() => {
        if (control.dirty && originalErrors) {
          control.setErrors(originalErrors);
        }
      }, 1000);
    }
  }
  
  /**
   * Check if field should show validation errors
   */
  public shouldShowFieldError(fieldName: string): boolean {
    const control = this.authForm.get(fieldName);
    if (!control) return false;
    
    // Show errors only after user interaction and validation is enabled
    return this.showValidationErrors && 
           control.invalid && 
           (control.dirty || control.touched) &&
           this.fieldFocusStates[fieldName];
  }
  
  /**
   * Get validation status for progressive feedback
   */
  public getFieldValidationStatus(fieldName: string): 'valid' | 'invalid' | 'pending' | 'none' {
    const control = this.authForm.get(fieldName);
    if (!control) return 'none';
    
    // Don't show status until user has interacted
    if (!this.fieldFocusStates[fieldName] || (!control.dirty && !control.touched)) {
      return 'none';
    }
    
    if (control.pending) return 'pending';
    if (control.valid && control.value) return 'valid';
    if (control.invalid && (control.dirty || control.touched)) return 'invalid';
    
    return 'none';
  }
  
  /**
   * Enhanced form validation with better user feedback
   */
  public validateFormStep(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    this.currentStep$
      .pipe(take(1))
      .subscribe(step => {
        const requiredFields = this.getRequiredFieldsForStep(step);
        
        requiredFields.forEach(fieldName => {
          const control = this.authForm.get(fieldName);
          if (control && control.invalid) {
            const errorMessage = this.getErrorMessage(fieldName);
            if (errorMessage) {
              errors.push(`${fieldName}: ${errorMessage}`);
            }
          }
        });
      });
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Get required fields for current step
   */
  private getRequiredFieldsForStep(step: AuthStep): string[] {
    switch (step) {
      case AuthStep.Email:
        return ['email'];
      case AuthStep.Password:
      case AuthStep.Signin:
        return ['password'];
      case AuthStep.PasswordSetup:
        return ['password', 'firstName', 'lastName'];
      case AuthStep.EmailVerify:
        return ['emailCode'];
      case AuthStep.MfaVerify:
        return ['mfaCode'];
      default:
        return [];
    }
  }
  
  
  /**
   * Public method to check if a user is valid for templates
   * @param user The user to check
   * @returns True if the user has all required attributes, false otherwise
   */
  public isUserValid(user: IUsers | null): boolean {
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
            this.store.dispatch(UserActions.setupPhone({ phoneNumber: user.phoneNumber }));
          } else {
            // Display error
            this.store.dispatch(UserActions.setupPhoneFailure({
              error: 'No phone number found. Please go back and enter your phone number.'
            }));
          }
        });
    } else {
      // Use the phone number from the form
      this.store.dispatch(UserActions.setupPhone({ phoneNumber }));
    }
  }

  /**
   * Get current step number for accessibility (4-step consolidated flow)
   */
  getCurrentStepNumber(currentStep: AuthStep | null): number {
    if (!currentStep) return 1;
    
    const step = currentStep as AuthStep;
    
    if (step === AuthStep.Email || step === AuthStep.EmailVerify) {
      return 1; // "Email Verification"
    }
    if (step === AuthStep.Password || step === AuthStep.PasswordSetup || step === AuthStep.Signin) {
      return 2; // "Identity Setup"
    }
    if (step === AuthStep.MfaSetup || step === AuthStep.MfaVerify) {
      return 3; // "Security Verification"
    }
    if (step === AuthStep.Complete) {
      return 4; // "Complete"
    }
    
    return 1; // Default fallback
  }

  /**
   * Get step label for accessibility (4-step consolidated flow)
   */
  getStepLabel(step: AuthStep | null): string {
    if (!step) return 'Step';
    
    const authStep = step as AuthStep;
    
    if (authStep === AuthStep.Email || authStep === AuthStep.EmailVerify) {
      return 'Email Verification';
    }
    if (authStep === AuthStep.Password || authStep === AuthStep.PasswordSetup || authStep === AuthStep.Signin) {
      return 'Identity Setup';
    }
    if (authStep === AuthStep.MfaSetup || authStep === AuthStep.MfaVerify) {
      return 'Security Verification';
    }
    if (authStep === AuthStep.Complete) {
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
  isStepCompleted(step: AuthStep, currentStep: AuthStep | null): boolean {
    if (!currentStep) return false;
    
    const stepNumber = this.getCurrentStepNumber(step);
    const currentStepNumber = this.getCurrentStepNumber(currentStep);
    
    return stepNumber < currentStepNumber;
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
          this.store.dispatch(UserActions.signout());
          
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
        this.store.dispatch(UserActions.refreshSession());
        return;
      }
      
      this.store.dispatch(UserActions.setCurrentStep({ step: AuthStep.Email }));
    } catch (error) {
      // If there's an error checking the session, start with email step
      this.store.dispatch(UserActions.setCurrentStep({ step: AuthStep.Email }));
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
        this.store.dispatch(UserActions.setCurrentStep({ step: event.state.authStep }));
        
        // Reset flag after state change
        setTimeout(() => {
          this.isNavigatingBack = false;
        }, 100);
      }
    });
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
        
        this.store.dispatch(UserActions.setCurrentStep({ step: previousStep }));
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
  public navigateToStep(targetStep: AuthStep): void {
    if (this.isStepNavigationSafe(targetStep)) {
      this.isNavigatingBack = true;
      
      // Remove steps after the target step from history
      const targetIndex = this.stepHistory.indexOf(targetStep);
      if (targetIndex >= 0) {
        this.stepHistory = this.stepHistory.slice(0, targetIndex + 1);
      }
      
      // Clear any form errors before navigation
      this.clearFormErrors();
      
      this.store.dispatch(UserActions.setCurrentStep({ step: targetStep }));
      
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
  public isStepNavigationSafe(step: AuthStep): boolean {
    const destructiveSteps = [
      AuthStep.EmailVerify,
      AuthStep.MfaVerify,
      AuthStep.Complete
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
    this.store.dispatch(UserActions.signout());
    this.store.dispatch(UserActions.setCurrentStep({ step: AuthStep.Email }));
    
    // Update validators for the email step and ensure form is properly reset
    setTimeout(() => {
      this.updateValidators(AuthStep.Email);
      this.authForm.updateValueAndValidity({ emitEvent: true });
    }, 50);
    
    // Update browser history
    const url = this.router.url.split('?')[0];
    window.history.replaceState({ authStep: AuthStep.Email }, 'Sign In', url);
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
    const errorMap: Record<string, string> = {
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
  
  /**
   * Initialize touch device detection and optimizations
   */
  private initializeTouchOptimizations(): void {
    // Detect touch capability
    this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Detect orientation changes
    this.updateOrientationState();
    
    // Listen for orientation changes
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.updateOrientationState();
        this.adjustViewportForKeyboard();
      }, 100);
    });
    
    // Listen for resize events (keyboard show/hide)
    window.addEventListener('resize', () => {
      if (this.isTouchDevice) {
        this.adjustViewportForKeyboard();
      }
    });
    
    // Prevent double-tap zoom on buttons
    if (this.isTouchDevice) {
      this.preventDoubleTapZoom();
    }
  }
  
  /**
   * Update orientation state for layout adjustments
   */
  private updateOrientationState(): void {
    this.isLandscapeMode = window.innerWidth > window.innerHeight;
  }
  
  /**
   * Adjust viewport when virtual keyboard appears
   */
  private adjustViewportForKeyboard(): void {
    const viewport = document.querySelector('meta[name=viewport]');
    if (viewport && this.isTouchDevice) {
      // Get the initial viewport height
      const initialHeight = window.innerHeight;
      
      // Check if keyboard is likely open (significant height reduction)
      const currentHeight = window.innerHeight;
      const heightDifference = initialHeight - currentHeight;
      const isKeyboardOpen = heightDifference > 150; // 150px threshold
      
      if (isKeyboardOpen) {
        // Scroll focused element into view
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && activeElement.scrollIntoView) {
          setTimeout(() => {
            activeElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center'
            });
          }, 300);
        }
      }
    }
  }
  
  /**
   * Handle touch-specific focus behavior
   */
  private handleTouchFocus(fieldName: string): void {
    const fieldElement = document.getElementById(`${fieldName}-input`);
    if (fieldElement) {
      // Add visual feedback for touch focus
      fieldElement.classList.add('touch-focused');
      
      // Ensure field is visible when keyboard opens
      setTimeout(() => {
        this.ensureFieldVisibility(fieldElement);
      }, 100);
    }
  }
  
  /**
   * Handle touch-specific blur behavior
   */
  private handleTouchBlur(fieldName: string): void {
    const fieldElement = document.getElementById(`${fieldName}-input`);
    if (fieldElement) {
      fieldElement.classList.remove('touch-focused');
    }
  }
  
  /**
   * Ensure field remains visible when virtual keyboard opens
   */
  private ensureFieldVisibility(element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    // If field is below the fold when keyboard is open
    if (rect.bottom > viewportHeight * 0.6) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }
  
  /**
   * Prevent double-tap zoom on form elements
   */
  private preventDoubleTapZoom(): void {
    document.addEventListener('touchend', (event) => {
      const now = Date.now();
      const timeSinceLastTouch = now - this.lastTouchTime;
      
      if (timeSinceLastTouch < 300 && timeSinceLastTouch > 0) {
        // Potential double tap - prevent if on form element
        const target = event.target as HTMLElement;
        if (target && (
          target.tagName === 'INPUT' || 
          target.tagName === 'BUTTON' ||
          target.closest('.auth-flow__input-group-field') ||
          target.closest('.auth-flow__button')
        )) {
          event.preventDefault();
        }
      }
      
      this.lastTouchTime = now;
    });
  }
  
  /**
   * Handle touch start for gesture detection
   */
  public onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      this.touchStartY = event.touches[0].clientY;
    }
  }
  
  /**
   * Handle touch move for pull-to-refresh prevention
   */
  public onTouchMove(event: TouchEvent): void {
    if (event.touches.length === 1) {
      const touchY = event.touches[0].clientY;
      const deltaY = touchY - this.touchStartY;
      
      // Prevent pull-to-refresh when at top of form
      if (deltaY > 0 && window.scrollY === 0) {
        event.preventDefault();
      }
    }
  }
  
  /**
   * Get device-appropriate button text
   */
  public getResponsiveButtonText(baseText: string): string {
    if (this.isTouchDevice && baseText.length > 10) {
      // Shorten button text on mobile for better UX
      const shortTexts: Record<string, string> = {
        'Submit': 'Submit',
        'Continue': 'Next',
        'Verify Code': 'Verify',
        'Create Account': 'Sign Up',
        'Sign In': 'Sign In'
      };
      
      return shortTexts[baseText] || baseText;
    }
    
    return baseText;
  }
  
  /**
   * Check if device supports haptic feedback
   */
  public triggerHapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light'): void {
    if ('vibrate' in navigator && this.isTouchDevice) {
      // Different vibration patterns for different feedback types
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      };
      
      navigator.vibrate(patterns[type]);
    }
  }

  // ============ Loading States and Skeleton Screens ============

  /**
   * Show step transition loading overlay
   */
  private showStepTransition(message = 'Loading...'): void {
    this.isStepTransitioning = true;
    this.loadingMessage = message;
  }

  /**
   * Hide step transition loading overlay
   */
  private hideStepTransition(): void {
    this.isStepTransitioning = false;
    this.loadingMessage = '';
  }

  /**
   * Show skeleton screen for specific component
   */
  public showSkeleton(type: keyof typeof this.skeletonStates): void {
    this.skeletonStates[type] = true;
  }

  /**
   * Hide skeleton screen for specific component
   */
  public hideSkeleton(type: keyof typeof this.skeletonStates): void {
    this.skeletonStates[type] = false;
  }

  /**
   * Show validation loading state for specific field
   */
  public showValidationLoading(fieldName: string): void {
    this.validationLoadingStates[fieldName] = true;
  }

  /**
   * Hide validation loading state for specific field
   */
  public hideValidationLoading(fieldName: string): void {
    this.validationLoadingStates[fieldName] = false;
  }

  /**
   * Update button progress for long-running operations
   */
  public updateButtonProgress(progress: number): void {
    this.buttonProgress = Math.max(0, Math.min(100, progress));
  }

  /**
   * Reset all loading states
   */
  private resetLoadingStates(): void {
    this.isStepTransitioning = false;
    this.validationLoadingStates = {};
    this.qrCodeLoading = false;
    this.buttonProgress = 0;
    this.showSkeletonScreens = false;
    this.loadingMessage = '';
    
    Object.keys(this.skeletonStates).forEach(key => {
      this.skeletonStates[key as keyof typeof this.skeletonStates] = false;
    });
  }

  /**
   * Enhanced step navigation with loading states
   */
  public navigateToStepWithLoading(step: AuthStep, message?: string): void {
    // Show loading state
    this.showStepTransition(message || this.getStepTransitionMessage(step));
    
    // Small delay to show loading state
    setTimeout(() => {
      this.store.dispatch(UserActions.setCurrentStep({ step }));
      this.hideStepTransition();
    }, 600);
  }

  /**
   * Get appropriate loading message for step transition
   */
  private getStepTransitionMessage(step: AuthStep): string {
    const messages: Partial<Record<AuthStep, string>> = {
      [AuthStep.EmailEntry]: 'Preparing email entry...',
      [AuthStep.Email]: 'Preparing email verification...',
      [AuthStep.Password]: 'Loading password form...',
      [AuthStep.PasswordVerify]: 'Verifying password...',
      [AuthStep.PasswordSetup]: 'Setting up password...',
      [AuthStep.EmailVerify]: 'Setting up verification...',
      [AuthStep.Signin]: 'Preparing sign in...',
      [AuthStep.MfaSetup]: 'Preparing security setup...',
      [AuthStep.MfaVerify]: 'Loading verification...',
      [AuthStep.PasswordReset]: 'Preparing password reset...',
      [AuthStep.PasswordResetVerify]: 'Verifying reset code...',
      [AuthStep.PasswordResetConfirm]: 'Confirming new password...',
      [AuthStep.Complete]: 'Completing setup...'
    };
    
    return messages[step] || 'Loading...';
  }

  /**
   * Enhanced form submission with progress tracking
   */
  public submitFormWithProgress(): void {
    if (!this.authForm.valid) return;
    
    // Start progress tracking
    this.updateButtonProgress(10);
    
    // Simulate progress updates (replace with actual progress from API)
    const progressInterval = setInterval(() => {
      this.buttonProgress += 15;
      if (this.buttonProgress >= 90) {
        clearInterval(progressInterval);
      }
    }, 200);
    
    // Call original submit method
    this.onSubmit();
    
    // Reset progress when loading completes
    this.isLoading$.pipe(
      filter(loading => !loading),
      take(1)
    ).subscribe(() => {
      clearInterval(progressInterval);
      this.updateButtonProgress(100);
      setTimeout(() => this.updateButtonProgress(0), 500);
    });
  }

  /**
   * Generate QR code for MFA setup
   */
  public async generateQRCode(): Promise<void> {
    try {
      const QRCode = (await import('qrcode')).default;
      const details = await this.mfaSetupDetails$.pipe(take(1)).toPromise();
      
      if (!details?.secretKey || !details?.qrCode) {
        return;
      }
      
      const qrUrl = details.setupUri?.toString() || '';
      const options = {
        width: 200,
        margin: 2,
        errorCorrectionLevel: 'M'
      } as QRCodeToDataURLOptions;
      
      this.qrCodeDataUrl = await QRCode.toDataURL(qrUrl, options);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  }

  /**
   * Enhanced QR code loading with skeleton
   */
  public loadQRCodeWithSkeleton(): void {
    this.qrCodeLoading = true;
    this.showSkeleton('qrCode');
    
    // Simulate QR code generation delay
    setTimeout(() => {
      this.generateQRCode();
      this.qrCodeLoading = false;
      this.hideSkeleton('qrCode');
    }, 1500);
  }

  /**
   * Enhanced field validation with loading indicators
   */
  public validateFieldWithLoading(fieldName: string): void {
    this.showValidationLoading(fieldName);
    
    // Perform validation (existing logic)
    const control = this.authForm.get(fieldName);
    if (control) {
      // Simulate async validation delay
      setTimeout(() => {
        control.updateValueAndValidity();
        this.hideValidationLoading(fieldName);
      }, 800);
    }
  }

  /**
   * Check if any loading state is active
   */
  public isAnyLoadingActive(): boolean {
    return this.isStepTransitioning || 
           this.qrCodeLoading || 
           Object.values(this.validationLoadingStates).some(loading => loading) ||
           Object.values(this.skeletonStates).some(skeleton => skeleton);
  }

  /**
   * Get skeleton items for current step
   */
  public getSkeletonItems(): {type: string, class: string}[] {
    // Return skeleton configuration based on current step
    return [
      { type: 'input', class: 'auth-flow__skeleton auth-flow__skeleton--input' },
      { type: 'input', class: 'auth-flow__skeleton auth-flow__skeleton--input' },
      { type: 'button', class: 'auth-flow__skeleton auth-flow__skeleton--button' }
    ];
  }

  /**
   * WCAG 4.1.3 Status Message Helper Methods for Screen Reader Announcements
   */
  
  /**
   * Check if any field validation is in progress
   */
  public isValidationInProgress(): boolean {
    return Object.values(this.validationLoadingStates).some(loading => loading);
  }

  /**
   * Check if form processing is active
   */
  public isFormProcessing(): boolean {
    // Check if any authentication processing is active
    let isProcessing = false;
    this.isLoading$.pipe(take(1)).subscribe(loading => isProcessing = loading);
    return isProcessing;
  }

  /**
   * Announce success message for screen readers
   */
  public announceSuccess(message: string, duration = 3000): void {
    this.successMessage = message;
    this.showSuccessMessage = true;
    
    // Clear the message after specified duration
    setTimeout(() => {
      this.showSuccessMessage = false;
      this.successMessage = '';
    }, duration);
  }

  /**
   * Validate field in real-time with enhanced error handling
   */
  private validateFieldRealTime(fieldName: string): void {
    try {
      const control = this.authForm.get(fieldName);
      if (!control) return;
      
      // Mark field as loading during validation
      this.validationLoadingStates[fieldName] = true;
      
      // Perform validation
      control.updateValueAndValidity({ emitEvent: false });
      
      // Clear loading state
      setTimeout(() => {
        this.validationLoadingStates[fieldName] = false;
      }, 200);
      
    } catch (error) {
      this.errorHandler.captureValidationError(
        'validateFieldRealTime',
        error,
        'AuthFlowComponent',
        fieldName
      );
      
      // Clear loading state on error
      this.validationLoadingStates[fieldName] = false;
    }
  }

  /**
   * Track step history for navigation
   */
  private trackStepHistory(step: AuthStep): void {
    try {
      if (!this.isNavigatingBack) {
        // Add to history if not navigating back
        this.stepHistory.push(step);
        
        // Keep history reasonable size
        if (this.stepHistory.length > 10) {
          this.stepHistory = this.stepHistory.slice(-10);
        }
      } else {
        this.isNavigatingBack = false;
      }
    } catch (error) {
      this.errorHandler.captureError({
        type: 'system',
        severity: 'low',
        message: 'Step history tracking failed',
        component: 'AuthFlowComponent',
        operation: 'trackStepHistory',
        error
      });
    }
  }

  /**
   * Update browser history for navigation
   */
  private updateBrowserHistory(step: AuthStep): void {
    try {
      // Update URL without navigation to reflect current step
      const stepUrl = this.getUrlForStep(step);
      if (stepUrl && stepUrl !== this.router.url) {
        this.location.replaceState(stepUrl);
      }
    } catch (error) {
      this.errorHandler.captureError({
        type: 'system',
        severity: 'low',
        message: 'Browser history update failed',
        component: 'AuthFlowComponent',
        operation: 'updateBrowserHistory',
        error
      });
    }
  }

  /**
   * Get URL for auth step
   */
  private getUrlForStep(step: AuthStep): string {
    const stepUrls: Partial<Record<AuthStep, string>> = {
      [AuthStep.EmailEntry]: '/authenticate',
      [AuthStep.Email]: '/authenticate',
      [AuthStep.Password]: '/authenticate/password',
      [AuthStep.PasswordVerify]: '/authenticate/password',
      [AuthStep.PasswordSetup]: '/authenticate/setup',
      [AuthStep.EmailVerify]: '/authenticate/verify-email',
      [AuthStep.Signin]: '/authenticate/signin',
      [AuthStep.MfaSetup]: '/authenticate/mfa-setup',
      [AuthStep.MfaVerify]: '/authenticate/mfa-verify',
      [AuthStep.PasswordReset]: '/authenticate/reset',
      [AuthStep.PasswordResetVerify]: '/authenticate/reset-verify',
      [AuthStep.PasswordResetConfirm]: '/authenticate/reset-confirm',
      [AuthStep.Complete]: '/authenticate/complete'
    };
    
    return stepUrls[step] || '/authenticate';
  }

  /**
   * Focus current step input for accessibility
   */
  private focusCurrentStepInput(step: AuthStep): void {
    try {
      setTimeout(() => {
        const focusMap: Partial<Record<AuthStep, string>> = {
          [AuthStep.EmailEntry]: 'email',
          [AuthStep.Email]: 'email',
          [AuthStep.Password]: 'password',
          [AuthStep.PasswordVerify]: 'password',
          [AuthStep.PasswordSetup]: 'password',
          [AuthStep.EmailVerify]: 'emailCode',
          [AuthStep.Signin]: 'password',
          [AuthStep.MfaSetup]: 'submit',
          [AuthStep.MfaVerify]: 'mfaCode',
          [AuthStep.PasswordReset]: 'email',
          [AuthStep.PasswordResetVerify]: 'emailCode',
          [AuthStep.PasswordResetConfirm]: 'password',
          [AuthStep.Complete]: 'submit'
        };
        
        const fieldToFocus = focusMap[step];
        if (fieldToFocus && fieldToFocus !== 'submit') {
          const element = document.querySelector(`[formControlName="${fieldToFocus}"]`) as HTMLElement;
          if (element) {
            element.focus();
          }
        }
      }, 100);
    } catch (error) {
      this.errorHandler.captureError({
        type: 'user',
        severity: 'low',
        message: 'Focus management failed',
        component: 'AuthFlowComponent',
        operation: 'focusCurrentStepInput',
        error
      });
    }
  }

  /**
   * Announce step change for screen readers
   */
  private announceStepChange(step: AuthStep): void {
    try {
      const announcements: Partial<Record<AuthStep, string>> = {
        [AuthStep.EmailEntry]: 'Email entry step loaded',
        [AuthStep.Email]: 'Email step loaded',
        [AuthStep.Password]: 'Password step loaded',
        [AuthStep.PasswordVerify]: 'Password verification step loaded',
        [AuthStep.PasswordSetup]: 'Password setup step loaded',
        [AuthStep.EmailVerify]: 'Email verification step loaded',
        [AuthStep.Signin]: 'Sign in step loaded',
        [AuthStep.MfaSetup]: 'MFA setup step loaded',
        [AuthStep.MfaVerify]: 'MFA verification step loaded',
        [AuthStep.PasswordReset]: 'Password reset step loaded',
        [AuthStep.PasswordResetVerify]: 'Password reset verification loaded',
        [AuthStep.PasswordResetConfirm]: 'Password reset confirmation loaded',
        [AuthStep.Complete]: 'Authentication complete'
      };
      
      const announcement = announcements[step];
      if (announcement) {
        // Use ARIA live region for announcement
        const liveRegion = document.getElementById('auth-step-announcer');
        if (liveRegion) {
          liveRegion.textContent = announcement;
        }
      }
    } catch (error) {
      this.errorHandler.captureError({
        type: 'user',
        severity: 'low',
        message: 'Step announcement failed',
        component: 'AuthFlowComponent',
        operation: 'announceStepChange',
        error
      });
    }
  }

  /**
   * Go to previous step in authentication flow
   */
  public goToPreviousStep(): void {
    try {
      if (this.stepHistory.length > 1) {
        // Remove current step
        this.stepHistory.pop();
        
        // Get previous step
        const previousStep = this.stepHistory[this.stepHistory.length - 1];
        
        // Mark as navigating back
        this.isNavigatingBack = true;
        
        // Dispatch action to change step
        this.store.dispatch(UserActions.setCurrentStep({ step: previousStep }));
      }
    } catch (error) {
      this.errorHandler.captureError({
        type: 'user',
        severity: 'medium',
        message: 'Previous step navigation failed',
        component: 'AuthFlowComponent',
        operation: 'goToPreviousStep',
        error,
        recoverable: true,
        recoveryActions: ['Refresh page', 'Try again']
      });
    }
  }

  /**
   * Handle error retry action
   */
  public onErrorRetry(): void {
    try {
      // Retry the last attempted operation
      if (this.authForm.valid) {
        this.onSubmit();
      } else {
        // If form is invalid, focus the first invalid field
        this.focusFirstInvalidField();
      }
    } catch (error) {
      this.errorHandler.captureError({
        type: 'user',
        severity: 'medium',
        message: 'Error retry failed',
        component: 'AuthFlowComponent',
        operation: 'onErrorRetry',
        error
      });
    }
  }

  /**
   * Check if error message is a session refresh message
   */
  public isSessionRefreshMessage(error: string): boolean {
    if (!error) return false;
    const lowerError = error.toLowerCase();
    return lowerError.includes('refreshing your session') || 
           lowerError.includes('please wait while we sign you in');
  }

  /**
   * Check if error message is actually a success message
   */
  public isSuccessMessage(error: string): boolean {
    if (!error) return false;
    const lowerError = error.toLowerCase();
    return lowerError.includes('welcome back') || 
           lowerError.includes('successfully signed in');
  }

  /**
   * Get appropriate title for error display
   */
  public getErrorTitle(error: string): string {
    if (this.isSessionRefreshMessage(error)) {
      return 'Refreshing Session';
    } else if (this.isSuccessMessage(error)) {
      return 'Success';
    } else {
      return 'Authentication Error';
    }
  }

  /**
   * Get appropriate button text for error display
   */
  public getRetryButtonText(error: string): string {
    if (this.isSessionRefreshMessage(error)) {
      return 'Please Wait...';
    } else if (this.isSuccessMessage(error)) {
      return 'Continue';
    } else {
      return 'Try Again';
    }
  }

  /**
   * Focus the first invalid field for accessibility
   */
  private focusFirstInvalidField(): void {
    try {
      const invalidControl = Object.keys(this.authForm.controls).find(key => {
        const control = this.authForm.get(key);
        return control && control.invalid && control.enabled;
      });
      
      if (invalidControl) {
        const element = document.querySelector(`[formControlName="${invalidControl}"]`) as HTMLElement;
        if (element) {
          element.focus();
        }
      }
    } catch (error) {
      this.errorHandler.captureError({
        type: 'user',
        severity: 'low',
        message: 'Focus invalid field failed',
        component: 'AuthFlowComponent',
        operation: 'focusFirstInvalidField',
        error
      });
    }
  }

  /**
   * Create user - Cognito uses email as username
   */
  private createUserWithCognito(password: string): void {
    const now = new Date();
    
    const userInput = {
      userId: '', // Will be set from Cognito sub
      cognitoId: '', // Will be set from Cognito sub
      cognitoSub: '', // Will be set from Cognito response
      email: this.authForm.value.email,
      firstName: this.authForm.value.firstName || '',
      lastName: this.authForm.value.lastName || '',
      phoneNumber: this.authForm.value.phoneNumber,
      groups: [UserGroup.User],
      status: UserStatus.Pending,
      createdAt: now,
      phoneVerified: false,
      emailVerified: false,
      mfaEnabled: false,
      mfaSetupComplete: false,
      updatedAt: now
    };

    this.store.dispatch(UserActions.createUser({input: userInput, password: password}));
  }


}
