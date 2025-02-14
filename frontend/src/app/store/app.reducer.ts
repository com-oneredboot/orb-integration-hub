// file: frontend/src/app/store/app.reducer.ts
// author: Corey Dale Peters
// date: 2025-01-03
// description: App Reducer

// 3rd Party Imports
import { ActionReducerMap } from '@ngrx/store';

// Application Imports
import {AppState} from "./app.state";
import { authReducer } from "../features/user/components/auth-flow/store/auth.reducer";
import { userReducer } from "../features/user/store/user.reducer";

export const reducers: ActionReducerMap<AppState> = {
    authenticate: authReducer,
    user: userReducer
};
