// auth.actions.ts
import { createAction, props } from '@ngrx/store';
import {AuthStep} from "./auth.state";

// Check Email
export const checkEmail = createAction(
  '[Auth] Check Email',
  props<{ email: string }>()
);

export const checkEmailSuccess = createAction(
  '[Auth] Check Email Success',
  props<{ exists: boolean }>()
);

export const checkEmailFailure = createAction(
  '[Auth] Check Email Failure',
  props<{ error: string }>()
);

// Sign In
export const signIn = createAction(
  '[Auth] Sign In',
  props<{ email: string; password: string }>()
);

export const signInSuccess = createAction(
  '[Auth] Sign In Success'
);

export const signInRequiresMfa = createAction(
  '[Auth] Sign In Requires MFA',
  props<{ mfaType: 'SMS' | 'TOTP' }>()
);

export const signInFailure = createAction(
  '[Auth] Sign In Failure',
  props<{ error: string }>()
);

// Sign Up
export const signUp = createAction(
  '[Auth] Sign Up',
  props<{ email: string; password: string }>()
);

export const signUpSuccess = createAction(
  '[Auth] Sign Up Success'
);

export const signUpFailure = createAction(
  '[Auth] Sign Up Failure',
  props<{ error: string }>()
);

// Verify MFA
export const verifyMfa = createAction(
  '[Auth] Verify MFA',
  props<{ code: string }>()
);

export const verifyMfaSuccess = createAction(
  '[Auth] Verify MFA Success'
);

export const verifyMfaFailure = createAction(
  '[Auth] Verify MFA Failure',
  props<{ error: string }>()
);

// Navigation Actions
export const setAuthStep = createAction(
  '[Auth] Set Step',
  props<{ step: AuthStep }>()
);

