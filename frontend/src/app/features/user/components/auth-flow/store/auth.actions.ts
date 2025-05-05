// file: frontend/src/app/features/auth/store/user.actions.ts
// author: Corey Dale Peters
// date: 2024-12-27
// description: Contains all actions for the Auth feature

// 3rd Party Imports
import { createActionGroup, emptyProps, props } from '@ngrx/store';

// Application Imports
import { IUser } from '../../../../../core/models/users.model';
import { UsersCreateInput, UsersQueryByEmailInput } from '../../../../../core/graphql/user.graphql';
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
    'SignIn Success': props<{ user: IUser, message: string }>(),
    'SignIn Failure': props<{ error: string }>(),

    'Setup Password': props<{ password: string }>(),
    'Setup Password Success': emptyProps(),
    'Setup Password Failure': props<{ error: string }>(),

    // Phone verification
    'Setup Phone': props<{ phoneNumber: string }>(),
    'Setup Phone Success': props<{ validationId: string, expiresAt: number }>(),
    'Setup Phone Failure': props<{ error: string }>(),

    'Verify Phone': props<{ code: string }>(),
    'Verify Phone Success': emptyProps(),
    'Verify Phone Failure': props<{ error: string }>(),

    'Needs MFA': props<{ code: string, rememberDevice:boolean }>(),
    'Needs MFA Success': emptyProps(),
    'Needs MFA Failure': props<{ error: string }>(),

    'Needs MFA Setup': emptyProps(),
    'Needs MFA Setup Success': emptyProps(),
    'Needs MFA Setup Failure': props<{ error: string }>(),

    'Signout': emptyProps(),
    'Signout Success': emptyProps(),
    'Signout Failure': props<{ error: string }>(),

    'Create User': props<{ input: UsersCreateInput, password: string}>(),
    'Create User Success': emptyProps(),
    'Create User Failure': props<{ error: string }>(),

    'Register': props<{ email: string; password: string; firstName: string; lastName: string }>(),
    'Register Success': props<{ user: IUser }>(),
    'Register Failure': props<{ error: string }>(),

    'Verify Email': props<{ input: UsersQueryByEmailInput, code: string, email?: string }>(),
    'Verify Email Success': emptyProps(),
    'Verify Email Failure': props<{ error: string }>(),

    'Refresh Session': emptyProps(),
    'Refresh Session Success': props<{ user: IUser }>(),
    'Refresh Session Failure': props<{ error: string }>(),

    'Check Phone Required': emptyProps(),
    'Check Phone Required Success': props<{ required: boolean }>(),
    'Check Phone Required Failure': props<{ error: string }>(),

    // Password Reset
    'Initiate Password Reset': props<{ email: string }>(),
    'Initiate Password Reset Success': props<{ message: string }>(),
    'Initiate Password Reset Failure': props<{ error: string }>(),

    'Verify Password Reset Code': props<{ email: string, code: string }>(),
    'Verify Password Reset Code Success': emptyProps(),
    'Verify Password Reset Code Failure': props<{ error: string }>(),

    'Confirm Password Reset': props<{ email: string, code: string, newPassword: string }>(),
    'Confirm Password Reset Success': props<{ message: string }>(),
    'Confirm Password Reset Failure': props<{ error: string }>()
  }
});
