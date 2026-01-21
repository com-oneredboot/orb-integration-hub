// file: apps/web/src/app/services/user.service.ts
// author: Corey Dale Peters
// date: 2024-12-06
// description: The API service provides a core interface for making GraphQL queries and mutations

// 3rd Party Imports
import { GraphQLResult} from "@aws-amplify/api-graphql";
import { Injectable, inject } from "@angular/core";
import { Store } from '@ngrx/store';
import { BehaviorSubject, Observable } from 'rxjs';

// Application Imports
import {ApiService} from "./api.service";
import {
  UsersCreate, UsersUpdate, UsersQueryByUserId, UsersQueryByEmail, UsersQueryByCognitoSub
} from "../graphql/Users.graphql";
import { SmsVerification } from "../graphql/SmsVerification.graphql";
import { CheckEmailExists } from "../graphql/CheckEmailExists.graphql";
import { CreateUserFromCognito } from "../graphql/CreateUserFromCognito.graphql";
import {
  UsersCreateInput, UsersUpdateInput,
  UsersCreateResponse, UsersUpdateResponse, IUsers,
  UsersListResponse, UsersResponse, Users
} from "../models/UsersModel";
import { UserGroup } from "../enums/UserGroupEnum";
import { UserStatus } from "../enums/UserStatusEnum";
import { CognitoService } from "./cognito.service";
import { Auth, AuthResponse } from "../models/AuthModel";
import { UserActions } from '../../features/user/store/user.actions';
import { toGraphQLInput } from '../../graphql-utils';
import { DebugLogService } from './debug-log.service';

@Injectable({
  providedIn: 'root'
})
export class UserService extends ApiService {

  private userDebugLog = inject(DebugLogService);  // Private Attributes
  private currentUser = new BehaviorSubject<IUsers | null>(null);

  /**
   * Constructor
   * @param cognitoService
   * @param store
   */
  constructor(
    private cognitoService: CognitoService,
    private store: Store
  ) {
    super();

    // Sync with Cognito's auth state
    this.cognitoService.currentUser.subscribe(user => {
      if (user) {
        this.currentUser.next(user);
        this.store.dispatch(UserActions.signInSuccess({ user, message: 'User found' }));
      }
    });
  }

  /**
   * Create a new user in Cognito only.
   * DynamoDB record will be created later via CreateUserFromCognito after email verification and MFA.
   * 
   * Flow: EMAIL → PASSWORD_SETUP → EMAIL_VERIFY → SIGNIN → MFA_SETUP → CreateUserFromCognito → Dashboard
   * 
   * @param input User input (only email is used for Cognito signup)
   * @param password User's password
   */
  public async userCreate(input: UsersCreateInput, password: string): Promise<UsersResponse> {
    console.debug('[UserService][userCreate] Creating Cognito user only:', input.email);
    this.userDebugLog.logApi('userCreate', 'pending', { email: input.email });

    try {
      // Create the Cognito User ONLY - no DynamoDB record yet
      // DynamoDB record will be created via CreateUserFromCognito after MFA completion
      this.userDebugLog.logApi('createCognitoUser', 'pending', { email: input.email });
      const cognitoResponse = await this.cognitoService.createCognitoUser(input, password);
      console.debug('[UserService][userCreate] createCognitoUser Response:', cognitoResponse);
      
      const cognitoSub = cognitoResponse.userId || '';
      this.userDebugLog.logAuth('createCognitoUser', 'success', { userId: cognitoSub });

      // Return success - user needs to verify email next
      // No DynamoDB record created yet - that happens after MFA via CreateUserFromCognito
      return {
        StatusCode: 200,
        Message: 'Cognito user created successfully. Please verify your email.',
        Data: null // No DynamoDB user yet
      } as UsersResponse;

    } catch (error: unknown) {
      console.error('[UserService][userCreate] Error creating Cognito user:', error);
      const errorObj = error as { message?: string; name?: string; code?: string };
      const message = errorObj?.message || String(error) || '';
      const errorName = errorObj?.name || '';
      const errorCode = errorObj?.code || '';
      
      console.debug('[UserService][userCreate] Error details:', {
        message,
        name: errorName,
        code: errorCode,
        fullError: JSON.stringify(error)
      });
      
      this.userDebugLog.logError('userCreate', message, { error: String(error), name: errorName });
      
      // Re-throw UsernameExistsException so the effect can handle smart recovery
      const isUsernameExists = 
        message.toLowerCase().includes('usernameexistsexception') || 
        message.toLowerCase().includes('user already exists') ||
        message.toLowerCase().includes('already exists') ||
        errorName === 'UsernameExistsException' ||
        errorCode === 'UsernameExistsException';
        
      if (isUsernameExists) {
        console.debug('[UserService][userCreate] Detected UsernameExistsException, re-throwing for smart recovery');
        throw error; // Let the effect handle this for smart recovery
      }

      return {
        StatusCode: 500,
        Message: message || 'Error creating Cognito user',
        Data: new Users()
      } as UsersResponse;
    }
  }

