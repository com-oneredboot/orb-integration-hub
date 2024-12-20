// auth.reducer.ts
import { createReducer, on } from '@ngrx/store';
import * as AuthActions from './auth.actions';
import { AuthState, initialAuthState, AuthStep } from './auth.state';

export const authReducer = createReducer(
  initialAuthState,

  on(AuthActions.checkEmail, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),

  on(AuthActions.checkEmailSuccess, (state, { exists }) => ({
    ...state,
    userExists: exists,
    currentStep: exists ? AuthStep.PASSWORD : AuthStep.CREATE_PASSWORD,
    isLoading: false
  })),

  on(AuthActions.checkEmailFailure, (state, { error }) => ({
    ...state,
    error,
    isLoading: false
  })),

  on(AuthActions.signIn, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),

  on(AuthActions.signInSuccess, (state) => ({
    ...state,
    isAuthenticated: true,
    currentStep: AuthStep.COMPLETE,
    isLoading: false
  })),

  on(AuthActions.signInRequiresMfa, (state, { mfaType }) => ({
    ...state,
    needsMfa: true,
    mfaType,
    currentStep: AuthStep.MFA,
    isLoading: false
  })),

  on(AuthActions.signInFailure, (state, { error }) => ({
    ...state,
    error,
    isLoading: false
  })),

  on(AuthActions.setAuthStep, (state, { step }) => ({
    ...state,
    currentStep: step
  }))
);

