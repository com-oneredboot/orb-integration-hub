/**
 * ApplicationUsers model.
 */

export enum ApplicationUserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  REJECTED = 'REJECTED',
  DELETED = 'DELETED'
}


export interface IApplicationUsers {
  application_id: string;
  user_id: string;
  role_id: string;
  status: ApplicationUserStatus;
  created_at: number;
  updated_at: number;
}