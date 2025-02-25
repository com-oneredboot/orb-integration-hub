import {createReducer, on} from '@ngrx/store';
import {AuthActions} from './auth.actions';
import {AuthSteps, initialState} from './auth.state';

export const authReducer = createReducer(
  initialState,

  // Check Email
  on(AuthActions.checkEmail, (state) => {
    console.debug('Reducer: checkEmail', {
      currentState: state,
      action: 'checkEmail'
    });
    return {
      ...state,
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
  on(AuthActions.signInSuccess, (state, { user }) => ({
    ...state,
    currentUser: user,
    isAuthenticated: true,
    isLoading: false,
    error: null
  })),
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