  /**
   * Create DynamoDB record only (user already exists in Cognito)
   * This is used when a user exists in Cognito but not in DynamoDB
   * @param input User data to create
   */
  public async createUserRecordOnly(input: UsersCreateInput): Promise<UsersResponse> {
    console.debug('[UserService][createUserRecordOnly] Creating DynamoDB record:', input.email);
    this.userDebugLog.logApi('createUserRecordOnly', 'pending', { email: input.email });

    try {
      const timestamp = new Date();
      
      const userCreateInput: UsersCreateInput = {
        userId: input.userId,
        cognitoId: input.cognitoId,
        cognitoSub: input.cognitoSub,
        email: input.email,
        firstName: input.firstName || '',
        lastName: input.lastName || '',
        phoneNumber: input.phoneNumber || '',
        groups: input.groups || [UserGroup.User] as string[],
        status: input.status || UserStatus.Pending,
        createdAt: input.createdAt || timestamp,
        phoneVerified: input.phoneVerified || false,
        emailVerified: input.emailVerified || false,
        updatedAt: timestamp,
        mfaEnabled: input.mfaEnabled || false,
        mfaSetupComplete: input.mfaSetupComplete || false
      };

      // Convert Date fields to Unix timestamps for GraphQL AWSTimestamp compatibility
      const graphqlInput = toGraphQLInput(userCreateInput as unknown as Record<string, unknown>);

      // Use userPool auth since user is already authenticated
      const response = await this.mutate(UsersCreate, {"input": graphqlInput}, "userPool") as GraphQLResult<UsersCreateResponse>;
      console.debug('[UserService][createUserRecordOnly] Response:', response);

      const statusCode = response.data?.StatusCode ?? 200;
      if (statusCode !== 200) {
        this.userDebugLog.logError('createUserRecordOnly', response.data?.Message || 'Non-200 status', { statusCode });
      } else {
        this.userDebugLog.logApi('createUserRecordOnly', 'success', { userId: input.userId });
      }

      return {
        StatusCode: statusCode,
        Message: response.data?.Message ?? '',
        Data: response.data?.Data ?? null
      } as UsersResponse;

    } catch (error: unknown) {
      console.error('[UserService][createUserRecordOnly] Error:', error);
      const errorObj = error as { message?: string };
      const message = errorObj?.message || String(error) || '';
      
      this.userDebugLog.logError('createUserRecordOnly', message, { error: String(error) });

      return {
        StatusCode: 500,
        Message: message || 'Error creating user record',
        Data: new Users()
      } as UsersResponse;
    }
  }

