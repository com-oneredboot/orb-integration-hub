/**
 * Auth standard model.
 * Generated at 2025-07-04T19:09:47.112133
 */

// Import enums and models used in this model
import { MfaSetupDetails } from './MfaSetupDetailsModel';
import { Users } from './UsersModel';

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
  user = new Users();
  needsMFA = false;
  needsMFASetup = false;
  mfaType = '';
  mfaSetupDetails = new MfaSetupDetails();

  constructor(data: Partial<IAuth> = {}) {
    Object.entries(data).forEach(([key, value]) => {
      if (key in this) {
        if (key === 'user' && value) {
          this.user = value as Users;
        } else 
        if (key === 'mfaSetupDetails' && value) {
          this.mfaSetupDetails = value as MfaSetupDetails;
        } else 
        {
          this[key as keyof this] = value as this[keyof this];
        }
      }
    });
  }
}

// Response type
export type AuthResponse = {
  StatusCode: number;
  Message: string;
  Data: Auth | null;
};
