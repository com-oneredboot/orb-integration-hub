/**
 * Auth static model.
 */

// Import enums and models used in this model
import { MfaSetupDetails, IMfaSetupDetails } from './MfaSetupDetails.model';
import { Users, IUsers } from './Users.model';

export interface IAuth {
  statusCode: number;
  isSignedIn: boolean | undefined;
  message: string | undefined;
  user: IUsers | undefined;
  needsMFA: boolean | undefined;
  needsMFASetup: boolean | undefined;
  mfaType: string | undefined;
  mfaSetupDetails: MfaSetupDetails | undefined;
}

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

// Static type definitions
export type AuthResponse = {
  statusCode: number;
  message: string;
  data: IAuth | null;
}; 