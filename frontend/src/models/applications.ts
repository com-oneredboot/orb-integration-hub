/**
 * applications model.
 */

export enum ApplicationStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DELETED = 'DELETED'
}

export interface Applications {
  application_id: string;
  name: string;
  description: string;
  status: ApplicationStatus;
  created_at: number;
  updated_at: number;
  user_id: string;
}