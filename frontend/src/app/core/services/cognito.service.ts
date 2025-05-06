// file: frontend/src/app/services/cognito.service.ts
// author: Corey Peters
// date: 2024-12-06
// description: Service for handling user authentication

// 3rd-party imports
import {Injectable} from '@angular/core';
import {
  confirmSignIn,
  confirmSignUp,
  fetchAuthSession,
  getCurrentUser,
  fetchUserAttributes,
  signIn,
  signOut,
  signUp,
  SignUpOutput,
  resetPassword,
  confirmResetPassword,
} from 'aws-amplify/auth';
import {BehaviorSubject, Observable} from 'rxjs';

// Application-specific imports
import { Users, UsersCreateInput, IUsers } from '../models/Users.model';
import { AuthResponse } from '../models/Auth.model';
import { IAuth } from "../models/Auth.model";
import { AuthError } from "../models/AuthError.model";
import { environment } from '../../../environments/environment';

// Settings
const appName = environment.appName;

@Injectable({
  providedIn: 'root'
})
export class CognitoService {

  public currentUser: Observable<IUsers | null>;
  public isAuthenticated: Observable<boolean>;
  public mfaSetupRequired: Observable<boolean>;
  public mfaRequired: Observable<boolean>;

  private currentUserSubject: BehaviorSubject<IUsers | null>;
  private isAuthenticatedSubject: BehaviorSubject<boolean>;
  private mfaSetupRequiredSubject: BehaviorSubject<boolean>;
  private mfaRequiredSubject: BehaviorSubject<boolean>;

  /**
   * Constructor
   */
  constructor() {

    // Get BehaviorSubjects for current user, authentication status, and MFA setup
    this.currentUserSubject = new BehaviorSubject<IUsers | null>(null);
    this.isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
    this.mfaSetupRequiredSubject = new BehaviorSubject<boolean>(false);
    this.mfaRequiredSubject = new BehaviorSubject<boolean>(false);

    // Set Observables for current user, authentication status, and MFA setup
    this.currentUser = this.currentUserSubject.asObservable();
    this.isAuthenticated = this.isAuthenticatedSubject.asObservable();
    this.mfaSetupRequired = this.mfaSetupRequiredSubject.asObservable();
    this.mfaRequired = this.mfaRequiredSubject.asObservable();
  }

  /**
   * Register a new user
   * @param input
   * @param password
   */
  public async createCognitoUser(input: UsersCreateInput, password:string): Promise<SignUpOutput> {

      console.debug('Creating Cognito user:', input);

      return await signUp({
        username: input.cognitoId,
        password,
        options: {
          userAttributes: {
            email: input.email,
          }
        }
      });

  }

  /**
   * Confirm the email using the verification code
   * @param cognito_id
   * @param code
   */
  public async emailVerify(cognito_id: string, code: string): Promise<AuthResponse> {
    console.debug('Verifying email:', cognito_id, code);
    try {
      await confirmSignUp({ username: cognito_id, confirmationCode: code });

      return {
        statusCode: 200,
        message: 'Email verified',
        data: createAuthData({ isSignedIn: false })
      };

    } catch (error) {
      console.error('Confirmation error:', error);
      return {
        statusCode: 500,
        message: error instanceof Error ? error.message : 'Confirmation failed',
        data: null
      };
    }
  }

  /**
   * Sign in a user
   * @param username (cognito_id in users table)
   * @param password
   * @param email (optional) User's email for better MFA labeling
   */
  public async signIn(username: string, password: string, email?: string): Promise<AuthResponse> {
    console.info('Starting sign in process for:', username);
    const signInResponse = await signIn({ username, password });

    if (signInResponse.isSignedIn) {
      console.info('Sign in successful for cognito_id:', username);
      return {
        statusCode: 200,
        message: 'Sign in successful',
        data: createAuthData({ isSignedIn: true })
      };
    }

    const nextStep = signInResponse.nextStep;
    console.debug('Sign in next step:', nextStep);

    switch(nextStep.signInStep) {
      case 'CONTINUE_SIGN_IN_WITH_TOTP_SETUP':
        const totpSetupDetails = nextStep.totpSetupDetails;
        // Use the custom issuer format with email if available
        const issuer = email ? `${appName}:${email}` : appName;
        const setupUri = totpSetupDetails.getSetupUri(issuer);
        this.mfaSetupRequiredSubject.next(true);
        return {
          statusCode: 200,
          message: 'MFA setup required',
          data: createAuthData({ isSignedIn: false, needsMFASetup: true, mfaType: 'totp', mfaSetupDetails: { qrCode: email || username, secretKey: nextStep.totpSetupDetails?.sharedSecret, setupUri: setupUri } })
        };
      case 'CONFIRM_SIGN_IN_WITH_TOTP_CODE':
        this.mfaSetupRequiredSubject.next(true);
        return {
          statusCode: 200,
          message: 'MFA setup not required',
          data: createAuthData({ isSignedIn: false, needsMFASetup: false, needsMFA: true, mfaType: 'totp' })
        };
      default:
        console.error('Sign in failed:', signInResponse);
    }

    return {
      statusCode: 401,
      message: 'Sign in failed',
      data: createAuthData({ isSignedIn: false })
    }
  }

