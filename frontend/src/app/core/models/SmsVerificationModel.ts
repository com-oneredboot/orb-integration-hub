/**
 * SmsVerification Lambda-backed GraphQL resolver model.
 * Generated at 2025-07-16T22:31:58.000548+00:00
 */

// Import enums and models used in this model

// Interface definition
export interface ISmsVerification {
  phoneNumber: string;
  code: number | undefined;
  valid: boolean | undefined;
}

// Class definition
export class SmsVerification implements ISmsVerification {
  phoneNumber = '';
  code = 0;
  valid = false;

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