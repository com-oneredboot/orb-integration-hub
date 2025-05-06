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
  UsersCreateMutation, UsersUpdateMutation, UsersDeleteMutation, UsersQueryByUserId
} from "../graphql/Users.graphql";
import {
  UsersCreateInput, UsersUpdateInput, UsersQueryByUserIdInput,
  UsersCreateResponse, UsersResponse, UsersUpdateResponse
} from "../models/Users.model";
import { UserGroups, UserStatus } from "../models/user.enum";
import { CognitoService } from "./cognito.service";
import { AuthResponse } from "../models/auth.model";
import { AuthActions } from '../../features/user/components/auth-flow/store/auth.actions';
import { sendSMSVerificationCodeMutation, SMSVerificationInput, SMSVerificationResponse } from "../models/sms.model";
import { ErrorRegistry } from "../models/error-registry.model";


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
        user_id: uuidv4(),
        cognito_id: input.cognito_id,
        email: input.email,
        groups: [UserGroups.USER] as string[],
        status: UserStatus.PENDING,
        created_at: timestamp,
        phone_verified: false,
        updated_at: timestamp
      };

      const response = await this.mutate(
        UsersCreateMutation, {"input": userCreateInput}, "apiKey") as GraphQLResult<UsersCreateResponse>;
      console.debug('createUser Response: ', response);

      return {
        UsersQueryByUserId: response.data.UsersCreate
      } as UsersResponse;

    } catch (error) {
      console.error('Error creating User:', error);
      
      let errorCode = 'ORB-API-002';
      let errorMessage = 'Error creating user';
      
      if (error && typeof error === 'object' && 'errors' in error) {
        const gqlError = error as any;
        if (gqlError.errors?.[0]?.message) {
          const errorMsg = gqlError.errors[0].message;
          
          if (errorMsg.includes('NonNull type')) {
            errorCode = 'ORB-API-003';
            errorMessage = `[${errorCode}] Invalid input for user creation: Missing required field`;
          } else if (errorMsg.includes('already exists')) {
            errorCode = 'ORB-AUTH-004';
            errorMessage = ErrorRegistry.getErrorMessage(errorCode);
          } else {
            errorMessage = `[${errorCode}] ${errorMsg}`;
          }
          
          ErrorRegistry.logError(errorCode, { 
            originalError: error,
            graphqlError: gqlError.errors[0]
          });
        }
      } else if (error instanceof Error) {
        errorMessage = `[${errorCode}] ${error.message}`;
        ErrorRegistry.logError(errorCode, { originalError: error });
      }
      
      return {
        UsersQueryByUserId: {
          StatusCode: 500,
          Message: errorMessage,
          Data: null
        }
      } as UsersResponse;
    }
  }

  /**
   * Check if a user exists
   * @param input UserQueryInput with backend-compatible fields
   * @param email Optional email to filter results client-side
   */
  public async userExists(input: UsersQueryByUserId, email?: string): Promise<boolean> {
    const startTime = Date.now();
    console.debug('UserService [userExists]: Starting', { input, email, time: startTime });

    try {
      console.debug('UserService [userExists]: Making API call');
      
      const response = await this.query(
        usersExistQuery,
        {input: input},
        'apiKey'
      ) as GraphQLResult<UsersResponse>;

      console.debug('UserService [userExists]: API response received', {
        response,
        elapsed: Date.now() - startTime
      });

      if (response.data?.UsersQueryByUserId?.StatusCode === 404) {
        console.debug('UserService [userExists]: User not found (404)');
        return false;
      }

      if (response.data?.UsersQueryByUserId?.StatusCode !== 200) {
        console.debug('UserService [userExists]: Invalid status code', response.data?.UsersQueryByUserId?.StatusCode);
        throw new Error(`Invalid response code: ${response.data?.UsersQueryByUserId?.StatusCode}`);
      }

      const result = Boolean(response.data?.UsersQueryByUserId?.Data?.user_id);
      console.debug('UserService [userExists]: Returning result', result);
      return result;

    } catch (error) {
      console.error('UserService [userExists]: Error caught', {
        error,
        elapsed: Date.now() - startTime
      });
      throw error;
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
      if (userResponse.UsersQueryByUserId?.StatusCode !== 200 || !userResponse.UsersQueryByUserId?.Data) {
        return {
          status_code: userResponse.UsersQueryByUserId?.StatusCode,
          isSignedIn: false,
          message: 'Error getting user'
        };
      }

      const emailVerifyResponse = await this.cognitoService.emailVerify(userResponse.UsersQueryByUserId.Data.cognito_id, code);
      console.debug('verifyEmail Response: ', emailVerifyResponse);

      return emailVerifyResponse;

    } catch (error) {
      console.error('Error verifying email:', error);
      return {
        status_code: 500,
        isSignedIn: false,
        message: 'Error verifying email'
      };
    }
  }

  /**
   * Query a user by ID
   * @param input UserQueryInput with backend-compatible fields
   * @param email Optional email to filter results client-side
   */
  public async userQueryByUserId(input: UsersQueryInput, email?: string): Promise<UsersResponse> {
    console.debug('userQueryByUserId:', input, email ? { email } : '');
    try {
      const response = await this.query(
        UsersQueryByUserId,
        {input: input},
        'apiKey') as GraphQLResult<UsersResponse>;

      console.debug('userQueryByUserId Response: ', response);
      
      if (email && response.data?.UsersQueryByUserId?.Data && 
          response.data.UsersQueryByUserId.Data.email !== email) {
        
        console.debug('userQueryByUserId: Email mismatch, returning 404');
        
        return {
          UsersQueryByUserId: {
            StatusCode: 404,
            Message: 'User not found',
            Data: null
          }
        } as UsersResponse;
      }
      
      return response.data;
    } catch (error) {
      console.error('Error getting user:', error);
      return {
        UsersQueryByUserId: {
          StatusCode: 500,
          Message: 'Error getting user',
          Data: null
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
      const userQueryInput = { email: email } as UsersQueryInput;
      const userResponse = await this.userQueryByUserId(userQueryInput, email);

      user = userResponse.UsersQueryByUserId?.Data;
      if (userResponse.UsersQueryByUserId?.StatusCode !== 200 || !user) {
        return {
          status_code: userResponse.UsersQueryByUserId?.StatusCode,
          isSignedIn: false,
          message: 'User Does Not Exist'
        };
      }

      // Update store with user data before auth attempt
      this.store.dispatch(AuthActions.signInSuccess({ user, message: 'User found' }));
      this.currentUser.next(user);

    } catch (error) {
      console.error('Error getting user:', error);
      return {
        status_code: 500,
        isSignedIn: false,
        message: 'Error getting user'
      } as AuthResponse;
    }

    try {
      // Pass the user's email as the third parameter for MFA setup
      const userSignInResponse = await this.cognitoService.signIn(user.cognito_id, password, user.email);

      // Handle already signed in case
      if (userSignInResponse.status_code === 401 &&
        userSignInResponse.message?.toLowerCase().includes('already signed in')) {
        console.warn('User already signed in');
        await this.cognitoService.checkIsAuthenticated();
        return {
          status_code: 200,
          isSignedIn: true,
          message: 'User already signed in',
          user
        };
      }

      return userSignInResponse;

    } catch (error) {
      const error_message = error instanceof Error ? error.message : 'Error signing in';
      console.warn('Sign in error:', error_message);

      if (error_message.toLowerCase().includes('already signed in')) {
        await this.cognitoService.checkIsAuthenticated();
        return {
          status_code: 200,
          isSignedIn: true,
          message: 'User already signed in',
          user
        };
      }

      return {
        status_code: 500,
        isSignedIn: false,
        message: 'Error signing in: ' + error_message
      } as AuthResponse;

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
        status_code: 200,
      } as AuthResponse
    } catch (error) {
      console.error('Error setting up MFA:', error);
      return {
        status_code: 500,
        isSignedIn: false,
        message: 'Error setting up MFA'
      } as AuthResponse
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
        status_code: 500,
        isSignedIn: false,
        message: 'Error verifying MFA'
      } as AuthResponse;
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
      !!user.first_name &&
      !!user.last_name &&
      !!user.phone_number;

    // Check user status is ACTIVE
    const isActive = user.status === 'ACTIVE';

    return hasRequiredAttributes && isActive;
  }

  /**
   * Send SMS verification code to a phone number
   * @param phoneNumber The phone number to send the verification code to
   * @returns Promise with the verification response
   */
  public async sendSMSVerificationCode(phoneNumber: string): Promise<SMSVerificationResponse> {
    console.debug('sendSMSVerificationCode:', phoneNumber);

    try {
      const input: SMSVerificationInput = {
        phone_number: phoneNumber
      };

      const response = await this.mutate<{sendSMSVerificationCode: SMSVerificationResponse}>(
        sendSMSVerificationCodeMutation,
        { input },
        'userPool'
      );

      console.debug('sendSMSVerificationCode Response:', response);

      if (!response.data?.sendSMSVerificationCode) {
        return {
          status_code: 500,
          message: 'No response from SMS verification service'
        };
      }

      return response.data.sendSMSVerificationCode;
    } catch (error) {
      console.error('Error sending SMS verification code:', error);

      let errorMessage = 'Error sending SMS verification code';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        status_code: 500,
        message: errorMessage
      };
    }
  }

  /**
   * Verify an SMS code
   * @param phoneNumber The phone number to verify
   * @param code The verification code
   * @returns Promise with a boolean indicating success
   */
  public async verifySMSCode(phoneNumber: string, code: string): Promise<boolean> {
    console.debug('verifySMSCode:', phoneNumber, code);

    try {
      // TODO: Implement actual code verification against backend
      // This should be replaced with a real API call to a verification endpoint
      
      // For now we'll return false until the real implementation is complete
      console.error('SMS verification not yet implemented with backend');
      return false;
    } catch (error) {
      console.error('Error verifying SMS code:', error);
      throw error;
    }
  }

  /**
   * Update an existing user
   * @param input User data to update
   * @returns Promise with UserResponse
   */
  public async userUpdate(input: UsersUpdateInput): Promise<UsersResponse> {
    console.debug('userUpdate input:', input);

    try {
      if (!input.user_id) {
        console.error('Cannot update user: missing required user_id');
        return {
          UsersQueryByUserId: {
            StatusCode: 400,
            Message: 'Missing required user_id',
            Data: null
          }
        };
      }

      let hasUpdates = false;
      const updateInput: UsersUpdateInput = {
        user_id: input.user_id,
        updated_at: Date.now()
      };
      hasUpdates = true;

      if (input.first_name) {
        updateInput.first_name = input.first_name;
        hasUpdates = true;
      }

      if (input.last_name) {
        updateInput.last_name = input.last_name;
        hasUpdates = true;
      }

      if (input.email) {
        updateInput.email = input.email;
        hasUpdates = true;
      }

      if (input.phone_number) {
        updateInput.phone_number = input.phone_number;
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

      if (!response.data?.UsersUpdate) {
        return {
          UsersQueryByUserId: {
            StatusCode: 500,
            Message: 'No response from update operation',
            Data: null
          }
        };
      }

      const updatedUser = await this.userQueryByUserId({ user_id: input.user_id });

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
          StatusCode: 500,
          Message: errorMessage,
          Data: null
        }
      };
    }
  }
}
