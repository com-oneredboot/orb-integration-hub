/**
 * users model.
 */

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DELETED = 'DELETED'
}

export interface Users {
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