  /**
   * Check if a user exists
   * @param input UserQueryInput with backend-compatible fields
   * @returns UsersResponse object
   */
  public async userExists(input: { userId?: string; email?: string }): Promise<UsersListResponse> {
    try {
      let queryInput;
      let query;
      if (input.userId) {
        queryInput = { userId: input.userId };
        query = UsersQueryByUserId;
      } else if (input.email) {
        queryInput = { email: input.email };
        query = UsersQueryByEmail;
      } else {
        throw new Error('Must provide userId or email');
      }

      // UsersQueryByUserId and UsersQueryByEmail require Cognito auth
      const response = await this.query(
        query,
        { input: queryInput },
        'userPool'
      ) as GraphQLResult<{ UsersQueryByUserId?: UsersListResponse; UsersQueryByEmail?: UsersListResponse }>;

      // Dynamically get the result based on which query was used
      let result;
      if (input.userId) {
        result = response.data?.UsersQueryByUserId;
      } else if (input.email) {
        result = response.data?.UsersQueryByEmail;
      }
      
      const statusCode = result?.StatusCode ?? 200;
      const message = result?.Message ?? '';
      const Data = result?.Data ?? [];

      const users = Data as IUsers[];

      if (users.length > 1) {
        console.error('[userExists] Duplicate users found for input:', input, users);
        return {
          StatusCode: 500,
          Message: 'Duplicate users found for this email or userId',
          Data: []
        };
      }

      return {
        StatusCode: statusCode,
        Message: message,
        Data: users
      } as UsersListResponse;

    } catch (error: unknown) {
      // Better error message handling
      let message = '';
      const errorObj = error as { message?: string; errors?: { message?: string; recoverySuggestion?: string }[]; name?: string; code?: string };
      
      if (errorObj?.message && typeof errorObj.message === 'string') {
        message = errorObj.message;
      } else if (typeof error === 'string') {
        message = error;
      } else {
        // Handle complex error objects by extracting useful information
        if (errorObj?.errors && Array.isArray(errorObj.errors)) {
          const errorMessages = errorObj.errors.map((e) => e.message || String(e)).join(', ');
          message = `GraphQL Error: ${errorMessages}`;
          
          // Add recovery suggestions if available
          const suggestions = errorObj.errors
            .filter((e) => e.recoverySuggestion)
            .map((e) => e.recoverySuggestion)
            .join(', ');
          if (suggestions) {
            message += ` | Suggestions: ${suggestions}`;
          }
        } else {
          message = `GraphQL Error: ${errorObj?.name || 'Unknown'} - ${errorObj?.code || 'No code'}`;
        }
      }
      
      // Detect network/DNS errors and throw a user-friendly error
      if (
        message.includes('ERR_NAME_NOT_RESOLVED') ||
        message.includes('NetworkError') ||
        message.includes('Failed to fetch') ||
        message.includes('network timeout') ||
        message.includes('Could not connect')
      ) {
        throw new Error('Unable to connect to the server. Please check your connection and try again.');
      }
      
      console.error('Error in userExists:', error);
      console.debug('userExists error details:', {
        input,
        error: error,
        errorMessage: message,
        errorType: typeof error,
        errorName: (error as Error | undefined)?.name,
        errorCode: (error as { code?: string } | undefined)?.code,
        rawError: JSON.stringify(error, null, 2)
      });
      
      return {
        StatusCode: 500,
        Message: message || 'Unknown error occurred in user lookup',
        Data: []
      };
    }
  }

  /**
   * Check if email is already verified in Cognito
   * @param email Email to check
   * @returns Promise<boolean> indicating if email is verified in Cognito
   */
  public async checkCognitoEmailVerification(email: string): Promise<boolean> {
    try {
      const cognitoProfile = await this.cognitoService.getCognitoProfile();
      console.debug('[UserService][checkCognitoEmailVerification] Cognito profile:', cognitoProfile);
      
      // Check if the current user's email matches and is verified
      if (cognitoProfile?.['email'] === email && cognitoProfile?.['email_verified'] === 'true') {
        console.debug('[UserService][checkCognitoEmailVerification] Email is verified in Cognito');
        return true;
      }
      
      console.debug('[UserService][checkCognitoEmailVerification] Email not verified in Cognito or different email');
      return false;
    } catch (error) {
      console.error('[UserService][checkCognitoEmailVerification] Error checking Cognito verification:', error);
      return false;
    }
  }

  /**
   * Verify the email
   * @param code Verification code
   * @param email User's email address
   */
  public async emailVerify(code: string, email: string): Promise<AuthResponse> {
    console.debug('[UserService][emailVerify] called with', { code, email });
    try {
      // Call Cognito's confirmSignUp with email (the username used during signup)
      // No need to check DynamoDB first - user may not exist yet or we may not have auth
      const emailVerifyResponse = await this.cognitoService.emailVerify(email, code);
      console.debug('[UserService][emailVerify] cognitoService.emailVerify response:', emailVerifyResponse);

      return emailVerifyResponse;

    } catch (error) {
      console.error('[UserService][emailVerify] threw error', error);
      return {
        StatusCode: 500,
        Message: 'Error verifying email',
        Data: {} as Auth
      };

    }
  }

  /**
   * Query a user by ID
   * @param input UserQueryInput with backend-compatible fields
   * @param email Optional email to filter results client-side
   */
  public async userQueryByUserId(userId: string): Promise<UsersResponse> {
    console.debug('userQueryByUserId:', userId);
    try {
      // UsersQueryByUserId requires Cognito auth
      const response = await this.query(
        UsersQueryByUserId,
        {
          input: {
            userId: userId
          }
        }, 'userPool') as GraphQLResult<UsersResponse>;

      console.debug('userQueryByUserId Response: ', response);
     
      return {
        StatusCode: response.data?.StatusCode,
        Message: response.data?.Message,
        Data: response.data?.Data
      } as UsersResponse;

    } catch (error) {

      console.error('Error getting user:', error);
      return {
        StatusCode: 500,
        Message: 'Error getting user',
        Data: new Users()
      } as UsersResponse;

    }
  }

