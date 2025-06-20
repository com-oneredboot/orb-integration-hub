// file: frontend/src/app/features/user/components/dashboard/dashboard.component.ts
// author: Corey Dale Peters
// date: 2025-02-24
// description: Dashboard component for authenticated users

import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { IUsers } from '../../../../core/models/UsersModel';
import * as fromAuth from '../../components/auth-flow/store/auth.selectors';
import { AuthActions } from '../../components/auth-flow/store/auth.actions';
import { UserService } from '../../../../core/services/user.service';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { RouterModule } from '@angular/router';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { 
  faUser, 
  faBolt, 
  faHeartbeat, 
  faHistory, 
  faUserEdit, 
  faShieldAlt, 
  faCreditCard, 
  faCog, 
  faCheckCircle, 
  faClock, 
  faExclamationTriangle, 
  faInfoCircle,
  faArrowRight
} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FontAwesomeModule,
    RouterModule
    // Add any shared components, directives, or pipes used in the template here
  ]
})
export class DashboardComponent implements OnInit {
  currentUser$: Observable<IUsers | null>;
  debugMode$: Observable<boolean>;

  constructor(
    private store: Store,
    private userService: UserService,
    private library: FaIconLibrary,
    private router: Router
  ) {
    this.currentUser$ = this.store.select(fromAuth.selectCurrentUser);
    this.debugMode$ = this.store.select(fromAuth.selectDebugMode);
    
    // Add FontAwesome icons to library
    this.library.addIcons(
      faUser, 
      faBolt, 
      faHeartbeat, 
      faHistory, 
      faUserEdit, 
      faShieldAlt, 
      faCreditCard, 
      faCog, 
      faCheckCircle, 
      faClock, 
      faExclamationTriangle, 
      faInfoCircle,
      faArrowRight
    );
  }
  
  /**
   * Public method to check if a user is valid
   * @param user The user to check
   * @returns True if the user has all required attributes, false otherwise
   */
  public isUserValid(user: any): boolean {
    return this.userService.isUserValid(user);
  }

  ngOnInit(): void {
    // Additional initialization if needed
  }

  /**
   * Get CSS class for user status badge
   * @param status The user status
   * @returns CSS class name
   */
  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'suspended':
      case 'inactive':
        return 'error';
      default:
        return 'default';
    }
  }

  /**
   * Format date string for display
   * @param dateString The ISO date string
   * @returns Formatted date
   */
  formatDate(dateString: string): string {
    if (!dateString) return 'Not available';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  }

  /**
   * Check if user has valid first and last name
   * @param user The user object
   * @returns true if both first and last name are present
   */
  hasValidName(user: any): boolean {
    return !!(user?.firstName?.trim() && user?.lastName?.trim());
  }

  /**
   * Navigate to profile page
   */
  goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  /**
   * Navigate to email verification in auth flow
   */
  goToEmailVerification(): void {
    this.router.navigate(['/authenticate']);
    // The auth flow will handle checking email verification status
  }

  /**
   * Navigate to phone setup/verification in auth flow
   */
  goToPhoneVerification(): void {
    this.router.navigate(['/authenticate']);
    // The auth flow will handle checking phone verification status
  }

  /**
   * Check MFA setup status by triggering user record update
   * This will cause the Lambda to check Cognito and update MFA fields
   */
  checkMFASetup(): void {
    // Dispatch action to update user record with current timestamp
    // This will trigger the DynamoDB stream and Lambda will check Cognito MFA status
    this.currentUser$.subscribe(user => {
      if (user) {
        console.log('[Dashboard] Triggering MFA check for user:', user.userId);
        
        // Update the user record to trigger Lambda stream processing
        this.userService.updateUserTimestamp(user).subscribe({
          next: () => {
            console.log('[Dashboard] User timestamp updated, waiting for Lambda to process...');
            
            // Refresh session with exponential backoff: 1s, 2s, 4s
            const refreshAttempts = [1000, 2000, 4000];
            
            refreshAttempts.forEach((delay, index) => {
              setTimeout(() => {
                console.log(`[Dashboard] Refresh attempt ${index + 1} after ${delay}ms`);
                this.store.dispatch(AuthActions.refreshSession());
              }, delay);
            });
          },
          error: (error) => {
            console.error('[Dashboard] Error updating user timestamp:', error);
          }
        });
      }
    }).unsubscribe();
  }

  /**
   * Navigate to security settings (MFA management)
   */
  goToSecuritySettings(): void {
    // Use the new explicit MFA setup flow action to avoid redirect loops
    this.store.dispatch(AuthActions.beginMFASetupFlow());
    this.router.navigate(['/authenticate']);
  }

  /**
   * Check if user has any health warnings
   * @param user The user object
   * @returns true if there are any incomplete requirements
   */
  hasHealthWarnings(user: any): boolean {
    if (!user) return true;
    
    // Check all health requirements
    const hasValidName = this.hasValidName(user);
    const emailVerified = !!user.emailVerified;
    const phoneVerified = !!user.phoneVerified;
    const mfaComplete = !!(user.mfaEnabled && user.mfaSetupComplete);
    
    // Return true if ANY requirement is not met
    return !hasValidName || !emailVerified || !phoneVerified || !mfaComplete;
  }
}