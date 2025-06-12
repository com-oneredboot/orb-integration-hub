/**
 * PhoneVerification Lambda-backed GraphQL resolver model.
 * Generated at 2025-06-12T16:30:18.395112
 */

// Import enums and models used in this model

// Interface definition
export interface IPhoneVerification {
  phonenumber: number;
  code: number | undefined;
}

// Class definition
export class PhoneVerification implements IPhoneVerification {
  phonenumber = 0;
  code = 0;

  constructor(data: Partial<IPhoneVerification> = {}) {
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
export type PhoneVerificationResponse = {
  StatusCode: number;
  Message: string;
  Data: PhoneVerification | null;
}; 