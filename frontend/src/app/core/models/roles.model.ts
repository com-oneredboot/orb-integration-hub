/**
 * Roles DynamoDB model.
 */

// Import enums and models used in this model
import { RoleType } from './RoleType.enum';
import { RoleStatus } from './RoleStatus.enum';

// CreateInput
export type RolesCreateInput = {
  roleId: string;
  userId: string;
  applicationId: string;
  roleName: string;
  roleType: string;
  permissions: any[];
  status: string;
  createdAt: string;
  updatedAt: string;
};

// UpdateInput
export type RolesUpdateInput = {
  roleId: string;
  userId: string;
  applicationId: string;
  roleName: string;
  roleType: string;
  permissions: any[];
  status: string;
  createdAt: string;
  updatedAt: string;
};

// QueryInput
// Primary key queries
export type RolesQueryByRoleIdInput = {
  roleId: string;
};

export type RolesQueryByApplicationIdInput = {
  applicationId: string;
};

export type RolesQueryByBothInput = {
  roleId: string;
  applicationId: string;
};

// Secondary index queries
export type RolesQueryByUserIdInput = {
  userId: string;
};

// Response types
export type RolesResponse = {
  statusCode: number;
  message: string;
  data: IRoles | null;
};

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

export interface IRoles {
  roleId: string;
  userId: string;
  applicationId: string;
  roleName: string;
  roleType: string;
  permissions: any[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

export class Roles implements IRoles {
  roleId = '';
  userId = '';
  applicationId = '';
  roleName = '';
  roleType = '';
  permissions = [];
  status = '';
  createdAt = '';
  updatedAt = '';

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
          this[key as keyof this] = value as this[keyof this];
        }
      }
    });
  }
} 