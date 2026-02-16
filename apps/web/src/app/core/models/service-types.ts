/**
 * Internal response types for UserService methods.
 * 
 * These types wrap GraphQL responses into a consistent format for internal use.
 * They are NOT legacy - they provide a stable interface for:
 * - Cognito authentication operations (AuthResponse)
 * - User lookup operations that need StatusCode-based error handling
 * 
 * The v0.19.0 GraphQL envelope (code/success/message/item) is unwrapped
 * by ApiService base methods, then re-wrapped here for consistent error handling.
 */

import { IUsers, Users } from './UsersModel';
import { Auth } from './AuthModel';

/**
 * Response type for Cognito authentication operations.
 * Used by CognitoService for sign-in, MFA, password reset, etc.
 */
export type AuthResponse = {
  StatusCode: number;
  Message: string;
  Data: Auth;
};

/**
 * Response type for single user operations.
 * Used for user queries that return a single user or null.
 */
export type UsersResponse = {
  StatusCode: number;
  Message: string;
  Data: IUsers | null;
};

/**
 * Response type for user list operations.
 * Used for queries that may return multiple users.
 */
export type UsersListResponse = {
  StatusCode: number;
  Message: string;
  Data: IUsers[];
};

/**
 * Response type for user creation operations.
 */
export type UsersCreateResponse = {
  StatusCode: number;
  Message: string;
  Data: Users | null;
};

// Aliases for backward compatibility during migration
/** @deprecated Use UsersListResponse */
export type LegacyUsersListResponse = UsersListResponse;
/** @deprecated Use UsersCreateResponse */
export type LegacyUsersCreateResponse = UsersCreateResponse;
