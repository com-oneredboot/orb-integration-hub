/**
 * Users model.
 */

// Import enums used in this model
import { UserStatus } from './UserStatus.enum';

// CreateInput
export type UsersCreateInput = {
  cognito_id: string;
  email: string;
  phone_number: string;
  phone_verified: boolean;
  first_name: string;
  last_name: string;
  groups: string[];
  status: UserStatus;
  created_at: number;
  updated_at: number;
};

// UpdateInput
export type UsersUpdateInput = Partial<IUsers>;

// QueryBy<PartitionKey>Input
export type UsersQueryByUserIdInput = {
  user_id: string;
};

// QueryBy<SecondaryIndex>Input types
export type UsersQueryByUserIdInput = {
  user_id: string;  status: string;};
export type UsersQueryByEmailInput = {
  email: string;  user_id: string;};

// Response types
export type UsersCreateResponse = {
  StatusCode: number;
  Message: string;
  Data: IUsers | null;
};
export type UsersUpdateResponse = {
  StatusCode: number;
  Message: string;
  Data: IUsers | null;
};
export type UsersResponse = {
  UsersQueryByUserId: {
    StatusCode: number;
    Message: string;
    Data: IUsers | null;
  };
};

export interface IUsers {
  user_id: string;
  cognito_id: string;
  email: string;
  phone_number: string;
  phone_verified: boolean;
  first_name: string;
  last_name: string;
  groups: string[];
  status: UserStatus;
  created_at: number;
  updated_at: number;
}

export class Users implements IUsers {
  user_id: string = '';
  cognito_id: string = '';
  email: string = '';
  phone_number: string = '';
  phone_verified: boolean = false;
  first_name: string = '';
  last_name: string = '';
  groups: string[] = [];
  status: UserStatus = UserStatus.UNKNOWN;
  created_at: number = 0;
  updated_at: number = 0;

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
