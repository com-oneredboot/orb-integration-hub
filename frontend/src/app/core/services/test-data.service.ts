// file: frontend/src/app/core/services/test-data.service.ts
// description: Service for managing test data during development

import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { User, UserGroup, UserStatus } from '../models/user.model';
import { AuthActions } from '../../features/user/components/auth-flow/store/auth.actions';
import { environment } from '../../../environments/environment';

/**
 * TestDataService provides utilities for managing test data in development
 */
@Injectable({
  providedIn: 'root' // This ensures we only have one instance of the service
})
export class TestDataService {

  constructor(private store: Store) {}

  /**
   * Check if a specific user is a test user
   */
  public isTestUser(user: User): boolean {
    if (environment.production) return false;
    return user.user_id === 'test-user-123';
  }

  /**
   * Check if we're currently using test data from local storage
   */
  public isUsingTestData(): boolean {
    if (environment.production) return false;

    // Check localStorage
    const authData = localStorage.getItem('auth');
    if (!authData) return false;

    try {
      const authState = JSON.parse(authData);
      return !!authState.currentUser && authState.currentUser.user_id === 'test-user-123';
    } catch (e) {
      return false;
    }
  }

  /**
   * Add test user data if needed and we're in development mode
   * This is useful for components that require user data
   */
  public addTestUserIfNeeded(): void {
    if (environment.production) return;

    // Check if we already have a user in local storage to prevent overriding it
    const existingAuthData = localStorage.getItem('auth');
    if (existingAuthData) {
      try {
        const authState = JSON.parse(existingAuthData);
        if (authState.currentUser) {
          console.debug('Found existing user in storage, using that instead of test user');
          // Update the store with the existing user data
          this.store.dispatch(AuthActions.signInSuccess({
            user: authState.currentUser,
            message: 'Loaded user from storage'
          }));
          return;
        }
      } catch (e) {
        console.error('Error parsing auth data from localStorage', e);
      }
    }

    // No existing user in storage, create a test user for development
    const testUser: User = {
      user_id: 'test-user-123',
      cognito_id: 'test-cognito-id',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      phone_number: '+1234567890',
      phone_verified: true,
      groups: [UserGroup.USER],
      status: UserStatus.ACTIVE,
      created_at: Date.now() // Use a timestamp instead of string
    };

    // Dispatch the action to add the user to the store
    this.store.dispatch(AuthActions.signInSuccess({
      user: testUser,
      message: 'Test user added'
    }));

    // Store the test user in localStorage for persistence
    const authState = {
      debugMode: true,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      currentUser: testUser,
      currentStep: 9, // AuthSteps.COMPLETE
      userExists: true,
      phoneValidationId: null,
      phoneValidationCode: null,
      phoneValidationExpiration: null,
      phoneVerified: true,
      mfaType: null,
      mfaEnabled: false,
      mfaRequired: false,
      mfaSetupRequired: false,
      mfaPreferences: {
        sms: false,
        totp: false
      },
      currentGroup: "USER",
      availableGroups: ["USER"],
      groupPriority: [],
      emailVerified: true,
      sessionActive: true,
      lastActivity: Date.now()
    };
    localStorage.setItem('auth', JSON.stringify(authState));
    console.debug('Test user stored in localStorage for development');
  }

  /**
   * Clear all test data from localStorage and reset the store
   */
  public clearTestData(): void {
    console.debug('Clearing test user data');

    // First remove from localStorage before dispatching signout
    localStorage.removeItem('auth');

    // Then dispatch signout action - this will reset the store
    this.store.dispatch(AuthActions.signoutSuccess());

    // Redirect to authentication page instead of reloading
    // This ensures a full reset of the application state
    window.location.href = '/authenticate';
  }

  /**
   * Sign out the current user, cleaning up test data if appropriate
   */
  public signOut(): void {
    console.debug('Signing out user');

    // Always remove auth data from localStorage first
    localStorage.removeItem('auth');

    // Then dispatch signout action
    this.store.dispatch(AuthActions.signoutSuccess());

    // Redirect to authentication page
    window.location.href = '/authenticate';
  }
}
