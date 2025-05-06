/**
 * Auth model.
 */

// Import enums used in this model

export interface IAuth {
  status_code: number;
  isSignedIn: boolean;
  message: string;
  user: string;
  needsMFA: boolean;
  needsMFASetup: boolean;
  mfaType: string;
  mfaSetupDetails: string;
}

export class Auth implements IAuth {
  status_code: number = 0;
  isSignedIn: boolean = false;
  message: string = '';
  user: string = '';
  needsMFA: boolean = false;
  needsMFASetup: boolean = false;
  mfaType: string = '';
  mfaSetupDetails: string = '';

  constructor(data: Partial<IAuth> = {}) {
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
export type AuthResponse = {
  StatusCode: number;
  Message: string;
  Data: IAuth | null;
};
