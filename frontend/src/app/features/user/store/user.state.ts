// file: frontend/src/app/features/user/store/user.state.ts
// author: Corey Dale Peters
// date: 2025-01-03
// description: User State

// Application Imports
import { IUsers } from "../../../core/models/Users.model";
import { UserGroup } from "../../../core/models/UserGroup.enum";


export interface UserState {
  debugMode: boolean;
  isAuthenticated: boolean;
  error: string | null;
  currentUser: IUsers | null;
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
