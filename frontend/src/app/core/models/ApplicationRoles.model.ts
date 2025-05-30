/**
 * Generated TypeScript models for ApplicationRoles
 * Generated at 2025-05-30T08:46:39.113429
 */

// Import enums and models used in this modelimport { RoleType } from './RoleType.enum';import { RoleStatus } from './RoleStatus.enum';

// Input types
export interface ApplicationRolesCreateInput {
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

export interface ApplicationRolesUpdateInput {
  applicationRoleId?: string;
  userId?: string;
  applicationId?: string;
  roleId?: string;
  roleName?: string;
  roleType?: string;
  permissions?: string[];
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Always include DeleteInput (PK fields only)
export interface ApplicationRolesDeleteInput {
  applicationRoleId: string;
}

// Always include DisableInput (PK fields + disabled boolean)
export interface ApplicationRolesDisableInput {
  applicationRoleId: string;
  disabled: boolean;
}

// QueryBy inputs for PK, SK, and all indexes
export interface ApplicationRolesQueryByApplicationRoleIdInput {
  applicationRoleId: string;
}
export interface ApplicationRolesQueryByUserIdInput {
  userId: string;
}
export interface ApplicationRolesQueryByApplicationIdInput {
  applicationId: string;
}
export interface ApplicationRolesQueryByRoleIdInput {
  roleId: string;
}

// Model
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


export interface ApplicationRoles {
  applicationRoleId: string;
  userId: string;
  applicationId: string;
  roleId: string;
  roleName: string;
  roleType: RoleType;
  permissions: string[];
  status: RoleStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ProperCase response types
export interface ApplicationRolesResponse {
  StatusCode: number;
  Message: string;
  Data: ApplicationRoles;
}

export interface ApplicationRolesListResponse {
  StatusCode: number;
  Message: string;
  Data: ApplicationRoles[];
}

// CRUD response aliases
export type ApplicationRolesCreateResponse = ApplicationRolesResponse;
export type ApplicationRolesUpdateResponse = ApplicationRolesResponse;
export type ApplicationRolesDeleteResponse = ApplicationRolesResponse;
export type ApplicationRolesDisableResponse = ApplicationRolesResponse;
