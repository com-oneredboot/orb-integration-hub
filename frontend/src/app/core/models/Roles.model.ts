/**
 * Generated TypeScript models for Roles
 * Generated at 2025-05-30T08:46:39.396239
 */

// Import enums and models used in this modelimport { RoleType } from './RoleType.enum';import { RoleStatus } from './RoleStatus.enum';

// Input types
export interface RolesCreateInput {
  roleId: string;
  userId: string;
  roleType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface RolesUpdateInput {
  roleId?: string;
  userId?: string;
  roleType?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Always include DeleteInput (PK fields only)
export interface RolesDeleteInput {
  roleId: string;
}

// Always include DisableInput (PK fields + disabled boolean)
export interface RolesDisableInput {
  roleId: string;
  disabled: boolean;
}

// QueryBy inputs for PK, SK, and all indexes
export interface RolesQueryByRoleIdInput {
  roleId: string;
}
export interface RolesQueryByUserIdInput {
  userId: string;
}

// Model
export interface IRoles {
  roleId: string;
  userId: string;
  roleType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export class Roles implements IRoles {
  roleId = '';
  userId = '';
  roleType = '';
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


export interface Roles {
  roleId: string;
  userId: string;
  roleType: RoleType;
  status: RoleStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ProperCase response types
export interface RolesResponse {
  StatusCode: number;
  Message: string;
  Data: Roles;
}

export interface RolesListResponse {
  StatusCode: number;
  Message: string;
  Data: Roles[];
}

// CRUD response aliases
export type RolesCreateResponse = RolesResponse;
export type RolesUpdateResponse = RolesResponse;
export type RolesDeleteResponse = RolesResponse;
export type RolesDisableResponse = RolesResponse;
