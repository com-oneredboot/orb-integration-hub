// auth.selectors.ts
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AuthState } from './auth.state';

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

export const selectNeedsMfa = createSelector(
  selectAuthState,
  (state) => state.needsMFA
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
