/**
 * Roles model.
 */

export enum RoleType {
  ADMIN = 'ADMIN',  USER = 'USER',  GUEST = 'GUEST',  CUSTOM = 'CUSTOM'}
export enum RoleStatus {
  ACTIVE = 'ACTIVE',  INACTIVE = 'INACTIVE',  DELETED = 'DELETED'}

export interface Roles {
  role_id: string;
  user_id: string;
  application_id: string;
  role_name: string;
  role_type: RoleType;
  permissions: string[];
  status: RoleStatus;
  created_at: number;
  updated_at: number;
}