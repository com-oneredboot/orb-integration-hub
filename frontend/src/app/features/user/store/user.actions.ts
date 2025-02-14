// user.actions.ts

import { createAction, props } from '@ngrx/store';
import {ICognitoUser} from "../../../core/services/cognito.service";
import {IUser} from "../../shared/components/user/user.model";

export const signIn = createAction(
    '[Auth] Sign In',
    props<{ username: string; password: string }>()
);

export const signInSuccess = createAction(
    '[Auth] Sign In Success',
    props<{ cognitoUser: ICognitoUser, user: IUser }>()
);

export const signInFailure = createAction(
    '[Auth] Sign In Failure',
    props<{ error: any }>()
);

export const updateCognitoUser = createAction(
    '[Auth] Update Cognito User',
    props<{ cognitoUser: ICognitoUser }>()
);

export const updateUser = createAction(
    '[Auth] Update User',
    props<{ user: IUser }>()
);


