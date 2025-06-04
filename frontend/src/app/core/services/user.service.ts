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
  UsersCreateMutation, UsersUpdateMutation, UsersDeleteMutation, UsersQueryByUserId, UsersQueryByEmail
} from "../graphql/Users.graphql";
import {
  UsersCreateInput, UsersUpdateInput, UsersQueryByUserIdInput,
  UsersCreateResponse, UsersUpdateResponse, IUsers,
  UsersListResponse, UsersResponse, Users
} from "../models/Users.model";
import { UserGroup } from "../models/UserGroup.enum";
import { UserStatus } from "../models/UserStatus.enum";
import { CognitoService } from "./cognito.service";
import { Auth, AuthResponse } from "../models/Auth.model";
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
        cognitoId: input.cognitoId,
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
      const response = await this.query(
        query,
        { input: queryInput },
        'apiKey'
      ) as any; // Use 'any' to access raw keys

      const result = response.data?.UsersQueryByEmail;
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
      // Detect network/DNS errors and throw a user-friendly error
      const message = error?.message || error?.toString() || '';
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
      return {
        StatusCode: 500,
        Message: message || 'Unknown error',
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

      if (userResponse.StatusCode !== 200 || !userResponse.Data) {
        console.error('[UserService][emailVerify] user not found or error', userResponse);

        return {
          StatusCode: userResponse.StatusCode,
          Message: 'Error getting user',
          Data: new Auth( { isSignedIn: false})
        };

      }

      const emailVerifyResponse = await this.cognitoService.emailVerify(userResponse.Data.cognitoId, code);
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
      const response = await this.query(UsersQueryByUserId, {input: {userId: userId}},'apiKey') as GraphQLResult<UsersResponse>;

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

  public async userQueryByEmail(email: string): Promise<UsersResponse> {
    console.debug('userQueryByEmail: ', email);
    try {
      const response = await this.query(UsersQueryByUserId, {input: {email: email}},'apiKey') as GraphQLResult<UsersResponse>;

      console.debug('userQueryByEmail Response: ', response);
      
      if (email && response.data?.Data && 
          response.data.Data.email !== email) {
        
        console.debug('userQueryByEmail: Email mismatch, returning 404');
        
        return {
          StatusCode: 404,
          Message: 'User not found',
          Data: new Users()
        } as UsersResponse;
      }
      
      return {
        StatusCode: response.data?.StatusCode ?? 200,
        Message: response.data?.Message ?? '',
        Data: response.data?.Data ?? null
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


  /**
   * Sign in a user
   * @param email
   * @param password
   */
  public async userSignIn(email: string, password: string): Promise<AuthResponse> {
    console.debug('userSignIn:', email);
    let user;

    try {
      // Use UsersQueryByEmailInput for email lookups
      const userResponse = await this.query(
        UsersQueryByEmail,
        { input: { email } },
        'apiKey'
      ) as GraphQLResult<UsersResponse>;

      user = userResponse.data?.Data;
      if (userResponse.data?.StatusCode !== 200 || !user) {
        return {
          StatusCode: userResponse.data?.StatusCode ?? 404,
          Message: 'User Does Not Exist',
          Data: new Auth({ isSignedIn: false, message: 'User Does Not Exist' })
        };
      }

      // Update store with user data before auth attempt
      this.store.dispatch(AuthActions.signInSuccess({ user: user.toDto(), message: 'User found' }));
      this.currentUser.next(user);

    } catch (error) {
      
      console.error('Error getting user:', error);

      return {
        StatusCode: 500,
        Message: 'Error getting user',
        Data: new Auth({ isSignedIn: false, message: 'Error getting user' })
      };
    }

    try {
      // Pass the user's email as the third parameter for MFA setup
      const userSignInResponse = await this.cognitoService.signIn(user.cognitoId, password, user.email);

      // Handle already signed in case
      if (userSignInResponse.StatusCode === 401 &&
        userSignInResponse.Message?.toLowerCase().includes('already signed in')) {
        console.warn('User already signed in');
        await this.cognitoService.checkIsAuthenticated();
        return {
          StatusCode: 200,
          Message: 'User already signed in',
          Data: new Auth({ isSignedIn: false, message: 'User already signed in' })
        };
      }

      return userSignInResponse;

    } catch (error) {
      const error_message = error instanceof Error ? error.message : 'Error signing in';
      console.warn('Sign in error:', error_message);

      if (error_message.toLowerCase().includes('already signed in')) {
        await this.cognitoService.checkIsAuthenticated();
        return {
          StatusCode: 200,
          Message: 'User already signed in',
          Data: new Auth({ isSignedIn: false, message: 'User already signed in' })
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

    try {
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

      const response = await this.mutate(
        UsersUpdateMutation,
        { input: updateInput },
        "userPool"
      ) as GraphQLResult<UsersUpdateResponse>;

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
    // TODO: Implement actual SMS sending logic
    return { statusCode: 200, message: 'Verification code sent' };
  }

  /**
   * Verify SMS code for a phone number
   * @param phoneNumber
   * @param code
   * @returns Promise<boolean> indicating if the code is valid
   */
  public async verifySMSCode(phoneNumber: string, code: string): Promise<boolean> {
    // TODO: Implement actual verification logic
    return true;
  }
}
