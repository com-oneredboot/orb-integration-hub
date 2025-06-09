/**
 * Roles model.
 */

// Import enums and models used in this model
import { RoleType } from './RoleTypeEnum';
import { RoleStatus } from './RoleStatusEnum';

// CreateInput
export type RolesCreateInput = {
  roleId: string;
  userId: string | undefined;
  roleType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

// UpdateInput
export type RolesUpdateInput = {
  roleId: string;
  userId: string | undefined;
  roleType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

// QueryInput
export type RolesQueryByRoleIdInput = {
  roleId: string;
};


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
  userId: string | undefined;
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