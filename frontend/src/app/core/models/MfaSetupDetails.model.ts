/**
 * MfaSetupDetails model.
 */

// Import enums used in this model

export interface IMfaSetupDetails {
  qrCode: string;
  secretKey: string;
  setupUri: string;
}

export class MfaSetupDetails implements IMfaSetupDetails {
  qrCode: string = '';
  secretKey: string = '';
  setupUri: string = '';

  constructor(data: Partial<IMfaSetupDetails> = {}) {
    Object.entries(data).forEach(([key, value]) => {
      if (key in this) {
        {
          this[key as keyof this] = value as any;
        }
      }
    });
  }
}
// Response envelope for GraphQL type
export type MfaSetupDetailsResponse = {
  StatusCode: number;
  Message: string;
  Data: IMfaSetupDetails | null;
};
