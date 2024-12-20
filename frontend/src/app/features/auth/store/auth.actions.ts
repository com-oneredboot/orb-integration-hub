import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { User } from '../../../core/models/user.model';

export const AuthActions = createActionGroup({
  source: 'Auth',
  events: {
    'Login': props<{ email: string; password: string }>(),
    'Login Success': props<{ user: User }>(),
    'Login Failure': props<{ error: string }>(),

    'Logout': emptyProps(),
    'Logout Success': emptyProps(),
    'Logout Failure': props<{ error: string }>(),

    'Register': props<{ email: string; password: string; firstName: string; lastName: string }>(),
    'Register Success': props<{ user: User }>(),
    'Register Failure': props<{ error: string }>(),

    'Verify Email': props<{ code: string }>(),
    'Verify Email Success': emptyProps(),
    'Verify Email Failure': props<{ error: string }>(),

    'Setup MFA': props<{ mfaType: 'sms' | 'totp' }>(),
    'Setup MFA Success': emptyProps(),
    'Setup MFA Failure': props<{ error: string }>(),

    'Verify MFA': props<{ code: string }>(),
    'Verify MFA Success': emptyProps(),
    'Verify MFA Failure': props<{ error: string }>(),

    'Refresh Session': emptyProps(),
    'Refresh Session Success': props<{ user: User }>(),
    'Refresh Session Failure': props<{ error: string }>()
  }
});
