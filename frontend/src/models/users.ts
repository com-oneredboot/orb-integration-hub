/**
 * Users model.
 */

export enum UserStatus {
  UNKNOWN = 'UNKNOWN',  ACTIVE = 'ACTIVE',  INACTIVE = 'INACTIVE',  PENDING = 'PENDING',  REJECTED = 'REJECTED',  DELETED = 'DELETED'}

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