/**
 * SmsVerification Lambda-backed GraphQL resolver model.
 * Generated at 2025-06-18T23:48:00.235689
 */

// Import enums and models used in this model

// Interface definition
export interface ISmsVerification {
  phonenumber: number;
  code: number | undefined;
}

// Class definition
export class SmsVerification implements ISmsVerification {
  phonenumber = 0;
  code = 0;

  constructor(data: Partial<ISmsVerification> = {}) {
    Object.entries(data).forEach(([key, value]) => {
      if (key in this) {
        {
          this[key as keyof this] = value as this[keyof this];
        }
      }
    });
  }
}

// Response type
export type SmsVerificationResponse = {
  StatusCode: number;
  Message: string;
  Data: SmsVerification | null;
}; 