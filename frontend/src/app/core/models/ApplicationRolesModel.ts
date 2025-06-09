/**
 * ApplicationRoles model.
 */

// Import enums and models used in this model
import { RoleType } from './RoleTypeEnum';
import { RoleStatus } from './RoleStatusEnum';

// CreateInput
export type ApplicationRolesCreateInput = {
  applicationRoleId: string;
  userId: string;
  applicationId: string;
  roleId: string;
  roleName: string;
  roleType: string;
  permissions: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
};

// UpdateInput
export type ApplicationRolesUpdateInput = {
  applicationRoleId: string;
  userId: string;
  applicationId: string;
  roleId: string;
  roleName: string;
  roleType: string;
  permissions: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
};

// QueryInput
export type ApplicationRolesQueryByApplicationRoleIdInput = {
  applicationRoleId: string;
};


export type ApplicationRolesQueryByUserIdInput = {
  userId: string;
};
export type ApplicationRolesQueryByApplicationIdInput = {
  applicationId: string;
};
export type ApplicationRolesQueryByRoleIdInput = {
  roleId: string;
};

// Response types
export type ApplicationRolesResponse = {
  statusCode: number;
  message: string;
  data: IApplicationRoles | null;
};

export type ApplicationRolesCreateResponse = {
  statusCode: number;
  message: string;
  data: IApplicationRoles | null;
};

export type ApplicationRolesUpdateResponse = {
  statusCode: number;
  message: string;
  data: IApplicationRoles | null;
};

export interface IApplicationRoles {
  applicationRoleId: string;
  userId: string;
  applicationId: string;
  roleId: string;
  roleName: string;
  roleType: string;
  permissions: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

export class ApplicationRoles implements IApplicationRoles {
  applicationRoleId = '';
  userId = '';
  applicationId = '';
  roleId = '';
  roleName = '';
  roleType = '';
  permissions = [];
  status = '';
  createdAt = '';
  updatedAt = '';

  constructor(data: Partial<IApplicationRoles> = {}) {
    Object.entries(data).forEach(([key, value]) => {
      if (key in this) {
        if (key === 'roleType' && typeof value === 'string') {
          this.roleType = RoleTypeEnum[value as keyof typeof RoleTypeEnum] ?? RoleTypeEnum.UNKNOWN;
        } else 
        if (key === 'status' && typeof value === 'string') {
          this.status = RoleStatusEnum[value as keyof typeof RoleStatusEnum] ?? RoleStatusEnum.UNKNOWN;
        } else 
        {
          this[key as keyof this] = value as this[keyof this];
        }
      }
    });
  }
} 