/**
 * User Model
 * Generated code - do not modify directly
 */

export interface User {
  user_id: string;
  cognito_id: string;
  email: string;
  phone_number: string;
  phone_verified: boolean;
  first_name: string;
  last_name: string;
  groups: string[];
  status: string;
  created_at: number | string; // Allow both number and string for flexibility
}

export interface UserCreateInput {
  user_id: string;
  cognito_id: string;
  email: string;
  phone_number?: string;
  phone_verified?: boolean;
  first_name: string;
  last_name: string;
  groups: string[];
  status: string;
  created_at: number | string;
}

export interface UserQueryInput {
  user_id?: string;
  cognito_id?: string;
  email?: string;
}

export interface UserUpdateInput {
  user_id: string;
  cognito_id?: string;
  email?: string;
  phone_number?: string;
  phone_verified?: boolean;
  first_name?: string;
  last_name?: string;
  groups?: string[];
  status?: string;
  created_at?: number;
}

// GraphQL types
export interface UserResponse {
  userQueryById: {
    status_code: number;
    message?: string;
    user: User | null;
  };
}

export interface UserCreateResponse {
  userCreate: {
    status_code: number;
    message?: string;
    user: User | null;
  };
}

export interface UserUpdateResponse {
  userUpdate: {
    status_code: number;
    message?: string;
    user: User | null;
  };
}

// GraphQL queries and mutations
export const userQueryById = `
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
}`;

export const userExistQuery = `
query UserExistQuery($input: UserQueryInput!) {
  userQueryById(input: $input) {
    status_code
    message
    user {
      user_id
    }
  }
}`;

export const userCreateMutation = `
mutation CreateUser($input: UserCreateInput!) {
  userCreate(input: $input) {
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
}`;

export const userUpdateMutation = `
mutation UpdateUser($input: UserUpdateInput!) {
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
}`;

// Enums
export enum UserGroup {
  USER = 'USER',
  CUSTOMER = 'CUSTOMER',
  CLIENT = 'CLIENT',
  EMPLOYEE = 'EMPLOYEE',
  OWNER = 'OWNER'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED',
  INACTIVE = 'INACTIVE'
}

export class UserModel implements User {
  user_id: string = '';
  cognito_id: string = '';
  email: string = '';
  phone_number: string = '';
  phone_verified: boolean = false;
  first_name: string = '';
  last_name: string = '';
  groups: string[] = [];
  status: string = '';
  created_at: number | string = 0;

  constructor(data: Partial<User> = {}) {
    Object.assign(this, data);
  }

  static fromDynamoDB(item: Record<string, any>): User {
    if (!item) return new UserModel();

    return new UserModel({
      'user_id': item['user_id'],
      'cognito_id': item['cognito_id'],
      'email': item['email'],
      'phone_number': item['phone_number'],
      'phone_verified': item['phone_verified'],
      'first_name': item['first_name'],
      'last_name': item['last_name'],
      'groups': item['groups'],
      'status': item['status'],
      'created_at': item['created_at'],
    });
  }

  toDynamoDB(): Record<string, any> {
    return {
      'user_id': this.user_id,
      'cognito_id': this.cognito_id,
      'email': this.email,
      'phone_number': this.phone_number,
      'phone_verified': this.phone_verified,
      'first_name': this.first_name,
      'last_name': this.last_name,
      'groups': this.groups,
      'status': this.status,
      'created_at': this.created_at,
    };
  }
}