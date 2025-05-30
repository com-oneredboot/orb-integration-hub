/**
 * Generated TypeScript models for MfaSetupDetails
 * Generated at 2025-05-30T10:59:55.228509
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

// DTO Interface (API/DB contract)
export interface IMfaSetupDetails {
  qrCode: string;
  secretKey: string;
  setupUri: string;
}

// Domain Model Class (uses enums for enum fields)
// Properties: '!' = required (definite assignment), '?' = optional (from schema)
export class MfaSetupDetails {
  qrCode!: string;
  secretKey!: string;
  setupUri?: string;

  constructor(data: Partial<MfaSetupDetails> = {}) {
    Object.assign(this, data);
  }

  // Convert from DTO (IMfaSetupDetails) to domain model
  static fromDto(dto: IMfaSetupDetails): MfaSetupDetails {
    return new MfaSetupDetails({
      qrCode: dto.qrCode,
      secretKey: dto.secretKey,
      setupUri: dto.setupUri,
    });
  }

  // Convert domain model to DTO (IMfaSetupDetails)
  toDto(): IMfaSetupDetails {
    return {
      qrCode: this.qrCode,
      secretKey: this.secretKey,
      setupUri: this.setupUri,
    };
  }
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
