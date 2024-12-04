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
import { User, UserRole } from '../models/user.model';
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
    qrCode?: string;
    secretKey?: string;
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

  public async getUserRole(): Promise<UserRole> {
    const currentUser = this.currentUserSubject.value;
    if (!currentUser) throw new AuthError('No authenticated user found');
    if (!currentUser.role) throw new AuthError('User role not found');
    return currentUser.role;
  }

  async register(username: string, password: string, email: string): Promise<AuthResponse> {
    try {
      await signUp({
        username,
        password,
        options: { userAttributes: { email } }
      });

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
      console.error('Registration error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      };
    }
  }

  async confirmRegistration(username: string, code: string, mfaCode: string): Promise<AuthResponse> {
    try {
      // Verify email
      await confirmSignUp({ username, confirmationCode: code });

      // Sign in and complete MFA setup
      const signInResult = await signIn({ username });

      if (signInResult.nextStep.signInStep.includes('TOTP')) {
        await confirmSignIn({ challengeResponse: mfaCode });
      }

      await this.checkAuthState();
      return {
        success: true,
        user: this.currentUserSubject.value || undefined
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
      const signInResult = await signIn({ username, password });
      const nextStep = signInResult.nextStep.signInStep;

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

      if (nextStep !== 'DONE') {
        return {
          success: false,
          error: `Authentication requires: ${nextStep}`
        };
      }

      await this.checkAuthState();
      const user = this.currentUserSubject.value;

      return {
        success: true,
        user: user || undefined
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
      const result = await confirmSignIn({
        challengeResponse: code,
        options: { rememberDevice }
      });

      if (result.isSignedIn) {
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

  async resendCode(username: string): Promise<AuthResponse> {
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
