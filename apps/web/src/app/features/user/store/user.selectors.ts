// file: apps/web/src/app/features/user/store/user.selectors.ts
// author: Corey Dale Peters
// date: 2025-01-03
// description: Contains all selectors for the User feature
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { UserState } from './user.state';
import { AuthStep } from '../../../core/enums/AuthStepEnum';

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

// Recovery-related selectors
export const selectRecoveryMessage = createSelector(
  selectUserState,
  (state) => state.recoveryMessage
);

export const selectRecoveryAction = createSelector(
  selectUserState,
  (state) => state.recoveryAction
);

// Derived selector for step title
export const selectStepTitle = createSelector(
  selectCurrentStep,
  selectUserExists,
  (step, userExists) => {
    switch (step) {
      case AuthStep.Email:
        return 'Sign In or Create Account';
      case AuthStep.Password:
        return userExists ? 'Enter Password' : 'Create Account';
      case AuthStep.PasswordSetup:
        return 'Create a Password';
      case AuthStep.EmailVerify:
        return 'Verify Email';
      case AuthStep.MfaSetup:
        return 'Set Up Two-Factor Authentication';
      case AuthStep.MfaVerify:
        return 'Enter Verification Code';
      case AuthStep.PasswordReset:
        return 'Reset Password';
      case AuthStep.PasswordResetVerify:
        return 'Enter Reset Code';
      case AuthStep.PasswordResetConfirm:
        return 'Create New Password';
      default:
        return 'Authentication';
    }
  }
);
