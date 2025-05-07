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
  UsersCreateResponse, UsersResponse, UsersUpdateResponse, IUsers
} from "../models/Users.model";
import { UserGroup } from "../models/UserGroup.enum";
import { UserStatus } from "../models/UserStatus.enum";
import { CognitoService } from "./cognito.service";
import { AuthResponse } from "../models/Auth.model";
import { AuthActions } from '../../features/user/components/auth-flow/store/auth.actions';
import { toSnakeCase, toCamelCase } from '../caseConverter';


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

      const timestamp = Date.now();
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
        updatedAt: timestamp
      };

      const response = await this.mutate(
        UsersCreateMutation, {"input": toSnakeCase(userCreateInput)}, "apiKey") as GraphQLResult<UsersCreateResponse>;
      console.debug('createUser Response: ', response);

      return {
        UsersQueryByUserId: {
          statusCode: response.data?.statusCode ?? 200,
          message: response.data?.message ?? '',
          data: response.data?.data ?? null
        }
      } as UsersResponse;

    } catch (error) {
      console.error('Error creating User:', error);
      
      return {
        UsersQueryByUserId: {
          statusCode: 500,
          message: 'Error creating user',
          data: null
        }
      } as UsersResponse;
    }
  }

  /**
   * Check if a user exists
   * @param input UserQueryInput with backend-compatible fields
   * @param email Optional email to filter results client-side
   */
  public async userExists(input: { userId?: string; email?: string }): Promise<IUsers | false> {
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
        { input: toSnakeCase(queryInput) },
        'apiKey'
      ) as GraphQLResult<UsersResponse>;
      const user = response.data?.UsersQueryByUserId?.data;
      return user ? user : false;
    } catch (error) {
      console.error('Error in userExists:', error);
      return false;
    }
  }

  /**
   * Verify the email
   * @param input UserQueryInput with backend-compatible fields
   * @param code Verification code
   * @param email Optional email to filter results client-side
   */
  public async emailVerify(input: UsersQueryByUserIdInput, code: string, email?: string): Promise<AuthResponse> {
    console.debug('verifyEmail:', input, email ? { email } : '');
    try {

      // get the user
      const userResponse = await this.userQueryByUserId(input, email);
      console.debug('User Response:', userResponse);
      if (userResponse.UsersQueryByUserId?.statusCode !== 200 || !userResponse.UsersQueryByUserId?.data) {
        return {
          statusCode: userResponse.UsersQueryByUserId?.statusCode,
          message: 'Error getting user',
          data: null
        };
      }

      const emailVerifyResponse = await this.cognitoService.emailVerify(userResponse.UsersQueryByUserId.data.cognitoId, code);
      console.debug('verifyEmail Response: ', emailVerifyResponse);

      return emailVerifyResponse;

    } catch (error) {
      console.error('Error verifying email:', error);
      return {
        statusCode: 500,
        message: 'Error verifying email',
        data: null
      };
    }
  }

  /**
   * Query a user by ID
   * @param input UserQueryInput with backend-compatible fields
   * @param email Optional email to filter results client-side
   */
  public async userQueryByUserId(input: UsersQueryByUserIdInput, email?: string): Promise<UsersResponse> {
    console.debug('userQueryByUserId:', input, email ? { email } : '');
    try {
      const response = await this.query(
        UsersQueryByUserId,
        {input: toSnakeCase(input)},
        'apiKey') as GraphQLResult<UsersResponse>;

      console.debug('userQueryByUserId Response: ', response);
      
      if (email && response.data?.UsersQueryByUserId?.data && 
          response.data.UsersQueryByUserId.data.email !== email) {
        
        console.debug('userQueryByUserId: Email mismatch, returning 404');
        
        return {
          UsersQueryByUserId: {
            statusCode: 404,
            message: 'User not found',
            data: null
          }
        } as UsersResponse;
      }
      
      const camelResponse = toCamelCase(response);
      return camelResponse;
    } catch (error) {
      console.error('Error getting user:', error);
      return {
        UsersQueryByUserId: {
          statusCode: 500,
          message: 'Error getting user',
          data: null
        }
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
      const userQueryInput: UsersQueryByUserIdInput = { userId: email, status: '' };
      const userResponse = await this.userQueryByUserId(userQueryInput, email);

      user = userResponse.UsersQueryByUserId?.data;
      if (userResponse.UsersQueryByUserId?.statusCode !== 200 || !user) {
        return {
          statusCode: userResponse.UsersQueryByUserId?.statusCode,
          message: 'User Does Not Exist',
          data: null
        };
      }

      // Update store with user data before auth attempt
      this.store.dispatch(AuthActions.signInSuccess({ user, message: 'User found' }));
      this.currentUser.next(user);

    } catch (error) {
      console.error('Error getting user:', error);
      return {
        statusCode: 500,
        message: 'Error getting user',
        data: null
      };
    }

    try {
      // Pass the user's email as the third parameter for MFA setup
      const userSignInResponse = await this.cognitoService.signIn(user.cognitoId, password, user.email);

      // Handle already signed in case
      if (userSignInResponse.statusCode === 401 &&
        userSignInResponse.message?.toLowerCase().includes('already signed in')) {
        console.warn('User already signed in');
        await this.cognitoService.checkIsAuthenticated();
        return {
          statusCode: 200,
          message: 'User already signed in',
          data: null
        };
      }

      return userSignInResponse;

    } catch (error) {
      const error_message = error instanceof Error ? error.message : 'Error signing in';
      console.warn('Sign in error:', error_message);

      if (error_message.toLowerCase().includes('already signed in')) {
        await this.cognitoService.checkIsAuthenticated();
        return {
          statusCode: 200,
          message: 'User already signed in',
          data: null
        };
      }

      return {
        statusCode: 500,
        message: 'Error signing in: ' + error_message,
        data: null
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
        statusCode: 200,
        message: 'MFA setup successful',
        data: null
      };
    } catch (error) {
      console.error('Error setting up MFA:', error);
      return {
        statusCode: 500,
        message: 'Error setting up MFA',
        data: null
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
        statusCode: 500,
        message: 'Error verifying MFA',
        data: null
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
          UsersQueryByUserId: {
            statusCode: 400,
            message: 'Missing required userId',
            data: null
          }
        };
      }

      let hasUpdates = false;
      const updateInput: UsersUpdateInput = {
        userId: input.userId,
        updatedAt: Date.now()
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
        { input: toSnakeCase(updateInput) },
        "userPool"
      ) as GraphQLResult<UsersUpdateResponse>;

      console.debug('userUpdate Response:', response);

      if (!response.data) {
        return {
          UsersQueryByUserId: {
            statusCode: 500,
            message: 'No response from update operation',
            data: null
          }
        };
      }

      const updatedUser = await this.userQueryByUserId({ userId: input.userId, status: '' });

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
        UsersQueryByUserId: {
          statusCode: 500,
          message: errorMessage,
          data: null
        }
      };
    }
  }

  /**
   * Send SMS verification code to a phone number
   * @param phoneNumber
   * @returns Promise with status_code and optional message
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
