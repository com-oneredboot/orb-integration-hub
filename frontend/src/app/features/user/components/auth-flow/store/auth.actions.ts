// file: frontend/src/app/features/auth/store/user.actions.ts
// author: Corey Dale Peters
// date: 2024-12-27
// description: Contains all actions for the Auth feature

// 3rd Party Imports
import { createActionGroup, emptyProps, props } from '@ngrx/store';

// Application Imports
import { User, UserCreateInput, UserQueryInput } from '../../../../../core/models/user.model';
import { MfaSetupDetails } from '../../../../../core/models/auth.model';

/**
 * Auth Actions
 */
export const AuthActions = createActionGroup({
  source: 'Auth',
  events: {

    // State 0 - Email
    'Check Email': props<{ email: string }>(),
    'Check Email Success': props<{ userExists: boolean }>(),
    'Check Email Failure': props<{ error: string }>(),

    'Verify Cognito Password': props<{ email: string; password: string }>(),
    'Verify Cognito Password Success': props<{ message?: string, needsMFA?: boolean, needsMFASetup?:boolean, mfaSetupDetails?: MfaSetupDetails }>(),
    'Verify Cognito Password Failure': props<{ error: string }>(),

    'SignIn': props<{ email: string; password: string }>(),
    'SignIn Success': props<{ user: User, message: string,  }>(),
    'SignIn Failure': props<{ error: string }>(),

    'Setup Password': props<{ password: string }>(),
    'Setup Password Success': emptyProps(),
    'Setup Password Failure': props<{ error: string }>(),

    'Needs MFA': props<{ code: string, rememberDevice:boolean }>(),
    'Needs MFA Success': emptyProps(),
    'Needs MFA Failure': props<{ error: string }>(),

    'Needs MFA Setup': emptyProps(),
    'Needs MFA Setup Success': emptyProps(),
    'Needs MFA Setup Failure': props<{ error: string }>(),

    'Signout': emptyProps(),
    'Signout Success': emptyProps(),
    'Signout Failure': props<{ error: string }>(),

    'Create User': props<{ input: UserCreateInput, password: string}>(),
    'Create User Success': emptyProps(),
    'Create User Failure': props<{ error: string }>(),

    'Register': props<{ email: string; password: string; firstName: string; lastName: string }>(),
    'Register Success': props<{ user: User }>(),
    'Register Failure': props<{ error: string }>(),

    'Verify Email': props<{ input: UserQueryInput, code: string }>(),
    'Verify Email Success': emptyProps(),
    'Verify Email Failure': props<{ error: string }>(),

    'Refresh Session': emptyProps(),
    'Refresh Session Success': props<{ user: User }>(),
    'Refresh Session Failure': props<{ error: string }>()

  }
});
