/**
 * MfaSetupDetails static model.
 */

// Import enums and models used in this model









export interface IMfaSetupDetails {

  qrCode: string;

  secretKey: string;

  setupUri: string | undefined;

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

// Static type definitions
export type MfaSetupDetailsResponse = {
  statusCode: number;
  message: string;
  data: IMfaSetupDetails | null;
}; 