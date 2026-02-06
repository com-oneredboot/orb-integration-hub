// file: apps/web/src/app/store/app.reducer.ts
// author: Corey Dale Peters
// date: 2025-01-03
// description: App Reducer

// 3rd Party Imports
import { ActionReducerMap } from '@ngrx/store';

// Application Imports
import {AppState} from "./app.state";
import { userReducer } from "../features/user/store/user.reducer";
import { usersReducer } from "../features/customers/users/store/users.reducer";

export { AppState } from "./app.state";

export const reducers: ActionReducerMap<AppState> = {
    user: userReducer,
    users: usersReducer
};
