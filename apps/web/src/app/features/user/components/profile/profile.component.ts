import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable, Subject, takeUntil, take } from 'rxjs';
import { IUsers, UsersUpdateInput } from '../../../../core/models/UsersModel';
import * as fromUser from '../../store/user.selectors';
import { UserActions } from '../../store/user.actions';
import { UserService } from '../../../../core/services/user.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, SlicePipe } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { RouterModule } from '@angular/router';
import { Users } from '../../../../core/models/UsersModel';
import { StatusBadgeComponent } from '../../../../shared/components/ui/status-badge.component';
import { UserStatus } from '../../../../core/enums/UserStatusEnum';
import { DebugLogService, DebugLogEntry } from '../../../../core/services/debug-log.service';
import { ProgressStepsComponent, ProgressStep } from '../../../../shared/components/progress-steps/progress-steps.component';

/**
 * Profile setup flow steps
 * Used for step-based profile completion flow
 */
export enum ProfileSetupStep {
  NAME = 'NAME',           // First name, last name
  PHONE = 'PHONE',         // Phone number entry
  PHONE_VERIFY = 'PHONE_VERIFY', // SMS code verification
  COMPLETE = 'COMPLETE'    // All done, show summary
}

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
    SlicePipe,
    ProgressStepsComponent
  ]
})
export class ProfileComponent implements OnInit, OnDestroy {
  currentUser$: Observable<IUsers | null>;
  debugMode$: Observable<boolean>;
  profileForm: FormGroup;
  isLoading = false;
  isEditMode = false;
  private destroy$ = new Subject<void>();

  // Debug log state (matching auth-flow)
  debugLogs$: Observable<DebugLogEntry[]>;
  debugCopyStatus: 'idle' | 'copying' | 'copied' = 'idle';

  // Profile setup flow state
  setupState: ProfileSetupState = {
    currentStep: ProfileSetupStep.NAME,
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
   * Get current step number for progress component
   */
  getCurrentStepNumber(): number {
    switch (this.setupState.currentStep) {
      case ProfileSetupStep.NAME: return 1;
      case ProfileSetupStep.PHONE: return 2;
      case ProfileSetupStep.PHONE_VERIFY: return 3;
      case ProfileSetupStep.COMPLETE: return 3;
      default: return 1;
    }
  }

  constructor(
    private store: Store,
    private userService: UserService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private debugLogService: DebugLogService
  ) {
    this.currentUser$ = this.store.select(fromUser.selectCurrentUser);
    this.debugMode$ = this.store.select(fromUser.selectDebugMode);
    this.debugLogs$ = this.debugLogService.logs$;
    
    // Initialize the legacy form with empty values and properly disabled controls
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: [{value: '', disabled: true}], // Email is always disabled
      phoneNumber: [{value: '', disabled: true}] // Phone number is managed through auth flow, not profile
    });

