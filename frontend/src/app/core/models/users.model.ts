/**
 * Users model.
 */

// Import enums used in this model
import { UserStatus } from './UserStatus.enum';

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

// Response types
export type UsersCreateResponse = {
  StatusCode: number;
  Message: string;
  Data: IUsers;
};
export type UsersUpdateResponse = {
  StatusCode: number;
  Message: string;
  Data: IUsers;
};
export type UsersResponse = {
  UsersQueryByUserId: {
    StatusCode: number;
    Message: string;
    Data: IUsers;
  };
};

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
        if (Array.isArray(value) && this[key] instanceof Array && this[key].length === 0) {
          this[key] = value as typeof this[key];
        } else if (typeof value === 'string' && this[key] instanceof Object && 'UNKNOWN' in this[key]) {
          this[key] = (this[key] as any)[value] || (this[key] as any).UNKNOWN;
        } else {
          this[key] = value as any;
        }
      }
    });
  }
}