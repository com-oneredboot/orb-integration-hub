// file: frontend/src/app/features/user/store/auth.selectors.ts
// author: Corey Dale Peters
// date: 2025-01-03
// description: Contains all selectors for the Auth feature
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AuthState, AuthSteps } from './auth.state';

export const selectAuthState = createFeatureSelector<AuthState>('auth');

export const selectCurrentStep = createSelector(
  selectAuthState,
  (state) => state.currentStep
);

export const selectIsLoading = createSelector(
  selectAuthState,
  (state) => state.isLoading
);

export const selectError = createSelector(
  selectAuthState,
  (state) => state.error
);

export const selectUserExists = createSelector(
  selectAuthState,
  (state) => state.userExists
);

export const selectCurrentUser = createSelector(
  selectAuthState,
  (state) => state.currentUser
);

export const selectNeedsMfa = createSelector(
  selectAuthState,
  (state) => state.mfaRequired
);

export const selectMfaType = createSelector(
  selectAuthState,
  (state) => state.mfaType
);

export const selectIsAuthenticated = createSelector(
  selectAuthState,
  (state) => state.isAuthenticated
);

// Base selectors
export const selectPhoneValidationId = createSelector(
  selectAuthState,
  (state) => state.phoneValidationId
);

export const selectPhoneValidationCode = createSelector(
  selectAuthState,
  (state) => state.phoneValidationCode
);

export const selectPhoneValidationExpiration = createSelector(
  selectAuthState,
  (state) => state.phoneValidationExpiration
);

// Group-related selectors
export const selectUserGroup = createSelector(
  selectAuthState,
  (state) => state.currentGroup
);

export const selectAvailableGroups = createSelector(
  selectAuthState,
  (state) => state.availableGroups
);

export const selectGroupPriority = createSelector(
  selectAuthState,
  (state) => state.groupPriority
);

// MFA-related selectors
export const selectMFAEnabled = createSelector(
  selectAuthState,
  (state) => state.mfaEnabled
);

export const selectMFASetupRequired = createSelector(
  selectAuthState,
  (state) => state.mfaSetupRequired
);

export const selectMFAPreferences = createSelector(
  selectAuthState,
  (state) => state.mfaPreferences
);

export const selectMFADetails = createSelector(
  selectAuthState,
  (state) => state.mfaSetupDetails
);

// User attribute selectors
export const selectEmailVerified = createSelector(
  selectAuthState,
  (state) => state.emailVerified
);

export const selectPhoneVerified = createSelector(
  selectAuthState,
  (state) => state.phoneVerified
);

// Session selectors
export const selectSessionActive = createSelector(
  selectAuthState,
  (state) => state.sessionActive
);

export const selectLastActivity = createSelector(
  selectAuthState,
  (state) => state.lastActivity
);

export const selectDebugMode = createSelector(
  selectAuthState,
  (state) => state.debugMode
);

export const selectCurrentEmail = createSelector(
  selectAuthState,
  (state) => state.currentEmail || ''
);

// Derived selector for step title
export const selectStepTitle = createSelector(
  selectCurrentStep,
  selectUserExists,
  (step, userExists) => {
    switch (step) {
      case AuthSteps.EMAIL:
        return 'Sign In or Create Account';
      case AuthSteps.PASSWORD:
        return userExists ? 'Enter Password' : 'Create Account';
      case AuthSteps.PASSWORD_SETUP:
        return 'Create a Password';
      case AuthSteps.EMAIL_VERIFY:
        return 'Verify Email';
      case AuthSteps.NAME_SETUP:
        return 'Complete Your Profile';
      case AuthSteps.PHONE_SETUP:
        return 'Add Phone Number';
      case AuthSteps.PHONE_VERIFY:
        return 'Verify Phone Number';
      case AuthSteps.MFA_SETUP:
        return 'Set Up Two-Factor Authentication';
      case AuthSteps.MFA_VERIFY:
        return 'Enter Verification Code';
      case AuthSteps.PASSWORD_RESET:
        return 'Reset Password';
      case AuthSteps.PASSWORD_RESET_VERIFY:
        return 'Enter Reset Code';
      case AuthSteps.PASSWORD_RESET_CONFIRM:
        return 'Create New Password';
      default:
        return 'Authentication';
    }
  }
);
