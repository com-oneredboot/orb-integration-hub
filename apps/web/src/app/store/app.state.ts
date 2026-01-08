// file: apps/web/src/app/core/models/currency.model.ts
// author: Corey Dale Peters
// date: 2025-01-03
// description: This file contains the currency model.

// Application Imports
import { UserState, initialState as userInitialState} from "../features/user/store/user.state";

export interface AppState {
  user: UserState
}

export const initialState: AppState = {
  user: userInitialState
}
