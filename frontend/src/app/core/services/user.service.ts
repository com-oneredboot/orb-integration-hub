// file: frontend/src/app/services/user.service.ts
// author: Corey Dale Peters
// date: 2024-12-06
// description: The API service provides a core interface for making GraphQL queries and mutations

// 3rd Party Imports
import { GraphQLResult} from "@aws-amplify/api-graphql";
import { Injectable } from "@angular/core";
import { v4 as uuidv4 } from "uuid";
import { Store } from '@ngrx/store';
import { BehaviorSubject, Observable } from 'rxjs';

// Application Imports
import {ApiService} from "./api.service";
import {
  UsersCreateMutation, UsersUpdateMutation, UsersDeleteMutation, UsersQueryByUserId, UsersQueryByEmail, UsersQueryByCognitoSub
} from "../graphql/Users.graphql";
import { SmsVerificationMutation } from "../graphql/SmsVerification.graphql";
import {
  UsersCreateInput, UsersUpdateInput, UsersQueryByUserIdInput, UsersQueryByCognitoSubInput,
  UsersCreateResponse, UsersUpdateResponse, IUsers,
  UsersListResponse, UsersResponse, Users
} from "../models/UsersModel";
import { UserGroup } from "../models/UserGroupEnum";
import { UserStatus } from "../models/UserStatusEnum";
import { CognitoService } from "./cognito.service";
import { Auth, AuthResponse } from "../models/AuthModel";
import { SmsVerificationResponse } from "../models/SmsVerificationModel";
import { AuthActions } from '../../features/user/components/auth-flow/store/auth.actions';

@Injectable({
  providedIn: 'root'
})
export class UserService extends ApiService {

  // Private Attributes
  private currentUser = new BehaviorSubject<any>(null);

  /**
   * Constructor
   * @param cognitoService
   * @param store
   */
  constructor(
    private cognitoService: CognitoService,
    private store: Store,
  ) {
    super();

    // Sync with Cognito's auth state
    this.cognitoService.currentUser.subscribe(user => {
      if (user) {
        this.currentUser.next(user);
        this.store.dispatch(AuthActions.signInSuccess({ user, message: 'User found' }));
      }
    });
  }

