// file: apps/web/src/app/core/services/recovery.service.ts
// author: Corey Dale Peters
// date: 2026-01-17
// description: Service for smart recovery auth flow - detects user state and determines recovery action

import { Injectable, inject } from '@angular/core';
import { resendSignUpCode } from '@aws-amplify/auth';

import { UserService } from './user.service';
import { DebugLogService } from './debug-log.service';
import {
  SmartCheckResult,
  CognitoUserStatus,
  RecoveryAction,
  AUTH_MESSAGES,
  getNextStepForAction
} from '../models/RecoveryModel';
import { AuthSteps } from '../../features/user/store/user.state';

@Injectable({
  providedIn: 'root'
})
export class RecoveryService {
  private debugLog = inject(DebugLogService);
  private userService = inject(UserService);

  /**
   * Performs smart check across Cognito and DynamoDB to determine user state
   * and appropriate recovery action.
   * 
   * State Decision Matrix:
   * | Cognito State | DynamoDB State | Action |
   * |---------------|----------------|--------|
   * | None | None | New signup |
   * | UNCONFIRMED | None | Resend code, EMAIL_VERIFY |
   * | CONFIRMED | None | Create DynamoDB record, continue |
   * | FORCE_CHANGE_PASSWORD | None | Password reset flow |
   * | CONFIRMED | Exists | Login flow |
   * | None | Exists | Data integrity error (log) |
   * 
   * @param email User's email address
   * @returns SmartCheckResult with recovery action and next step
   */
  async smartCheck(email: string): Promise<SmartCheckResult> {
    const startTime = Date.now();
    this.debugLog.logApi('smartCheck', 'pending', { email: this.maskEmail(email) });

    try {
      // Check both Cognito and DynamoDB
      const cognitoStart = Date.now();
      const checkResult = await this.userService.checkEmailExists(email);
      const cognitoCheckMs = Date.now() - cognitoStart;

      const dynamoStart = Date.now();
      const dynamoResult = await this.userService.userExists({ email });
      const dynamoCheckMs = Date.now() - dynamoStart;

      const cognitoStatus = this.parseCognitoStatus(checkResult.cognitoStatus);
      const cognitoSub = checkResult.cognitoSub ?? null;
      const dynamoExists = dynamoResult.StatusCode === 200 && 
                          dynamoResult.Data !== null && 
                          dynamoResult.Data.length > 0;

      // Determine recovery action based on state matrix
      const { action, message } = this.determineRecoveryAction(
        cognitoStatus,
        dynamoExists
      );

      const result: SmartCheckResult = {
        cognitoStatus,
        cognitoSub,
        dynamoExists,
        recoveryAction: action,
        nextStep: getNextStepForAction(action),
        userMessage: message,
        debugInfo: {
          checkTimestamp: new Date(),
          cognitoCheckMs,
          dynamoCheckMs
        }
      };

      this.debugLog.logApi('smartCheck', 'success', {
        cognitoStatus,
        dynamoExists,
        recoveryAction: action,
        nextStep: result.nextStep,
        totalMs: Date.now() - startTime
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.debugLog.logError('smartCheck', errorMessage, { email: this.maskEmail(email) });
      
      // Return a safe default that allows retry
      return {
        cognitoStatus: null,
        cognitoSub: null,
        dynamoExists: false,
        recoveryAction: RecoveryAction.NEW_SIGNUP,
        nextStep: AuthSteps.EMAIL_ENTRY,
        userMessage: AUTH_MESSAGES.NETWORK_ERROR,
        debugInfo: {
          checkTimestamp: new Date(),
          cognitoCheckMs: 0,
          dynamoCheckMs: 0
        }
      };
    }
  }

  /**
   * Resends verification code for UNCONFIRMED users
   * @param email User's email address
   */
  async resendVerificationCode(email: string): Promise<void> {
    this.debugLog.logAuth('resendVerificationCode', 'success', { email: this.maskEmail(email) });
    
    try {
      await resendSignUpCode({ username: email });
      this.debugLog.logAuth('resendVerificationCode', 'success', { email: this.maskEmail(email) });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.debugLog.logError('resendVerificationCode', errorMessage, { email: this.maskEmail(email) });
      throw error;
    }
  }

  /**
   * Determines recovery action based on Cognito and DynamoDB state
   */
  private determineRecoveryAction(
    cognitoStatus: CognitoUserStatus | null,
    dynamoExists: boolean
  ): { action: RecoveryAction; message: string } {
    // Case 1: Neither system has the user - new signup
    if (!cognitoStatus && !dynamoExists) {
      return {
        action: RecoveryAction.NEW_SIGNUP,
        message: AUTH_MESSAGES.NEW_SIGNUP
      };
    }

    // Case 2: DynamoDB has user but Cognito doesn't - data integrity issue
    if (!cognitoStatus && dynamoExists) {
      this.debugLog.logError('determineRecoveryAction', 'Data integrity issue: DynamoDB user without Cognito', {
        cognitoStatus,
        dynamoExists
      });
      return {
        action: RecoveryAction.CONTACT_SUPPORT,
        message: AUTH_MESSAGES.CONTACT_SUPPORT
      };
    }

    // Case 3: Cognito has user but DynamoDB doesn't - orphaned state
    if (cognitoStatus && !dynamoExists) {
      switch (cognitoStatus) {
        case CognitoUserStatus.UNCONFIRMED:
          return {
            action: RecoveryAction.RESEND_VERIFICATION,
            message: AUTH_MESSAGES.NEW_CODE_SENT
          };
        case CognitoUserStatus.CONFIRMED:
          return {
            action: RecoveryAction.CREATE_DYNAMO_RECORD,
            message: AUTH_MESSAGES.RESUMING
          };
        case CognitoUserStatus.FORCE_CHANGE_PASSWORD:
        case CognitoUserStatus.RESET_REQUIRED:
          return {
            action: RecoveryAction.PASSWORD_RESET,
            message: AUTH_MESSAGES.PASSWORD_RESET
          };
        default:
          return {
            action: RecoveryAction.RESEND_VERIFICATION,
            message: AUTH_MESSAGES.WELCOME_BACK
          };
      }
    }

    // Case 4: Both systems have the user - login flow
    if (cognitoStatus && dynamoExists) {
      // Check if user needs password reset
      if (cognitoStatus === CognitoUserStatus.FORCE_CHANGE_PASSWORD ||
          cognitoStatus === CognitoUserStatus.RESET_REQUIRED) {
        return {
          action: RecoveryAction.PASSWORD_RESET,
          message: AUTH_MESSAGES.PASSWORD_RESET
        };
      }
      
      // Check if user is unconfirmed (shouldn't happen if DynamoDB exists, but handle it)
      if (cognitoStatus === CognitoUserStatus.UNCONFIRMED) {
        return {
          action: RecoveryAction.RESEND_VERIFICATION,
          message: AUTH_MESSAGES.NEW_CODE_SENT
        };
      }

      return {
        action: RecoveryAction.LOGIN,
        message: AUTH_MESSAGES.LOGIN
      };
    }

    // Fallback - should never reach here
    return {
      action: RecoveryAction.NEW_SIGNUP,
      message: AUTH_MESSAGES.NEW_SIGNUP
    };
  }

  /**
   * Parse Cognito status string to enum
   */
  private parseCognitoStatus(status: string | null | undefined): CognitoUserStatus | null {
    if (!status) return null;
    
    const upperStatus = status.toUpperCase();
    if (Object.values(CognitoUserStatus).includes(upperStatus as CognitoUserStatus)) {
      return upperStatus as CognitoUserStatus;
    }
    
    return CognitoUserStatus.UNKNOWN;
  }

  /**
   * Mask email for logging (privacy)
   */
  private maskEmail(email: string): string {
    if (!email || !email.includes('@')) return '***';
    const [local, domain] = email.split('@');
    const maskedLocal = local.length > 2 
      ? local[0] + '***' + local[local.length - 1]
      : '***';
    return `${maskedLocal}@${domain}`;
  }
}