  /**
   * Verify the MFA code
   * @param code
   * @param rememberDevice
   */
  async mfaVerify(code: string, rememberDevice = false): Promise<AuthResponse> {
    try {
      console.info('Verifying MFA code');
      const result = await confirmSignIn({
        challengeResponse: code,
        options: { rememberDevice }
      });
      console.debug('MFA verification result:', result);

      if (result.isSignedIn) {
        console.info('MFA verification successful');

        return {
          statusCode: 200,
          message: 'MFA verification successful',
          data: createAuthData({ isSignedIn: true })
        };
      }

      return {
        statusCode: 401,
        message: 'MFA verification failed',
        data: createAuthData({ isSignedIn: false })
      };

    } catch (error) {
      console.error('MFA verification error:', error);
      return {
        statusCode: 500,
        message: error instanceof Error ? error.message : 'MFA verification failed',
        data: null
      };
    }
  }

  /**
   * Get the current user
   */
  public isAuthenticated$(): Observable<boolean> {
    return this.isAuthenticated;
  }

  /**
   * Get the current user
   */
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

  public async getCognitoProfile(): Promise<any | null> {
    try {
      // Fetch the current session
      const session = await fetchAuthSession();

      if (!session.tokens?.idToken?.payload) {
        console.debug('No valid session found');
        return null;
      }

      // Get current authenticated user
      const { username, signInDetails } = await getCurrentUser();

      // Get user attributes using getCurrentUser() and getUserAttributes()
      const userAttributes = await fetchUserAttributes();

      return {
        username,
        ...userAttributes,
        sub: session.tokens.idToken.payload.sub,
        groups: session.tokens.idToken.payload['cognito:groups'] || []
      };

    } catch (error) {
      console.error('Error fetching Cognito profile:', error);
      return null;
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

  /**
   * Initiate the password reset process
   * @param username The user's cognito ID or email
   * @returns AuthResponse with status of the request
   */
  async initiatePasswordReset(username: string): Promise<AuthResponse> {
    try {
      console.info('Initiating password reset for:', username);
      await resetPassword({ username });
      
      return {
        statusCode: 200,
        message: 'Password reset initiated successfully',
        data: createAuthData({ isSignedIn: false })
      };
    } catch (error) {
      console.error('Password reset initiation error:', error);
      return {
        statusCode: 500,
        message: error instanceof Error ? error.message : 'Password reset failed',
        data: null
      };
    }
  }

  /**
   * Confirm password reset with the verification code
   * @param username The user's cognito ID or email
   * @param code The verification code sent to the user
   * @param newPassword The new password
   * @returns AuthResponse with status of the request
   */
  async confirmPasswordReset(username: string, code: string, newPassword: string): Promise<AuthResponse> {
    try {
      console.info('Confirming password reset for:', username);
      await confirmResetPassword({ 
        username, 
        confirmationCode: code,
        newPassword
      });
      
      return {
        statusCode: 200,
        message: 'Password reset successfully',
        data: createAuthData({ isSignedIn: false })
      };
    } catch (error) {
      console.error('Password reset confirmation error:', error);
      return {
        statusCode: 500,
        message: error instanceof Error ? error.message : 'Password reset confirmation failed',
        data: null
      };
    }
  }
}

function createAuthData(partial: Partial<IAuth>): IAuth {
  return {
    statusCode: partial.statusCode ?? 0,
    isSignedIn: partial.isSignedIn ?? false,
    message: partial.message,
    user: partial.user,
    needsMFA: partial.needsMFA,
    needsMFASetup: partial.needsMFASetup,
    mfaType: partial.mfaType,
    mfaSetupDetails: partial.mfaSetupDetails
  };
}
