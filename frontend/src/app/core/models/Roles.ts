/**
 * Roles model.
 */

export enum RoleType {
  ADMIN = 'ADMIN',
  USER = 'USER',
  GUEST = 'GUEST',
  CUSTOM = 'CUSTOM'}
export enum RoleStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DELETED = 'DELETED'}

export interface IRoles {
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

export class Roles implements IRoles {
  role_id: string = '';
  user_id: string = '';
  application_id: string = '';
  role_name: string = '';
  role_type: RoleType = RoleType.UNKNOWN;
  permissions: string[] = [];
  status: RoleStatus = RoleStatus.UNKNOWN;
  created_at: number = '';
  updated_at: number = '';

  constructor(data: Partial<IRoles> = {}) {
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