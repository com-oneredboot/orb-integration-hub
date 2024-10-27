import { Injectable } from '@angular/core';
import { fetchAuthSession, ConfirmSignUpOutput, SignUpInput, SignUpOutput, signUp, signIn, signOut, confirmSignUp } from 'aws-amplify/auth';
import { BehaviorSubject, Observable } from 'rxjs';
import { User, UserRole } from '../models/user.model';
import { generateClient, GraphQLResult } from 'aws-amplify/api';
import { getUserProfileQuery } from '../graphql/queries';

/**
 * Custom error class for authentication-related errors
 */
class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Custom error class for user profile-related errors
 */
class UserProfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserProfileError';
  }
}

/**
 * Interface defining the structure of the GraphQL user profile query result
 */
interface GetUserProfileResult {
  getUserProfile: User | null;
}

/**
 * Interface defining the structure of the signin response
 * Used to provide consistent authentication responses to components
 */
export interface SigninResponse {
  success: boolean;
  user?: User;
  error?: string;
  role?: string;
}

/**
 * Service handling all authentication-related operations
 * Manages user authentication state, profile data, and session management
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  private isAuthenticatedSubject: BehaviorSubject<boolean>;
  public currentUser: Observable<User | null>;
  public isAuthenticated: Observable<boolean>;
  private amplifyClient = generateClient();

  /**
   * Initialize the authentication service
   * Sets up observables for tracking user state and checks initial authentication
   */
  constructor() {
    this.currentUserSubject = new BehaviorSubject<User | null>(null);
    this.isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
    this.currentUser = this.currentUserSubject.asObservable();
    this.isAuthenticated = this.isAuthenticatedSubject.asObservable();
    this.checkAuthState();
  }

  /**
   * Checks the current authentication state
   * Verifies session validity and refreshes user profile if authenticated
   * @private
   * @returns Promise<void>
   */
  private async checkAuthState(): Promise<void> {
    console.debug('Checking authentication state');
    try {
      const session = await fetchAuthSession();
      const tokens = session.tokens;

      if (!tokens?.idToken?.payload) {
        console.debug('No valid tokens found in session');
        this.isAuthenticatedSubject.next(false);
        return;
      }

      this.isAuthenticatedSubject.next(true);
      const cognitoId = tokens.idToken.payload.sub;

      if (!cognitoId) {
        console.warn('No Cognito ID found in token payload');
        return;
      }

      await this.refreshUserProfile(cognitoId);
    } catch (error) {
      console.error('Error checking auth state:', error);
      this.isAuthenticatedSubject.next(false);
      this.currentUserSubject.next(null);
    }
  }

  /**
   * Refreshes the user profile data from the backend
   * @private
   * @param cognitoId - The Cognito ID of the user
   * @returns Promise<void>
   */
  private async refreshUserProfile(cognitoId: string): Promise<void> {
    console.debug(`Refreshing user profile for Cognito ID: ${cognitoId}`);
    try {
      const result = await this.amplifyClient.graphql<GraphQLResult<GetUserProfileResult>>({
        query: getUserProfileQuery,
        variables: { cognito_id: cognitoId }
      });

      if ('data' in result && result.data?.getUserProfile) {
        console.debug('User profile successfully refreshed');
        this.currentUserSubject.next(result.data.getUserProfile);
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    }
  }

  /**
   * Observable that tracks the authentication state
   * @returns Observable<boolean> indicating if user is authenticated
   */
  public isAuthenticated$(): Observable<boolean> {
    return this.isAuthenticated;
  }

  /**
   * Promise-based method to check current authentication state
   * @returns Promise<boolean> indicating if user is authenticated
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

  /**
   * Retrieves the role of the currently authenticated user
   * @returns Promise<UserRole> containing the user's role
   * @throws AuthError if no user is authenticated or role is not found
   */
  public async getUserRole(): Promise<UserRole> {
    console.debug('Getting user role');
    const currentUser = this.currentUserSubject.value;

    if (!currentUser) {
      console.error('No authenticated user found');
      throw new AuthError('No authenticated user found');
    }

    if (!currentUser.role) {
      console.error('Role not found in user profile');
      throw new AuthError('User role not found in profile');
    }

    console.debug(`User role retrieved: ${currentUser.role}`);
    return currentUser.role;
  }

  /**
   * Helper method to validate user role
   * @param role - Role to validate
   * @returns boolean indicating if role is valid
   */
  private isValidRole(role: any): role is UserRole {
    return Object.values(UserRole).includes(role);
  }

  /**
   * Authenticates a user with their credentials
   * Handles various authentication states and retrieves user profile
   * @param credentials - Object containing username and password
   * @returns Promise<SigninResponse> containing authentication result
   */
  async authenticateUser(credentials: { username: string, password: string }): Promise<SigninResponse> {
    console.debug(`Attempting to authenticate user: ${credentials.username}`);
    try {
      const signInResult = await signIn({
        username: credentials.username,
        password: credentials.password
      });

      // Handle different authentication states
      switch (signInResult.nextStep.signInStep) {
        case 'CONFIRM_SIGN_UP':
          console.warn('User needs to confirm signup');
          return {
            success: false,
            error: 'CONFIRM_SIGN_UP_REQUIRED'
          };
        case 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED':
          console.warn('User needs to set new password');
          return {
            success: false,
            error: 'NEW_PASSWORD_REQUIRED'
          };
        case 'DONE':
          break;
        default:
          console.warn(`Unexpected sign-in state: ${signInResult.nextStep.signInStep}`);
          return {
            success: false,
            error: `Unexpected sign-in state: ${signInResult.nextStep.signInStep}`
          };
      }

      // Retrieve session tokens
      const { idToken } = (await fetchAuthSession()).tokens ?? {};
      if (!idToken) {
        console.error('Failed to get user session');
        return {
          success: false,
          error: 'Failed to get user session'
        };
      }

      // Extract and verify Cognito ID
      const cognitoId = idToken.payload.sub;
      if (!cognitoId) {
        console.error('Cognito ID not found in token');
        return {
          success: false,
          error: 'Cognito ID not found'
        };
      }

      // Fetch user profile
      const userProfileResult = await this.amplifyClient.graphql<GraphQLResult<GetUserProfileResult>>({
        query: getUserProfileQuery,
        variables: { cognito_id: cognitoId }
      });

      if ('data' in userProfileResult && userProfileResult.data?.getUserProfile) {
        const user = userProfileResult.data.getUserProfile;
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
        console.info('User successfully authenticated and profile retrieved');

        return {
          success: true,
          user,
          role: user.role
        };
      }

      console.error('User profile not found after successful authentication');
      return {
        success: false,
        error: 'User profile not found'
      };

    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    }
  }


  /**
   * Register a new user
   * @param username - The username for the new account
   * @param password - The password for the new account
   * @param email - The email address for the new account
   * @returns Promise resolving to the new user data
   */
  async registerUser(username: string, password: string, email: string): Promise<SignUpOutput> {
    console.debug(`Attempting to register user: ${username}`);
    try {
      const signUpInput: SignUpInput = {
        username,
        password,
        options: {
          userAttributes: {
            email
          }
        }
      };

      const result = await signUp(signUpInput);
      console.info(`User ${username} registered successfully. Confirmation required:`, result.isSignUpComplete);
      return result;
    } catch (error) {
      console.error(`Error during registration for user ${username}:`, error);
      throw new AuthError(`Failed to register user: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Confirm a user's registration with the confirmation code
   * @param username - The username of the account to confirm
   * @param code - The confirmation code sent to the user
   * @returns Promise resolving to the confirmation result
   */
  async confirmRegistration(username: string, code: string): Promise<ConfirmSignUpOutput> {
    console.debug(`Attempting to confirm registration for user: ${username}`);
    try {
      const result = await confirmSignUp({ username, confirmationCode: code });
      console.info(`Registration confirmed for user ${username}. Result:`, result);
      return result;
    } catch (error) {
      console.error(`Error during registration confirmation for user ${username}:`, error);
      throw new AuthError(`Failed to confirm registration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Log out the current user and clear the session
   * @returns Promise<void>
   */
  async logoutUser(): Promise<void> {
    console.debug('Attempting to sign out user');
    try {
      await signOut();
      this.currentUserSubject.next(null);
      this.isAuthenticatedSubject.next(false);
      console.info('User signed out successfully');
    } catch (error) {
      console.error('Error during sign out:', error);
      throw new AuthError(`Sign out failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
