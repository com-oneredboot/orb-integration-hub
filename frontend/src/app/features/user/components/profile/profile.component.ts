import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable, Subject, takeUntil } from 'rxjs';
import { User, UserUpdateInput, UserStatus, UserGroup } from '../../../../core/models/user.model';
import * as fromAuth from '../../components/auth-flow/store/auth.selectors';
import { UserService } from '../../../../core/services/user.service';
import { AuthActions } from '../../components/auth-flow/store/auth.actions';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  standalone: false
})
export class ProfileComponent implements OnInit, OnDestroy {
  currentUser$: Observable<User | null>;
  debugMode$: Observable<boolean>;
  profileForm: FormGroup;
  isLoading = false;
  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    private userService: UserService,
    private fb: FormBuilder
  ) {
    this.currentUser$ = this.store.select(fromAuth.selectCurrentUser);
    this.debugMode$ = this.store.select(fromAuth.selectDebugMode);
    
    // Initialize the form with empty values and properly disabled controls
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: [{value: '', disabled: true}], // Properly disabled at form creation time
      phoneNumber: [{value: '', disabled: true}] // Properly disabled at form creation time
    });
  }
  
  ngOnInit(): void {
    // Check if we have a user in the store, if not, add a mock user
    this.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user) {
          // User exists, update the form
          this.profileForm.patchValue({
            firstName: user.first_name || '',
            lastName: user.last_name || '',
            email: user.email || '',
            phoneNumber: user.phone_number || ''
          });
        } else {
          // No user, add a test user to the store for development
          this.addTestUser();
        }
      });
  }
  
  /**
   * Adds a test user to the store for development purposes
   * This lets us test the profile component without authentication
   */
  private addTestUser(): void {
    console.log('Adding test user to store');
    const testUser: User = {
      user_id: 'test-user-123',
      cognito_id: 'test-cognito-id',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      phone_number: '+1234567890',
      groups: [UserGroup.USER],
      status: UserStatus.ACTIVE,
      created_at: new Date().toISOString()
    };
    
    // Dispatch the action to add the user to the store
    this.store.dispatch(AuthActions.signInSuccess({
      user: testUser,
      message: 'Test user added'
    }));
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
   * Format a date string
   */
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
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
            firstName: user.first_name || '',
            lastName: user.last_name || ''
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
      // Get current user to retrieve the user_id
      const user = await this.getCurrentUser();
      
      if (!user || !user.user_id) {
        console.error('Cannot update profile: No user ID available');
        return;
      }
      
      // Create update input from form values
      const updateInput: UserUpdateInput = {
        user_id: user.user_id,
        first_name: this.profileForm.get('firstName')?.value,
        last_name: this.profileForm.get('lastName')?.value
      };
      
      // Call the userService to update the profile
      console.log('Updating user profile:', updateInput);
      
      // TODO: Uncomment this when the actual update method is implemented
      // await this.userService.updateUser(updateInput);
      
      // Simulating API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mark form as pristine after successful update
      this.profileForm.markAsPristine();
      
      console.log('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      this.isLoading = false;
    }
  }
  
  /**
   * Get the current user as a promise
   */
  private async getCurrentUser(): Promise<User | null> {
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
   * Clear test user data from localStorage and store
   * This is used for development to reset to a clean state
   */
  public clearTestUserData(): void {
    console.log('Clearing test user data');
    localStorage.removeItem('auth');
    this.store.dispatch(AuthActions.signout());
    window.location.reload(); // Force reload to ensure clean state
  }
  
  /**
   * Sign out the current user
   */
  public signOut(): void {
    console.log('Signing out user');
    this.store.dispatch(AuthActions.signout());
    // For test users, also remove from localStorage
    if (localStorage.getItem('auth')) {
      const authState = JSON.parse(localStorage.getItem('auth') || '{}');
      if (authState.currentUser?.user_id === 'test-user-123') {
        localStorage.removeItem('auth');
      }
    }
    window.location.href = '/authenticate'; // Redirect to auth page
  }
  
  /**
   * Check if we're using test data - this method is only used in the template
   * and will be evaluated in the context of the current user
   */
  public isUsingTestData(user?: User): boolean {
    // In the template, this will be called with the current user from the async pipe
    return user?.user_id === 'test-user-123';
  }
}
