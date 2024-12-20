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

// ------------------------------ //
// Type Definitions
// ------------------------------ //
export type UserResponse = {
  getUserById: {
    status_code: number;
    user: User | null;
    message?: string;
  };
};

export type UserExistResponse = GenericResponse & {
  user?: {
    id: string | null;
  } | null;
}

export type UserQueryInput = Partial<Pick<User, 'id' | 'cognito_id' | 'email'>>;

export type CreateUserInput = Omit<User, 'id' | 'created_at'>;

export type UpdateUserInput = Partial<Omit<User, 'id' | 'created_at' >> & { id: string };


// ------------------------------ //
// AppSync Mutations and Queries
// ------------------------------ //
export const createUserMutation = /* GraphQL */ `
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
    }
  }
`;

export const doesUserExistQuery = `
  query DoesUserExist($input: UserQueryInput!) {
    getUserById(input: $input) {
      status_code
      user {
        id
      }
    }
  }
`;

export const getUserByIdQuery = /* GraphQL */ `
  query GetUserById($input: UserQueryInput!) {
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

export const updateUserMutation = /* GraphQL */ `
  mutation UpdateUser($input: UpdateUserInput!) {
    updateUser(input: $input) {
      id
    }
  }
`;
