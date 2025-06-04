/**
 * Generated TypeScript models for Users
 * Generated at 2025-06-04T10:49:55.847467
 */

// Import enums and models used in this model
import { UserStatus } from './UserStatus.enum';


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

// DTO Interface (API/DB contract)
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

// Domain Model Class (uses enums for enum fields)
// Properties: '!' = required (definite assignment), '?' = optional (from schema)
export class Users {
  userId!: string;
  cognitoId!: string;
  email!: string;
  firstName!: string;
  lastName!: string;
  status!: UserStatus;
  createdAt!: string;
  updatedAt!: string;
  phoneNumber?: string;
  groups?: string[];
  emailVerified?: boolean;
  phoneVerified?: boolean;

  constructor(data: Partial<Users> = {}) {
    Object.assign(this, data);
  }

  // Convert from DTO (IUsers) to domain model
  static fromDto(dto: IUsers): Users {
    return new Users({
      userId: dto.userId ?? '',
      cognitoId: dto.cognitoId ?? '',
      email: dto.email ?? '',
      firstName: dto.firstName ?? '',
      lastName: dto.lastName ?? '',
      status: UserStatus[dto.status as keyof typeof UserStatus] ?? UserStatus.UNKNOWN,
      createdAt: dto.createdAt ?? '',
      updatedAt: dto.updatedAt ?? '',
      phoneNumber: dto.phoneNumber ?? '',
      groups: dto.groups ?? [],
      emailVerified: dto.emailVerified ?? false,
      phoneVerified: dto.phoneVerified ?? false,
    });
  }

  // Convert domain model to DTO (IUsers)
  toDto(): IUsers {
    return {
      userId: this.userId ?? '',
      cognitoId: this.cognitoId ?? '',
      email: this.email ?? '',
      firstName: this.firstName ?? '',
      lastName: this.lastName ?? '',
      status: this.status.toString(),
      createdAt: this.createdAt ?? '',
      updatedAt: this.updatedAt ?? '',
      phoneNumber: this.phoneNumber ?? '',
      groups: this.groups ?? [],
      emailVerified: this.emailVerified ?? false,
      phoneVerified: this.phoneVerified ?? false,
    };
  }
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
