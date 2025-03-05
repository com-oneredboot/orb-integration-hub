/**
 * User Model
 * Generated code - do not modify directly
 */

// Import enum types
import { UserStatus, UserGroups } from './user.enum';

export interface IUser {
  user_id: string;
  cognito_id: string;
  email: string;
  phone_number: string;
  phone_verified: boolean;
  first_name: string;
  last_name: string;
  groups: UserGroups[];
  status: UserStatus;
  created_at: number;
}

export class User implements IUser {
  user_id: string = '';
  cognito_id: string = '';
  email: string = '';
  phone_number: string = '';
  phone_verified: boolean = false;
  first_name: string = '';
  last_name: string = '';
  groups: UserGroups[] = [];
  status: UserStatus = UserStatus.UNKNOWN;
  created_at: number = 0;

  constructor(data: Partial<IUser> = {}) {
    Object.assign(this, data);
  }
}