  /**
   * Create a new user
   * @param input
   * @param password
   */
  public async userCreate(input: UsersCreateInput, password: string): Promise<UsersResponse> {
    console.debug('createUser input:', input);

    try {
      // create the Cognito User
      const cognitoResponse = await this.cognitoService.createCognitoUser(input, password);
      console.debug('createCognitoUser Response: ', cognitoResponse);

      const timestamp = new Date().toISOString();
      const userCreateInput: UsersCreateInput = {
        userId: uuidv4(),
        cognitoId: input.cognitoId, // Store random UUID as cognitoId for authentication
        cognitoSub: cognitoResponse.userId || '', // Store actual Cognito sub from signup response
        email: input.email,
        firstName: '',
        lastName: '',
        phoneNumber: '',
        groups: [UserGroup.USER] as string[],
        status: UserStatus.PENDING,
        createdAt: timestamp,
        phoneVerified: false,
        emailVerified: false,
        updatedAt: timestamp
      };

      const response = await this.mutate(UsersCreateMutation, {"input": userCreateInput}, "apiKey") as GraphQLResult<UsersCreateResponse>;
      console.debug('createUser Response: ', response);

      return {
        StatusCode: response.data?.StatusCode ?? 200,
        Message: response.data?.Message ?? '',
        Data: response.data?.Data ?? null
      } as UsersResponse;

    } catch (error: any) {
      console.error('Error creating User:', error);
      const message = error?.message || error?.toString() || '';
      if (message.includes('Not Authorized') || message.includes('Unauthorized')) {
        return {
          StatusCode: 401,
          Message: 'Not Authorized to access UsersCreate on type Mutation',
          Data: new Users()
        } as UsersResponse;
      }

      return {
        StatusCode: 500,
        Message: 'Error creating user',
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
      // Try userPool auth first (user might have access), fallback to apiKey
      let response;
      try {
        // First try with userPool authentication (for authenticated users)
        response = await this.query(
          query,
          { input: queryInput },
          'userPool'
        ) as any;
      } catch (userPoolError) {
        console.debug('userExists: userPool auth failed, trying apiKey', userPoolError);
        // Fallback to apiKey authentication
        response = await this.query(
          query,
          { input: queryInput },
          'apiKey'
        ) as any;
      }

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

    } catch (error: any) {
      // Better error message handling
      let message = '';
      
      if (error?.message && typeof error.message === 'string') {
        message = error.message;
      } else if (error?.toString && typeof error.toString === 'function') {
        message = error.toString();
      } else if (typeof error === 'string') {
        message = error;
      } else {
        // Handle complex error objects by extracting useful information
        if (error?.errors && Array.isArray(error.errors)) {
          const errorMessages = error.errors.map((e: any) => e.message || e.toString()).join(', ');
          message = `GraphQL Error: ${errorMessages}`;
          
          // Add recovery suggestions if available
          const suggestions = error.errors
            .filter((e: any) => e.recoverySuggestion)
            .map((e: any) => e.recoverySuggestion)
            .join(', ');
          if (suggestions) {
            message += ` | Suggestions: ${suggestions}`;
          }
        } else {
          message = `GraphQL Error: ${error?.name || 'Unknown'} - ${error?.code || 'No code'}`;
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
        errorName: error?.name,
        errorCode: error?.code,
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
   * Verify the email
   * @param input UserQueryInput with backend-compatible fields
   * @param code Verification code
   * @param email Optional email to filter results client-side
   */
  public async emailVerify(code: string, email: string): Promise<AuthResponse> {
    console.debug('[UserService][emailVerify] called with', { code, email });
    try {
      // get the user
      const userResponse = await this.userQueryByEmail(email);
      console.debug('[UserService][emailVerify] userQueryByEmail response:', userResponse);

      if (userResponse.StatusCode !== 200 || userResponse.Data == null || userResponse.Data?.length == 0) {
        console.error('[UserService][emailVerify] user not found or error', userResponse);

        return {
          StatusCode: userResponse.StatusCode,
          Message: 'Error getting user',
          Data: new Auth( { isSignedIn: false})
        };

      }

      // QueryByEmail ensures we have either 1
      const user = userResponse.Data[0];
      const emailVerifyResponse = await this.cognitoService.emailVerify(user.cognitoId, code);
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
      const response = await this.query(
        UsersQueryByUserId,
        {
          input: {
            userId: userId
          }
        },'apiKey') as GraphQLResult<UsersResponse>;

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
      const query = await this.query(
        UsersQueryByCognitoSub,
        {
          input: {
            cognitoSub: cognitoSub
          }
        },
        'apiKey') as any;

        const response = query.data?.UsersQueryByCognitoSub;
        const users = response.Data;

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
      
      return response;

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
      const query = await this.query(
        UsersQueryByEmail,
        {
          input: {
            email: email
          }
        },
        'apiKey') as any;

        const response = query.data?.UsersQueryByEmail;
        const users = response.Data;

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
      
      return response;

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

      // Lookup the User
      const userResult = await this.userQueryByEmail(email);
      console.debug('userResult:', userResult);
      if (userResult.StatusCode !== 200 || userResult.Data == null || userResult.Data?.length == 0) {
        return {
          StatusCode: userResult?.StatusCode,
          Message: userResult.Message,
          Data: new Auth({ isSignedIn: false, message: 'User Does Not Exist' })
        };
      }

      // SIgn in
      const user = new Users(userResult.Data[0]);
      console.debug('User: ', user)
      const userSignInResponse = await this.cognitoService.signIn(user.cognitoId, password, user.email);

      if (userSignInResponse.StatusCode === 401 &&
        userSignInResponse.Message?.toLowerCase().includes('already signed in')) {
        console.debug('User is already signed in, checking authentication status');
        const isAuth = await this.cognitoService.checkIsAuthenticated();
        
        if (isAuth) {
          // User is authenticated, dispatch success and redirect will be handled by auth component
          this.store.dispatch(AuthActions.signInSuccess({ user: user, message: 'User already signed in' }));
          this.currentUser.next(user);
          return {
            StatusCode: 200,
            Message: 'User already signed in',
            Data: new Auth({ isSignedIn: true, message: 'User already signed in', user: user })
          };
        }
        
        return {
          StatusCode: 500,
          Message: 'Error signing in: There is already a signed in user.',
          Data: new Auth({ isSignedIn: false, message: 'Error signing in: There is already a signed in user.' })
        };
      }

      // Only dispatch signInSuccess if authentication is successful
      if (userSignInResponse.StatusCode === 200) {
        this.store.dispatch(AuthActions.signInSuccess({ user: user, message: 'User found' }));
        this.currentUser.next(user);
      }

      return userSignInResponse;

    } catch (error) {
      const error_message = error instanceof Error ? error.message : 'Error signing in';
      console.warn('Sign in error:', error_message);

      if (error_message.toLowerCase().includes('already signed in')) {
        console.debug('Caught already signed in error, checking authentication status');
        const isAuth = await this.cognitoService.checkIsAuthenticated();
        
        if (isAuth) {
          // Try to get user profile and dispatch success
          const profile = await this.cognitoService.getCognitoProfile();
          if (profile) {
            // Create a user object from the profile for consistency
            const userFromProfile = new Users({
              userId: profile.sub,
              cognitoId: profile.username,
              email: profile.email || '',
              firstName: profile.given_name || '',
              lastName: profile.family_name || '',
              phoneNumber: profile.phone_number || '',
              groups: profile.groups || [],
              status: UserStatus.PENDING,
              phoneVerified: profile.phone_number_verified === 'true',
              emailVerified: profile.email_verified === 'true',
              createdAt: '',
              updatedAt: ''
            });
            
            this.store.dispatch(AuthActions.signInSuccess({ user: userFromProfile, message: 'User already signed in' }));
            this.currentUser.next(userFromProfile);
            return {
              StatusCode: 200,
              Message: 'User already signed in',
              Data: new Auth({ isSignedIn: true, message: 'User already signed in', user: userFromProfile })
            };
          }
        }
        
        return {
          StatusCode: 500,
          Message: 'Error signing in: There is already a signed in user.',
          Data: new Auth({ isSignedIn: false, message: 'Error signing in: There is already a signed in user.' })
        };
      }

      return {
        StatusCode: 500,
        Message: 'Error signing in: ' + error_message,
        Data: new Auth({ isSignedIn: false, message: 'Error signing in: ' + error_message })
      };
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
  public async mfaVerify(code: string, rememberDevice: boolean = false): Promise<AuthResponse> {
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
  public getCurrentUser$(): Observable<any> {
    return this.currentUser.asObservable();
  }

  /**
   * Check if a user has all required attributes
   * @param user The user to check
   * @returns True if the user has all required attributes, false otherwise
   */
  public isUserValid(user: any): boolean {
    if (!user) return false;

    // Check for required attributes
    const hasRequiredAttributes =
      !!user.email &&
      !!user.firstName &&
      !!user.lastName &&
      !!user.phoneNumber;

    // Check user status is ACTIVE
    const isActive = user.status === 'ACTIVE';

    return hasRequiredAttributes && isActive;
  }

  /**
   * Update an existing user
   * @param input User data to update
   * @returns Promise with UserResponse
   */
  public async userUpdate(input: UsersUpdateInput): Promise<UsersResponse> {
    console.debug('userUpdate input:', input);
    console.debug('🔍 DEBUG: Enhanced userUpdate method with token validation is running');

    try {
      // Check Cognito auth status
      const cognitoProfile = await this.cognitoService.getCognitoProfile();
      console.debug('Cognito profile for update:', cognitoProfile);
      
      const isAuthenticated = await this.cognitoService.checkIsAuthenticated();
      console.debug('Is authenticated:', isAuthenticated);
      
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
          console.debug('Token expiration check:', { 
            now, 
            accessTokenExp, 
            idTokenExp, 
            hasValidTokens,
            accessExpired: accessTokenExp ? accessTokenExp <= now : 'no-token',
            idExpired: idTokenExp ? idTokenExp <= now : 'no-token'
          });
          
          // Debug token claims for userPool authentication
          console.debug('Token claims for debugging:', {
            accessTokenClaims: session.tokens?.accessToken?.payload,
            idTokenClaims: session.tokens?.idToken?.payload,
            userSub: session.tokens?.idToken?.payload?.sub,
            userGroups: session.tokens?.idToken?.payload['cognito:groups'],
            tokenUse: session.tokens?.accessToken?.payload?.['token_use']
          });
        } catch (tokenError) {
          console.warn('Error checking token validity:', tokenError);
          hasValidTokens = false;
        }
      }
      
      if (!cognitoProfile || !isAuthenticated || !hasValidTokens) {
        console.warn('User not properly authenticated or tokens expired - skipping userPool auth and using apiKey directly');
      }

      if (!input.userId) {
        console.error('Cannot update user: missing required userId');
        return {
          StatusCode: 400,
          Message: 'Missing required userId',
          Data: new Users()
        } as UsersResponse;
      }

      let hasUpdates = false;
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
        updatedAt: new Date().toISOString()
      };
      hasUpdates = true;

      if (input.firstName) {
        updateInput.firstName = input.firstName;
        hasUpdates = true;
      }

      if (input.lastName) {
        updateInput.lastName = input.lastName;
        hasUpdates = true;
      }

      if (input.email) {
        updateInput.email = input.email;
        hasUpdates = true;
      }

      if (input.phoneNumber) {
        updateInput.phoneNumber = input.phoneNumber;
        hasUpdates = true;
      }

      if (Object.keys(updateInput).length <= 2) {
        console.debug('Only updating timestamp, no other field changes');
      }

      console.debug('Update input:', updateInput);

      let response: GraphQLResult<UsersUpdateResponse>;
      
      // Skip userPool auth if user is not properly authenticated or tokens are expired
      if (!cognitoProfile || !isAuthenticated || !hasValidTokens) {
        console.debug('Skipping userPool auth - using apiKey directly');
        response = await this.mutate(
          UsersUpdateMutation,
          { input: updateInput },
          "apiKey"
        ) as GraphQLResult<UsersUpdateResponse>;
      } else {
        try {
          // Try userPool authentication first
          response = await this.mutate(
            UsersUpdateMutation,
            { input: updateInput },
            "userPool"
          ) as GraphQLResult<UsersUpdateResponse>;
        } catch (authError) {
          console.warn('userPool authentication failed, trying API key:', authError);
          
          // Log detailed error information for debugging
          if (authError && typeof authError === 'object') {
            console.debug('userPool error details:', {
              errorType: (authError as any)?.errors?.[0]?.errorType,
              errorMessage: (authError as any)?.errors?.[0]?.message,
              data: (authError as any)?.data,
              fullError: authError
            });
          }
          
          // Fallback to API key authentication
          response = await this.mutate(
            UsersUpdateMutation,
            { input: updateInput },
            "apiKey"
          ) as GraphQLResult<UsersUpdateResponse>;
        }
      }

      console.debug('userUpdate Response:', response);

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
        const gqlError = error as any;
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
    console.debug('sendSMSVerificationCode:', phoneNumber);
    
    try {
      // Check if user is authenticated - only authenticated users can verify phone
      const isAuthenticated = await this.cognitoService.checkIsAuthenticated();
      console.debug('sendSMSVerificationCode - authenticated:', isAuthenticated);
      
      if (!isAuthenticated) {
        return { 
          statusCode: 401, 
          message: 'User must be authenticated to verify phone number' 
        };
      }
      
      // Debug: Check what groups the user currently has
      const userGroups = await this.cognitoService.getCurrentUserGroups();
      console.debug('🔍 Current user Cognito groups:', userGroups);
      
      // Validate user has required Cognito groups for SMS verification
      const hasAccess = await this.cognitoService.validateGraphQLAccess(['USER', 'OWNER']);
      console.debug('🔍 User has SMS verification access:', hasAccess);
      
      if (!hasAccess) {
        console.error('❌ User does not have required Cognito groups for SMS verification');
        console.error('❌ Required groups: [USER, OWNER], User groups:', userGroups);
        return { 
          statusCode: 403, 
          message: `User does not have required permissions for SMS verification. User groups: [${userGroups.join(', ')}], Required: [USER, OWNER]` 
        };
      }
      
      // Use userPool authentication for authenticated users
      const response = await this.mutate(
        SmsVerificationMutation,
        {
          input: {
            phoneNumber: phoneNumber
          }
        },
        "userPool"
      ) as any;

      console.debug('SMS verification response:', response);

      if (response.data?.SmsVerification?.StatusCode === 200) {
        // Log the generated code for testing purposes (remove in production)
        const generatedCode = response.data.SmsVerification.Data?.code;
        if (generatedCode) {
          console.debug('🔐 Generated verification code for testing:', generatedCode);
        }
        
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
   * Verify SMS code for a phone number
   * @param phoneNumber
   * @param code
   * @returns Promise<boolean> indicating if the code is valid
   */
  public async verifySMSCode(phoneNumber: string, code: string): Promise<boolean> {
    console.debug('verifySMSCode:', phoneNumber, code);
    
    try {
      // Check if user is authenticated - only authenticated users can verify phone
      const isAuthenticated = await this.cognitoService.checkIsAuthenticated();
      console.debug('verifySMSCode - authenticated:', isAuthenticated);
      
      if (!isAuthenticated) {
        console.error('User must be authenticated to verify SMS code');
        return false;
      }
      
      // Debug: Check what groups the user currently has
      const userGroups = await this.cognitoService.getCurrentUserGroups();
      console.debug('🔍 Current user Cognito groups (verify):', userGroups);
      
      // Validate user has required Cognito groups for SMS verification
      const hasAccess = await this.cognitoService.validateGraphQLAccess(['USER', 'OWNER']);
      console.debug('🔍 User has SMS verification access (verify):', hasAccess);
      
      if (!hasAccess) {
        console.error('❌ User does not have required Cognito groups for SMS verification (verify)');
        console.error('❌ Required groups: [USER, OWNER], User groups:', userGroups);
        return false;
      }
      
      // Use userPool authentication for authenticated users
      const response = await this.mutate(
        SmsVerificationMutation,
        {
          input: {
            phoneNumber: phoneNumber,
            code: parseInt(code)
          }
        },
        "userPool"
      ) as any;

      console.debug('SMS verification check response:', response);

      // Check if the lambda verified the code successfully
      if (response.data?.SmsVerification?.StatusCode === 200) {
        const verificationData = response.data.SmsVerification.Data;
        return verificationData?.valid === true;
      }

      return false;

    } catch (error) {
      console.error('Error verifying SMS code:', error);
      return false;
    }
  }
}
