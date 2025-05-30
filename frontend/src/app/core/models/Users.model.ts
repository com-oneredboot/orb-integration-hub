/**
 * Generated TypeScript models for Users
 * Generated at 2025-05-30T08:46:39.448965
 */

// Import enums and models used in this modelimport { UserStatus } from './UserStatus.enum';

// Input types
export interface UsersCreateInput {
  userId: string;
  cognitoId: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  phoneNumber: string;
  groups: string[];
  emailVerified: boolean;
  phoneVerified: boolean;
}

export interface UsersUpdateInput {
  userId?: string;
  cognitoId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  phoneNumber?: string;
  groups?: string[];
  emailVerified?: boolean;
  phoneVerified?: boolean;
}

// Always include DeleteInput (PK fields only)
export interface UsersDeleteInput {
  userId: string;
}

// Always include DisableInput (PK fields + disabled boolean)
export interface UsersDisableInput {
  userId: string;
  disabled: boolean;
}

// QueryBy inputs for PK, SK, and all indexes
export interface UsersQueryByUserIdInput {
  userId: string;
}
export interface UsersQueryByEmailInput {
  email: string;
}
export interface UsersQueryByCognitoIdInput {
  cognitoId: string;
}

// Model
export interface IUsers {
  userId: string;
  cognitoId: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  phoneNumber: string;
  groups: string[];
  emailVerified: boolean;
  phoneVerified: boolean;
}

export class Users implements IUsers {
  userId = '';
  cognitoId = '';
  email = '';
  firstName = '';
  lastName = '';
  status = '';
  createdAt = '';
  updatedAt = '';
  phoneNumber = '';
  groups = [];
  emailVerified = false;
  phoneVerified = false;
  constructor(data: Partial<IUsers> = {}) {
    Object.entries(data).forEach(([key, value]) => {
      if (key in this) {
        if (key === 'status' && typeof value === 'string') {
          this.status = UserStatus[value as keyof typeof UserStatus] ?? UserStatus.UNKNOWN;
        } else 
        {
          this[key as keyof this] = value as this[keyof this];
        }
      }
    });
  }
}


export interface Users {
  userId: string;
  cognitoId: string;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  phoneNumber: string;
  groups: string[];
  emailVerified: boolean;
  phoneVerified: boolean;
}

// ProperCase response types
export interface UsersResponse {
  StatusCode: number;
  Message: string;
  Data: Users;
}

export interface UsersListResponse {
  StatusCode: number;
  Message: string;
  Data: Users[];
}

// CRUD response aliases
export type UsersCreateResponse = UsersResponse;
export type UsersUpdateResponse = UsersResponse;
export type UsersDeleteResponse = UsersResponse;
export type UsersDisableResponse = UsersResponse;
