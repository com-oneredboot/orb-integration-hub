import { Injectable } from '@angular/core';
import {
  fetchAuthSession,
  ConfirmSignUpOutput,
  SignUpInput,
  SignUpOutput,
  signUp,
  signIn,
  signOut,
  confirmSignUp,
  resendSignUpCode,
  ResendSignUpCodeInput,
  confirmSignIn,
  setUpTOTP
} from 'aws-amplify/auth';
import { BehaviorSubject, Observable } from 'rxjs';
import {User, UserGroup} from '../models/user.model';
import { generateClient, GraphQLResult } from 'aws-amplify/api';
import { getUserProfileQuery } from '../graphql/queries';

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
  mfaType?: 'sms' | 'totp';
  setupDetails?: {
    qrCode: string;  // Changed from URL to string
    secretKey: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  private isAuthenticatedSubject: BehaviorSubject<boolean>;
  public currentUser: Observable<User | null>;
  public isAuthenticated: Observable<boolean>;
  private amplifyClient = generateClient();

  constructor() {
    this.currentUserSubject = new BehaviorSubject<User | null>(null);
    this.isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
    this.currentUser = this.currentUserSubject.asObservable();
    this.isAuthenticated = this.isAuthenticatedSubject.asObservable();
    this.checkAuthState();
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

      await this.refreshUserProfile(cognitoId);
    } catch (error) {
      console.error('Auth state error:', error);
      this.isAuthenticatedSubject.next(false);
      this.currentUserSubject.next(null);
    }
  }

  private async refreshUserProfile(cognitoId: string): Promise<void> {
    try {
      const result = await this.amplifyClient.graphql<GraphQLResult<GetUserProfileResult>>({
        query: getUserProfileQuery,
        variables: { cognito_id: cognitoId }
      });

      if ('data' in result && result.data?.getUserProfile) {
        this.currentUserSubject.next(result.data.getUserProfile);
      }
    } catch (error) {
      console.error('Profile refresh error:', error);
    }
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

  public async getUserGroup(): Promise<UserGroup> {
    try {
      const session = await fetchAuthSession();
      const payload = session.tokens?.idToken?.payload;

      if (!payload) {
        throw new AuthError('No authenticated user found');
      }

      // Check for cognito:groups in the token
      const groups = payload['cognito:groups'] as string[] || [];
      console.log('User groups:', groups);

      // Map Cognito groups to UserGroup
      if (groups.includes('Owner')) return UserGroup.OWNER;
      if (groups.includes('Employees')) return UserGroup.EMPLOYEES;
      if (groups.includes('Client')) return UserGroup.CLIENT;
      if (groups.includes('Customer')) return UserGroup.CUSTOMER;
      if (groups.includes('User')) return UserGroup.USER;

      // Default to User if no specific group found but user is authenticated
      return UserGroup.USER;
    } catch (error) {
      console.error('Error getting user group:', error);
      throw error;
    }
  }

  async register(username: string, password: string, email: string): Promise<AuthResponse> {
    try {
      // Just handle the initial signup
      await signUp({
        username,
        password,
        options: { userAttributes: { email } }
      });

      return {
        success: true,
        needsMFA: false // We'll set up MFA after confirmation
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      };
    }
  }

// Add a new method for setting up TOTP after sign-in
  async setupTOTP(): Promise<AuthResponse> {
    try {
      const totpSetup = await setUpTOTP();
      const setupDetails = totpSetup as any;

      return {
        success: true,
        needsMFA: true,
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

  async confirmRegistration(username: string, code: string, mfaCode: string): Promise<AuthResponse> {
    try {
      // Just confirm the registration first
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

        // Convert the QR code URI to a string
        const qrCodeUri = totpSetupDetails.getSetupUri(
          'OneRedBoot Integration Hub',
          username
        ).toString();  // Added toString()

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

      // Default return for any other nextStep value
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
