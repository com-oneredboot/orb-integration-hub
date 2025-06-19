// file: frontend/src/app/features/user/components/auth-flow/store/auth.reducer.ts
// author: Corey Dale Peters
// date: 2025-03-07
// description: TypeScript file

import {createReducer, on} from '@ngrx/store';
import {AuthActions} from './auth.actions';
import {AuthSteps, initialState} from './auth.state';

export const authReducer = createReducer(
  initialState,

  // Check Email
  on(AuthActions.checkEmail, (state, { email }) => {
    console.debug('Reducer: checkEmail', {
      currentState: state,
      action: 'checkEmail',
      email
    });
    return {
      ...state,
      currentEmail: email,
      isLoading: true,
      error: null
    };
  }),
  on(AuthActions.checkEmailSuccess, (state, { userExists }) => {
    console.debug('Reducer handling checkEmailSuccess:', {
      currentState: state,
      userExists,
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
  on(AuthActions.checkEmailFailure, (state, { error }) => ({
    ...state,
    error,
    isLoading: false
  })),
  on(AuthActions.checkEmailUserNotFound, (state) => ({
    ...state,
    currentStep: AuthSteps.PASSWORD_SETUP,
    isLoading: false,
    error: null
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

  // Email Verification
  on(AuthActions.verifyEmail, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(AuthActions.verifyEmailSuccess, (state) => ({
    ...state,
    emailVerified: true,
    currentStep: AuthSteps.SIGNIN,
    isLoading: false
  })),
  on(AuthActions.verifyEmailFailure, (state, { error }) => ({
    ...state,
    error,
    isLoading: false
  })),

  // Verify Cognito Password
  on(AuthActions.verifyCognitoPassword, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(AuthActions.verifyCognitoPasswordSuccess, (state, { message, needsMFA, needsMFASetup, mfaSetupDetails }) => {
    console.debug('Reducer handling verifyCognitoPasswordSuccess:', { message, needsMFA, needsMFASetup });

    // decide on next step.  NeedsMFASetup trumps all
    let nextStep = (needsMFA)? AuthSteps.MFA_VERIFY: AuthSteps.SIGNIN;
    nextStep = (needsMFASetup) ? AuthSteps.MFA_SETUP : nextStep;
    console.debug('Reducer handling verifyCognitoPasswordSuccess:', { nextStep });

    return {
      ...state,
      currentStep: nextStep,
      mfaSetupDetails: mfaSetupDetails,
      isLoading: false
    }
  }),
  on(AuthActions.verifyCognitoPasswordFailure, (state, { error }) => ({
    ...state,
    error,
    isLoading: false
  })),

  // Sign In
  on(AuthActions.signIn, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(AuthActions.signInSuccess, (state, { user }) => {
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
  on(AuthActions.signInFailure, (state, { error }) => ({
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
    currentUser: user,
    currentStep: AuthSteps.EMAIL_VERIFY,
    isLoading: false
  })),
  on(AuthActions.registerFailure, (state, { error }) => ({
    ...state,
    error,
    isLoading: false
  })),

  // MFA
  on(AuthActions.needsMFA, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(AuthActions.needsMFASuccess, (state) => ({
    ...state,
    mfaEnabled: true,
    currentStep: AuthSteps.COMPLETE,
    isLoading: false
  })),
  on(AuthActions.needsMFAFailure, (state, { error }) => ({
    ...state,
    error,
    isLoading: false
  })),

  // MFA Setup
  on(AuthActions.needsMFASetup, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(AuthActions.needsMFASetupSuccess, (state) => ({
    ...state,
    currentStep: AuthSteps.MFA_VERIFY,
    isLoading: false
  })),
  on(AuthActions.needsMFASetupFailure, (state, { error }) => ({
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
    currentUser: user,
    isAuthenticated: true,
    isLoading: false,
    currentStep: AuthSteps.COMPLETE
  })),
  
  // Phone verification actions
  on(AuthActions.checkPhoneRequired, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(AuthActions.checkPhoneRequiredSuccess, (state, { required }) => ({
    ...state,
    isLoading: false,
    error: null,
    currentStep: required ? AuthSteps.PHONE_SETUP : AuthSteps.COMPLETE
  })),
  on(AuthActions.checkPhoneRequiredFailure, (state, { error }) => ({
    ...state,
    error,
    isLoading: false
  })),
  
  on(AuthActions.setupPhone, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(AuthActions.setupPhoneSuccess, (state, { validationId, expiresAt }) => ({
    ...state, 
    isLoading: false,
    error: null,
    phoneValidationId: validationId,
    phoneValidationExpiration: expiresAt,
    currentStep: AuthSteps.PHONE_VERIFY
  })),
  on(AuthActions.setupPhoneFailure, (state, { error }) => ({
    ...state,
    error,
    isLoading: false,
    // Keep the current step to allow retry
  })),
  
  on(AuthActions.verifyPhone, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(AuthActions.verifyPhoneSuccess, (state) => ({
    ...state,
    isLoading: false,
    error: null,
    phoneVerified: true
    // Don't set currentStep to COMPLETE yet - wait for user update to complete
  })),
  on(AuthActions.verifyPhoneFailure, (state, { error }) => ({
    ...state,
    error,
    isLoading: false,
    // Stay on the verification step to allow retry
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
  on(AuthActions.signoutSuccess, () => {
    // Ensure complete reset to initial state with a new object reference
    return {...initialState};
  }),
  on(AuthActions.signoutFailure, (state, { error }) => ({
    ...state,
    error,
    isLoading: false
  })),

  // User update after phone verification
  on(AuthActions.updateUserAfterPhoneVerification, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(AuthActions.updateUserAfterPhoneVerificationSuccess, (state, { user }) => ({
    ...state,
    isLoading: false,
    error: null,
    currentUser: user,
    sessionActive: true,
    isAuthenticated: true,
    currentStep: AuthSteps.COMPLETE
  })),
  on(AuthActions.updateUserAfterPhoneVerificationFailure, (state, { error }) => ({
    ...state,
    error,
    isLoading: false
  }))
);
