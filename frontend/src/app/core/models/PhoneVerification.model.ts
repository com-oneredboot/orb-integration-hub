/**
 * Generated TypeScript models for PhoneVerification
 * Generated at 2025-06-04T16:28:49.276568
 */

// Import enums and models used in this model


// Input types
export interface PhoneVerificationCreateInput {
  phonenumber: number;
  code: number;
}

export interface PhoneVerificationUpdateInput {
  phonenumber?: number;
  code?: number;
}

// Always include DeleteInput (PK fields only)

// DTO Interface (API/DB contract)
export interface IPhoneVerification {
  phonenumber: number;
  code: number;
}

// Domain Model Class (uses enums for enum fields)
// Properties: '!' = required (definite assignment), '?' = optional (from schema)
export class PhoneVerification {
  phonenumber!: number;
  code?: number;

  constructor(data: Partial<PhoneVerification> = {}) {
    Object.assign(this, data);
  }

  // Convert from DTO (IPhoneVerification) to domain model
  static fromDto(dto: IPhoneVerification): PhoneVerification {
    return new PhoneVerification({
      phonenumber: dto.phonenumber ?? 0,
      code: dto.code ?? 0,
    });
  }

  // Convert domain model to DTO (IPhoneVerification)
  toDto(): IPhoneVerification {
    return {
      phonenumber: this.phonenumber ?? 0,
      code: this.code ?? 0,
    };
  }

  // Returns a DTO with all fields set to their default values
  static emptyDto(): IPhoneVerification {
    return {
      phonenumber: 0,
      code: 0,
    };
  }
}


// ProperCase response types
export interface PhoneVerificationResponse {
  StatusCode: number;
  Message: string;
  Data: PhoneVerification;
}

export interface PhoneVerificationListResponse {
  StatusCode: number;
  Message: string;
  Data: PhoneVerification[];
}

// CRUD response aliases
export type PhoneVerificationCreateResponse = PhoneVerificationResponse;
export type PhoneVerificationUpdateResponse = PhoneVerificationResponse;
export type PhoneVerificationDeleteResponse = PhoneVerificationResponse;
export type PhoneVerificationDisableResponse = PhoneVerificationResponse;
