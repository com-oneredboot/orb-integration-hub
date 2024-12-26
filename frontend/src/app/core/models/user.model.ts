// file: frontend/src/app/models/user.model.ts
// author: Corey Dale Peters
// date: 2024-12-06
// description: The user model is used only by the Integration Hub.

// Application Imports
import {GenericResponse} from "./appsync.model";


// ------------------------------ //
// Model Definitions
// ------------------------------ //
export enum UserGroup {
  USER = 'USER',           // Base group
  CUSTOMER = 'CUSTOMER',   // End-users making purchases
  CLIENT = 'CLIENT',       // Customers using the service
  EMPLOYEE = 'EMPLOYEE', // Internal staff
  OWNER = 'OWNER'         // Root-level access
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED',
  INACTIVE = 'INACTIVE'
}

export interface User {
  id: string;
  cognito_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  groups: [UserGroup];
  status: UserStatus;
  created_at: string;
}

export const groupPriority: UserGroup[] = [
  UserGroup.OWNER,
  UserGroup.EMPLOYEE,
  UserGroup.CLIENT,
  UserGroup.CUSTOMER,
  UserGroup.USER
];

export type UserResponse = {
  userQueryById: {
    status_code: number;
    user: User | null;
    message?: string;
  };
};

export type UserQueryInput = Partial<Pick<User, 'id' | 'cognito_id' | 'email'>>;

export type UserCreateInput = Omit<User, 'first_name' | 'last_name' | 'phone_number'>;

export type UserUpdateInput = Partial<Omit<User, 'id' | 'created_at' >> & { id: string };


// ------------------------------ //
// AppSync Mutations and Queries
// ------------------------------ //
export const userCreateMutation = /* GraphQL */ `
  mutation UserCreate($input: UserCreateInput!) {
    userCreate(input: $input) {
      status_code
      message
      user {
        id
      }
    }
  }
`;

export const userExistQuery = `
  query UserExists($input: UserQueryInput!) {
    userQueryById(input: $input) {
      status_code
      user {
        id
      }
    }
  }
`;

export const userQueryById = /* GraphQL */ `
  query UserQueryById($input: UserQueryInput!) {
      id
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
`;

export const userUpdateMutation = /* GraphQL */ `
  mutation UserUpdate($input: UpdateUserInput!) {
    userUpdate(input: $input) {
      id
    }
  }
`;
