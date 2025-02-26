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
} from 'aws-amplify/auth';
import {BehaviorSubject, Observable} from 'rxjs';

// Application-specific imports
import {UserCreateInput, User, } from '../models/user.model';
import {AuthResponse, AuthError } from "../models/auth.model";
import { environment } from '../../../environments/environment';

// Settings
const appName = environment.appName;

@Injectable({
  providedIn: 'root'
})
export class CognitoService {

  public currentUser: Observable<User | null>;
  public isAuthenticated: Observable<boolean>;
  public mfaSetupRequired: Observable<boolean>;
  public mfaRequired: Observable<boolean>;

  private currentUserSubject: BehaviorSubject<User | null>;
  private isAuthenticatedSubject: BehaviorSubject<boolean>;
  private mfaSetupRequiredSubject: BehaviorSubject<boolean>;
  private mfaRequiredSubject: BehaviorSubject<boolean>;

  /**
   * Constructor
   */
  constructor() {

    // Get BehaviorSubjects for current user, authentication status, and MFA setup
    this.currentUserSubject = new BehaviorSubject<User | null>(null);
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
  public async createCognitoUser(input: UserCreateInput, password:string): Promise<SignUpOutput> {

      console.debug('Creating Cognito user:', input);

      return await signUp({
        username: input.cognito_id,
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
        status_code: 200,
        isSignedIn: false,
        message: 'Email verified'
      };

    } catch (error) {
      console.error('Confirmation error:', error);
      return {
        status_code: 500,
        isSignedIn: false,
        message: error instanceof Error ? error.message : 'Confirmation failed'
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
        status_code: 200,
        isSignedIn: true,
        message: 'Sign in successful',
        user: this.currentUserSubject.value || undefined
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
          status_code: 200,
          isSignedIn: false,
          needsMFASetup: true,
          mfaType: 'totp',
          mfaSetupDetails: {
            qrCode: email || username, // Use email if available
            secretKey: nextStep.totpSetupDetails?.sharedSecret,
            setupUri: setupUri
          }
        };
      case 'CONFIRM_SIGN_IN_WITH_TOTP_CODE':
        this.mfaSetupRequiredSubject.next(true);
        return {
          status_code: 200,
          isSignedIn: false,
          needsMFASetup: false,
          needsMFA: true,
          mfaType: 'totp',
        };
      default:
        console.error('Sign in failed:', signInResponse);
    }

    return {
      status_code: 401,
      isSignedIn: false,
      message: 'Sign in failed'
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
          status_code: 200,
          isSignedIn: true,
          message: 'MFA verification successful',
          user: this.currentUserSubject.value || undefined
        };
      }

      return {
        status_code: 401,
        isSignedIn: false,
        message: 'MFA verification failed'
      };

    } catch (error) {
      console.error('MFA verification error:', error);
      return {
        status_code: 500,
        isSignedIn: false,
        message: error instanceof Error ? error.message : 'MFA verification failed'
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

}
