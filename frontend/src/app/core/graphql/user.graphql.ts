// file: frontend/src/app/graphql/user.graphql.ts
// author: Corey Dale Peters
// date: 2024-12-06
// description: The user model is used only by the Integration Hub.

// Application Imports
import { GenericResponse } from "../models/appsync.model";
import { User } from  "../models/user.model";
import { UserGroups } from "../models/user.enum";

export type UsersResponse = {
  usersQueryById: {
    status_code: number;
    message: string;
    data: User | null;
  };
};

export type UsersCreateResponse = GenericResponse & {
  usersCreate: {
    status_code: number;
    message: string;
    data: User | null;
  };
}

export type UsersUpdateResponse = GenericResponse & {
  usersUpdate: {
    status_code: number;
    message: string;
    data: User | null;
  }
}

export type UsersQueryInput = {
  user_id: string;
  email: string;
};

export type UsersCreateInput = Omit<User, 'first_name' | 'last_name' | 'phone_number' >;

export type UsersUpdateInput = Partial<Omit<User, 'user_id' | 'created_at' >> & { user_id: string };

// ------------------------------ //
// AppSync Mutations and Queries
// ------------------------------ //
export const usersCreateMutation = /* GraphQL */ `
  mutation UsersCreate($input: UsersCreateInput!) {
    usersCreate(input: $input) {
      status_code
      message
      data {
        user_id
      }
    }
  }
`;

export const usersExistQuery = `
  query UsersExists($input: UsersQueryInput!) {
    usersQueryById(input: $input) {
      status_code
      message
      data {
        user_id
      }
    }
  }
`;

export const usersQueryById = /* GraphQL */ `
  query UsersQueryById($input: UsersQueryInput!) {
    usersQueryById(input: $input) {
      status_code
      message
      data {
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

export const usersUpdateMutation = /* GraphQL */ `
  mutation UsersUpdate($input: UsersUpdateInput!) {
    usersUpdate(input: $input) {
      status_code
      message
      data {
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
