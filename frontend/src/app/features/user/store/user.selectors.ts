// file: frontend/src/app/features/user/store/user.selectors.ts
// author: Corey Dale Peters
// date: 2025-01-03
// description: Contains all selectors for the User feature
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { UserState, AuthSteps } from './user.state';

export const selectUserState = createFeatureSelector<UserState>('user');

export const selectCurrentStep = createSelector(
  selectUserState,
  (state) => state.currentStep
);

export const selectIsLoading = createSelector(
  selectUserState,
  (state) => state.isLoading
);

export const selectError = createSelector(
  selectUserState,
  (state) => state.error
);

export const selectUserExists = createSelector(
  selectUserState,
  (state) => state.userExists
);

export const selectCurrentUser = createSelector(
  selectUserState,
  (state) => state.currentUser
);

export const selectNeedsMfa = createSelector(
  selectUserState,
  (state) => state.mfaRequired
);

export const selectMfaType = createSelector(
  selectUserState,
  (state) => state.mfaType
);

export const selectIsAuthenticated = createSelector(
  selectUserState,
  (state) => state.isAuthenticated
);

// Base selectors
export const selectPhoneValidationId = createSelector(
  selectUserState,
  (state) => state.phoneValidationId
);

export const selectPhoneValidationCode = createSelector(
  selectUserState,
  (state) => state.phoneValidationCode
);

export const selectPhoneValidationExpiration = createSelector(
  selectUserState,
  (state) => state.phoneValidationExpiration
);

// Group-related selectors
export const selectUserGroup = createSelector(
  selectUserState,
  (state) => state.currentGroup
);

export const selectAvailableGroups = createSelector(
  selectUserState,
  (state) => state.availableGroups
);

export const selectGroupPriority = createSelector(
  selectUserState,
  (state) => state.groupPriority
);

// MFA-related selectors
export const selectMFAEnabled = createSelector(
  selectUserState,
  (state) => state.mfaEnabled
);

export const selectMFASetupRequired = createSelector(
  selectUserState,
  (state) => state.mfaSetupRequired
);

export const selectMFAPreferences = createSelector(
  selectUserState,
  (state) => state.mfaPreferences
);

export const selectMFADetails = createSelector(
  selectUserState,
  (state) => state.mfaSetupDetails
);

// User attribute selectors
export const selectEmailVerified = createSelector(
  selectUserState,
  (state) => state.emailVerified
);

export const selectPhoneVerified = createSelector(
  selectUserState,
  (state) => state.phoneVerified
);

// Session selectors
export const selectSessionActive = createSelector(
  selectUserState,
  (state) => state.sessionActive
);

export const selectLastActivity = createSelector(
  selectUserState,
  (state) => state.lastActivity
);

export const selectDebugMode = createSelector(
  selectUserState,
  (state) => state.debugMode
);

export const selectCurrentEmail = createSelector(
  selectUserState,
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
