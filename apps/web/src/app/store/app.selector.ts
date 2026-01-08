// file: apps/web/src/app/core/models/currency.model.ts
// author: Corey Dale Peters
// date: 2025-01-03
// description: This file contains the currency model.

import {AppState} from "./app.state";
import {createSelector} from "@ngrx/store";
import {UserState} from "../features/user/store/user.state";

const selectAuthenticationFeature = (state: AppState) => state.authenticate;

export const selectUser = createSelector(
  selectAuthenticationFeature,
  (state: UserState) => state.currentUser
);