  public async userQueryByCognitoSub(cognitoSub: string): Promise<UsersListResponse> {
    console.debug('userQueryByCognitoSub: ', cognitoSub);
    try {
      // UsersQueryByCognitoSub requires Cognito auth
      const queryResult = await this.query(
        UsersQueryByCognitoSub,
        {
          input: {
            cognitoSub: cognitoSub
          }
        },
        'userPool') as GraphQLResult<{ UsersQueryByCognitoSub: UsersListResponse }>;

        const response = queryResult.data?.UsersQueryByCognitoSub;
        const users = response?.Data || [];

        if (users.length > 1) {
          return {
            StatusCode: 500,
            Message: 'Duplicate users found for this cognitoSub',
            Data: []
          };
        }
        if (users.length === 0) {
          return {
            StatusCode: 404,
            Message: 'User not found.',
            Data: []
          };
        }          
      
      return response || { StatusCode: 500, Message: 'No response', Data: [] };

    } catch (error) {

      console.error('Error getting user by cognitoSub:', error);
      return {
        StatusCode: 500,
        Message: 'Error getting user',
        Data: []
      }

    }
  }

  public async userQueryByEmail(email: string): Promise<UsersListResponse> {
    console.debug('userQueryByEmail: ', email);
    try {
      // UsersQueryByEmail requires Cognito auth (user must be signed in)
      const queryResult = await this.query(
        UsersQueryByEmail,
        {
          input: {
            email: email
          }
        },
        'userPool') as GraphQLResult<{ UsersQueryByEmail: UsersListResponse }>;

        const response = queryResult.data?.UsersQueryByEmail;
        const users = response?.Data || [];

        if (users.length > 1) {
          return {
            StatusCode: 500,
            Message: 'Duplicate users found for this email or userId',
            Data: []
          };
        }
        if (users.length === 0) {
          return {
            StatusCode: 404,
            Message: 'User not found.',
            Data: []
          };
        }          
      
      return response || { StatusCode: 500, Message: 'No response', Data: [] };

    } catch (error) {

      console.error('Error getting user:', error);
      return {
        StatusCode: 500,
        Message: 'Error getting user',
        Data: []
      }

    }
  }

  /**
   * Sign in a user
   * @param email
   * @param password
   */
  public async userSignIn(email: string, password: string): Promise<AuthResponse> {
    console.debug('userSignIn:', email);

    try {
      // Step 1: Sign in with Cognito first using email as username
      // (email is used as username during signup)
      const cognitoSignInResponse = await this.cognitoService.signIn(email, password, email);
      console.debug('cognitoSignInResponse:', cognitoSignInResponse);

      if (cognitoSignInResponse.StatusCode === 401 &&
        cognitoSignInResponse.Message?.toLowerCase().includes('already signed in')) {
        console.debug('User is already signed in, initiating cleanup and sign out process');
        
        // Show helpful message to user about cleaning up sessions
        this.store.dispatch(UserActions.signInFailure({ 
          error: 'Refreshing your session... Please wait while we sign you in.'
        }));
        
        try {
          // Sign out the existing user
          await this.cognitoService.signOut();
          console.debug('Successfully signed out existing user');
          
          // Small delay to let the user see the cleanup message
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Try signing in again
          const retrySignInResponse = await this.cognitoService.signIn(email, password, email);
          
          if (retrySignInResponse.StatusCode !== 200) {
            return retrySignInResponse;
          }
        } catch (signOutError) {
          console.error('Error during sign out and retry:', signOutError);
          return {
            StatusCode: 500,
            Message: 'Session refresh failed. Please refresh the page and try signing in again.',
            Data: new Auth({ isSignedIn: false, message: 'Session refresh failed. Please refresh the page and try signing in again.' })
          };
        }
      } else if (cognitoSignInResponse.StatusCode !== 200) {
        // Cognito sign-in failed
        return cognitoSignInResponse;
      }

      // Check if MFA is required
      if (cognitoSignInResponse.Data?.needsMFA || cognitoSignInResponse.Data?.needsMFASetup) {
        return cognitoSignInResponse;
      }

      // Step 2: Now that we're authenticated, lookup the user in DynamoDB
      const userResult = await this.userQueryByEmail(email);
      console.debug('userResult:', userResult);
      
      if (userResult.StatusCode !== 200 || userResult.Data == null || userResult.Data?.length == 0) {
        // User exists in Cognito but not in DynamoDB
        // Return success with isSignedIn but no user - the MFA flow will handle creating the record
        // via CreateUserFromCognito Lambda
        return {
          StatusCode: 200,
          Message: 'Signed in but user record not found',
          Data: new Auth({ isSignedIn: true, message: 'User record will be created' })
        };
      }

      const user = new Users(userResult.Data[0]);
      console.debug('User: ', user);

      // Dispatch success and update current user
      this.store.dispatch(UserActions.signInSuccess({ user: user, message: 'Welcome back!' }));
      this.currentUser.next(user);

      return {
        StatusCode: 200,
        Message: 'Welcome back! Successfully signed in.',
        Data: new Auth({ isSignedIn: true, message: 'Welcome back! Successfully signed in.', user: user })
      };

    } catch (error) {
      const error_message = error instanceof Error ? error.message : 'Error signing in';
      console.warn('Sign in error:', error_message);

      if (error_message.toLowerCase().includes('already signed in')) {
        console.debug('Caught already signed in error, initiating cleanup and sign out process');
        
        // Show helpful message to user about cleaning up sessions
        this.store.dispatch(UserActions.signInFailure({ 
          error: 'Cleaning up existing sessions and signing you out... Please wait.'
        }));
        
        try {
          // Sign out the existing user
          await this.cognitoService.signOut();
          console.debug('Successfully signed out existing user');
          
          // Small delay to let the user see the cleanup message
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Try signing in again (recursive call)
          return await this.userSignIn(email, password);
        } catch (signOutError) {
          console.error('Error during sign out and retry:', signOutError);
          return {
            StatusCode: 500,
            Message: 'Unable to clean up existing session. Please refresh the page and try again.',
            Data: new Auth({ isSignedIn: false, message: 'Unable to clean up existing session. Please refresh the page and try again.' })
          };
        }
      }

      return {
        StatusCode: 500,
        Message: 'Error signing in: ' + error_message,
        Data: new Auth({ isSignedIn: false, message: 'Error signing in: ' + error_message })
      };
    }
  }

