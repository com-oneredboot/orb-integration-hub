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
  fetchMFAPreference,
  signIn,
  signOut,
  signUp,
  SignUpOutput,
  resetPassword,
  confirmResetPassword,
} from 'aws-amplify/auth';
import {BehaviorSubject, Observable} from 'rxjs';

// Application-specific imports
import { Users, UsersCreateInput, IUsers } from '../models/UsersModel';
import { AuthResponse } from '../models/AuthModel';
import { IAuth, Auth } from "../models/AuthModel";
import { AuthError } from "../models/AuthErrorModel";
import { environment } from '../../../environments/environment';
import { MfaSetupDetails } from '../models/MfaSetupDetailsModel';

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
   * Verify email for a user
   * @param cognitoId
   * @param code
   */
  public async emailVerify(cognitoId: string, code: string): Promise<AuthResponse> {
    console.debug('[CognitoService][emailVerify] called with', { cognitoId, code });
    try {
      await confirmSignUp({ username: cognitoId, confirmationCode: code });
      console.debug('[CognitoService][emailVerify] confirmSignUp success');
      return {
        StatusCode: 200,
        Message: 'Email verified',
        Data: new Auth({ isSignedIn: false })
      };
    } catch (error) {
      console.error('[CognitoService][emailVerify] threw error', error);
      return {
        StatusCode: 500,
        Message: error instanceof Error ? error.message : 'Confirmation failed',
        Data: new Auth({ isSignedIn: false, message: 'Confirmation failed' })
      };
    }
  }

  /**
   * Sign in a user
   * @param username (cognitoId in users table)
   * @param password
   * @param email (optional) User's email for better MFA labeling
   */
  public async signIn(username: string, password: string, email?: string): Promise<AuthResponse> {
    console.info('Starting sign in process for:', username);
    const signInResponse = await signIn({ username, password });

    if (signInResponse.isSignedIn) {
      console.info('Sign in successful for cognitoId:', username);
      return {
        StatusCode: 200,
        Message: 'Sign in successful',
        Data: new Auth({ isSignedIn: true })
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
          StatusCode: 200,
          Message: 'MFA setup required',
          Data: new Auth(
            { 
              isSignedIn: false,
              needsMFASetup: true,
              mfaType: 'totp',
              mfaSetupDetails: new MfaSetupDetails({ 
                qrCode: email || username,
                secretKey: nextStep.totpSetupDetails?.sharedSecret,
                setupUri: setupUri.toString()
              })
            })
        };

      case 'CONFIRM_SIGN_IN_WITH_TOTP_CODE':
        this.mfaSetupRequiredSubject.next(true);
        return {
          StatusCode: 200,
          Message: 'MFA setup not required',
          Data: new Auth({ isSignedIn: false, needsMFASetup: false, needsMFA: true, mfaType: 'totp' })
        };
      default:
        console.error('Sign in failed:', signInResponse);
    }

    return {
      StatusCode: 401,
      Message: 'Sign in failed',
      Data: new Auth({ isSignedIn: false })
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
          StatusCode: 200,
          Message: 'MFA verification successful',
          Data: new Auth({ isSignedIn: true })
        };
      }

      return {
        StatusCode: 401,
        Message: 'MFA verification failed',
        Data: new Auth({ isSignedIn: false })
      };

    } catch (error) {
      console.error('MFA verification error:', error);
      return {
        StatusCode: 500,
        Message: error instanceof Error ? error.message : 'MFA verification failed',
        Data: new Auth({ isSignedIn: false, message: 'MFA verification failed' })
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
   * Check if user is properly authenticated with valid tokens and accessible user data
   * This method validates:
   * 1. Session exists with tokens
   * 2. Tokens are not expired 
   * 3. User profile can be retrieved
   * 4. User has basic required groups for app access
   */
  public async checkIsAuthenticated(): Promise<boolean> {
    try {
      // Step 1: Check if session and tokens exist
      const session = await fetchAuthSession();
      if (!session.tokens?.accessToken || !session.tokens?.idToken) {
        console.debug('checkIsAuthenticated: No valid tokens found');
        this.isAuthenticatedSubject.next(false);
        return false;
      }

      // Step 2: Validate token expiration
      const currentTime = Math.floor(Date.now() / 1000);
      const accessTokenExp = session.tokens.accessToken.payload?.exp;
      const idTokenExp = session.tokens.idToken.payload?.exp;

      if (!accessTokenExp || !idTokenExp) {
        console.debug('checkIsAuthenticated: Tokens missing expiration data');
        this.isAuthenticatedSubject.next(false);
        return false;
      }

      if (accessTokenExp <= currentTime || idTokenExp <= currentTime) {
        console.debug('checkIsAuthenticated: Tokens are expired', {
          currentTime,
          accessTokenExp,
          idTokenExp,
          accessExpired: accessTokenExp <= currentTime,
          idExpired: idTokenExp <= currentTime
        });
        this.isAuthenticatedSubject.next(false);
        return false;
      }

      // Step 3: Verify we can retrieve current user (validates tokens are functional)
      let currentUser;
      try {
        currentUser = await getCurrentUser();
        if (!currentUser.username) {
          console.debug('checkIsAuthenticated: Unable to retrieve current user');
          this.isAuthenticatedSubject.next(false);
          return false;
        }
      } catch (userError) {
        console.debug('checkIsAuthenticated: Error retrieving current user:', userError);
        this.isAuthenticatedSubject.next(false);
        return false;
      }

      // Step 4: Verify user has basic app access (USER or OWNER group)
      const userGroupsRaw = session.tokens.idToken.payload['cognito:groups'];
      const userGroups = Array.isArray(userGroupsRaw) ? userGroupsRaw : [];
      const hasBasicAccess = userGroups.includes('USER') || userGroups.includes('OWNER');
      
      if (!hasBasicAccess) {
        console.debug('checkIsAuthenticated: User lacks required groups for app access', {
          userGroups,
          requiredGroups: ['USER', 'OWNER']
        });
        this.isAuthenticatedSubject.next(false);
        return false;
      }

      // All checks passed
      console.debug('checkIsAuthenticated: User is properly authenticated', {
        username: currentUser?.username,
        groups: userGroups,
        tokenExpiry: {
          access: new Date(accessTokenExp * 1000).toISOString(),
          id: new Date(idTokenExp * 1000).toISOString()
        }
      });

      this.isAuthenticatedSubject.next(true);
      return true;

    } catch (error) {
      console.debug('checkIsAuthenticated: Error during authentication check:', error);
      this.isAuthenticatedSubject.next(false);
      return false;
    }
  }

  /**
   * Lightweight authentication check - only validates token existence
   * Use this for non-critical checks where performance is important
   * For dashboard/protected routes, use checkIsAuthenticated() instead
   */
  public async checkHasTokens(): Promise<boolean> {
    try {
      const session = await fetchAuthSession();
      return !!session.tokens?.accessToken && !!session.tokens?.idToken;
    } catch {
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

      const groupsRaw = session.tokens.idToken.payload['cognito:groups'];
      const groups = Array.isArray(groupsRaw) ? groupsRaw.filter(g => typeof g === 'string') : [];
      
      return {
        username,
        ...userAttributes,
        sub: session.tokens.idToken.payload.sub,
        groups: groups
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
      throw new AuthError({ message: error instanceof Error ? error.message : 'Sign out failed' });
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
        StatusCode: 200,
        Message: 'Password reset initiated successfully',
        Data: new Auth({ isSignedIn: false })
      };
    } catch (error) {
      console.error('Password reset initiation error:', error);
      return {
        StatusCode: 500,
        Message: error instanceof Error ? error.message : 'Password reset failed',
        Data: new Auth({ isSignedIn: false, message: 'Password reset failed' })
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
        StatusCode: 200,
        Message: 'Password reset successfully',
        Data: new Auth({ isSignedIn: false })
      };
    } catch (error) {
      console.error('Password reset confirmation error:', error);
      return {
        StatusCode: 500,
        Message: error instanceof Error ? error.message : 'Password reset confirmation failed',
        Data: new Auth({ isSignedIn: false, message: 'Password reset confirmation failed' })
      };
    }
  }

  /**
   * Get the current user's Cognito groups from the JWT token
   * @returns Array of group names the user belongs to
   */
  async getCurrentUserGroups(): Promise<string[]> {
    try {
      const session = await fetchAuthSession();
      
      if (!session.tokens?.idToken?.payload) {
        console.debug('No valid session found for group retrieval');
        return [];
      }

      const groupsRaw = session.tokens.idToken.payload['cognito:groups'];
      const groups = Array.isArray(groupsRaw) ? groupsRaw.filter(g => typeof g === 'string') : [];
      console.debug('Current user groups:', groups);
      return groups as string[];
    } catch (error) {
      console.error('Error fetching user groups:', error);
      return [];
    }
  }

  /**
   * Check if the current user belongs to specific Cognito groups
   * @param requiredGroups Array of group names to check
   * @returns True if user belongs to at least one of the required groups
   */
  async hasRequiredGroups(requiredGroups: string[]): Promise<boolean> {
    try {
      const userGroups = await this.getCurrentUserGroups();
      const hasGroup = requiredGroups.some(group => userGroups.includes(group));
      console.debug(`User groups: ${userGroups}, Required: ${requiredGroups}, Has access: ${hasGroup}`);
      return hasGroup;
    } catch (error) {
      console.error('Error checking user groups:', error);
      return false;
    }
  }

  /**
   * Validate that the current user has access to perform a specific operation
   * This should be called before making GraphQL requests that require specific groups
   * @param requiredGroups Array of group names required for the operation
   * @returns True if user has access, false otherwise
   */
  async validateGraphQLAccess(requiredGroups: string[]): Promise<boolean> {
    const isAuthenticated = await this.checkIsAuthenticated();
    if (!isAuthenticated) {
      console.error('User is not authenticated');
      return false;
    }

    const hasAccess = await this.hasRequiredGroups(requiredGroups);
    if (!hasAccess) {
      console.error(`User does not have required groups for operation. Required: ${requiredGroups}`);
    }

    return hasAccess;
  }

  /**
   * Check MFA preferences from Cognito directly
   * @returns Promise<{mfaEnabled: boolean, mfaSetupComplete: boolean}> MFA status from Cognito
   */
  async checkMFAPreferences(): Promise<{mfaEnabled: boolean, mfaSetupComplete: boolean}> {
    try {
      console.debug('[CognitoService][checkMFAPreferences] Checking MFA preferences from Cognito');
      
      const mfaPreferences = await fetchMFAPreference();
      console.debug('[CognitoService][checkMFAPreferences] MFA preferences:', mfaPreferences);
      
      // Check if TOTP (Time-based One-Time Password) is enabled
      // The AWS Amplify v6 API uses 'TOTP' property, not 'totp'
      const totpPreference = (mfaPreferences as any).TOTP || (mfaPreferences as any).totp;
      const totpEnabled = totpPreference === 'ENABLED' || totpPreference === 'PREFERRED';
      
      // For AWS Cognito, if TOTP is enabled, setup is complete
      const mfaEnabled = totpEnabled;
      const mfaSetupComplete = totpEnabled;
      
      console.debug('[CognitoService][checkMFAPreferences] Parsed MFA status:', { 
        mfaEnabled, 
        mfaSetupComplete,
        totpPreference,
        rawPreferences: mfaPreferences
      });
      
      return { mfaEnabled, mfaSetupComplete };
    } catch (error) {
      console.error('[CognitoService][checkMFAPreferences] Error checking MFA preferences:', error);
      // If there's an error (like user not found or MFA not configured), assume not enabled
      return { mfaEnabled: false, mfaSetupComplete: false };
    }
  }

  /**
   * Debug method to check user's authentication and group status
   * Call this from browser console: window.cognitoService.debugUserStatus()
   */
  async debugUserStatus(): Promise<void> {
    console.log('🔍 === COGNITO USER DEBUG STATUS ===');
    
    try {
      // Check authentication
      const isAuth = await this.checkIsAuthenticated();
      console.log('✅ Is Authenticated:', isAuth);
      
      if (!isAuth) {
        console.log('❌ User is not authenticated - cannot check groups');
        return;
      }
      
      // Get user profile
      const profile = await this.getCognitoProfile();
      console.log('👤 User Profile:', {
        username: profile?.username,
        email: profile?.email,
        email_verified: profile?.email_verified,
        phone_number: profile?.phone_number,
        phone_number_verified: profile?.phone_number_verified
      });
      
      // Get groups
      const groups = await this.getCurrentUserGroups();
      console.log('👥 Current Cognito Groups:', groups);
      
      // Check SMS verification access
      const hasAccess = await this.hasRequiredGroups(['USER', 'OWNER']);
      console.log('📱 Has SMS Verification Access:', hasAccess);
      
      // Check MFA status
      const mfaStatus = await this.checkMFAPreferences();
      console.log('🔐 MFA Status:', mfaStatus);
      
      if (!hasAccess) {
        console.log('❌ User needs to be added to USER or OWNER group for SMS verification');
        console.log('💡 Required groups: ["USER", "OWNER"]');
        console.log('💡 Current groups:', groups);
      } else {
        console.log('✅ User has proper group membership for SMS verification');
      }
      
    } catch (error) {
      console.error('❌ Error checking user status:', error);
    }
    
    console.log('🔍 === END DEBUG STATUS ===');
  }
}

