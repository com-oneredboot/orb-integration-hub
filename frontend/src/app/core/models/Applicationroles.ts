/**
 * ApplicationRoles model.
 */

export enum ApplicationRoleStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  REJECTED = 'REJECTED',
  DELETED = 'DELETED'}

export interface IApplicationRoles {
  application_id: string;
  role_id: string;
  description: string;
  status: ApplicationRoleStatus;
  created_at: number;
  updated_at: number;
}

export class ApplicationRoles implements IApplicationRoles {
  application_id: string = '';
  role_id: string = '';
  description: string = '';
  status: ApplicationRoleStatus = ApplicationRoleStatus.UNKNOWN;
  created_at: number = '';
  updated_at: number = '';

  constructor(data: Partial<IApplicationRoles> = {}) {
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