  /**
   * Check if MFA is already enabled in Cognito
   * @returns Promise<{mfaEnabled: boolean, mfaSetupComplete: boolean}> MFA status from Cognito
   */
  public async checkCognitoMFAStatus(): Promise<{mfaEnabled: boolean, mfaSetupComplete: boolean}> {
    try {
      // TODO: Replace this with actual GraphQL query that uses adminGetUser on backend
      // The backend should implement a query like:
      // query CheckUserMFAStatus($email: String!) {
      //   CheckUserMFAStatus(email: $email) {
      //     mfaEnabled
      //     mfaSetupComplete
      //     mfaOptions
      //     mfaSettings
      //   }
      // }
      
      // For now, fall back to client-side detection
      const mfaStatus = await this.cognitoService.checkMFAPreferences();
      
      return mfaStatus;
    } catch (error) {
      console.error('[UserService][checkCognitoMFAStatus] Error checking Cognito MFA status:', error);
      return { mfaEnabled: false, mfaSetupComplete: false };
    }
  }

  /**
   * Setup MFA
   * @returns AuthResponse
   */
  public async mfaSetup(): Promise<AuthResponse> {
    try {
      console.debug('mfaSetup');
      return {
        StatusCode: 200,
        Message: 'MFA setup successful',
        Data: new Auth({ isSignedIn: true, message: 'MFA setup successful' })
      };
    } catch (error) {
      console.error('Error setting up MFA:', error);
      return {
        StatusCode: 500,
        Message: 'Error setting up MFA',
        Data: new Auth({ isSignedIn: true, message: 'Error setting up MFA' })
      };
    }
  }

  /**
   * Verify MFA
   * @param code
   * @param rememberDevice
   * @returns AuthResponse
   */
  public async mfaVerify(code: string, rememberDevice = false): Promise<AuthResponse> {
    console.debug('mfaVerify:', code, rememberDevice);
    try {
      const response = await this.cognitoService.mfaVerify(code, rememberDevice);
      console.debug('mfaVerify Response: ', response);
      return response;
    } catch (error) {
      console.error('Error verifying MFA:', error);
      return {
        StatusCode: 500,
        Message: 'Error verifying MFA',
        Data: new Auth({ isSignedIn: false, message: 'Error verifying MFA' })
      };
    }
  }

  /**
   * Get the current user as an observable
   */
  public getCurrentUser$(): Observable<IUsers | null> {
    return this.currentUser.asObservable();
  }

  /**
   * Check if the current user is a paying customer
   * @returns boolean indicating if user has CUSTOMER group
   */
  public isCustomer(): boolean {
    const currentUser = this.currentUser.value;
    const groups = currentUser?.groups || [];
    return groups.includes('CUSTOMER');
  }

