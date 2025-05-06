/**
 * ApplicationUsers model.
 */

export enum ApplicationUserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  REJECTED = 'REJECTED',
  DELETED = 'DELETED'}

export interface IApplicationUsers {
  application_id: string;
  user_id: string;
  role_id: string?;
  status: ApplicationUserStatus;
  created_at: number;
  updated_at: number;
}

export class ApplicationUsers implements IApplicationUsers {
  application_id: string = '';
  user_id: string = '';
  role_id: string = undefined;
  status: ApplicationUserStatus = ApplicationUserStatus.UNKNOWN;
  created_at: number = 0;
  updated_at: number = 0;

  constructor(data: Partial<IApplicationUsers> = {}) {
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