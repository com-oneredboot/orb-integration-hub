// user.actions.ts

import { createAction, props } from '@ngrx/store';
import { CognitoUser } from "../../../core/models/cognito.model"
import { User } from "../../../core/models/user.model"

export const signIn = createAction(
    '[Auth] Sign In',
    props<{ username: string; password: string }>()
);

export const signInSuccess = createAction(
    '[Auth] Sign In Success',
    props<{ cognitoUser: CognitoUser, user: User }>()
);

export const signInFailure = createAction(
    '[Auth] Sign In Failure',
    props<{ error: any }>()
);

export const updateCognitoUser = createAction(
    '[Auth] Update Cognito User',
    props<{ cognitoUser: CognitoUser }>()
);

export const updateUser = createAction(
    '[Auth] Update User',
    props<{ user: User }>()
);