  /**
   * Check if a specific user is a paying customer
   * @param user User object to check
   * @returns boolean indicating if user has CUSTOMER group
   */
  public isUserCustomer(user: IUsers | null): boolean {
    const groups = user?.groups || [];
    return groups.includes('CUSTOMER');
  }

  /**
   * Calculate the correct user status based on completion requirements
   * @param user The user to check
   * @returns The status the user should have ('PENDING' or 'ACTIVE')
   */
  public calculateUserStatus(user: IUsers | null): 'PENDING' | 'ACTIVE' {
    if (!user) return 'PENDING';

    // Check all required fields are present
    const hasRequiredFields = 
      !!user.email &&
      !!user.firstName &&
      !!user.lastName &&
      !!user.phoneNumber;

    // Check all verification requirements are met
    const hasRequiredVerifications = 
      !!user.emailVerified &&
      !!user.phoneVerified;

    // Check MFA requirements are met
    const hasMFARequirements = 
      !!user.mfaEnabled &&
      !!user.mfaSetupComplete;

    // User is ACTIVE only when ALL requirements are met
    const isComplete = hasRequiredFields && hasRequiredVerifications && hasMFARequirements;
    
    return isComplete ? 'ACTIVE' : 'PENDING';
  }

  /**
   * Check if a user has all required attributes and is ACTIVE
   * @param user The user to check
   * @returns True if the user is complete and active, false otherwise
   */
  public isUserValid(user: IUsers | null): boolean {
    if (!user) return false;

    // User is valid if they have all required attributes and are ACTIVE
    const requiredStatus = this.calculateUserStatus(user);
    return requiredStatus === 'ACTIVE' && user.status === 'ACTIVE';
  }

  /**
   * Check if a user is ready for dashboard access
   * Since MFA setup is done during signup, all requirements must be met
   * @param user The user to check
   * @returns True if user can access dashboard, false otherwise
   */
  public canAccessDashboard(user: IUsers | null): boolean {
    if (!user) return false;

    // All requirements must be met for dashboard access
    const hasRequiredFields = 
      !!user.email &&
      !!user.firstName &&
      !!user.lastName &&
      !!user.phoneNumber;

    const hasRequiredVerifications = 
      !!user.emailVerified &&
      !!user.phoneVerified;

    const hasMFARequirements = 
      !!user.mfaEnabled &&
      !!user.mfaSetupComplete;

    return hasRequiredFields && hasRequiredVerifications && hasMFARequirements;
  }

