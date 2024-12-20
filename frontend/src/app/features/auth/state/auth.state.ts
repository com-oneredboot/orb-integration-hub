// auth.state.ts
export enum AuthStep {
  EMAIL = 'EMAIL',
  PASSWORD = 'PASSWORD',
  CREATE_PASSWORD = 'CREATE_PASSWORD',
  MFA = 'MFA',
  COMPLETE = 'COMPLETE'
}

export interface AuthState {
  currentStep: AuthStep;
  email: string | null;
  userExists: boolean;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  needsMfa: boolean;
  mfaType: 'SMS' | 'TOTP' | null;
}

export const initialAuthState: AuthState = {
  currentStep: AuthStep.EMAIL,
  email: null,
  userExists: false,
  isLoading: false,
  error: null,
  isAuthenticated: false,
  needsMfa: false,
  mfaType: null
};

