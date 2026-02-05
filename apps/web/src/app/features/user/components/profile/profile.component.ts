import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { Observable, Subject, takeUntil, take } from 'rxjs';
import { IUsers, Users } from '../../../../core/models/UsersModel';
import * as fromUser from '../../store/user.selectors';
import { UserActions } from '../../store/user.actions';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { RouterModule } from '@angular/router';
import { StatusBadgeComponent } from '../../../../shared/components/ui/status-badge.component';
import { UserStatus } from '../../../../core/enums/UserStatusEnum';
import { DebugLogService, DebugLogEntry } from '../../../../core/services/debug-log.service';
import { ProgressStepsComponent, ProgressStep } from '../../../../shared/components/progress-steps/progress-steps.component';
import { VerificationCodeInputComponent } from '../../../../shared/components/verification-code-input/verification-code-input.component';
import { DebugPanelComponent, DebugContext } from '../../../../shared/components/debug/debug-panel.component';
import { ProfileSetupStep } from '../../../../core/enums/ProfileSetupStepEnum';
import { HeroSplitComponent } from '../../../../shared/components/hero-split/hero-split.component';

// Re-export the generated enum for external use
export { ProfileSetupStep } from '../../../../core/enums/ProfileSetupStepEnum';

/**
 * Profile setup state interface
 */
export interface ProfileSetupState {
  currentStep: ProfileSetupStep;
  isFlowMode: boolean;     // true = step-by-step flow, false = summary view
  startFromBeginning: boolean; // true = edit all, false = skip completed
}

/**
 * Phone verification state interface
 */
export interface PhoneVerificationState {
  codeSent: boolean;
  codeExpiration: Date | null;
  error: string | null;
  cooldownUntil: Date | null;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FontAwesomeModule,
    RouterModule,
    StatusBadgeComponent,
    ProgressStepsComponent,
    VerificationCodeInputComponent,
    DebugPanelComponent,
    HeroSplitComponent,
  ]
})
export class ProfileComponent implements OnInit, OnDestroy {
  currentUser$: Observable<IUsers | null>;
  isLoading$: Observable<boolean>;
  error$: Observable<string | null>;
  debugMode$: Observable<boolean>;
  profileForm: FormGroup;
  isEditMode = false;
  private destroy$ = new Subject<void>();

  // Debug log state (matching auth-flow)
  debugLogs$: Observable<DebugLogEntry[]>;

  // Current user snapshot for debug context
  private currentUserSnapshot: IUsers | null = null;

  // Profile setup flow state
  setupState: ProfileSetupState = {
    currentStep: ProfileSetupStep.Name,
    isFlowMode: false,
    startFromBeginning: true
  };

  // Phone verification state
  phoneVerificationState: PhoneVerificationState = {
    codeSent: false,
    codeExpiration: null,
    error: null,
    cooldownUntil: null
  };

  // Separate forms for each step
  nameForm!: FormGroup;
  phoneForm!: FormGroup;
  verifyForm!: FormGroup;

  // Expose enum to template
  ProfileSetupStep = ProfileSetupStep;

  // Profile setup steps configuration for shared component
  profileSteps: ProgressStep[] = [
    { number: 1, label: 'Name' },
    { number: 2, label: 'Phone' },
    { number: 3, label: 'Verify' }
  ];

  /**
   * Get the verification code form control with proper typing
   */
  get verificationCodeControl(): FormControl<string> {
    return this.verifyForm.get('verificationCode') as FormControl<string>;
  }

  /**
   * Get current step number for progress component
   */
  getCurrentStepNumber(): number {
    switch (this.setupState.currentStep) {
      case ProfileSetupStep.Name: return 1;
      case ProfileSetupStep.Phone: return 2;
      case ProfileSetupStep.PhoneVerify: return 3;
      case ProfileSetupStep.Complete: return 3;
      default: return 1;
    }
  }

