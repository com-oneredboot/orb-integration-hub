/**
 * Users model.
 */

// Import enums used in this model
import { UserStatus } from './UserStatus.enum';

// CreateInput
export type UsersCreateInput = {
  userId: string;
  cognitoId: string;
  email: string;
  emailVerified: boolean;
  phoneNumber: string;
  phoneVerified: boolean;
  firstName: string;
  lastName: string;
  groups: string[];
  status: UserStatus;
  createdAt: number;
  updatedAt: number;
};

// UpdateInput
export type UsersUpdateInput = Partial<IUsers>;

// QueryBy<PartitionKey>Input
// QueryBy<SecondaryIndex>Input types
export type UsersQueryByUserIdInput = {
    userId: string;
    status?: string;
};
export type UsersQueryByCognitoIdInput = {
    cognitoId: string;
    userId?: string;
};
export type UsersQueryByPhoneNumberInput = {
    phoneNumber: string;
    userId?: string;
};
export type UsersQueryByEmailInput = {
    email: string;
    userId?: string;
};

// Response types
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
export type UsersResponse = {
  UsersQueryByUserId: {
    statusCode: number;
    message: string;
    data: IUsers | null;
  };
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
  groups: string[];
  status: UserStatus;
  createdAt: number;
  updatedAt: number;
}

export class Users implements IUsers {
  userId: string = '';
  cognitoId: string = '';
  email: string = '';
  emailVerified: boolean = false;
  phoneNumber: string | undefined = '';
  phoneVerified: boolean | undefined = false;
  firstName: string = '';
  lastName: string = '';
  groups: string[] = [];
  status: UserStatus = UserStatus.UNKNOWN;
  createdAt: number = 0;
  updatedAt: number = 0;

  constructor(data: Partial<IUsers> = {}) {
    Object.entries(data).forEach(([key, value]) => {
      if (key in this) {
        if (key === 'status' && typeof value === 'string') {
          this.status = UserStatus[value as keyof typeof UserStatus] ?? UserStatus.UNKNOWN;
        } else 
        {
          this[key as keyof this] = value as any;
        }
      }
    });
  }
}
