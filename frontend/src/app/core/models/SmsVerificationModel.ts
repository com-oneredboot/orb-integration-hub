/**
 * SmsVerification Lambda-backed GraphQL resolver model.
 * Generated at 2025-06-19T13:19:12.875124
 */

// Import enums and models used in this model

// Interface definition
export interface ISmsVerification {
  phoneNumber: string;
  code: number | undefined;
}

// Class definition
export class SmsVerification implements ISmsVerification {
  phoneNumber = '';
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