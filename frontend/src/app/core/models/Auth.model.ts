/**
 * Generated TypeScript models for Auth
 * Generated at 2025-05-30T08:46:39.266799
 */

// Import enums and models used in this modelimport { MfaSetupDetails } from './MfaSetupDetails.model';import { Users } from './Users.model';

// Input types
export interface AuthCreateInput {
  statusCode: number;
  isSignedIn: boolean;
  message: string;
  user: IUsers;
  needsMFA: boolean;
  needsMFASetup: boolean;
  mfaType: string;
  mfaSetupDetails: MfaSetupDetails;
}

export interface AuthUpdateInput {
  statusCode?: number;
  isSignedIn?: boolean;
  message?: string;
  user?: IUsers;
  needsMFA?: boolean;
  needsMFASetup?: boolean;
  mfaType?: string;
  mfaSetupDetails?: MfaSetupDetails;
}

// Always include DeleteInput (PK fields only)
export interface AuthDeleteInput {
  : string;
}

// Always include DisableInput (PK fields + disabled boolean)
export interface AuthDisableInput {
  : string;
  disabled: boolean;
}

// QueryBy inputs for PK, SK, and all indexes
export interface AuthQueryByInput {
  : string;
}

// Model
export interface IAuth {
  statusCode: number;
  isSignedIn: boolean;
  message: string;
  user: IUsers;
  needsMFA: boolean;
  needsMFASetup: boolean;
  mfaType: string;
  mfaSetupDetails: MfaSetupDetails;
}

export class Auth implements IAuth {
  statusCode = 0;
  isSignedIn = false;
  message = '';
  user = undefined;
  needsMFA = false;
  needsMFASetup = false;
  mfaType = '';
  mfaSetupDetails = undefined;
  constructor(data: Partial<IAuth> = {}) {
    Object.entries(data).forEach(([key, value]) => {
      if (key in this) {
        {
          this[key as keyof this] = value as this[keyof this];
        }
      }
    });
  }
}


export interface Auth {
  statusCode: string;
  isSignedIn: boolean;
  message: string;
  user: string;
  needsMFA: boolean;
  needsMFASetup: boolean;
  mfaType: string;
  mfaSetupDetails: string;
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
