/**
 * Applications model.
 */

export enum ApplicationStatus {
  ACTIVE = 'ACTIVE',  INACTIVE = 'INACTIVE',  PENDING = 'PENDING',  DELETED = 'DELETED'}

export interface IApplications {
  application_id: string;
  name: string;
  description: string;
  status: ApplicationStatus;
  created_at: number;
  updated_at: number;
  user_id: string;
}