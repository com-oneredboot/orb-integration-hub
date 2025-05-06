/**
 * ApplicationRoles model.
 */

// Import enums used in this model
import { ApplicationRoleStatus } from './ApplicationRoleStatus.enum';

// CreateInput
export type ApplicationRolesCreateInput = {
  role_id: string;
  description: string;
  status: ApplicationRoleStatus;
  created_at: number;
  updated_at: number;
};

// UpdateInput
export type ApplicationRolesUpdateInput = Partial<IApplicationRoles>;

// QueryBy<PartitionKey>Input
export type ApplicationRolesQueryByApplicationIdInput = {
  application_id: string;
};

// QueryBy<SecondaryIndex>Input types
export type ApplicationRolesQueryByRoleIdInput = {
  role_id: string;  application_id: string;};

// Response types
export type ApplicationRolesCreateResponse = {
  StatusCode: number;
  Message: string;
  Data: IApplicationRoles | null;
};
export type ApplicationRolesUpdateResponse = {
  StatusCode: number;
  Message: string;
  Data: IApplicationRoles | null;
};
export type ApplicationRolesResponse = {
  ApplicationRolesQueryByApplicationId: {
    StatusCode: number;
    Message: string;
    Data: IApplicationRoles | null;
  };
};

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
  created_at: number = 0;
  updated_at: number = 0;

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
