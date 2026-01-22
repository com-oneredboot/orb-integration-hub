// file: apps/web/src/app/features/user/components/dashboard/dashboard.component.ts
// author: Corey Dale Peters
// date: 2025-02-24
// description: Dashboard component for authenticated users

import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { IUsers } from '../../../../core/models/UsersModel';
import * as fromUser from '../../store/user.selectors';
import { UserActions } from '../../store/user.actions';
import { UserService } from '../../../../core/services/user.service';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { RouterModule } from '@angular/router';

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
  isLoading$: Observable<boolean>;
  isNotLoading$: Observable<boolean>;

  constructor(
    private store: Store,
    private userService: UserService,
    private router: Router
  ) {
    this.currentUser$ = this.store.select(fromUser.selectCurrentUser);
    this.debugMode$ = this.store.select(fromUser.selectDebugMode);
    this.isLoading$ = this.store.select(fromUser.selectIsLoading);
    this.isNotLoading$ = this.isLoading$.pipe(map(loading => !loading));
  }
  
  /**
   * Public method to check if a user is valid
   * @param user The user to check
   * @returns True if the user has all required attributes, false otherwise
   */
  public isUserValid(user: IUsers | null): boolean {
    return this.userService.isUserValid(user);
  }

  ngOnInit(): void {
    // Lifecycle hook - initialization handled by store selectors in constructor
    void 0; // Intentionally empty - initialization handled in constructor
  }

  // Status handling now uses global StatusBadgeComponent

  /**
   * Format date string for display
   * @param dateValue The date value (string or Date)
   * @returns Formatted date
   */
  formatDate(dateValue: string | Date): string {
    if (!dateValue) return 'Not available';
    
    try {
      const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
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
  hasValidName(user: IUsers | null): boolean {
    return !!(user?.firstName?.trim() && user?.lastName?.trim());
  }

  /**
   * Navigate to profile page (summary view)
   */
  goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  /**
   * Navigate to profile setup flow (starts from first incomplete step)
   */
  goToProfileSetup(): void {
    this.router.navigate(['/profile'], { 
      queryParams: { mode: 'setup', startFrom: 'incomplete' } 
    });
  }

  /**
   * Check if user is a CUSTOMER user (should see organizations features)
   * @param user The user object
   * @returns true if user has CUSTOMER group membership
   */
  isCustomerUser(user: IUsers | null): boolean {
    return user?.groups?.includes('CUSTOMER') || false;
  }

  /**
   * Navigate to email verification in auth flow
   */
  goToEmailVerification(): void {
    this.router.navigate(['/authenticate']);
    // The auth flow will handle checking email verification status
  }

  /**
   * Navigate to phone setup/verification on profile page
   */
  goToPhoneVerification(): void {
    this.router.navigate(['/profile'], { 
      queryParams: { mode: 'setup', startFrom: 'incomplete' } 
    });
  }

  /**
   * Check MFA setup status by triggering user record update
   * This will cause the Lambda to check Cognito and update MFA fields
   */
  checkMFASetup(): void {
    // Only proceed if not already loading
    this.isLoading$.subscribe(isLoading => {
      if (!isLoading) {
        console.log('[Dashboard] Triggering MFA check...');
        this.store.dispatch(UserActions.checkMFASetup());
      }
    }).unsubscribe();
  }

  /**
   * Navigate to security settings (MFA management)
   */
  goToSecuritySettings(): void {
    // Use the new explicit MFA setup flow action to avoid redirect loops
    this.store.dispatch(UserActions.beginMFASetupFlow());
    this.router.navigate(['/authenticate']);
  }

  /**
   * Check if user has any health warnings
   * @param user The user object
   * @returns true if there are any incomplete requirements
   */
  hasHealthWarnings(user: IUsers | null): boolean {
    if (!user) return true;
    
    // Check all health requirements
    const hasValidName = this.hasValidName(user);
    const emailVerified = !!user.emailVerified;
    const phoneVerified = !!user.phoneVerified;
    const mfaComplete = !!(user.mfaEnabled && user.mfaSetupComplete);
    
    // Return true if ANY requirement is not met
    return !hasValidName || !emailVerified || !phoneVerified || !mfaComplete;
  }

  /**
   * Get status class for header badge styling
   * @param status The user status (UserStatus enum value)
   * @returns CSS class name for status
   */
  getStatusClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return 'active';
      case 'PENDING':
        return 'pending';
      case 'INACTIVE':
      case 'REJECTED':
      case 'DELETED':
        return 'suspended';
      case 'UNKNOWN':
      default:
        return 'unknown';
    }
  }

  /**
   * Get status icon for header badge
   * @param status The user status (UserStatus enum value)
   * @returns Font Awesome icon name
   */
  getStatusIcon(status: string): string {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return 'check-circle';
      case 'PENDING':
        return 'clock';
      case 'INACTIVE':
      case 'REJECTED':
      case 'DELETED':
        return 'ban';
      case 'UNKNOWN':
      default:
        return 'question-circle';
    }
  }

  /**
   * Get status label for header badge
   * @param status The user status (UserStatus enum value)
   * @returns Human readable status label
   */
  getStatusLabel(status: string): string {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return 'Account Active';
      case 'PENDING':
        return 'Account Pending';
      case 'INACTIVE':
        return 'Account Inactive';
      case 'REJECTED':
        return 'Account Rejected';
      case 'DELETED':
        return 'Account Deleted';
      case 'UNKNOWN':
      default:
        return 'Account Status Unknown';
    }
  }
}