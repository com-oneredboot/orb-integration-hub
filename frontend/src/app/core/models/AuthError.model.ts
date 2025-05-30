/**
 * Generated TypeScript models for AuthError
 * Generated at 2025-05-30T10:59:55.180122
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

// DTO Interface (API/DB contract)
export interface IAuthError {
  code: string;
  message: string;
  description: string;
  details: string;
}

// Domain Model Class (uses enums for enum fields)
// Properties: '!' = required (definite assignment), '?' = optional (from schema)
export class AuthError {
  code!: string;
  message!: string;
  description?: string;
  details?: Record<string, any>;

  constructor(data: Partial<AuthError> = {}) {
    Object.assign(this, data);
  }

  // Convert from DTO (IAuthError) to domain model
  static fromDto(dto: IAuthError): AuthError {
    return new AuthError({
      code: dto.code,
      message: dto.message,
      description: dto.description,
      details: dto.details,
    });
  }

  // Convert domain model to DTO (IAuthError)
  toDto(): IAuthError {
    return {
      code: this.code,
      message: this.message,
      description: this.description,
      details: this.details,
    };
  }
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
