// file: frontend/src/app/features/user/store/user.reducer.ts
// author: Corey Dale Peters
// date: 2025-03-07
// description: TypeScript file

// users.reducer.ts
// author: Corey Peters
// created date: 2023-12-14
// description: The reducer for the users feature

// 3rd Party Imports
import {Action, createReducer, on} from '@ngrx/store';
import { initialState } from "./user.state";

export const userReducer = createReducer(
    initialState,
);

