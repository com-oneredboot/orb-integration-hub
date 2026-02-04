// file: apps/web/src/app/features/auth/store/auth.reducer.ts
// author: Corey Dale Peters
// date: 2024-12-27
// description: Contains the Auth reducer

// Application Imports
import { IUsers } from '../../../core/models/UsersModel';
import { UserGroup } from "../../../core/enums/UserGroupEnum";
import { environment } from "../../../../environments/environment";
import { RecoveryAction } from '../../../core/enums/RecoveryActionEnum';
import { AuthStep } from '../../../core/enums/AuthStepEnum';

// Re-export AuthStep for direct usage
export { AuthStep } from '../../../core/enums/AuthStepEnum';

export interface UserState {
  debugMode: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  currentStep: AuthStep;
  currentUser: IUsers | null;
  userExists: boolean;
  currentEmail: string | null;

  // Recovery state
  recoveryMessage: string | null;
  recoveryAction: RecoveryAction | null;

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

export const initialState: UserState = {
  debugMode: environment.debugMode, // Use environment-based debug mode configuration
  isAuthenticated: false,
  isLoading: false,
  error: null,
  currentUser: null,
  currentStep: AuthStep.Email,
  userExists: false,
  currentEmail: null,

  // Recovery state
  recoveryMessage: null,
  recoveryAction: null,

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
