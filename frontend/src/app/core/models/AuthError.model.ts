/**
 * Generated TypeScript models for AuthError
 * Generated at 2025-06-04T16:28:49.131145
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

// DTO Interface (API/DB contract)
export interface IAuthError {
  code: string;
  message: string;
  description: string;
  details: Record<string, any>;
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
      code: dto.code ?? '',
      message: dto.message ?? '',
      description: dto.description ?? '',
      details: dto.details ?? {},
    });
  }

  // Convert domain model to DTO (IAuthError)
  toDto(): IAuthError {
    return {
      code: this.code ?? '',
      message: this.message ?? '',
      description: this.description ?? '',
      details: this.details ?? {},
    };
  }

  // Returns a DTO with all fields set to their default values
  static emptyDto(): IAuthError {
    return {
      code: '',
      message: '',
      description: '',
      details: {},
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
