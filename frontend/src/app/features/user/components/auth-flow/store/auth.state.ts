// file: frontend/src/app/features/auth/store/auth.reducer.ts
// author: Corey Dale Peters
// date: 2024-12-27
// description: Contains the Auth reducer

// Application Imports
import { IUsers } from '../../../../../core/models/UsersModel';
import { UserGroup } from "../../../../../core/models/UserGroupEnum";
import { environment } from "../../../../../../environments/environment";

export enum AuthSteps {
  EMAIL,
  PASSWORD,           // For existing users
  PASSWORD_SETUP,     // For new users
  EMAIL_VERIFY,       // Verifies the email code
  SIGNIN,             // For users who have verified their email
  NAME_SETUP,         // for users without firstName, lastName
  PHONE_SETUP,        // for users without phoneNumber
  PHONE_VERIFY,       // verifies the phone number
  MFA_SETUP,          // for users without MFA
  MFA_VERIFY,         // verifies the MFA code
  PASSWORD_RESET,     // initiates password reset
  PASSWORD_RESET_VERIFY, // verifies password reset code
  PASSWORD_RESET_CONFIRM, // confirms new password
  COMPLETE            // User setup is complete
}

export interface AuthState {
  debugMode: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  currentStep: AuthSteps;
  currentUser: IUsers | null;
  userExists: boolean;
  currentEmail: string | null;

  // Phone validation
  phoneValidationId: string | null;
  phoneValidationCode: number | null;
  phoneValidationExpiration: number | null;
  phoneVerified: boolean;

  // MFA related
  mfaType: 'sms' | 'totp' | null;
  mfaEnabled: boolean;
  mfaRequired: boolean;
  mfaSetupRequired: boolean;
  mfaPreferences: {
    sms: boolean;
    totp: boolean;
  };
  mfaSetupDetails?: {
    qrCode: string;
    secretKey: string;
    setupUri?: string;
  };

  // Group related
  currentGroup: UserGroup | null;
  availableGroups: UserGroup[];
  groupPriority: UserGroup[];

  // Email
  emailVerified: boolean;

  // Session
  sessionActive: boolean;
  lastActivity: number | null;

  userGroups: UserGroup[];
  phoneValidationExpiresAt: number | null;
}

export const initialState: AuthState = {
  debugMode: environment.debugMode, // Use environment-based debug mode configuration
  isAuthenticated: false,
  isLoading: false,
  error: null,
  currentUser: null,
  currentStep: AuthSteps.EMAIL,
  userExists: false,
  currentEmail: null,

  phoneValidationId: null,
  phoneValidationCode: null,
  phoneValidationExpiration: null,
  phoneVerified: false,

  mfaType: null,
  mfaEnabled: false,
  mfaRequired: false,
  mfaSetupRequired: false,
  mfaPreferences: {
    sms: false,
    totp: false
  },
  mfaSetupDetails: undefined,

  currentGroup: null,
  availableGroups: [],
  groupPriority: [],

  emailVerified: false,

  sessionActive: false,
  lastActivity: null,

  userGroups: [],
  phoneValidationExpiresAt: null
};