  /**
   * Update an existing user
   * @param input User data to update
   * @returns Promise with UserResponse
   */
  public async userUpdate(input: UsersUpdateInput): Promise<UsersResponse> {
    try {
      // Check Cognito auth status
      const cognitoProfile = await this.cognitoService.getCognitoProfile();
      const isAuthenticated = await this.cognitoService.checkIsAuthenticated();
      
      // Additional token validation - check if tokens are actually valid
      let hasValidTokens = false;
      if (isAuthenticated && cognitoProfile) {
        try {
          // Import fetchAuthSession to check token validity
          const { fetchAuthSession } = await import('@aws-amplify/auth');
          const session = await fetchAuthSession();
          const now = Math.floor(Date.now() / 1000);
          const accessTokenExp = session.tokens?.accessToken?.payload?.exp;
          const idTokenExp = session.tokens?.idToken?.payload?.exp;
          
          hasValidTokens = !!(accessTokenExp && idTokenExp && accessTokenExp > now && idTokenExp > now);
        } catch (tokenError) {
          console.warn('Error checking token validity:', tokenError);
          hasValidTokens = false;
        }
      }

      if (!input.userId) {
        console.error('Cannot update user: missing required userId');
        return {
          StatusCode: 400,
          Message: 'Missing required userId',
          Data: new Users()
        } as UsersResponse;
      }

      const updateInput: UsersUpdateInput = {
        userId: input.userId,
        cognitoId: input.cognitoId,
        cognitoSub: input.cognitoSub,
        email: input.email,
        emailVerified: input.emailVerified,
        phoneNumber: input.phoneNumber,
        phoneVerified: input.phoneVerified,
        firstName: input.firstName,
        lastName: input.lastName,
        groups: input.groups,
        status: input.status,
        createdAt: input.createdAt,
        updatedAt: new Date(),
        mfaEnabled: input.mfaEnabled,
        mfaSetupComplete: input.mfaSetupComplete
      };

      if (input.firstName) {
        updateInput.firstName = input.firstName;
      }

      if (input.lastName) {
        updateInput.lastName = input.lastName;
      }

      if (input.email) {
        updateInput.email = input.email;
      }

      if (input.phoneNumber) {
        updateInput.phoneNumber = input.phoneNumber;
      }

      // Use apiKey for user updates during registration flow (user not yet authenticated)
      // Use userPool for authenticated users
      const authMode = (cognitoProfile && isAuthenticated && hasValidTokens) ? 'userPool' : 'apiKey';
      
      const response = await this.mutate(
        UsersUpdate,
        { input: updateInput },
        authMode
      ) as GraphQLResult<UsersUpdateResponse>;

      if (!response.data) {
        return {
          StatusCode: 500,
          Message: 'No response from update operation',
          Data: new Users()
        } as UsersResponse;
      }

      const updatedUser = await this.userQueryByUserId(input.userId);

      return updatedUser;

    } catch (error) {
      console.error('Error updating user:', error);

      let errorMessage = 'Error updating user';
      if (error && typeof error === 'object' && 'errors' in error) {
        const gqlError = error as { errors?: { message?: string }[] };
        if (gqlError.errors?.[0]?.message) {
          errorMessage = gqlError.errors[0].message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        StatusCode: 500,
        Message: errorMessage,
        Data: new Users()
      } as UsersResponse;
    }
  }

  /**
   * Send SMS verification code to a phone number
   * @param phoneNumber
   * @returns Promise with statusCode and optional message
   */
  public async sendSMSVerificationCode(phoneNumber: string): Promise<{ statusCode: number, message?: string }> {
    try {
      // Check if user is authenticated - only authenticated users can verify phone
      const isAuthenticated = await this.cognitoService.checkIsAuthenticated();
      
      if (!isAuthenticated) {
        return { 
          statusCode: 401, 
          message: 'User must be authenticated to verify phone number' 
        };
      }
      
      // Validate user has required Cognito groups for SMS verification
      const hasAccess = await this.cognitoService.validateGraphQLAccess(['USER', 'OWNER']);
      
      if (!hasAccess) {
        const userGroups = await this.cognitoService.getCurrentUserGroups();
        console.error('User does not have required Cognito groups for SMS verification');
        return { 
          statusCode: 403, 
          message: `User does not have required permissions for SMS verification. User groups: [${userGroups.join(', ')}], Required: [USER, OWNER]` 
        };
      }
      
      // Use userPool authentication for authenticated users
      const response = await this.mutate(
        SmsVerification,
        {
          input: {
            phoneNumber: phoneNumber
          }
        },
        "userPool"
      ) as GraphQLResult<{ SmsVerification?: { StatusCode?: number; Message?: string } }>;

      if (response.data?.SmsVerification?.StatusCode === 200) {
        return { 
          statusCode: 200, 
          message: response.data.SmsVerification.Message || 'Verification code sent' 
        };
      } else {
        return { 
          statusCode: response.data?.SmsVerification?.StatusCode || 500,
          message: response.data?.SmsVerification?.Message || 'Failed to send verification code'
        };
      }

    } catch (error) {
      console.error('Error sending SMS verification code:', error);
      return { 
        statusCode: 500, 
        message: 'Error sending verification code' 
      };
    }
  }

  /**
   * Update user record timestamp to trigger Lambda stream processing
   * @param user User object with all required fields
   * @returns Observable with update result
   */
  public updateUserTimestamp(user: IUsers): Observable<UsersResponse> {
    // Create minimal update input - backend will automatically set updatedAt to current timestamp
    const updateInput: UsersUpdateInput = {
      userId: user.userId,
      cognitoId: user.cognitoId,
      cognitoSub: user.cognitoSub,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt, // This will be ignored and set to current timestamp by backend
      phoneNumber: user.phoneNumber,
      groups: user.groups,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      mfaEnabled: user.mfaEnabled,
      mfaSetupComplete: user.mfaSetupComplete
    };

    return new Observable(observer => {
      this.userUpdate(updateInput)
        .then(response => {
          observer.next(response);
          observer.complete();
        })
        .catch(error => {
          console.error('[UserService][updateUserTimestamp] Update error:', error);
          observer.error(error);
        });
    });
  }

  /**
   * Verify SMS code for a phone number
   * @param phoneNumber
   * @param code
   * @returns Promise<boolean> indicating if the code is valid
   */
  public async verifySMSCode(phoneNumber: string, code: string): Promise<boolean> {
    try {
      // Check if user is authenticated - only authenticated users can verify phone
      const isAuthenticated = await this.cognitoService.checkIsAuthenticated();
      
      if (!isAuthenticated) {
        console.error('User must be authenticated to verify SMS code');
        return false;
      }
      
      // Validate user has required Cognito groups for SMS verification
      const hasAccess = await this.cognitoService.validateGraphQLAccess(['USER', 'OWNER']);
      
      if (!hasAccess) {
        console.error('User does not have required Cognito groups for SMS verification');
        return false;
      }
      
      // Use userPool authentication for authenticated users
      const response = await this.mutate(
        SmsVerification,
        {
          input: {
            phoneNumber: phoneNumber,
            code: parseInt(code)
          }
        },
        "userPool"
      ) as GraphQLResult<{ SmsVerification?: { StatusCode?: number; Data?: { valid?: boolean } } }>;

      try {
        // Check if the lambda verified the code successfully
        if (response.data?.SmsVerification?.StatusCode === 200) {
          const verificationData = response.data.SmsVerification.Data;
          const result = verificationData?.valid === true;
          return result;
        }

        return false;
      } catch (parseError) {
        console.error('Error parsing SMS verification response:', parseError);
        return false;
      }

    } catch (error) {
      console.error('Error verifying SMS code:', error);
      return false;
    }
  }

  /**
   * Check if an email exists in the system using the public CheckEmailExists query.
   * This uses API key authentication and doesn't require user authentication.
   * Returns Cognito user status for smart recovery flow.
   * 
   * @param email Email address to check
   * @returns Promise with exists boolean, cognitoStatus, and cognitoSub
   */
  public async checkEmailExists(email: string): Promise<{ 
    exists: boolean; 
    cognitoStatus?: string | null;
    cognitoSub?: string | null;
  }> {
    try {
      const response = await this.query(
        CheckEmailExists,
        { input: { email } },
        'apiKey'
      ) as GraphQLResult<{ CheckEmailExists?: { 
        email: string; 
        exists: boolean;
        cognitoStatus?: string | null;
        cognitoSub?: string | null;
      } }>;

      return {
        exists: response.data?.CheckEmailExists?.exists ?? false,
        cognitoStatus: response.data?.CheckEmailExists?.cognitoStatus ?? null,
        cognitoSub: response.data?.CheckEmailExists?.cognitoSub ?? null
      };
    } catch (error) {
      console.error('[UserService][checkEmailExists] Error checking email:', error);
      throw new Error('Failed to check email existence');
    }
  }

  /**
   * Create a user record in DynamoDB from Cognito data.
   * This is a secure, purpose-built operation for self-registration that validates
   * against Cognito before creating records. Only accepts cognitoSub as input and
   * extracts all user data from Cognito to prevent client-side data injection.
   * 
   * Uses API key authentication (no Cognito auth required).
   * 
   * @param cognitoSub The Cognito user sub (UUID)
   * @returns Promise with created/existing user data
   */
  public async createUserFromCognito(cognitoSub: string): Promise<{
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    status: string;
    emailVerified: boolean;
    phoneVerified: boolean;
    mfaEnabled: boolean;
    mfaSetupComplete: boolean;
    groups: string[];
    createdAt: number;
    updatedAt: number;
  }> {
    console.debug('[UserService][createUserFromCognito] Creating user from Cognito:', cognitoSub);
    this.userDebugLog.logApi('createUserFromCognito', 'pending', { cognitoSub });

    try {
      const response = await this.mutate(
        CreateUserFromCognito,
        { input: { cognitoSub } },
        'apiKey'
      ) as GraphQLResult<{ CreateUserFromCognito?: {
        userId: string;
        email: string;
        firstName: string;
        lastName: string;
        status: string;
        emailVerified: boolean;
        phoneVerified: boolean;
        mfaEnabled: boolean;
        mfaSetupComplete: boolean;
        groups: string[];
        createdAt: number;
        updatedAt: number;
      } }>;

      const data = response.data?.CreateUserFromCognito;
      if (!data) {
        this.userDebugLog.logError('createUserFromCognito', 'No data returned', { cognitoSub });
        throw new Error('Failed to create user record');
      }

      this.userDebugLog.logApi('createUserFromCognito', 'success', { userId: data.userId });

      return {
        userId: data.userId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        status: data.status,
        emailVerified: data.emailVerified,
        phoneVerified: data.phoneVerified,
        mfaEnabled: data.mfaEnabled,
        mfaSetupComplete: data.mfaSetupComplete,
        groups: data.groups || [],
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };
    } catch (error) {
      console.error('[UserService][createUserFromCognito] Error:', error);
      const errorObj = error as { message?: string };
      const message = errorObj?.message || String(error) || '';
      this.userDebugLog.logError('createUserFromCognito', message, { error: String(error) });
      throw new Error(message || 'Failed to create user from Cognito');
    }
  }
}
