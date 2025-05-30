/**
 * Generated TypeScript models for MfaSetupDetails
 * Generated at 2025-05-30T08:46:39.345988
 */

// Import enums and models used in this model

// Input types
export interface MfaSetupDetailsCreateInput {
  qrCode: string;
  secretKey: string;
  setupUri: string;
}

export interface MfaSetupDetailsUpdateInput {
  qrCode?: string;
  secretKey?: string;
  setupUri?: string;
}

// Always include DeleteInput (PK fields only)
export interface MfaSetupDetailsDeleteInput {
  : string;
}

// Always include DisableInput (PK fields + disabled boolean)
export interface MfaSetupDetailsDisableInput {
  : string;
  disabled: boolean;
}

// QueryBy inputs for PK, SK, and all indexes
export interface MfaSetupDetailsQueryByInput {
  : string;
}

// Model
export interface IMfaSetupDetails {
  qrCode: string;
  secretKey: string;
  setupUri: string;
}

export class MfaSetupDetails implements IMfaSetupDetails {
  qrCode = '';
  secretKey = '';
  setupUri = '';
  constructor(data: Partial<IMfaSetupDetails> = {}) {
    Object.entries(data).forEach(([key, value]) => {
      if (key in this) {
        {
          this[key as keyof this] = value as this[keyof this];
        }
      }
    });
  }
}


export interface MfaSetupDetails {
  qrCode: string;
  secretKey: string;
  setupUri: string;
}

// ProperCase response types
export interface MfaSetupDetailsResponse {
  StatusCode: number;
  Message: string;
  Data: MfaSetupDetails;
}

export interface MfaSetupDetailsListResponse {
  StatusCode: number;
  Message: string;
  Data: MfaSetupDetails[];
}

// CRUD response aliases
export type MfaSetupDetailsCreateResponse = MfaSetupDetailsResponse;
export type MfaSetupDetailsUpdateResponse = MfaSetupDetailsResponse;
export type MfaSetupDetailsDeleteResponse = MfaSetupDetailsResponse;
export type MfaSetupDetailsDisableResponse = MfaSetupDetailsResponse;