    // Initialize step-based forms
    this.initForms();
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
      currentStep: ProfileSetupStep.NAME,
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
      currentStep: ProfileSetupStep.COMPLETE,
      isFlowMode: false,
      startFromBeginning: true
    };
    this.isEditMode = false;
  }

  /**
   * Navigate to next step in the flow
   */
  nextStep(): void {
    const steps = [ProfileSetupStep.NAME, ProfileSetupStep.PHONE, ProfileSetupStep.PHONE_VERIFY, ProfileSetupStep.COMPLETE];
    const currentIndex = steps.indexOf(this.setupState.currentStep);
    
    if (currentIndex < steps.length - 1) {
      this.setupState.currentStep = steps[currentIndex + 1];
      
      // If we reached COMPLETE, exit flow mode
      if (this.setupState.currentStep === ProfileSetupStep.COMPLETE) {
        this.showSummary();
      }
    }
  }

  /**
   * Navigate to previous step in the flow
   */
  previousStep(): void {
    const steps = [ProfileSetupStep.NAME, ProfileSetupStep.PHONE, ProfileSetupStep.PHONE_VERIFY, ProfileSetupStep.COMPLETE];
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
      return ProfileSetupStep.NAME;
    }
    
    // Check name
    if (!user.firstName || !user.lastName) {
      return ProfileSetupStep.NAME;
    }
    
    // Check phone
    if (!user.phoneNumber) {
      return ProfileSetupStep.PHONE;
    }
    
    // Check phone verification
    if (!user.phoneVerified) {
      return ProfileSetupStep.PHONE_VERIFY;
    }
    
    // All complete
    return ProfileSetupStep.COMPLETE;
  }

  /**
   * Check if a step is complete for a user
   */
  isStepComplete(step: ProfileSetupStep, user: IUsers | null): boolean {
    if (!user) return false;
    
    switch (step) {
      case ProfileSetupStep.NAME:
        return !!(user.firstName && user.lastName);
      case ProfileSetupStep.PHONE:
        return !!user.phoneNumber;
      case ProfileSetupStep.PHONE_VERIFY:
        return !!user.phoneVerified;
      case ProfileSetupStep.COMPLETE:
        return !!(user.firstName && user.lastName && user.phoneNumber && user.phoneVerified);
      default:
        return false;
    }
  }

  /**
   * Get progress percentage for the flow
   */
  getProgressPercentage(): number {
    const steps = [ProfileSetupStep.NAME, ProfileSetupStep.PHONE, ProfileSetupStep.PHONE_VERIFY, ProfileSetupStep.COMPLETE];
    const currentIndex = steps.indexOf(this.setupState.currentStep);
    return Math.round((currentIndex / (steps.length - 1)) * 100);
  }

  /**
   * Get step number (1-based)
   */
  getStepNumber(): number {
    const steps = [ProfileSetupStep.NAME, ProfileSetupStep.PHONE, ProfileSetupStep.PHONE_VERIFY, ProfileSetupStep.COMPLETE];
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

    this.isLoading = true;

    try {
      const user = await this.getCurrentUser();
      if (!user || !user.userId) {
        console.error('Cannot update profile: No user ID available');
        return;
      }

      const formValues = this.nameForm.value;
      const updateInput: UsersUpdateInput = {
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
        updatedAt: user.updatedAt,
      };

      const response = await this.userService.userUpdate(updateInput);

      if (response.StatusCode === 200 && response.Data) {
        this.store.dispatch(UserActions.updateProfileSuccess({
          user: new Users(response.Data),
          message: 'Name updated successfully'
        }));
        this.nextStep();
      } else {
        console.error('Failed to update name:', response.Message);
      }
    } catch (error) {
      console.error('Error updating name:', error);
    } finally {
      this.isLoading = false;
    }
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

    this.isLoading = true;

    try {
      const user = await this.getCurrentUser();
      if (!user || !user.userId) {
        console.error('Cannot update profile: No user ID available');
        return;
      }

      const formValues = this.phoneForm.value;
      const updateInput: UsersUpdateInput = {
        userId: user.userId,
        cognitoId: user.cognitoId,
        cognitoSub: user.cognitoSub,
        email: user.email,
        emailVerified: user.emailVerified,
        phoneNumber: formValues.phoneNumber?.trim(),
        phoneVerified: false, // Phone is not verified yet
        firstName: user.firstName,
        lastName: user.lastName,
        groups: user.groups,
        status: user.status,
        mfaEnabled: user.mfaEnabled || false,
        mfaSetupComplete: user.mfaSetupComplete || false,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      const response = await this.userService.userUpdate(updateInput);

      if (response.StatusCode === 200 && response.Data) {
        this.store.dispatch(UserActions.updateProfileSuccess({
          user: new Users(response.Data),
          message: 'Phone number updated successfully'
        }));
        this.nextStep();
        
        // Auto-send verification code when entering PHONE_VERIFY step
        // This matches the email verification UX where code is sent automatically
        await this.sendVerificationCode();
      } else {
        console.error('Failed to update phone:', response.Message);
      }
    } catch (error) {
      console.error('Error updating phone:', error);
    } finally {
      this.isLoading = false;
    }
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

    this.isLoading = true;
    this.phoneVerificationState.error = null;

    try {
      const code = this.verifyForm.get('verificationCode')?.value;
      const user = await this.getCurrentUser();
      
      if (!user?.phoneNumber) {
        this.phoneVerificationState.error = 'No phone number to verify';
        return;
      }

      // Call the SMS verification service to verify the code
      const isValid = await this.userService.verifySMSCode(user.phoneNumber, code);

      if (isValid) {
        // Update user with phoneVerified = true
        const updateInput: UsersUpdateInput = {
          userId: user.userId,
          cognitoId: user.cognitoId,
          cognitoSub: user.cognitoSub,
          email: user.email,
          emailVerified: user.emailVerified,
          phoneNumber: user.phoneNumber,
          phoneVerified: true,
          firstName: user.firstName,
          lastName: user.lastName,
          groups: user.groups,
          status: UserStatus.Active, // User is now active
          mfaEnabled: user.mfaEnabled || false,
          mfaSetupComplete: user.mfaSetupComplete || false,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };

        const updateResponse = await this.userService.userUpdate(updateInput);

        if (updateResponse.StatusCode === 200 && updateResponse.Data) {
          this.store.dispatch(UserActions.updateProfileSuccess({
            user: new Users(updateResponse.Data),
            message: 'Phone verified successfully'
          }));
          this.showSummary();
        }
      } else {
        this.phoneVerificationState.error = 'Invalid verification code. Please try again.';
      }
    } catch (error) {
      console.error('Error verifying phone:', error);
      this.phoneVerificationState.error = 'Verification failed. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  // ============================================
  // Phone Verification Methods
  // ============================================

  /**
   * Send verification code to user's phone
   */
  async sendVerificationCode(): Promise<void> {
    this.isLoading = true;
    this.phoneVerificationState.error = null;

    try {
      const user = await this.getCurrentUser();
      
      if (!user?.phoneNumber) {
        this.phoneVerificationState.error = 'No phone number available';
        return;
      }

      // Call the SMS verification service
      const response = await this.userService.sendSMSVerificationCode(user.phoneNumber);

      if (response.statusCode === 200) {
        this.phoneVerificationState.codeSent = true;
        this.phoneVerificationState.codeExpiration = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        this.phoneVerificationState.cooldownUntil = new Date(Date.now() + 60 * 1000); // 60 seconds cooldown
      } else {
        this.phoneVerificationState.error = response.message || 'Failed to send verification code';
      }
    } catch (error) {
      console.error('Error sending verification code:', error);
      this.phoneVerificationState.error = 'Failed to send verification code. Please try again.';
    } finally {
      this.isLoading = false;
    }
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
    
    this.isLoading = true;
    
    try {
      // Get current user to retrieve the userId
      const user = await this.getCurrentUser();
      
      if (!user || !user.userId) {
        console.error('Cannot update profile: No user ID available');
        return;
      }
      
      // Create update input from form values
      const formValues = this.profileForm.value;
      const updateInput: UsersUpdateInput = {
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
        mfaEnabled: false,
        mfaSetupComplete: false,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
      
      // Call the userService to update the profile
      console.log('Updating user profile:', updateInput);
      
      const response = await this.userService.userUpdate(updateInput);
      
      if (response.StatusCode === 200 && response.Data) {
        // Update the store with the updated user data
        this.store.dispatch(UserActions.updateProfileSuccess({
          user: new Users(response.Data),
          message: 'Profile updated successfully'
        }));
        
        // Mark form as pristine after successful update
        this.profileForm.markAsPristine();
        
        // Exit edit mode
        this.onFormSuccess();
        
        console.log('Profile updated successfully');
      } else {
        console.error('Failed to update profile:', response.Message);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      this.isLoading = false;
    }
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
   * @returns True if the user has all required attributes, false otherwise
   */
  public isUserValid(user: IUsers | null): boolean {
    return this.userService.isUserValid(user);
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

  /**
   * Copy debug summary to clipboard (matching auth-flow functionality)
   */
  async copyDebugSummary(): Promise<void> {
    this.debugCopyStatus = 'copying';
    
    try {
      const user = await this.getCurrentUser();
      const logs = await new Promise<DebugLogEntry[]>((resolve) => {
        this.debugLogs$.pipe(takeUntil(this.destroy$)).subscribe(logs => resolve(logs || []));
      });
      
      // Get recent failed operations
      const failedOps = logs
        .filter(log => log.status === 'failure')
        .slice(-5)
        .map(log => `- [${new Date(log.timestamp).toLocaleTimeString()}] ${log.operation}: ${log.error || 'Unknown error'}`)
        .join('\n');
      
      // Get recent actions
      const recentActions = logs
        .slice(-10)
        .map(log => `- ${log.type}:${log.operation}:${log.status}`)
        .join('\n');
      
      const summary = `DEBUG SUMMARY
==============
Page: Profile
Step: ${this.setupState.currentStep}
Flow Mode: ${this.setupState.isFlowMode}
Time: ${new Date().toISOString()}
Last Error: ${failedOps ? 'See below' : 'None'}
User State:
- Exists: ${!!user}
- Email Verified: ${user?.emailVerified || false}
- Phone Verified: ${user?.phoneVerified || false}
- MFA Enabled: ${user?.mfaEnabled || false}
- Status: ${user?.status || 'Unknown'}
Recent Actions (newest last):
${recentActions || '- None'}
Failed Operations:
${failedOps || '- None'}
Current Email: ${user?.email || 'N/A'}
Form State:
- Name Form Valid: ${this.nameForm?.valid}
- Phone Form Valid: ${this.phoneForm?.valid}
- Verify Form Valid: ${this.verifyForm?.valid}
- Loading: ${this.isLoading}
Store State:
${JSON.stringify({
  currentStep: this.setupState.currentStep,
  isFlowMode: this.setupState.isFlowMode,
  isLoading: this.isLoading,
  phoneVerificationState: this.phoneVerificationState
}, null, 2)}`;
      
      await navigator.clipboard.writeText(summary);
      this.debugCopyStatus = 'copied';
      
      setTimeout(() => {
        this.debugCopyStatus = 'idle';
      }, 2000);
    } catch (error) {
      console.error('Failed to copy debug summary:', error);
      this.debugCopyStatus = 'idle';
    }
  }
}
