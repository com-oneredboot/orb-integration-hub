// file: apps/web/src/app/services/cognito.service.ts
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
  setUpTOTP,
} from 'aws-amplify/auth';
import {BehaviorSubject, Observable} from 'rxjs';

// Application-specific imports
import { UsersCreateInput, IUsers } from '../models/UsersModel';
import { AuthResponse, Auth } from '../models/AuthModel';
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

      console.debug('[CognitoService] Creating Cognito user');

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
    console.debug('[CognitoService] Email verification initiated');
    try {
      await confirmSignUp({ username: cognitoId, confirmationCode: code });
      console.debug('[CognitoService][emailVerify] confirmSignUp success');
      return {
        StatusCode: 200,
        Message: 'Email verified',
        Data: new Auth({ isSignedIn: false })
      };
    } catch (error) {
      console.error('[CognitoService][emailVerify] Email verification failed');
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
    try {
      console.debug('[CognitoService] Starting sign in process');
      const signInResponse = await signIn({ username, password });

      if (signInResponse.isSignedIn) {
        console.debug('[CognitoService] Sign in successful');
        return {
          StatusCode: 200,
          Message: 'Sign in successful',
          Data: new Auth({ isSignedIn: true })
        };
      }

      const nextStep = signInResponse.nextStep;
      console.debug('[CognitoService] Processing sign in next step');

      switch(nextStep.signInStep) {
        case 'CONTINUE_SIGN_IN_WITH_TOTP_SETUP': {
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
        }

        case 'CONFIRM_SIGN_IN_WITH_TOTP_CODE':
          this.mfaSetupRequiredSubject.next(true);
          return {
            StatusCode: 200,
            Message: 'MFA setup not required',
            Data: new Auth({ isSignedIn: false, needsMFASetup: false, needsMFA: true, mfaType: 'totp' })
          };
        default:
          console.error('[CognitoService] Sign in failed - unexpected response type');
      }

      return {
        StatusCode: 401,
        Message: 'Sign in failed',
        Data: new Auth({ isSignedIn: false })
      }

    } catch (error) {
      console.error('[CognitoService] Sign in error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      
      // Check for "already signed in" or related error messages
      if (errorMessage.toLowerCase().includes('already signed in') || 
          errorMessage.toLowerCase().includes('already authenticated') ||
          errorMessage.toLowerCase().includes('user already exists')) {
        return {
          StatusCode: 401,
          Message: errorMessage,
          Data: new Auth({ isSignedIn: false, message: errorMessage })
        };
      }

      // Handle other authentication errors
      return {
        StatusCode: 500,
        Message: errorMessage,
        Data: new Auth({ isSignedIn: false, message: errorMessage })
      };
    }
  }

  /**
   * Verify the MFA code
   * @param code
   * @param rememberDevice
   */
  async mfaVerify(code: string, rememberDevice = false): Promise<AuthResponse> {
    try {
      console.debug('[CognitoService] Verifying MFA code');
      const result = await confirmSignIn({
        challengeResponse: code,
        options: { rememberDevice }
      });
      console.debug('[CognitoService] MFA verification completed');

      if (result.isSignedIn) {
        console.debug('[CognitoService] MFA verification successful');

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
      console.error('[CognitoService] MFA verification failed');
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
        console.debug('[CognitoService] No valid tokens found');
        this.isAuthenticatedSubject.next(false);
        return false;
      }

      // Step 2: Validate token expiration
      const currentTime = Math.floor(Date.now() / 1000);
      const accessTokenExp = session.tokens.accessToken.payload?.exp;
      const idTokenExp = session.tokens.idToken.payload?.exp;

      if (!accessTokenExp || !idTokenExp) {
        console.debug('[CognitoService] Tokens missing expiration data');
        this.isAuthenticatedSubject.next(false);
        return false;
      }

      if (accessTokenExp <= currentTime || idTokenExp <= currentTime) {
        console.debug('[CognitoService] Tokens are expired');
        this.isAuthenticatedSubject.next(false);
        return false;
      }

      // Step 3: Verify we can retrieve current user (validates tokens are functional)
      let currentUser;
      try {
        currentUser = await getCurrentUser();
        if (!currentUser.username) {
          console.debug('[CognitoService] Unable to retrieve current user');
          this.isAuthenticatedSubject.next(false);
          return false;
        }
      } catch (userError) {
        console.debug('[CognitoService] Error retrieving current user');
        this.isAuthenticatedSubject.next(false);
        return false;
      }

      // Step 4: Verify user has basic app access (USER or OWNER group)
      const userGroupsRaw = session.tokens.idToken.payload['cognito:groups'];
      const userGroups = Array.isArray(userGroupsRaw) ? userGroupsRaw : [];
      const hasBasicAccess = userGroups.includes('USER') || userGroups.includes('OWNER');
      
      console.debug('[CognitoService] Token analysis:', {
        userGroups: userGroups,
        userGroupsRaw: userGroupsRaw,
        hasBasicAccess,
        tokenAud: session.tokens.idToken.payload.aud,
        tokenIss: session.tokens.idToken.payload.iss,
        tokenSub: session.tokens.idToken.payload.sub,
        tokenExp: session.tokens.idToken.payload.exp,
        currentTime: Math.floor(Date.now() / 1000)
      });
      
      if (!hasBasicAccess) {
        console.debug('[CognitoService] User lacks required groups for app access');
        this.isAuthenticatedSubject.next(false);
        return false;
      }

      // All checks passed
      console.debug('[CognitoService] User is properly authenticated');

      this.isAuthenticatedSubject.next(true);
      return true;

    } catch (error) {
      console.debug('[CognitoService] Error during authentication check');
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
        console.debug('[CognitoService] No valid session found');
        return null;
      }

      // Get current authenticated user
      const { username } = await getCurrentUser();

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
      console.error('[CognitoService] Failed to fetch user profile');
      return null;
    }
  }

  async signOut(): Promise<void> {
    try {
      await signOut();
      this.currentUserSubject.next(null);
      this.isAuthenticatedSubject.next(false);
    } catch (error) {
      console.error('[CognitoService] Sign out failed');
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
      console.debug('[CognitoService] Initiating password reset');
      await resetPassword({ username });
      
      return {
        StatusCode: 200,
        Message: 'Password reset initiated successfully',
        Data: new Auth({ isSignedIn: false })
      };
    } catch (error) {
      console.error('[CognitoService] Password reset initiation failed');
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
      console.debug('[CognitoService] Confirming password reset');
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
      console.error('[CognitoService] Password reset confirmation failed');
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
        console.debug('[CognitoService] No valid session found for group retrieval');
        return [];
      }

      const groupsRaw = session.tokens.idToken.payload['cognito:groups'];
      const groups = Array.isArray(groupsRaw) ? groupsRaw.filter(g => typeof g === 'string') : [];
      console.debug('[CognitoService] Current user groups retrieved');
      return groups as string[];
    } catch (error) {
      console.error('[CognitoService] Failed to fetch user groups');
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
      console.debug('[CognitoService] User group access validation completed');
      return hasGroup;
    } catch (error) {
      console.error('[CognitoService] Failed to check user groups');
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
      console.error('[CognitoService] User authentication required');
      return false;
    }

    const hasAccess = await this.hasRequiredGroups(requiredGroups);
    if (!hasAccess) {
      console.error('[CognitoService] User lacks required permissions for operation');
    }

    return hasAccess;
  }

  /**
   * Check MFA preferences from Cognito directly
   * @returns Promise<{mfaEnabled: boolean, mfaSetupComplete: boolean}> MFA status from Cognito
   */
  async checkMFAPreferences(): Promise<{mfaEnabled: boolean, mfaSetupComplete: boolean}> {
    try {
      // Method 1: Try fetchMFAPreference (might only work during auth flow)
      let mfaPreferences;
      try {
        mfaPreferences = await fetchMFAPreference();
      } catch (mfaError) {
        mfaPreferences = null;
      }
      
      // Method 2: Check user attributes for MFA-related info
      let userAttributes;
      try {
        userAttributes = await fetchUserAttributes();
      } catch (attrError) {
        userAttributes = null;
      }
      
      // Method 3: Check auth session for MFA info
      let authSession;
      try {
        authSession = await fetchAuthSession();
      } catch (sessionError) {
        authSession = null;
      }
      
      // Method 4: Check current user for MFA info (validates session is active)
      try {
        await getCurrentUser();
      } catch {
        // User not authenticated, MFA check not possible
      }
      
      // Analyze all the data we collected
      let mfaEnabled = false;
      let mfaSetupComplete = false;
      
      // Check MFA preferences if available
      if (mfaPreferences) {
        const prefs = mfaPreferences as any;
        if (prefs.TOTP === 'ENABLED' || prefs.TOTP === 'PREFERRED' ||
            prefs.preferred === 'TOTP' ||
            (Array.isArray(prefs.enabled) && prefs.enabled.includes('TOTP'))) {
          mfaEnabled = true;
          mfaSetupComplete = true;
        }
      }
      
      // Check user attributes for MFA indicators
      if (userAttributes && !mfaEnabled) {
        if (userAttributes['software_token_mfa_enabled'] === 'true' ||
            userAttributes['mfa_enabled'] === 'true') {
          mfaEnabled = true;
          mfaSetupComplete = true;
        }
      }
      
      // Check auth session tokens for MFA info
      if (authSession?.tokens?.accessToken && !mfaEnabled) {
        const payload = authSession.tokens.accessToken.payload as any;
        // Check if the token indicates MFA was used
        if (payload.amr && Array.isArray(payload.amr) && payload.amr.includes('mfa')) {
          mfaEnabled = true;
          mfaSetupComplete = true;
        }
      }
      
      return { mfaEnabled, mfaSetupComplete };
    } catch (error) {
      console.error('[CognitoService] Failed to check MFA preferences');
      return { mfaEnabled: false, mfaSetupComplete: false };
    }
  }

  /**
   * Debug method to check user's authentication and group status
   * Call this from browser console: window.cognitoService.debugUserStatus()
   */
  async debugUserStatus(): Promise<void> {
    console.debug('🔍 === COGNITO USER DEBUG STATUS ===');
    
    try {
      // Check authentication
      const isAuth = await this.checkIsAuthenticated();
      console.debug('✅ Is Authenticated:', isAuth);
      
      if (!isAuth) {
        console.debug('❌ User is not authenticated - cannot check groups');
        return;
      }
      
      // Get user profile
      await this.getCognitoProfile();
      console.debug('👤 User Profile: Basic profile information retrieved');
      
      // Get groups
      await this.getCurrentUserGroups();
      console.debug('👥 Current Cognito Groups: Group information retrieved');
      
      // Check SMS verification access
      const hasAccess = await this.hasRequiredGroups(['USER', 'OWNER']);
      console.debug('📱 Has SMS Verification Access:', hasAccess);
      
      // Check MFA status
      await this.checkMFAPreferences();
      console.debug('🔐 MFA Status: MFA configuration retrieved');
      
      if (!hasAccess) {
        console.debug('❌ User needs to be added to USER or OWNER group for SMS verification');
        console.debug('💡 Required groups: ["USER", "OWNER"]');
        console.debug('💡 Current groups: Group information available');
      } else {
        console.debug('✅ User has proper group membership for SMS verification');
      }
      
    } catch (error) {
      console.error('[CognitoService] Failed to check user status');
    }
    
    console.debug('🔍 === END DEBUG STATUS ===');
  }

  /**
   * Set up TOTP MFA for the current user
   * @returns Promise<AuthResponse> with MFA setup details
   */
  public async setupMFA(): Promise<AuthResponse> {
    try {
      // Step 1: Set up TOTP with Cognito
      const totpSetupDetails = await setUpTOTP();
      
      // Step 2: Get current user attributes for issuer
      const userAttributes = await fetchUserAttributes();
      const userEmail = userAttributes.email || 'user';
      
      // Step 3: Create setup URI with proper issuer format
      const issuer = `${appName}:${userEmail}`;
      const setupUri = totpSetupDetails.getSetupUri(issuer);
      
      // Step 4: Return success with MFA setup details
      const mfaSetupDetails = new MfaSetupDetails({
        qrCode: userEmail, // Using email as QR identifier
        secretKey: totpSetupDetails.sharedSecret,
        setupUri: setupUri.toString()
      });
      
      return {
        StatusCode: 200,
        Message: 'MFA setup initiated successfully',
        Data: new Auth({
          isSignedIn: true,
          needsMFASetup: true,
          mfaType: 'totp',
          mfaSetupDetails: mfaSetupDetails
        })
      };
      
    } catch (error) {
      console.error('[CognitoService] Failed to setup MFA');
      return {
        StatusCode: 500,
        Message: 'Failed to set up MFA',
        Data: new Auth({
          isSignedIn: true,
          needsMFASetup: false,
          message: 'MFA setup failed'
        })
      };
    }
  }
}

