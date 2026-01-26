/**
 * Legacy response types for backward compatibility.
 * These types are used for Cognito responses and custom Lambda endpoints
 * that don't follow the v0.19.0 GraphQL response envelope format.
 * 
 * DO NOT use these for standard GraphQL operations - use the generated
 * response types from the model files instead.
 */

import { IUsers, Users } from './UsersModel';
import { Auth } from './AuthModel';

/**
 * Legacy response type for Cognito authentication operations.
 * Used by CognitoService for sign-in, MFA, password reset, etc.
 */
export type AuthResponse = {
  StatusCode: number;
  Message: string;
  Data: Auth;
};

/**
 * Legacy response type for single user operations.
 * Used for Cognito user creation and custom Lambda endpoints.
 * @deprecated Use UsersGetResponse for v0.19.0 GraphQL operations
 */
export type UsersResponse = {
  StatusCode: number;
  Message: string;
  Data: IUsers | null;
};

/**
 * Legacy response type for user list operations.
 * @deprecated Use UsersListResponse for v0.19.0 GraphQL operations
 */
export type LegacyUsersListResponse = {
  StatusCode: number;
  Message: string;
  Data: IUsers[];
};

/**
 * Legacy response type for user creation.
 * @deprecated Use UsersCreateResponse for v0.19.0 GraphQL operations
 */
export type LegacyUsersCreateResponse = {
  StatusCode: number;
  Message: string;
  Data: Users | null;
};
