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
  getUserFromIdQuery,
  UpdateUserInput, updateUserMutation
} from "../../models/user.model";
import {GraphQLResult} from "@aws-amplify/api-graphql";


@Injectable({
  providedIn: 'root'
})
export class UserService extends ApiService {

  constructor() {
    super();
  }

  public async createUser(input: CreateUserInput): Promise<UserResponse> {
    console.debug('createUser:', input);
    try {
      const response = await this.mutate(
        createUserMutation, input) as GraphQLResult<UserResponse>;
      console.debug('createUser Response: ', response);

      return response.data;

    } catch (error) {
      console.error('Error creating user:', error);
      return {
        status_code: 500,
        message: 'Error creating user'
      } as UserResponse;
    }
  }

  public async getUserFromId(input: UserQueryInput): Promise<any> {
    console.debug('getUserFromId:', input);
    try {

      const response = await this.query(
        getUserFromIdQuery, input) as GraphQLResult;

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
        status_code: 500,
        message: 'Error updating user profile'
      } as UserResponse;
    }
  }

}
