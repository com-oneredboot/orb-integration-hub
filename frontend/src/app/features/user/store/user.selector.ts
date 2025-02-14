// user.selector.ts
import { createSelector } from '@ngrx/store';
import {AppState} from "../../../store/app.reducer";
import {UserState} from "./user.reducer";

// Selector to access the rental unit state
const selectAuthenticationFeature = (state: AppState) => state.authentication;

// Selector for the cognito user
export const selectCognitoUser = createSelector(
    selectAuthenticationFeature,
    (state: UserState) => state.cognitoUser
);

// Selector for the user
export const selectUser = createSelector(
    selectAuthenticationFeature,
    (state: UserState) => state.user
);
