// file: frontend/src/app/graphql/user.graphql.ts
// author: Corey Dale Peters
// date: 2024-12-06
// description: The user model is used only by the Integration Hub.

// Application Imports
import { GenericResponse } from "../models/appsync.model";
import { User } from  "../models/user.model";
import { UserGroups } from "../models/user.enum";


export type UserResponse = {
  userQueryById: {
    status_code: number;
    user: User | null;
    message?: string;
  };
};

export type UserCreateResponse = GenericResponse & {
  userCreate: {
    status_code: number;
    user: User | null;
    message?: string;
  };
}

export type UserUpdateResponse = GenericResponse & {
  userUpdate: {
    status_code: number;
    user?: User;
    message?: string;
  }
}

export type UserQueryInput = Partial<Pick<User, 'user_id' | 'cognito_id' | 'email'>>;

export type UserCreateInput = Omit<User, 'first_name' | 'last_name' | 'phone_number' | 'toDynamoDB' | 'fromDynamoDB'>;

export type UserUpdateInput = Partial<Omit<User, 'user_id' | 'created_at' >> & { user_id: string };


// ------------------------------ //
// AppSync Mutations and Queries
// ------------------------------ //
export const userCreateMutation = /* GraphQL */ `
  mutation UserCreate($input: UserCreateInput!) {
    userCreate(input: $input) {
      status_code
      message
      user {
        user_id
      }
    }
  }
`;

export const userExistQuery = `
  query UserExists($input: UserQueryInput!) {
    userQueryById(input: $input) {
      status_code
      user {
        user_id
      }
    }
  }
`;

export const userQueryById = /* GraphQL */ `
  query UserQueryById($input: UserQueryInput!) {
    userQueryById(input: $input) {
      status_code
      message
      user {
        user_id
        cognito_id
        email
        phone_number
        first_name
        last_name
        groups
        status
        created_at
      }
    }
  }
`;

export const userUpdateMutation = /* GraphQL */ `
  mutation UserUpdate($input: UserUpdateInput!) {
    userUpdate(input: $input) {
      status_code
      message
      user {
        user_id
        email
        first_name
        last_name
        phone_number
        phone_verified
        groups
        status
        created_at
      }
    }
  }
`;
