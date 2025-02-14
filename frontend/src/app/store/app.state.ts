// file: frontend/src/app/core/models/currency.model.ts
// author: Corey Dale Peters
// date: 2025-01-03
// description: This file contains the currency model.

// Application Imports
import { AuthState, initialState as authInitialState } from "../features/user/components/auth-flow/store/auth.state";
import { UserState, initialState as userInitialState} from "../features/user/store/user.state";

export interface AppState {
  authenticate: AuthState
  user: UserState
}

export const initialState: AppState = {
  authenticate: authInitialState,
  user: userInitialState
}
