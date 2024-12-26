import { createReducer, on } from '@ngrx/store';
import {AuthActions, checkEmail, checkEmailFailure, checkEmailSuccess} from './auth.actions';
import { initialState, AuthSteps } from './auth.state';

export const authReducer = createReducer(
  initialState,

  // Check Email
  on(checkEmail, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(checkEmailSuccess, (state, { userExists }) => {
    console.log('Reducer handling checkEmailSuccess:', {
      currentState: state,
      userExists,
      // If user exists, go to PASSWORD for login, if not exist go to PASSWORD_SETUP for registration
      newStep: userExists ? AuthSteps.PASSWORD : AuthSteps.PASSWORD_SETUP
    });
    return {
      ...state,
      userExists,
      isLoading: false,
      currentStep: userExists ? AuthSteps.PASSWORD : AuthSteps.PASSWORD_SETUP,
      error: null
    };
  }),
  on(checkEmailFailure, (state, { error }) => ({
    ...state,
    error,
    isLoading: false
  })),

  // Create User
  on(AuthActions.createUser, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(AuthActions.createUserSuccess, (state) => ({
    ...state,
    currentStep: AuthSteps.EMAIL_VERIFY,
    isLoading: false
  })),
  on(AuthActions.createUserFailure, (state, { error }) => ({
    ...state,
    error,
    isLoading: false
  })),


  // Sign In
  on(AuthActions.signin, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(AuthActions.signinSuccess, (state, { user }) => ({
    ...state,
    user,
    isAuthenticated: true,
    isLoading: false,
    error: null
  })),
  on(AuthActions.signinFailure, (state, { error }) => ({
    ...state,
    error,
    isLoading: false
  })),

  // Register
  on(AuthActions.register, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(AuthActions.registerSuccess, (state, { user }) => ({
    ...state,
    user,
    currentStep: AuthSteps.EMAIL_VERIFY,
    isLoading: false
  })),
  on(AuthActions.registerFailure, (state, { error }) => ({
    ...state,
    error,
    isLoading: false
  })),

  // Email Verification
  on(AuthActions.verifyEmail, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(AuthActions.verifyEmailSuccess, (state) => ({
    ...state,
    emailVerified: true,
    currentStep: AuthSteps.PHONE_SETUP,
    isLoading: false
  })),
  on(AuthActions.verifyEmailFailure, (state, { error }) => ({
    ...state,
    error,
    isLoading: false
  })),

  // Phone Verification
  on(AuthActions.sendPhoneCodeVerification, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(AuthActions.verifyPhoneCode, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),

  // MFA
  on(AuthActions.setupMFA, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(AuthActions.setupMFASuccess, (state) => ({
    ...state,
    mfaEnabled: true,
    currentStep: AuthSteps.MFA_VERIFY,
    isLoading: false
  })),
  on(AuthActions.setupMFAFailure, (state, { error }) => ({
    ...state,
    error,
    isLoading: false
  })),

  on(AuthActions.verifyMFA, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(AuthActions.verifyMFASuccess, (state) => ({
    ...state,
    currentStep: AuthSteps.COMPLETE,
    isLoading: false
  })),
  on(AuthActions.verifyMFAFailure, (state, { error }) => ({
    ...state,
    error,
    isLoading: false
  })),

  // Session
  on(AuthActions.refreshSession, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(AuthActions.refreshSessionSuccess, (state, { user }) => ({
    ...state,
    user,
    isAuthenticated: true,
    isLoading: false
  })),
  on(AuthActions.refreshSessionFailure, (state, { error }) => ({
    ...state,
    error,
    isLoading: false
  })),

  // Signout
  on(AuthActions.signout, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(AuthActions.signoutSuccess, () => initialState),
  on(AuthActions.signoutFailure, (state, { error }) => ({
    ...state,
    error,
    isLoading: false
  }))
);
