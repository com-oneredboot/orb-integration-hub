/**
 * Roles model.
 */

// Import enums used in this model
import { RoleType } from './RoleType.enum';
import { RoleStatus } from './RoleStatus.enum';

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

// QueryBy<SecondaryIndex>Input types
export type RolesQueryByUserIdInput = {
  user_id: string;  role_id: string;};
export type RolesQueryByApplicationIdInput = {
  application_id: string;  role_id: string;};
export type RolesQueryByRoleIdInput = {
  role_id: string;  role_type: string;};

// Response types
export type RolesCreateResponse = {
  StatusCode: number;
  Message: string;
  Data: IRoles | null;
};
export type RolesUpdateResponse = {
  StatusCode: number;
  Message: string;
  Data: IRoles | null;
};
export type RolesResponse = {
  RolesQueryByRoleId: {
    StatusCode: number;
    Message: string;
    Data: IRoles | null;
  };
};

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
  created_at: number = 0;
  updated_at: number = 0;

  constructor(data: Partial<IRoles> = {}) {
    Object.entries(data).forEach(([key, value]) => {
      if (key in this) {
        if (key === 'role_type' && typeof value === 'string') {
          this.role_type = RoleType[value as keyof typeof RoleType] ?? RoleType.UNKNOWN;
        } else 
        if (key === 'status' && typeof value === 'string') {
          this.status = RoleStatus[value as keyof typeof RoleStatus] ?? RoleStatus.UNKNOWN;
        } else 
        {
          this[key as keyof this] = value as any;
        }
      }
    });
  }
}
