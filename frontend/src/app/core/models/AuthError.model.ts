/**
 * Generated TypeScript models for AuthError
 * Generated at 2025-05-30T08:46:39.290316
 */

// Import enums and models used in this model

// Input types
export interface AuthErrorCreateInput {
  code: string;
  message: string;
  description: string;
  details: Record<string, any>;
}

export interface AuthErrorUpdateInput {
  code?: string;
  message?: string;
  description?: string;
  details?: Record<string, any>;
}

// Always include DeleteInput (PK fields only)
export interface AuthErrorDeleteInput {
  : string;
}

// Always include DisableInput (PK fields + disabled boolean)
export interface AuthErrorDisableInput {
  : string;
  disabled: boolean;
}

// QueryBy inputs for PK, SK, and all indexes
export interface AuthErrorQueryByInput {
  : string;
}

// Model
export interface IAuthError {
  code: string;
  message: string;
  description: string;
  details: Record<string, any>;
}

export class AuthError implements IAuthError {
  code = '';
  message = '';
  description = '';
  details = {};
  constructor(data: Partial<IAuthError> = {}) {
    Object.entries(data).forEach(([key, value]) => {
      if (key in this) {
        {
          this[key as keyof this] = value as this[keyof this];
        }
      }
    });
  }
}


export interface AuthError {
  code: string;
  message: string;
  description: string;
  details: string;
}

// ProperCase response types
export interface AuthErrorResponse {
  StatusCode: number;
  Message: string;
  Data: AuthError;
}

export interface AuthErrorListResponse {
  StatusCode: number;
  Message: string;
  Data: AuthError[];
}

// CRUD response aliases
export type AuthErrorCreateResponse = AuthErrorResponse;
export type AuthErrorUpdateResponse = AuthErrorResponse;
export type AuthErrorDeleteResponse = AuthErrorResponse;
export type AuthErrorDisableResponse = AuthErrorResponse;
