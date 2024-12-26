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
  UserUpdateInput, userUpdateMutation, userExistQuery, UserCreateResponse, UserGroup, UserStatus
} from "../models/user.model";
import {GraphQLResult} from "@aws-amplify/api-graphql";
import {CognitoService} from "./cognito.service";
import {v4 as uuidv4} from "uuid";


@Injectable({
  providedIn: 'root'
})
export class UserService extends ApiService {

  constructor(
    private cognitoService: CognitoService
  ) {
    super();
  }

  public async userCreate(input: UserCreateInput, password: string): Promise<UserResponse> {
    console.debug('createUser input:', input);

    try {
      // create the Cognito User
      const cognitoResponse = await this.cognitoService.createCognitoUser(input, password);
      console.debug('createCognitoUser Response: ', cognitoResponse);

      const timestamp = new Date().toISOString();
      const userCreateInput: UserCreateInput = {
        id: uuidv4(),
        cognito_id: input.cognito_id,
        groups: [UserGroup.USER],
        status: UserStatus.PENDING,
        email: input.email,
        created_at: timestamp
      };

      const response = await this.mutate(
        userCreateMutation, {"input": userCreateInput }, "apiKey") as GraphQLResult<UserCreateResponse>;
      console.debug('createUser Response: ', response);

      return {
        userQueryById: response.data.userCreate
      } as UserResponse;


    } catch (error) {
      console.error('Error creating User:', error);
      return {
        userQueryById: {
          status_code: 500,
          user: null,
          message: 'Error creating User'
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

  public async emailVerify(input: UserQueryInput, code: string): Promise<boolean> {
    console.debug('verifyEmail:', input);
    try {

      // get the user
      const userResponse = await this.userQueryById(input);
      console.debug('User Response:', userResponse);
      if (userResponse.userQueryById?.status_code !== 200 || !userResponse.userQueryById?.user) {
        return false;
      }

      const response = await this.cognitoService.emailVerify(userResponse.userQueryById.user.cognito_id, code);
      console.debug('verifyEmail Response: ', response);

      return response.success;

    } catch (error) {
      console.error('Error verifying email:', error);
      return false;
    }
  }

  public async userQueryById(input: UserQueryInput): Promise<UserResponse> {
    console.debug('userQueryById:', input);
    try {
      const response = await this.query(
        userQueryById,
        {input: input},
        'apiKey') as GraphQLResult<UserResponse>;

      console.debug('userQueryById Response: ', response);
      return response.data;
    } catch (error) {
      console.error('Error getting user:', error);
      return {
        userQueryById: {
          status_code: 500,
          user: null,
          message: 'Error getting user'
        }
      } as UserResponse;
    }
  }

}
