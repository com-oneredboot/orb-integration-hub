/**
 * Generated TypeScript models for Auth
 * Generated at 2025-06-04T16:28:49.056395
 */

// Import enums and models used in this model
import { MfaSetupDetails } from './MfaSetupDetails.model';
import type { IMfaSetupDetails } from './MfaSetupDetails.model';
import { Users } from './Users.model';
import type { IUsers } from './Users.model';


// Input types
export interface AuthCreateInput {
  statusCode: number;
  isSignedIn: boolean;
  message: string;
  user: Users;
  needsMFA: boolean;
  needsMFASetup: boolean;
  mfaType: string;
  mfaSetupDetails: MfaSetupDetails;
}

export interface AuthUpdateInput {
  statusCode?: number;
  isSignedIn?: boolean;
  message?: string;
  user?: Users;
  needsMFA?: boolean;
  needsMFASetup?: boolean;
  mfaType?: string;
  mfaSetupDetails?: MfaSetupDetails;
}

// Always include DeleteInput (PK fields only)

// DTO Interface (API/DB contract)
export interface IAuth {
  statusCode: number;
  isSignedIn: boolean;
  message: string;
  user: IUsers;
  needsMFA: boolean;
  needsMFASetup: boolean;
  mfaType: string;
  mfaSetupDetails: IMfaSetupDetails;
}

// Domain Model Class (uses enums for enum fields)
// Properties: '!' = required (definite assignment), '?' = optional (from schema)
export class Auth {
  statusCode!: number;
  isSignedIn?: boolean;
  message?: string;
  user?: Users;
  needsMFA?: boolean;
  needsMFASetup?: boolean;
  mfaType?: string;
  mfaSetupDetails?: MfaSetupDetails;

  constructor(data: Partial<Auth> = {}) {
    Object.assign(this, data);
  }

  // Convert from DTO (IAuth) to domain model
  static fromDto(dto: IAuth): Auth {
    return new Auth({
      statusCode: dto.statusCode ?? 0,
      isSignedIn: dto.isSignedIn ?? false,
      message: dto.message ?? '',
      user: dto.user ? Users.fromDto(dto.user) : undefined,
      needsMFA: dto.needsMFA ?? false,
      needsMFASetup: dto.needsMFASetup ?? false,
      mfaType: dto.mfaType ?? '',
      mfaSetupDetails: dto.mfaSetupDetails ? MfaSetupDetails.fromDto(dto.mfaSetupDetails) : undefined,
    });
  }

  // Convert domain model to DTO (IAuth)
  toDto(): IAuth {
    return {
      statusCode: this.statusCode ?? 0,
      isSignedIn: this.isSignedIn ?? false,
      message: this.message ?? '',
      user: this.user ? this.user.toDto() : Users.emptyDto(),
      needsMFA: this.needsMFA ?? false,
      needsMFASetup: this.needsMFASetup ?? false,
      mfaType: this.mfaType ?? '',
      mfaSetupDetails: this.mfaSetupDetails ? this.mfaSetupDetails.toDto() : MfaSetupDetails.emptyDto(),
    };
  }

  // Returns a DTO with all fields set to their default values
  static emptyDto(): IAuth {
    return {
      statusCode: 0,
      isSignedIn: false,
      message: '',
      user: Users.emptyDto(),
      needsMFA: false,
      needsMFASetup: false,
      mfaType: '',
      mfaSetupDetails: MfaSetupDetails.emptyDto(),
    };
  }
}


// ProperCase response types
export interface AuthResponse {
  StatusCode: number;
  Message: string;
  Data: Auth;
}

export interface AuthListResponse {
  StatusCode: number;
  Message: string;
  Data: Auth[];
}

// CRUD response aliases
export type AuthCreateResponse = AuthResponse;
export type AuthUpdateResponse = AuthResponse;
export type AuthDeleteResponse = AuthResponse;
export type AuthDisableResponse = AuthResponse;
