/**
 * Auth standard model.
 * Generated at 2025-06-09T21:46:13.229868
 */

// Import enums and models used in this model

// Interface definition
export interface IAuth {
  statusCode: number;
  isSignedIn: boolean | undefined;
  message: string | undefined;
  user: Users | undefined;
  needsMFA: boolean | undefined;
  needsMFASetup: boolean | undefined;
  mfaType: string | undefined;
  mfaSetupDetails: MfaSetupDetails | undefined;
}

// Class definition
export class Auth implements IAuth {
  statusCode = 0;
  isSignedIn = false;
  message = '';
  user = undefined;
  needsMFA = false;
  needsMFASetup = false;
  mfaType = '';
  mfaSetupDetails = undefined;

  constructor(data: Partial<IAuth> = {}) {
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
export type AuthResponse = {
  statusCode: number;
  message: string;
  data: IAuth | null;
};
