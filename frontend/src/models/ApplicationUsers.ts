/**
 * application_users model.
 */

export enum ApplicationUserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DELETED = 'DELETED'
}

export interface ApplicationUsers {
  application_id: string;
  user_id: string;
  role_id: string;
  status: ApplicationUserStatus;
  created_at: number;
  updated_at: number;
}