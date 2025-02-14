// file: frontend/src/app/features/auth/store/auth.reducer.ts
// author: Corey Dale Peters
// date: 2024-12-27
// description: Contains the Auth reducer

// Application Imports
import { User, UserGroup } from "../../../../../core/models/user.model";

export enum AuthSteps {
  EMAIL,
  PASSWORD,           // For existing users
  PASSWORD_SETUP,     // For new users
  EMAIL_VERIFY,       // Verifies the email code
  SIGNIN,             // For users who have verified their email
  NAME_SETUP,         // for users without first_name, last_name
  PHONE_SETUP,        // for users without phone_number
  PHONE_VERIFY,       // verifies the phone number
  MFA_SETUP,          // for users without MFA
  MFA_VERIFY,         // verifies the MFA code
  COMPLETE            // User setup is complete
}

export interface AuthState {
  debugMode: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  currentStep: AuthSteps;
  currentUser: User | null;
  userExists: boolean;

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
    setupUri?: URL;
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
}

export const initialState: AuthState = {
  debugMode: true,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  currentUser: null,
  currentStep: AuthSteps.EMAIL,
  userExists: false,

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
  lastActivity: null
};
