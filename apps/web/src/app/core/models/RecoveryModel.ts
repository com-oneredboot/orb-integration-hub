// file: apps/web/src/app/core/models/RecoveryModel.ts
// author: Corey Dale Peters
// date: 2026-01-17
// description: Models for the Smart Recovery Auth Flow

import { AuthSteps } from '../../features/user/store/user.state';

/**
 * Cognito user status values returned by adminGetUser
 */
export enum CognitoUserStatus {
  UNCONFIRMED = 'UNCONFIRMED',
  CONFIRMED = 'CONFIRMED',
  FORCE_CHANGE_PASSWORD = 'FORCE_CHANGE_PASSWORD',
  RESET_REQUIRED = 'RESET_REQUIRED',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Recovery actions determined by the smart check
 */
export enum RecoveryAction {
  NEW_SIGNUP = 'NEW_SIGNUP',
  RESEND_VERIFICATION = 'RESEND_VERIFICATION',
  CREATE_DYNAMO_RECORD = 'CREATE_DYNAMO_RECORD',
  LOGIN = 'LOGIN',
  PASSWORD_RESET = 'PASSWORD_RESET',
  CONTACT_SUPPORT = 'CONTACT_SUPPORT'
}

/**
 * Result of the smart check operation
 */
export interface SmartCheckResult {
  // Cognito state
  cognitoStatus: CognitoUserStatus | null;
  cognitoSub: string | null;
  
  // DynamoDB state
  dynamoExists: boolean;
  
  // Recovery decision
  recoveryAction: RecoveryAction;
  nextStep: AuthSteps;
  
  // User-facing message (no jargon)
  userMessage: string;
  
  // Debug info (for logging only)
  debugInfo: {
    checkTimestamp: Date;
    cognitoCheckMs: number;
    dynamoCheckMs: number;
  };
}

/**
 * User-friendly messages for recovery scenarios
 * These messages MUST NOT contain technical jargon
 */
export const AUTH_MESSAGES = {
  // New user
  NEW_SIGNUP: "Let's create your account",
  
  // Returning user - incomplete signup
  WELCOME_BACK: "Welcome back! Let's finish setting up your account.",
  NEW_CODE_SENT: "We've sent a new verification code to your email.",
  
  // Returning user - complete
  LOGIN: "Welcome back!",
  
  // Recovery scenarios
  RESUMING: "We found your account. Let's pick up where you left off.",
  PASSWORD_RESET: "Please set a new password to continue.",
  
  // Error scenarios
  NETWORK_ERROR: "We're having trouble connecting. Your progress is saved - please try again.",
  GENERIC_ERROR: "Something went wrong. Please try again or contact support if this continues.",
  CONTACT_SUPPORT: "We found an issue with your account. Please contact support for assistance.",
  
  // Loading states
  CHECKING: "Checking your account...",
  SENDING_CODE: "Sending verification code...",
  CREATING_ACCOUNT: "Setting up your account..."
} as const;

/**
 * Map recovery action to next auth step
 */
export function getNextStepForAction(action: RecoveryAction): AuthSteps {
  switch (action) {
    case RecoveryAction.NEW_SIGNUP:
      return AuthSteps.PASSWORD_SETUP;
    case RecoveryAction.RESEND_VERIFICATION:
      return AuthSteps.EMAIL_VERIFY;
    case RecoveryAction.CREATE_DYNAMO_RECORD:
      // User exists in Cognito but not DynamoDB - need to sign in first
      // After sign-in, the flow will create the DynamoDB record
      return AuthSteps.SIGNIN;
    case RecoveryAction.LOGIN:
      return AuthSteps.PASSWORD_VERIFY;
    case RecoveryAction.PASSWORD_RESET:
      return AuthSteps.PASSWORD_SETUP;
    case RecoveryAction.CONTACT_SUPPORT:
      return AuthSteps.EMAIL_ENTRY;
    default:
      return AuthSteps.EMAIL_ENTRY;
  }
}

/**
 * Get user-friendly message for recovery action
 */
export function getMessageForAction(action: RecoveryAction): string {
  switch (action) {
    case RecoveryAction.NEW_SIGNUP:
      return AUTH_MESSAGES.NEW_SIGNUP;
    case RecoveryAction.RESEND_VERIFICATION:
      return AUTH_MESSAGES.NEW_CODE_SENT;
    case RecoveryAction.CREATE_DYNAMO_RECORD:
      return AUTH_MESSAGES.RESUMING;
    case RecoveryAction.LOGIN:
      return AUTH_MESSAGES.LOGIN;
    case RecoveryAction.PASSWORD_RESET:
      return AUTH_MESSAGES.PASSWORD_RESET;
    case RecoveryAction.CONTACT_SUPPORT:
      return AUTH_MESSAGES.CONTACT_SUPPORT;
    default:
      return AUTH_MESSAGES.CHECKING;
  }
}
