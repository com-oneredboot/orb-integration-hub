/**
 * MfaSetupDetails standard model.
 * Generated at 2025-06-12T18:05:18.978496
 */

// Import enums and models used in this model

// Interface definition
export interface IMfaSetupDetails {
  qrCode: string;
  secretKey: string;
  setupUri: string | undefined;
}

// Class definition
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

// Response type
export type MfaSetupDetailsResponse = {
  StatusCode: number;
  Message: string;
  Data: MfaSetupDetails | null;
};
