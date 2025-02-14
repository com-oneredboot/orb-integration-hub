// file: frontend/src/app/features/user/store/user.state.ts
// author: Corey Dale Peters
// date: 2025-01-03
// description: User State

// Application Imports
import { User, UserGroup } from "../../../core/models/user.model";


export interface UserState {
  debugMode: boolean;
  isAuthenticated: boolean;
  error: string | null;
  currentUser: User | null;
  userExists: boolean;

  // Group related
  currentGroup: UserGroup | null;

}

export const initialState: UserState = {
  debugMode: true,
  isAuthenticated: false,
  error: null,
  currentUser: null,
  userExists: false,

  currentGroup: null,
};
