// auth.state.ts
import {User, UserGroup} from "../../../core/models/user.model";

export enum AuthSteps {
  EMAIL,
  EMAIL_VERIFY,
  PASSWORD,
  PHONE_SETUP,
  PHONE_VERIFY,
  MFA_SETUP,
  MFA_VERIFY,
  COMPLETE
}

export interface AuthState {
  debugMode: boolean;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  currentStep: AuthSteps;
  userExists: boolean;

  // Phone validation
  phoneValidationId: string | null;
  phoneValidationCode: number | null;
  phoneValidationExpiration: number | null;
  phoneVerified: boolean;

  // MFA related
  needsMFA: boolean;
  mfaType: 'sms' | 'totp' | null;
  mfaEnabled: boolean;
  mfaSetupRequired: boolean;
  mfaPreferences: {
    sms: boolean;
    totp: boolean;
  };
  mfaSetupDetails: {
    qrCode: string;
    secretKey: string;
  } | null;

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
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  currentStep: AuthSteps.EMAIL,
  userExists: false,

  phoneValidationId: null,
  phoneValidationCode: null,
  phoneValidationExpiration: null,
  phoneVerified: false,

  needsMFA: false,
  mfaType: null,
  mfaEnabled: false,
  mfaSetupRequired: false,
  mfaPreferences: {
    sms: false,
    totp: false
  },
  mfaSetupDetails: null,

  currentGroup: null,
  availableGroups: [],
  groupPriority: [],

  emailVerified: false,

  sessionActive: false,
  lastActivity: null
};
