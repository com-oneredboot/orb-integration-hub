/**
 * Roles model.
 */

// Import enums used in this model
import { RoleType } from './RoleType.enum';
import { RoleStatus } from './RoleStatus.enum';

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

// CreateInput
export type RolesCreateInput = {
  user_id: string;
  application_id: string;
  role_name: string;
  role_type: RoleType;
  permissions: string[];
  status: RoleStatus;
  created_at: number;
  updated_at: number;
};

// UpdateInput
export type RolesUpdateInput = Partial<IRoles>;

// QueryBy<PartitionKey>Input
export type RolesQueryByRoleIdInput = {
  role_id: string;
};

// Response types
export type RolesCreateResponse = {
  StatusCode: number;
  Message: string;
  Data: IRoles;
};
export type RolesUpdateResponse = {
  StatusCode: number;
  Message: string;
  Data: IRoles;
};
export type RolesResponse = {
  RolesQueryByRoleId: {
    StatusCode: number;
    Message: string;
    Data: IRoles;
  };
};

export class Roles implements IRoles {
  role_id: string = '';
  user_id: string = '';
  application_id: string = '';
  role_name: string = '';
  role_type: RoleType = RoleType.UNKNOWN;
  permissions: string[] = [];
  status: RoleStatus = RoleStatus.UNKNOWN;
  created_at: number = 0;
  updated_at: number = 0;

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