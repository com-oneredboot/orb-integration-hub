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
  (state) => state.needsMfa
);

export const selectMfaType = createSelector(
  selectAuthState,
  (state) => state.mfaType
);

export const selectIsAuthenticated = createSelector(
  selectAuthState,
  (state) => state.isAuthenticated
);
