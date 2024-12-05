import {Injectable} from '@angular/core';
import {
  confirmSignIn,
  confirmSignUp,
  fetchAuthSession,
  fetchMFAPreference,
  resendSignUpCode,
  setUpTOTP,
  signIn,
  signOut,
  signUp,
  updateMFAPreference,
  updateUserAttributes,
  verifyTOTPSetup,
  VerifyTOTPSetupInput
} from 'aws-amplify/auth';
import {BehaviorSubject, Observable} from 'rxjs';
import {User, UserGroup} from '../models/user.model';

import {Router} from '@angular/router';
import {MFAType} from "../components/mfa-setup/mfa-setup.component";
import {ApiService} from "./api.service";


class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

interface GetUserProfileResult {
  getUserProfile: User | null;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
  needsMFA?: boolean;
  needsMFASetup?: boolean;
  mfaType?: 'sms' | 'totp';
  setupDetails?: {
    qrCode: string;
    secretKey: string;
  };
}

export interface MFASetupResponse {
  success: boolean;
  needsMFASetup?: boolean;
  error?: string;
  setupDetails?: {
    qrCode: string;
    secretKey: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private currentUserSubject: BehaviorSubject<User | null>;
  private isAuthenticatedSubject: BehaviorSubject<boolean>;
  private mfaSetupRequired: BehaviorSubject<boolean>;
  public currentUser: Observable<User | null>;
  public isAuthenticated: Observable<boolean>;
  public mfaSetupRequired$: Observable<boolean>;

  constructor(private router: Router, private api: ApiService) {
    this.currentUserSubject = new BehaviorSubject<User | null>(null);
    this.isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
    this.mfaSetupRequired = new BehaviorSubject<boolean>(false);
    this.currentUser = this.currentUserSubject.asObservable();
    this.isAuthenticated = this.isAuthenticatedSubject.asObservable();
    this.mfaSetupRequired$ = this.mfaSetupRequired.asObservable();
    this.checkAuthState().then(r => {
      console.debug('Auth state checked');
    });
  }

  private async checkAuthState(): Promise<void> {
    try {
      const session = await fetchAuthSession();
      const tokens = session.tokens;

      if (!tokens?.idToken?.payload) {
        this.isAuthenticatedSubject.next(false);
        return;
      }

      this.isAuthenticatedSubject.next(true);
      const cognitoId = tokens.idToken.payload.sub;

      if (!cognitoId) return;

      // await this.refreshUserProfile(cognitoId);

    } catch (error) {
      console.error('Auth state error:', error);
      this.isAuthenticatedSubject.next(false);
      this.currentUserSubject.next(null);
    }
  }

  public getCognitoProfile(): User | null {
    return this.currentUserSubject.value;
  }

  public isAuthenticated$(): Observable<boolean> {
    return this.isAuthenticated;
  }

  public async checkIsAuthenticated(): Promise<boolean> {
    try {
      const session = await fetchAuthSession();
      const isAuth = !!session.tokens;
      this.isAuthenticatedSubject.next(isAuth);
      return isAuth;
    } catch {
      this.isAuthenticatedSubject.next(false);
      return false;
    }
  }

  // send a verification code to the user's phone number
  async sendVerificationCode(phone: string): Promise<number> {
    // send a request to appsync mutation sendSMSVerificationCode
    return await this.api.sendSMSVerificationCode(phone)
  }

  public async getUserGroup(): Promise<UserGroup> {
    try {
      const session = await fetchAuthSession();
      const payload = session.tokens?.idToken?.payload;

      if (!payload) {
        throw new AuthError('No authenticated user found');
      }

      const groups = payload['cognito:groups'] as string[] || [];
      console.debug('User groups:', groups);

      if (groups.includes('Owner')) return UserGroup.OWNER;
      if (groups.includes('Employees')) return UserGroup.EMPLOYEES;
      if (groups.includes('Client')) return UserGroup.CLIENT;
      if (groups.includes('Customer')) return UserGroup.CUSTOMER;
      if (groups.includes('User')) return UserGroup.USER;

      throw new AuthError('User group not found');

    } catch (error) {
      console.error('Error getting user group:', error);
      throw error;
    }
  }

  async register(username: string, password: string, email: string, phone: string): Promise<AuthResponse> {
    try {
      await signUp({
        username,
        password,
        options: {
          userAttributes: {
            email,
            phone_number: phone
          }
        }
      });

      return {
        success: true,
        needsMFA: false
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      };
    }
  }

  async setupSMSMFA(phoneNumber: string): Promise<MFASetupResponse> {
    try {
      await updateMFAPreference({
        sms: "PREFERRED",
        totp: "ENABLED"
      });

      return {
        success: true
      };
    } catch (error) {
      console.error('SMS MFA setup error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SMS MFA setup failed'
      };
    }
  }

  async setupTOTP(): Promise<MFASetupResponse> {
    try {
      const totpSetup = await setUpTOTP();
      const setupDetails = totpSetup as any;

      return {
        success: true,
        setupDetails: {
          qrCode: setupDetails.qrCode,
          secretKey: setupDetails.secretKey
        }
      };
    } catch (error) {
      console.error('TOTP setup error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'MFA setup failed'
      };
    }
  }

  async confirmEmail(username: string, code: string): Promise<AuthResponse> {
    try {
      await confirmSignUp({ username, confirmationCode: code });

      return {
        success: true
      };

    } catch (error) {
      console.error('Confirmation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Confirmation failed'
      };
    }
  }

  // check the code to ensure it was what was sent and verify the Cognito phone
  async confirmPhone(generated_code: number, entered_code: number, expiration: number): Promise<AuthResponse> {
    try {

      // check if the code has expired
      if (new Date().getTime() > expiration) {
        return {
          success: false,
          error: 'Verification code has expired'
        };
      }

      // if the codes are not equal, then the phone number is verified
      if (generated_code !== entered_code) {
        return {
          success: false
        };
      }

      // Update the phone number attribute to mark it as verified in Cognito
      await updateUserAttributes({
        userAttributes: {
          'phone_number_verified': 'true',
        }
      });

      return {
        success: true,
      };

    } catch (error) {
      console.error('Error verifying phone number:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Phone verification failed',
      };
    }
  }

  async signIn(username: string, password: string): Promise<AuthResponse> {
    try {
      console.info('Starting sign in process for:', username);
      const signInResult = await signIn({ username, password });
      console.debug('Sign in result:', signInResult);
      const nextStep = signInResult.nextStep.signInStep;
      console.debug('Next step:', nextStep);

      if (nextStep === 'CONTINUE_SIGN_IN_WITH_TOTP_SETUP') {
        console.info('TOTP setup required');
        const totpSetupDetails = signInResult.nextStep.totpSetupDetails;

        const qrCodeUri = totpSetupDetails.getSetupUri(
          'OneRedBoot Integration Hub',
          username
        ).toString();

        return {
          success: false,
          needsMFA: true,
          mfaType: 'totp',
          setupDetails: {
            qrCode: qrCodeUri,
            secretKey: totpSetupDetails.sharedSecret
          }
        };
      }

      if (nextStep === 'CONFIRM_SIGN_IN_WITH_TOTP_CODE') {
        return {
          success: false,
          needsMFA: true,
          mfaType: 'totp'
        };
      }

      if (nextStep === 'CONFIRM_SIGN_IN_WITH_SMS_CODE') {
        return {
          success: false,
          needsMFA: true,
          mfaType: 'sms'
        };
      }

      if (nextStep === 'DONE') {
        console.info('Sign in completed');
        return {
          success: true
        };
      }

      return {
        success: false,
        error: `Authentication requires: ${nextStep}`
      };

    } catch (error) {
      console.error('Sign in error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sign in failed'
      };
    }
  }

  async verifyMFA(code: string, rememberDevice = false): Promise<AuthResponse> {
    try {
      console.info('Verifying MFA code');
      const result = await confirmSignIn({
        challengeResponse: code,
        options: { rememberDevice }
      });
      console.debug('MFA verification result:', result);

      if (result.isSignedIn) {
        console.info('MFA verification successful');
        await this.checkAuthState();
        return {
          success: true,
          user: this.currentUserSubject.value || undefined
        };
      }

      return {
        success: false,
        error: 'MFA verification failed'
      };
    } catch (error) {
      console.error('MFA verification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'MFA verification failed'
      };
    }
  }

  async verifyMFASetup(code: string, mfaType: MFAType): Promise<AuthResponse> {
    try {
      // change to switch
      switch (mfaType) {
        case MFAType.TOTP:
          // Verify TOTP setup
          const answer: VerifyTOTPSetupInput = {
            code,
            options: {
              friendlyDeviceName: 'OneRedBoot Integration Hub'
            }
          }
          await verifyTOTPSetup( answer );
          break;
        case MFAType.SMS:
          // Verify SMS MFA setup
          // No verification required
          break;
        case MFAType.EMAIL:
          // Verify EMAIL MFA setup
          // No verification required
          break;
        default:
          throw new Error('Invalid MFA type');
      }

      this.mfaSetupRequired.next(false);

      return {
        success: true
      };
    } catch (error) {
      console.error('MFA verification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'MFA verification failed'
      };
    }
  }

  async signOut(): Promise<void> {
    try {
      await signOut();
      this.currentUserSubject.next(null);
      this.isAuthenticatedSubject.next(false);
    } catch (error) {
      console.error('Sign out error:', error);
      throw new AuthError(error instanceof Error ? error.message : 'Sign out failed');
    }
  }

  async resendConfirmationCode(username: string): Promise<AuthResponse> {
    try {
      await resendSignUpCode({ username });
      return {
        success: true
      };
    } catch (error) {
      console.error('Code resend error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resend code'
      };
    }
  }

}
