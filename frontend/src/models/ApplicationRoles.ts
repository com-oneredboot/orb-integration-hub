/**
 * application_roles model.
 */

export enum ApplicationRoleStatus {
  ACTIVE = 'ACTIVE',  INACTIVE = 'INACTIVE',  PENDING = 'PENDING',  REJECTED = 'REJECTED',  DELETED = 'DELETED'}

export interface ApplicationRoles {
  application_id: string;
  role_id: string;
  description: string;
  status: ApplicationRoleStatus;
  created_at: number;
  updated_at: number;
}