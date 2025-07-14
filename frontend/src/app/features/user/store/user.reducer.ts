// file: frontend/src/app/features/user/components/auth-flow/store/auth.reducer.ts
// author: Corey Dale Peters
// date: 2025-03-07
// description: TypeScript file

import {createReducer, on} from '@ngrx/store';
import {UserActions} from './user.actions';
import {AuthSteps, initialState, UserState} from './user.state';

export { UserState } from './user.state';

export const userReducer = createReducer(
  initialState,

  // Navigation
  on(UserActions.setCurrentStep, (state, { step }) => ({
    ...state,
    currentStep: step
  })),

  // Check Email
  on(UserActions.checkEmail, (state, { email }) => {
    return {
      ...state,
      currentEmail: email,
      isLoading: true,
      error: null
    };
  }),
  on(UserActions.checkEmailSuccess, (state, { userExists }) => {
    return {
      ...state,
      userExists,
      isLoading: false,
      currentStep: userExists ? AuthSteps.PASSWORD : AuthSteps.PASSWORD_SETUP,
      error: null
    };
  }),
  on(UserActions.checkEmailFailure, (state, { error }) => ({
    ...state,
    error,
    isLoading: false
  })),
  on(UserActions.checkEmailUserNotFound, (state) => ({
    ...state,
    currentStep: AuthSteps.PASSWORD_SETUP,
    isLoading: false,
    error: null
  })),

  // Create User
  on(UserActions.createUser, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(UserActions.createUserSuccess, (state) => ({
    ...state,
    currentStep: AuthSteps.EMAIL_VERIFY,
    isLoading: false
  })),
  on(UserActions.createUserFailure, (state, { error }) => ({
    ...state,
    error,
    isLoading: false
  })),

  // Email Verification
  on(UserActions.verifyEmail, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(UserActions.verifyEmailSuccess, (state) => ({
    ...state,
    emailVerified: true,
    currentStep: AuthSteps.SIGNIN,
    isLoading: false
  })),
  on(UserActions.verifyEmailFailure, (state, { error }) => ({
    ...state,
    error,
    isLoading: false
  })),

  // Verify Cognito Password
  on(UserActions.verifyCognitoPassword, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(UserActions.verifyCognitoPasswordSuccess, (state, { message, needsMFA, needsMFASetup, mfaSetupDetails }) => {
    // decide on next step.  NeedsMFASetup trumps all
    let nextStep = (needsMFA)? AuthSteps.MFA_VERIFY: AuthSteps.SIGNIN;
    nextStep = (needsMFASetup) ? AuthSteps.MFA_SETUP : nextStep;

    return {
      ...state,
      currentStep: nextStep,
      mfaSetupDetails: mfaSetupDetails,
      isLoading: false
    }
  }),
  on(UserActions.verifyCognitoPasswordFailure, (state, { error }) => ({
    ...state,
    error,
    isLoading: false
  })),

  // Sign In
  on(UserActions.signIn, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(UserActions.signInSuccess, (state, { user }) => {
    // Check if phone verification is needed
    const phoneVerificationNeeded = !user.phoneNumber;
    
    return {
      ...state,
      currentUser: user,
      isAuthenticated: true,
      isLoading: false,
      error: null
    };
  }),
  on(UserActions.signInFailure, (state, { error }) => ({
    ...state,
    error,
    isLoading: false
  })),

  // Register
  on(UserActions.register, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(UserActions.registerSuccess, (state, { user }) => ({
    ...state,
    currentUser: user,
    currentStep: AuthSteps.EMAIL_VERIFY,
    isLoading: false
  })),
  on(UserActions.registerFailure, (state, { error }) => ({
    ...state,
    error,
    isLoading: false
  })),

  // MFA
  on(UserActions.needsMFA, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(UserActions.needsMFASuccess, (state) => ({
    ...state,
    mfaEnabled: true,
    isAuthenticated: true,
    sessionActive: true,
    isLoading: false,
    error: null
    // Note: currentStep will be set by authFlowComplete action
  })),
  on(UserActions.needsMFAFailure, (state, { error }) => ({
    ...state,
    error,
    isLoading: false
  })),

  // MFA Setup
  on(UserActions.needsMFASetup, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(UserActions.needsMFASetupSuccess, (state) => ({
    ...state,
    currentStep: AuthSteps.MFA_VERIFY,
    isLoading: false
  })),
  on(UserActions.needsMFASetupFailure, (state, { error }) => ({
    ...state,
    error,
    isLoading: false
  })),

  // Session
  on(UserActions.refreshSession, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(UserActions.refreshSessionSuccess, (state, { user }) => ({
    ...state,
    currentUser: user,
    isAuthenticated: true,
    isLoading: false,
    currentStep: AuthSteps.COMPLETE
  })),
  
  // Phone verification actions
  on(UserActions.checkPhoneRequired, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(UserActions.checkPhoneRequiredSuccess, (state, { required }) => ({
    ...state,
    isLoading: false,
    error: null,
    currentStep: required ? AuthSteps.PHONE_SETUP : AuthSteps.COMPLETE
  })),
  on(UserActions.checkPhoneRequiredFailure, (state, { error }) => ({
    ...state,
    error,
    isLoading: false
  })),
  
  on(UserActions.setupPhone, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(UserActions.setupPhoneSuccess, (state, { validationId, expiresAt }) => ({
    ...state, 
    isLoading: false,
    error: null,
    phoneValidationId: validationId,
    phoneValidationExpiration: expiresAt,
    currentStep: AuthSteps.PHONE_VERIFY
  })),
  on(UserActions.setupPhoneFailure, (state, { error }) => ({
    ...state,
    error,
    isLoading: false,
    // Keep the current step to allow retry
  })),
  
  on(UserActions.verifyPhone, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(UserActions.verifyPhoneSuccess, (state) => ({
    ...state,
    isLoading: false,
    error: null,
    phoneVerified: true
    // Don't set currentStep to COMPLETE yet - wait for user update to complete
  })),
  on(UserActions.verifyPhoneFailure, (state, { error }) => ({
    ...state,
    error,
    isLoading: false,
    // Stay on the verification step to allow retry
  })),
  on(UserActions.refreshSessionFailure, (state, { error }) => ({
    ...state,
    error,
    isLoading: false
  })),

  // Check MFA Setup
  on(UserActions.checkMFASetup, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(UserActions.checkMFASetupSuccess, (state) => ({
    ...state,
    isLoading: false,
    error: null
  })),
  on(UserActions.checkMFASetupFailure, (state, { error }) => ({
    ...state,
    error,
    isLoading: false
  })),

  // Auth Flow Complete
  on(UserActions.authFlowComplete, (state, { user }) => {
    console.log('[AuthReducer] authFlowComplete - Authentication flow completed for user:', user.email);
    return {
      ...state,
      currentStep: AuthSteps.COMPLETE,
      currentUser: user,
      isAuthenticated: true,
      sessionActive: true,
      isLoading: false,
      error: null
    };
  }),

  // Signout
  on(UserActions.signout, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(UserActions.signoutSuccess, () => {
    // Ensure complete reset to initial state with a new object reference
    return {...initialState};
  }),
  on(UserActions.signoutFailure, (state, { error }) => ({
    ...state,
    error,
    isLoading: false
  })),

  // User update after phone verification
  on(UserActions.updateUserAfterPhoneVerification, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(UserActions.updateUserAfterPhoneVerificationSuccess, (state, { user }) => ({
    ...state,
    isLoading: false,
    error: null,
    currentUser: user,
    sessionActive: true,
    isAuthenticated: true,
    currentStep: AuthSteps.COMPLETE
  })),
  on(UserActions.updateUserAfterPhoneVerificationFailure, (state, { error }) => ({
    ...state,
    error,
    isLoading: false
  }))
);
