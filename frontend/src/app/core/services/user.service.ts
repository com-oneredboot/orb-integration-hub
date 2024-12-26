// file: frontend/src/app/services/user.service.ts
// author: Corey Dale Peters
// date: 2024-12-06
// description: The API service provides a common interface for making GraphQL queries and mutations

// 3rd Party Imports
import {Injectable} from "@angular/core";

// Application Imports
import {ApiService} from "./api.service";
import {
  UserCreateInput,
  userCreateMutation,
  UserQueryInput,
  UserResponse,
  userQueryById,
  UserUpdateInput, userUpdateMutation, userExistQuery, UserCreateResponse
} from "../models/user.model";
import {GraphQLResult} from "@aws-amplify/api-graphql";
import {CognitoService} from "./cognito.service";


@Injectable({
  providedIn: 'root'
})
export class UserService extends ApiService {

  constructor(
    private cognitoService: CognitoService
  ) {
    super();
  }

  public async createUser(input: UserCreateInput, password: string): Promise<UserResponse> {
    console.debug('createUser:', input);

    try {

      // create the Cognito User
      await this.cognitoService.createCognitoUser(input, password);

      const response = await this.mutate(
        userCreateMutation, {"input": input }, "apiKey") as GraphQLResult<UserCreateResponse>;
      console.debug('createUser Response: ', response);

      const userResponse = response.data;
      if (userResponse.userCreate?.status_code !== 200 || !userResponse.userCreate?.user) {
        return {
          userQueryById: response.data.userCreate
        } as UserResponse;
      }

      // Set the Current user and authentication status
      this.cognitoService.setCurrentUser(userResponse.userCreate.user);
      await this.cognitoService.checkIsAuthenticated();

      return {
        userQueryById: response.data.userCreate
      } as UserResponse;


    } catch (error) {
      console.error('Error creating user:', error);
      return {
        userQueryById: {
          status_code: 500,
          user: null,
          message: 'Error creating user'
        }
      } as UserResponse;
    }
  }

  public async userExists(input: UserQueryInput): Promise<boolean|undefined> {
    console.debug('doesUserExist:', input);
    try {
      const response = await this.query(
        userExistQuery,
        { input: input },
        'apiKey') as GraphQLResult<UserResponse>;
      console.debug('doesUserExist Response: ', response);

      // if 404 return false
      if (response.data?.userQueryById?.status_code === 404) {
        return false;
      }

      // if not 200 throw error
      if (response.data?.userQueryById?.status_code !== 200) {
        throw new Error(`Invalid response code: ${response.data?.userQueryById?.status_code}`);
      }

      // return result
      return response.data?.userQueryById?.user?.id !== null;

    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  public async verifyEmail(input: UserQueryInput, code: string): Promise<boolean> {
    console.debug('verifyEmail:', input);
    try {
      // ensure id
      if (!input?.id) {
        console.error('Missing user id');
        return false;
      }
      const response = await this.cognitoService.emailVerify(input?.id, code);
      console.debug('verifyEmail Response: ', response);

      return response.success;

    } catch (error) {
      console.error('Error verifying email:', error);
      return false;
    }
  }

  public async getUserById(input: UserQueryInput): Promise<any> {
    console.debug('getUserFromId:', input);
    try {

      const response = await this.query(
        userQueryById, input) as GraphQLResult;

      console.debug('getUserFromId Response: ', response);

      return response.data;

    } catch (error) {
      console.error('Error getting user:', error);
    }
  }

  public async updateUser(input: UserUpdateInput): Promise<UserResponse> {
    console.debug('updateUser:', input);
    try {
      const response = await this.mutate(
        userUpdateMutation, input) as GraphQLResult<UserResponse>;
      console.debug('updateUserProfile Response: ', response);

      return response.data;

    } catch (error) {
      console.error('Error updating user profile:', error);
      return {
        userQueryById: {
          status_code: 500,
          user: null,
          message: 'Error updating user profile'
        }
      } as UserResponse;
    }
  }

  public async setCurrentUser(user: any): Promise<boolean> {
    console.debug('setCurrentUser:', user);
    try {
      // Set the Current user and authentication status
      this.cognitoService.setCurrentUser(user);
      return this.cognitoService.checkIsAuthenticated();
    } catch (error) {
      console.error('Error setting current user:', error);
      return false;
    }
  }

}
