/**
 *  DynamoDB model.
 */

/*
 * schema.table: 
 * schema.name: Users
 */

// Import enums and models used in this model
import { RoleType } from './RoleType.enum';
import { UserStatus } from './UserStatus.enum';

// CreateInput
export type UsersCreateInput = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  roleType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  cognitoId: string;
  phoneNumber: string | undefined;
  groups: any[] | undefined;
  emailVerified: boolean | undefined;
  phoneVerified: boolean | undefined;
};

// UpdateInput
export type UsersUpdateInput = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  roleType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  cognitoId: string;
  phoneNumber: string | undefined;
  groups: any[] | undefined;
  emailVerified: boolean | undefined;
  phoneVerified: boolean | undefined;
};

// QueryInput
// Primary key queries
export type UsersQueryByIdInput = {
  id: string;
};

export type UsersQueryByEmailInput = {
  email: string;
};

export type UsersQueryByBothInput = {
  id: string;
  email: string;
};

// Secondary index queries
export type UsersQueryByRoleIdInput = {
  roleId: string;
};

// Response types
export type UsersResponse = {
  statusCode: number;
  message: string;
  data: IUsers | null;
};

export type UsersCreateResponse = {
  statusCode: number;
  message: string;
  data: IUsers | null;
};

export type UsersUpdateResponse = {
  statusCode: number;
  message: string;
  data: IUsers | null;
};

export interface IUsers {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  roleType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  cognitoId: string;
  phoneNumber: string | undefined;
  groups: any[] | undefined;
  emailVerified: boolean | undefined;
  phoneVerified: boolean | undefined;
}

export class Users implements IUsers {
  id = '';
  email = '';
  firstName = '';
  lastName = '';
  roleId = '';
  roleType = '';
  status = '';
  createdAt = '';
  updatedAt = '';
  cognitoId = '';
  phoneNumber = '';
  groups = [];
  emailVerified = false;
  phoneVerified = false;

  constructor(data: Partial<IUsers> = {}) {
    Object.entries(data).forEach(([key, value]) => {
      if (key in this) {
        if (key === 'roleType' && typeof value === 'string') {
          this.roleType = RoleType[value as keyof typeof RoleType] ?? RoleType.UNKNOWN;
        } else 
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