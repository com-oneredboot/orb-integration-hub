/**
 * Auth model.
 */

// Import enums used in this model

export interface IAuth {
  statusCode: number;
  isSignedIn: boolean | undefined;
  message: string | undefined;
  user: string | undefined;
  needsMFA: boolean | undefined;
  needsMFASetup: boolean | undefined;
  mfaType: string | undefined;
  mfaSetupDetails: IMfaSetupDetails | undefined;
}

export class Auth implements IAuth {
  statusCode: number = 0;
  isSignedIn: boolean | undefined = false;
  message: string | undefined = '';
  user: string | undefined = '';
  needsMFA: boolean | undefined = false;
  needsMFASetup: boolean | undefined = false;
  mfaType: string | undefined = '';
  mfaSetupDetails: IMfaSetupDetails | undefined = undefined;

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
  statusCode: number;
  message: string;
  data: IAuth | null;
};
