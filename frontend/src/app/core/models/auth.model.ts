// file: frontend/src/app/core/models/auth.model.ts
// author: Corey Dale Peters
// date: 2025-03-07
// description: TypeScript file

// src/app/models/auth.models.ts
import {User} from "./user.model";

export interface SignInCredentials {
  username: string;
  password: string;
}

export interface SignInResponse {
  success: boolean;
  user?: any;
  error?: string;
  role?: string;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export interface MfaSetupDetails {
  qrCode: string;
  secretKey: string;
  setupUri?: URL;
}

export interface AuthResponse {
  status_code: number;
  message?: string;
  isSignedIn: boolean;
  user?: User;
  needsMFA?: boolean;
  needsMFASetup?: boolean;
  mfaType?: 'sms' | 'totp';
  mfaSetupDetails?: MfaSetupDetails;
}

export interface MFASetupResponse {
  success: boolean;
  needsMFASetup?: boolean;
  error?: string;
  mfaSetupDetails?: MfaSetupDetails;
}

