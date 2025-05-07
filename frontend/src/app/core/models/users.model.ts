/**
 * Users DynamoDB model.
 */

// Import enums and models used in this model
import { UserStatus } from './UserStatus.enum';

// CreateInput
export type UsersCreateInput = {
  userId: string;
  cognitoId: string;
  email: string;
  emailVerified: boolean;
  phoneNumber: string | undefined;
  phoneVerified: boolean | undefined;
  firstName: string;
  lastName: string;
  groups: any[];
  status: string;
  createdAt: string;
  updatedAt: string;
};

// UpdateInput
export type UsersUpdateInput = {
  userId: string;
  cognitoId: string;
  email: string;
  emailVerified: boolean;
  phoneNumber: string | undefined;
  phoneVerified: boolean | undefined;
  firstName: string;
  lastName: string;
  groups: any[];
  status: string;
  createdAt: string;
  updatedAt: string;
};

// QueryInput
// Primary key queries
export type UsersQueryByUserIdInput = {
  userId: string;
};

export type UsersQueryByCognitoIdInput = {
  cognitoId: string;
};

export type UsersQueryByBothInput = {
  userId: string;
  cognitoId: string;
};

// Secondary index queries
export type UsersQueryByPhoneNumberInput = {
  phoneNumber: string;
};
export type UsersQueryByEmailInput = {
  email: string;
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
  userId: string;
  cognitoId: string;
  email: string;
  emailVerified: boolean;
  phoneNumber: string | undefined;
  phoneVerified: boolean | undefined;
  firstName: string;
  lastName: string;
  groups: any[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

export class Users implements IUsers {
  userId = '';
  cognitoId = '';
  email = '';
  emailVerified = false;
  phoneNumber = '';
  phoneVerified = false;
  firstName = '';
  lastName = '';
  groups = [];
  status = '';
  createdAt = '';
  updatedAt = '';

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