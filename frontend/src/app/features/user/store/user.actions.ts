// file: frontend/src/app/features/user/store/user.actions.ts
// author: Corey Dale Peters
// date: 2025-03-07
// description: TypeScript file

// user.actions.ts

import { createAction, props } from '@ngrx/store';
import { IAuth } from "../../../core/models/Auth.model";
import { IUsers } from "../../../core/models/Users.model";

export const signIn = createAction(
    '[Auth] Sign In',
    props<{ username: string; password: string }>()
);

export const signInSuccess = createAction(
    '[Auth] Sign In Success',
    props<{ auth: IAuth, user: IUsers }>()
);

export const signInFailure = createAction(
    '[Auth] Sign In Failure',
    props<{ error: any }>()
);

export const updateAuth = createAction(
    '[Auth] Update Auth',
    props<{ auth: IAuth }>()
);

export const updateUser = createAction(
    '[Auth] Update User',
    props<{ user: IUsers }>()
);

export const UserActions = {
  signIn,
  signInSuccess,
  signInFailure,
  updateAuth,
  updateUser
};