  constructor(
    private store: Store,
    private actions$: Actions,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private debugLogService: DebugLogService
  ) {
    this.currentUser$ = this.store.select(fromUser.selectCurrentUser);
    this.isLoading$ = this.store.select(fromUser.selectIsLoading);
    this.error$ = this.store.select(fromUser.selectError);
    this.debugMode$ = this.store.select(fromUser.selectDebugMode);
    this.debugLogs$ = this.debugLogService.logs$;

    // Keep a snapshot of current user for debug context
    this.currentUser$.subscribe(user => this.currentUserSnapshot = user);
    
    // Initialize the legacy form with empty values and properly disabled controls
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: [{value: '', disabled: true}], // Email is always disabled
      phoneNumber: [{value: '', disabled: true}] // Phone number is managed through auth flow, not profile
    });

    // Initialize step-based forms
    this.initForms();

    // Subscribe to profile update success for navigation
    this.actions$.pipe(
      ofType(UserActions.updateProfileSuccess),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      // If in flow mode, advance to next step
      if (this.setupState.isFlowMode && this.setupState.currentStep !== ProfileSetupStep.Complete) {
        // Step advancement is handled in the submit methods
      }
    });

    // Subscribe to phone setup success
    this.actions$.pipe(
      ofType(UserActions.setupPhoneSuccess),
      takeUntil(this.destroy$)
    ).subscribe(({ expiresAt }) => {
      this.phoneVerificationState.codeSent = true;
      this.phoneVerificationState.codeExpiration = new Date(expiresAt);
      this.phoneVerificationState.cooldownUntil = new Date(Date.now() + 60 * 1000);
    });

    // Subscribe to phone setup failure
    this.actions$.pipe(
      ofType(UserActions.setupPhoneFailure),
      takeUntil(this.destroy$)
    ).subscribe(({ error }) => {
      this.phoneVerificationState.error = error;
    });

    // Subscribe to phone verification success
    this.actions$.pipe(
      ofType(UserActions.verifyPhoneSuccess),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      // Phone verified, show summary
      this.showSummary();
    });

    // Subscribe to phone verification failure
    this.actions$.pipe(
      ofType(UserActions.verifyPhoneFailure),
      takeUntil(this.destroy$)
    ).subscribe(({ error }) => {
      this.phoneVerificationState.error = error;
    });
  }

  /**
   * Debug context getter for shared DebugPanelComponent
   */
  get debugContext(): DebugContext {
    const user = this.currentUserSnapshot;
    return {
      page: 'Profile',
      step: this.setupState.currentStep,
      email: user?.email,
      userExists: !!user,
      emailVerified: user?.emailVerified,
      phoneVerified: user?.phoneVerified,
      mfaEnabled: user?.mfaEnabled,
      status: user?.status,
      formState: {
        nameFormValid: this.nameForm?.valid,
        phoneFormValid: this.phoneForm?.valid,
        verifyFormValid: this.verifyForm?.valid,
        isLoading: 'see store'
      },
      storeState: {
        flowMode: this.setupState.isFlowMode,
        currentStep: this.setupState.currentStep,
        startFromBeginning: this.setupState.startFromBeginning,
        progress: this.getProgressPercentage()
      },
      additionalSections: [
        {
          title: 'Phone Verification State',
          data: {
            codeSent: this.phoneVerificationState.codeSent,
            error: this.phoneVerificationState.error || 'None',
            canResend: this.canResendCode()
          }
        }
      ]
    };
  }
  
  ngOnInit(): void {
    // Handle query parameters for flow mode
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['mode'] === 'setup') {
          if (params['startFrom'] === 'incomplete') {
            // Dashboard link - skip to first incomplete step
            this.startFromIncomplete();
          } else {
            // Full flow
            this.startFullFlow();
          }
        }
      });

    // Check if we have a user in the store
    this.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          // User exists, update the forms
          this.profileForm.patchValue({
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email || '',
            phoneNumber: user.phoneNumber || ''
          });
          
          // Update step-based forms
          this.nameForm.patchValue({
            firstName: user.firstName || '',
            lastName: user.lastName || ''
          });
          
          this.phoneForm.patchValue({
            phoneNumber: user.phoneNumber || ''
          });
        } else {
          // No user, redirect to authentication page
          this.router.navigate(['/authenticate']);
        }
      });
  }

  /**
   * Initialize forms for each step
   */
  private initForms(): void {
    this.nameForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]]
    });
    
    // E.164 format: + followed by 1-15 digits, first digit non-zero
    this.phoneForm = this.fb.group({
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\+[1-9]\d{0,14}$/)]]
    });
    
    this.verifyForm = this.fb.group({
      verificationCode: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6), Validators.pattern(/^\d{6}$/)]]
    });
  }

  // ============================================
  // Flow Navigation Methods
  // ============================================

  /**
   * Start full flow - "Edit Profile" button
   * Goes through all steps regardless of completion
   */
  startFullFlow(): void {
    this.setupState = {
      currentStep: ProfileSetupStep.Name,
      isFlowMode: true,
      startFromBeginning: true
    };
    this.isEditMode = true;
    
    // Reset phone verification state
    this.phoneVerificationState = {
      codeSent: false,
      codeExpiration: null,
      error: null,
      cooldownUntil: null
    };
  }

  /**
   * Start from first incomplete step - Dashboard link
   * Skips completed steps
   */
  async startFromIncomplete(): Promise<void> {
    const user = await this.getCurrentUser();
    const firstIncomplete = this.getFirstIncompleteStep(user);
    
    this.setupState = {
      currentStep: firstIncomplete,
      isFlowMode: true,
      startFromBeginning: false
    };
    this.isEditMode = true;
    
    // Reset phone verification state
    this.phoneVerificationState = {
      codeSent: false,
      codeExpiration: null,
      error: null,
      cooldownUntil: null
    };
  }

  /**
   * Show summary view (exit flow mode)
   */
  showSummary(): void {
    this.setupState = {
      currentStep: ProfileSetupStep.Complete,
      isFlowMode: false,
      startFromBeginning: true
    };
    this.isEditMode = false;
  }

  /**
   * Navigate to next step in the flow
   */
  nextStep(): void {
    const steps = [ProfileSetupStep.Name, ProfileSetupStep.Phone, ProfileSetupStep.PhoneVerify, ProfileSetupStep.Complete];
    const currentIndex = steps.indexOf(this.setupState.currentStep);
    
    if (currentIndex < steps.length - 1) {
      this.setupState.currentStep = steps[currentIndex + 1];
      
      // If we reached COMPLETE, exit flow mode
      if (this.setupState.currentStep === ProfileSetupStep.Complete) {
        this.showSummary();
      }
    }
  }

  /**
   * Navigate to previous step in the flow
   */
  previousStep(): void {
    const steps = [ProfileSetupStep.Name, ProfileSetupStep.Phone, ProfileSetupStep.PhoneVerify, ProfileSetupStep.Complete];
    const currentIndex = steps.indexOf(this.setupState.currentStep);
    
    if (currentIndex > 0) {
      this.setupState.currentStep = steps[currentIndex - 1];
    }
  }

  /**
   * Skip to a specific step
   */
  skipToStep(step: ProfileSetupStep): void {
    this.setupState.currentStep = step;
  }

  /**
   * Get the first incomplete step for a user
   */
  getFirstIncompleteStep(user: IUsers | null): ProfileSetupStep {
    if (!user) {
      return ProfileSetupStep.Name;
    }
    
    // Check name
    if (!user.firstName || !user.lastName) {
      return ProfileSetupStep.Name;
    }
    
    // Check phone
    if (!user.phoneNumber) {
      return ProfileSetupStep.Phone;
    }
    
    // Check phone verification
    if (!user.phoneVerified) {
      return ProfileSetupStep.PhoneVerify;
    }
    
    // All complete
    return ProfileSetupStep.Complete;
  }

  /**
   * Check if a step is complete for a user
   */
  isStepComplete(step: ProfileSetupStep, user: IUsers | null): boolean {
    if (!user) return false;
    
    switch (step) {
      case ProfileSetupStep.Name:
        return !!(user.firstName && user.lastName);
      case ProfileSetupStep.Phone:
        return !!user.phoneNumber;
      case ProfileSetupStep.PhoneVerify:
        return !!user.phoneVerified;
      case ProfileSetupStep.Complete:
        return !!(user.firstName && user.lastName && user.phoneNumber && user.phoneVerified);
      default:
        return false;
    }
  }

  /**
   * Get progress percentage for the flow
   */
  getProgressPercentage(): number {
    const steps = [ProfileSetupStep.Name, ProfileSetupStep.Phone, ProfileSetupStep.PhoneVerify, ProfileSetupStep.Complete];
    const currentIndex = steps.indexOf(this.setupState.currentStep);
    return Math.round((currentIndex / (steps.length - 1)) * 100);
  }

  /**
   * Get step number (1-based)
   */
  getStepNumber(): number {
    const steps = [ProfileSetupStep.Name, ProfileSetupStep.Phone, ProfileSetupStep.PhoneVerify, ProfileSetupStep.Complete];
    return steps.indexOf(this.setupState.currentStep) + 1;
  }

  /**
   * Get total number of steps
   */
  getTotalSteps(): number {
    return 3; // NAME, PHONE, PHONE_VERIFY (COMPLETE is not a step)
  }

  // ============================================
  // Step Submission Methods
  // ============================================

  /**
   * Submit the name step
   */
  async submitNameStep(): Promise<void> {
    if (this.nameForm.invalid) {
      Object.keys(this.nameForm.controls).forEach(key => {
        this.nameForm.get(key)?.markAsTouched();
      });
      return;
    }

    const user = await this.getCurrentUser();
    if (!user || !user.userId) {
      console.error('Cannot update profile: No user ID available');
      return;
    }

    const formValues = this.nameForm.value;
    const updateInput = new Users({
      userId: user.userId,
      cognitoId: user.cognitoId,
      cognitoSub: user.cognitoSub,
      email: user.email,
      emailVerified: user.emailVerified,
      phoneNumber: user.phoneNumber,
      phoneVerified: user.phoneVerified,
      firstName: formValues.firstName?.trim(),
      lastName: formValues.lastName?.trim(),
      groups: user.groups,
      status: user.status,
      mfaEnabled: user.mfaEnabled || false,
      mfaSetupComplete: user.mfaSetupComplete || false,
      createdAt: user.createdAt,
      updatedAt: new Date(),
    });

    // Dispatch action - effect handles service call
    this.store.dispatch(UserActions.updateProfile({ input: updateInput }));
    
    // Move to next step (effect will update the store)
    this.nextStep();
  }

  /**
   * Submit the phone step
   */
  async submitPhoneStep(): Promise<void> {
    if (this.phoneForm.invalid) {
      Object.keys(this.phoneForm.controls).forEach(key => {
        this.phoneForm.get(key)?.markAsTouched();
      });
      return;
    }

    const user = await this.getCurrentUser();
    if (!user || !user.userId) {
      console.error('Cannot update profile: No user ID available');
      return;
    }

    const formValues = this.phoneForm.value;
    const phoneNumber = formValues.phoneNumber?.trim();
    
    const updateInput = new Users({
      userId: user.userId,
      cognitoId: user.cognitoId,
      cognitoSub: user.cognitoSub,
      email: user.email,
      emailVerified: user.emailVerified,
      phoneNumber: phoneNumber,
      phoneVerified: false, // Phone is not verified yet
      firstName: user.firstName,
      lastName: user.lastName,
      groups: user.groups,
      status: user.status,
      mfaEnabled: user.mfaEnabled || false,
      mfaSetupComplete: user.mfaSetupComplete || false,
      createdAt: user.createdAt,
      updatedAt: new Date(),
    });

    // Dispatch action to update profile - effect handles service call
    this.store.dispatch(UserActions.updateProfile({ input: updateInput }));
    
    // Move to PHONE_VERIFY step
    this.nextStep();
    this.phoneVerificationState.codeSent = true;
    this.phoneVerificationState.codeExpiration = new Date(Date.now() + 10 * 60 * 1000);
    
    // Dispatch action to send verification code - effect handles service call
    this.store.dispatch(UserActions.setupPhone({ phoneNumber }));
  }

  /**
   * Submit the verification step
   */
  async submitVerifyStep(): Promise<void> {
    if (this.verifyForm.invalid) {
      Object.keys(this.verifyForm.controls).forEach(key => {
        this.verifyForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.phoneVerificationState.error = null;

    const code = this.verifyForm.get('verificationCode')?.value;
    
    // Dispatch action to verify phone - effect handles service call and user update
    this.store.dispatch(UserActions.verifyPhone({ code }));
  }

  // ============================================
  // Phone Verification Methods
  // ============================================

  /**
   * Send verification code to user's phone
   */
  async sendVerificationCode(): Promise<void> {
    this.phoneVerificationState.error = null;

    const user = await this.getCurrentUser();
    
    if (!user?.phoneNumber) {
      this.phoneVerificationState.error = 'No phone number available';
      return;
    }

    // Dispatch action - effect handles service call
    this.store.dispatch(UserActions.setupPhone({ phoneNumber: user.phoneNumber }));
  }

  /**
   * Check if user can resend verification code
   */
  canResendCode(): boolean {
    if (!this.phoneVerificationState.cooldownUntil) {
      return true;
    }
    return new Date() > this.phoneVerificationState.cooldownUntil;
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  /**
   * Checks if a field is invalid and has been touched or dirty
   */
  isFieldInvalid(fieldName: string): boolean {
    const field = this.profileForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }
  
  /**
   * Gets error message for a form field
   */
  getErrorMessage(fieldName: string): string {
    const control = this.profileForm.get(fieldName);
    if (!control || !control.errors) return '';
    
    if (control.errors['required']) {
      return `${this.formatFieldName(fieldName)} is required`;
    }
    
    if (control.errors['minlength']) {
      return `${this.formatFieldName(fieldName)} must be at least ${control.errors['minlength'].requiredLength} characters`;
    }
    
    if (control.errors['pattern']) {
      if (fieldName === 'phoneNumber') {
        return 'Phone number must be in international format (e.g., +12025550123)';
      }
      return `${this.formatFieldName(fieldName)} has an invalid format`;
    }
    
    return 'Invalid field';
  }
  
  /**
   * Formats a camelCase field name to display format
   */
  private formatFieldName(fieldName: string): string {
    // Convert camelCase to words with spaces and capitalize first letter of each word
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  }
  
  /**
   * Format a date string, timestamp, or Date object
   */
  formatDate(dateValue: string | number | Date): string {
    if (!dateValue) return 'N/A';
    
    try {
      let date: Date;
      if (dateValue instanceof Date) {
        date = dateValue;
      } else if (typeof dateValue === 'number') {
        // If it's a timestamp (number), convert to Date
        date = new Date(dateValue);
      } else {
        // If it's a string, parse it as a Date
        date = new Date(dateValue);
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      // If all else fails, return the original value as a string
      return String(dateValue);
    }
  }
  
  /**
   * Reset the form to its original values
   */
  resetForm(): void {
    this.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          this.profileForm.patchValue({
            firstName: user.firstName || '',
            lastName: user.lastName || ''
          });
          this.profileForm.markAsPristine();
        }
      });
  }
  
  /**
   * Handle form submission
   */
  async onSubmit(): Promise<void> {
    if (this.profileForm.invalid) {
      // Mark all fields as touched to trigger validation display
      Object.keys(this.profileForm.controls).forEach(key => {
        const control = this.profileForm.get(key);
        control?.markAsTouched();
      });
      return;
    }
    
    // Get current user to retrieve the userId
    const user = await this.getCurrentUser();
    
    if (!user || !user.userId) {
      console.error('Cannot update profile: No user ID available');
      return;
    }
    
    // Create update input from form values
    const formValues = this.profileForm.value;
    const updateInput = new Users({
      userId: user.userId,
      cognitoId: user.cognitoId,
      cognitoSub: user.cognitoSub,
      email: user.email,
      emailVerified: user.emailVerified,
      phoneNumber: user.phoneNumber,
      phoneVerified: user.phoneVerified,
      firstName: formValues.firstName?.trim() || user.firstName,
      lastName: formValues.lastName?.trim() || user.lastName,
      groups: user.groups,
      status: user.status,
      mfaEnabled: user.mfaEnabled || false,
      mfaSetupComplete: user.mfaSetupComplete || false,
      createdAt: user.createdAt,
      updatedAt: new Date(),
    });
    
    // Dispatch action - effect handles service call
    this.store.dispatch(UserActions.updateProfile({ input: updateInput }));
    
    // Mark form as pristine after dispatch
    this.profileForm.markAsPristine();
    
    // Exit edit mode
    this.onFormSuccess();
  }
  
  /**
   * Get the current user as a promise
   * Uses take(1) to complete after first emission, matching auth-flow pattern
   */
  private async getCurrentUser(): Promise<IUsers | null> {
    const user = await this.currentUser$.pipe(take(1)).toPromise();
    return user ?? null;
  }
  
  /**
   * Public method to check if a user is valid
   * @param user The user to check
   * @returns True if the user has all required attributes and is ACTIVE, false otherwise
   */
  public isUserValid(user: IUsers | null): boolean {
    if (!user) return false;
    
    // User is valid if they have all required attributes and are ACTIVE
    const hasRequiredFields = 
      !!user.email &&
      !!user.firstName &&
      !!user.lastName &&
      !!user.phoneNumber &&
      !!user.emailVerified &&
      !!user.phoneVerified &&
      !!user.mfaEnabled &&
      !!user.mfaSetupComplete;
    
    return hasRequiredFields && user.status === UserStatus.Active;
  }
  
  /**
   * Sign out the current user
   */
  public signOut(): void {
    this.store.dispatch(UserActions.signout());
  }

  /**
   * Get status class for styling
   */
  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'active';
      case 'pending':
        return 'pending';
      case 'suspended':
        return 'suspended';
      default:
        return 'unknown';
    }
  }

  /**
   * Check if account setup is complete
   * Account is complete when status is ACTIVE
   */
  isAccountComplete(user: IUsers | null): boolean {
    return user?.status === 'ACTIVE';
  }

  /**
   * Enter edit mode
   */
  enterEditMode(): void {
    this.isEditMode = true;
  }

  /**
   * Cancel edit mode and reset form
   */
  cancelEdit(): void {
    this.isEditMode = false;
    this.resetForm();
  }

  /**
   * Handle successful form submission
   */
  onFormSuccess(): void {
    this.isEditMode = false;
  }

  /**
   * Get the profile subtitle based on current state
   */
  getProfileSubtitle(): string {
    if (this.setupState.isFlowMode) {
      return 'Complete the steps below to finish your profile';
    }
    
    // Get current user synchronously from the snapshot
    const user = this.currentUserSnapshot;
    
    if (user && this.isAccountComplete(user)) {
      return 'Your profile is complete and ready for engineering work';
    }
    
    return 'Complete your profile setup to activate your account';
  }

  /**
   * Safely convert groups to an array
   * Handles cases where groups might be a string (e.g., "[USER]") instead of an array
   */
  getGroupsArray(groups: string[] | string | undefined | null): string[] {
    if (!groups) {
      return [];
    }
    if (Array.isArray(groups)) {
      return groups;
    }
    // Handle case where groups is a string like "[USER]" or "USER"
    if (typeof groups === 'string') {
      // Try to parse as JSON array
      try {
        const parsed = JSON.parse(groups);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        // Not valid JSON, treat as single group name
        // Remove brackets if present
        const cleaned = groups.replace(/^\[|\]$/g, '').trim();
        return cleaned ? [cleaned] : [];
      }
    }
    return [];
  }
}
