// file: frontend/src/app/services/user.service.ts
// author: Corey Dale Peters
// date: 2024-12-06
// description: The API service provides a common interface for making GraphQL queries and mutations

// 3rd Party Imports
import {Injectable} from "@angular/core";

// Application Imports
import {ApiService} from "./api.service";
import {
  CreateUserInput,
  createUserMutation,
  UserQueryInput,
  UserResponse,
  getUserByIdQuery,
  UpdateUserInput, updateUserMutation, doesUserExistQuery
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

  public async createUser(input: CreateUserInput, password: string): Promise<UserResponse> {
    console.debug('createUser:', input);

    try {

      // create the Cognito User
      await this.cognitoService.createCognitoUser(input, password);

      const response = await this.mutate(
        createUserMutation, input) as GraphQLResult<UserResponse>;
      console.debug('createUser Response: ', response);

      const userResponse = response.data;

      if (userResponse.getUserById?.status_code !== 200 || !userResponse.getUserById?.user) {
        return userResponse;
      }

      // Set the Current user and authentication status
      this.cognitoService.setCurrentUser(userResponse.getUserById.user);
      await this.cognitoService.checkIsAuthenticated();

      return userResponse;



    } catch (error) {
      console.error('Error creating user:', error);
      return {
        getUserById: {
          status_code: 500,
          user: null,
          message: 'Error creating user'
        }
      } as UserResponse;
    }
  }

  public async doesUserExist(input: UserQueryInput): Promise<boolean|undefined> {
    console.debug('doesUserExist:', input);
    try {
      const response = await this.query(
        doesUserExistQuery,
        { input: input },
        'apiKey') as GraphQLResult<UserResponse>;
      console.debug('doesUserExist Response: ', response);

      // if 404 return false
      if (response.data?.getUserById?.status_code === 404) {
        return false;
      }

      // if not 200 throw error
      if (response.data?.getUserById?.status_code !== 200) {
        throw new Error(`Invalid response code: ${response.data?.getUserById?.status_code}`);
      }

      // return result
      return response.data?.getUserById?.user?.id !== null;

    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  public async getUserById(input: UserQueryInput): Promise<any> {
    console.debug('getUserFromId:', input);
    try {

      const response = await this.query(
        getUserByIdQuery, input) as GraphQLResult;

      console.debug('getUserFromId Response: ', response);

      return response.data;

    } catch (error) {
      console.error('Error getting user:', error);
    }
  }

  public async updateUser(input: UpdateUserInput): Promise<UserResponse> {
    console.debug('updateUser:', input);
    try {
      const response = await this.mutate(
        updateUserMutation, input) as GraphQLResult<UserResponse>;
      console.debug('updateUserProfile Response: ', response);

      return response.data;

    } catch (error) {
      console.error('Error updating user profile:', error);
      return {
        getUserById: {
          status_code: 500,
          user: null,
          message: 'Error updating user profile'
        }
      } as UserResponse;
    }
  }

}
