// file: frontend/src/app/graphql/user.graphql.ts
// author: Corey Dale Peters
// date: 2024-12-06
// description: The user model is used only by the Integration Hub.

// Application Imports
import { GenericResponse } from "../models/appsync.model";
import { User } from  "../models/user.model";
import { UserGroups } from "../models/user.enum";

export type UsersResponse = {
  usersQueryByUserId: {
    StatusCode: number;
    Message: string;
    Data: User | null;
  };
  usersQueryByEmail: {
    StatusCode: number;
    Message: string;
    Data: User | null;
  };
};

export type UsersCreateResponse = GenericResponse & {
  usersCreate: {
    StatusCode: number;
    Message: string;
    Data: User | null;
  };
}

export type UsersUpdateResponse = GenericResponse & {
  usersUpdate: {
    StatusCode: number;
    Message: string;
    Data: User | null;
  }
}

export type UsersQueryByUserIdInput = {
  user_id: string;
};

export type UsersQueryByEmailInput = {
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
      StatusCode
      Message
      Data {
        user_id
      }
    }
  }
`;

export const usersQueryByUserId = /* GraphQL */ `
  query UsersQueryByUserId($input: UsersQueryByUserIdInput!) {
    usersQueryByUserId(input: $input) {
      StatusCode
      Message
      Data {
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

export const usersQueryByEmail = /* GraphQL */ `
  query UsersQueryByEmail($input: UsersQueryByEmailInput!) {
    usersQueryByEmail(input: $input) {
      StatusCode
      Message
      Data {
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
      StatusCode
      Message
      Data {
        user_id
        email
        first_name
        last_name
        phone_number
        groups
        status
      }
    }
  }
`;
