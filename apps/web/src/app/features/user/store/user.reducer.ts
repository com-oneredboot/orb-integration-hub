// file: apps/web/src/app/features/user/components/auth-flow/store/auth.reducer.ts
// author: Corey Dale Peters
// date: 2025-03-07
// description: TypeScript file

import {createReducer, on} from '@ngrx/store';
import {UserActions} from './user.actions';
import {AuthSteps, initialState} from './user.state';
import { sanitizeEmail } from '../../../core/utils/log-sanitizer';

export { UserState } from './user.state';

export const userReducer = createReducer(
  initialState,

  // Navigation
  on(UserActions.setCurrentStep, (state, { step }) => ({
    ...state,
    currentStep: step
  })),

  // Smart Recovery Actions
  on(UserActions.smartCheck, (state, { email }) => ({
    ...state,
    currentEmail: email,
    isLoading: true,
    error: null,
    recoveryMessage: null
  })),
  on(UserActions.smartCheckSuccess, (state, { result }) => ({
    ...state,
    isLoading: false,
    error: null,
    currentStep: result.nextStep,
    recoveryAction: result.recoveryAction,
    recoveryMessage: result.userMessage,
    userExists: result.dynamoExists
  })),
  on(UserActions.smartCheckFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
    recoveryMessage: null
  })),
  
  on(UserActions.recoverOrphanedUser, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(UserActions.recoverOrphanedUserSuccess, (state, { user }) => ({
    ...state,
    isLoading: false,
    error: null,
    currentUser: user,
    recoveryMessage: null
  })),
  on(UserActions.recoverOrphanedUserFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error
  })),
  
  on(UserActions.resumeFromStorage, (state) => ({
    ...state,
    isLoading: true
  })),
  on(UserActions.resumeFromStorageSuccess, (state, { email, step }) => ({
    ...state,
    isLoading: false,
    currentEmail: email,
    currentStep: step
  })),
  on(UserActions.resumeFromStorageNotFound, (state) => ({
    ...state,
    isLoading: false
  })),
  
  on(UserActions.setRecoveryMessage, (state, { message }) => ({
    ...state,
    recoveryMessage: message
  })),
  on(UserActions.clearRecoveryMessage, (state) => ({
    ...state,
    recoveryMessage: null
  })),

  // Create User
  on(UserActions.createUser, (state, { input }) => ({
    ...state,
    currentEmail: input.email, // Preserve email for verification step
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
  
  // Create DynamoDB record only (user already exists in Cognito)
  on(UserActions.createUserRecordOnly, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(UserActions.createUserRecordOnlySuccess, (state, { user }) => ({
    ...state,
    currentUser: user,
    isLoading: false,
    error: null
  })),
  on(UserActions.createUserRecordOnlyFailure, (state, { error }) => ({
    ...state,
    error,
    isLoading: false
  })),

  // Create user from Cognito (secure Lambda-backed operation)
  on(UserActions.createUserFromCognito, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(UserActions.createUserFromCognitoSuccess, (state, { user }) => ({
    ...state,
    currentUser: user,
    isLoading: false,
    error: null
  })),
  on(UserActions.createUserFromCognitoFailure, (state, { error }) => ({
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
  on(UserActions.verifyCognitoPasswordSuccess, (state, { message: _message, needsMFA, needsMFASetup, mfaSetupDetails }) => {
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
  on(UserActions.signIn, (state, { email }) => ({
    ...state,
    currentEmail: email, // Preserve email for MFA flow
    isLoading: true,
    error: null
  })),
  on(UserActions.signInSuccess, (state, { user }) => {
    // Phone verification status is tracked in user object
    
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
  // Note: Phone setup/verification is now handled on the profile page
  // These reducers are kept for the profile component's use
  on(UserActions.checkPhoneRequired, (state) => ({
    ...state,
    isLoading: true,
    error: null
  })),
  on(UserActions.checkPhoneRequiredSuccess, (state, { required: _required }) => ({
    ...state,
    isLoading: false,
    error: null
    // Step navigation is now handled by the profile page
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
    phoneValidationExpiration: expiresAt
    // Step navigation is now handled by the profile page
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
    console.log('[AuthReducer] authFlowComplete - Authentication flow completed for user:', sanitizeEmail(user.email));
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
  })),

  // Profile Update (updates store without triggering auth flow completion)
  on(UserActions.updateProfileSuccess, (state, { user }) => ({
    ...state,
    currentUser: user,
    isLoading: false,
    error: null
  }))
);
