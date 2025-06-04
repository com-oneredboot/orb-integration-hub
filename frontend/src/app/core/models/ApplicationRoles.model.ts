/**
 * Generated TypeScript models for ApplicationRoles
 * Generated at 2025-06-04T10:59:51.352967
 */

// Import enums and models used in this model
import { RoleStatus } from './RoleStatus.enum';
import { RoleType } from './RoleType.enum';


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

// DTO Interface (API/DB contract)
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

// Domain Model Class (uses enums for enum fields)
// Properties: '!' = required (definite assignment), '?' = optional (from schema)
export class ApplicationRoles {
  applicationRoleId!: string;
  userId!: string;
  applicationId!: string;
  roleId!: string;
  roleName!: string;
  roleType!: RoleType;
  permissions!: string[];
  status!: RoleStatus;
  createdAt!: string;
  updatedAt!: string;

  constructor(data: Partial<ApplicationRoles> = {}) {
    Object.assign(this, data);
  }

  // Convert from DTO (IApplicationRoles) to domain model
  static fromDto(dto: IApplicationRoles): ApplicationRoles {
    return new ApplicationRoles({
      applicationRoleId: dto.applicationRoleId ?? '',
      userId: dto.userId ?? '',
      applicationId: dto.applicationId ?? '',
      roleId: dto.roleId ?? '',
      roleName: dto.roleName ?? '',
      roleType: RoleType[dto.roleType as keyof typeof RoleType] ?? RoleType.UNKNOWN,
      permissions: dto.permissions ?? [],
      status: RoleStatus[dto.status as keyof typeof RoleStatus] ?? RoleStatus.UNKNOWN,
      createdAt: dto.createdAt ?? '',
      updatedAt: dto.updatedAt ?? '',
    });
  }

  // Convert domain model to DTO (IApplicationRoles)
  toDto(): IApplicationRoles {
    return {
      applicationRoleId: this.applicationRoleId ?? '',
      userId: this.userId ?? '',
      applicationId: this.applicationId ?? '',
      roleId: this.roleId ?? '',
      roleName: this.roleName ?? '',
      roleType: (this.roleType ?? RoleType.UNKNOWN).toString(),
      permissions: this.permissions ?? [],
      status: (this.status ?? RoleStatus.UNKNOWN).toString(),
      createdAt: this.createdAt ?? '',
      updatedAt: this.updatedAt ?? '',
    };
  }

  // Returns a DTO with all fields set to their default values
  static emptyDto(): IApplicationRoles {
    return {
      applicationRoleId: '',
      userId: '',
      applicationId: '',
      roleId: '',
      roleName: '',
      roleType: RoleType.UNKNOWN.toString(),
      permissions: [],
      status: RoleStatus.UNKNOWN.toString(),
      createdAt: '',
      updatedAt: '',
    };
  }
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
