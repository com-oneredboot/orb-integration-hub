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
  user_id: string;
  cognito_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  // The phone_verified field is part of our model but may not exist in backend yet
  phone_verified?: boolean;
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

export type UserCreateResponse = GenericResponse & {
  userCreate: {
    status_code: number;
    user: User | null;
    message?: string;
  };
}

export type UserQueryInput = Partial<Pick<User, 'user_id' | 'cognito_id' | 'email'>>;

export type UserCreateInput = Omit<User, 'first_name' | 'last_name' | 'phone_number'>;

// Now include phone_verified in the UserUpdateInput since the backend schema has been updated
export type UserUpdateInput = Partial<Omit<User, 'user_id' | 'created_at' >> & { user_id: string };

export type UserUpdateResponse = GenericResponse & {
  userUpdate: {
    status_code: number;
    user: User | null;
    message?: string;
  };
}

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
        phone_verified
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
        cognito_id
        email
        phone_number
        phone_verified
        first_name
        last_name
        groups
        status
        created_at
      }
    }
  }
`;
