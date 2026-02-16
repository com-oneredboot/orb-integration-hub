// file: apps/web/src/app/core/models/RecoveryModel.ts
// author: Corey Dale Peters
// date: 2026-01-17
// description: Models for the Smart Recovery Auth Flow

import { AuthStep } from '../enums/AuthStepEnum';
import { CognitoUserStatus } from '../enums/CognitoUserStatusEnum';
import { RecoveryAction } from '../enums/RecoveryActionEnum';

// Re-export the generated enums for external use
export { CognitoUserStatus } from '../enums/CognitoUserStatusEnum';
export { RecoveryAction } from '../enums/RecoveryActionEnum';

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
  nextStep: AuthStep;
  
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
export function getNextStepForAction(action: RecoveryAction): AuthStep {
  switch (action) {
    case RecoveryAction.NewSignup:
      return AuthStep.PasswordSetup;
    case RecoveryAction.ResendVerification:
      return AuthStep.EmailVerify;
    case RecoveryAction.CreateDynamoRecord:
      // User exists in Cognito but not DynamoDB - need to sign in first
      // After sign-in, the flow will create the DynamoDB record
      return AuthStep.Signin;
    case RecoveryAction.Login:
      return AuthStep.PasswordVerify;
    case RecoveryAction.PasswordReset:
      return AuthStep.PasswordSetup;
    case RecoveryAction.ContactSupport:
      return AuthStep.EmailEntry;
    default:
      return AuthStep.EmailEntry;
  }
}

/**
 * Get user-friendly message for recovery action
 */
export function getMessageForAction(action: RecoveryAction): string {
  switch (action) {
    case RecoveryAction.NewSignup:
      return AUTH_MESSAGES.NEW_SIGNUP;
    case RecoveryAction.ResendVerification:
      return AUTH_MESSAGES.NEW_CODE_SENT;
    case RecoveryAction.CreateDynamoRecord:
      return AUTH_MESSAGES.RESUMING;
    case RecoveryAction.Login:
      return AUTH_MESSAGES.LOGIN;
    case RecoveryAction.PasswordReset:
      return AUTH_MESSAGES.PASSWORD_RESET;
    case RecoveryAction.ContactSupport:
      return AUTH_MESSAGES.CONTACT_SUPPORT;
    default:
      return AUTH_MESSAGES.CHECKING;
  }
}
