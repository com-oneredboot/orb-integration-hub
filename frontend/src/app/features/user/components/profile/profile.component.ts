import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable, Subject, takeUntil } from 'rxjs';
import { IUsers, UsersUpdateInput, UsersResponse, UsersQueryByUserIdInput } from '../../../../core/models/UsersModel';
import * as fromAuth from '../../components/auth-flow/store/auth.selectors';
import { AuthActions } from '../../components/auth-flow/store/auth.actions';
import { UserService } from '../../../../core/services/user.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { RouterModule } from '@angular/router';
import { Users } from '../../../../core/models/UsersModel';
import { faUser, faEdit, faCheckCircle, faClock } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FontAwesomeModule,
    RouterModule
  ]
})
export class ProfileComponent implements OnInit, OnDestroy {
  currentUser$: Observable<IUsers | null>;
  debugMode$: Observable<boolean>;
  profileForm: FormGroup;
  isLoading = false;
  isEditMode = false;
  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    private userService: UserService,
    private fb: FormBuilder,
    private router: Router,
    private library: FaIconLibrary
  ) {
    this.currentUser$ = this.store.select(fromAuth.selectCurrentUser);
    this.debugMode$ = this.store.select(fromAuth.selectDebugMode);
    
    // Add FontAwesome icons to library
    this.library.addIcons(faUser, faEdit, faCheckCircle, faClock);
    
    // Initialize the form with empty values and properly disabled controls
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: [{value: '', disabled: true}], // Email is always disabled
      phoneNumber: [{value: '', disabled: true}] // Phone number is managed through auth flow, not profile
    });
  }
  
  ngOnInit(): void {
    // Check if we have a user in the store
    this.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          // User exists, update the form
          this.profileForm.patchValue({
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email || '',
            phoneNumber: user.phoneNumber || ''
          });
        } else {
          // No user, redirect to authentication page
          this.router.navigate(['/authenticate']);
        }
      });
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
   * Format a date string or timestamp
   */
  formatDate(dateValue: string | number): string {
    if (!dateValue) return 'N/A';
    
    try {
      let date: Date;
      if (typeof dateValue === 'number') {
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
        this.store.dispatch(AuthActions.signInSuccess({
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
   */
  private async getCurrentUser(): Promise<IUsers | null> {
    return new Promise((resolve) => {
      this.currentUser$
        .pipe(takeUntil(this.destroy$))
        .subscribe(user => resolve(user));
    });
  }
  
  /**
   * Public method to check if a user is valid
   * @param user The user to check
   * @returns True if the user has all required attributes, false otherwise
   */
  public isUserValid(user: any): boolean {
    return this.userService.isUserValid(user);
  }
  
  /**
   * Sign out the current user
   */
  public signOut(): void {
    this.store.dispatch(AuthActions.signout());
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
  isAccountComplete(user: any): boolean {
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
}
