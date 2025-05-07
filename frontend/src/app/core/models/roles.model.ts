/**
 * Roles model.
 */

// Import enums used in this model
import { RoleType } from './RoleType.enum';
import { RoleStatus } from './RoleStatus.enum';

// CreateInput
export type RolesCreateInput = {
  userId: string;
  applicationId: string;
  roleName: string;
  roleType: RoleType;
  permissions: string[];
  status: RoleStatus;
  createdAt: number;
  updatedAt: number;
};

// UpdateInput
export type RolesUpdateInput = Partial<IRoles>;

// QueryBy<PartitionKey>Input
// QueryBy<SecondaryIndex>Input types
export type RolesQueryByRoleIdInput = {
    roleId: string;
    roleType?: string;
};
export type RolesQueryByUserIdInput = {
    userId: string;
    roleId?: string;
};
export type RolesQueryByApplicationIdInput = {
    applicationId: string;
    roleId?: string;
};

// Response types
export type RolesCreateResponse = {
  statusCode: number;
  message: string;
  data: IRoles | null;
};
export type RolesUpdateResponse = {
  statusCode: number;
  message: string;
  data: IRoles | null;
};
export type RolesResponse = {
  RolesQueryByRoleId: {
    statusCode: number;
    message: string;
    data: IRoles | null;
  };
};

export interface IRoles {
  roleId: string;
  userId: string;
  applicationId: string;
  roleName: string;
  roleType: RoleType;
  permissions: string[];
  status: RoleStatus;
  createdAt: number;
  updatedAt: number;
}

export class Roles implements IRoles {
  roleId: string = '';
  userId: string = '';
  applicationId: string = '';
  roleName: string = '';
  roleType: RoleType = RoleType.UNKNOWN;
  permissions: string[] = [];
  status: RoleStatus = RoleStatus.UNKNOWN;
  createdAt: number = 0;
  updatedAt: number = 0;

  constructor(data: Partial<IRoles> = {}) {
    Object.entries(data).forEach(([key, value]) => {
      if (key in this) {
        if (key === 'roleType' && typeof value === 'string') {
          this.roleType = RoleType[value as keyof typeof RoleType] ?? RoleType.UNKNOWN;
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
