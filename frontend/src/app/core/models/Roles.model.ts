/**
 * Generated TypeScript models for Roles
 * Generated at 2025-06-04T16:28:49.362580
 */

// Import enums and models used in this model
import { RoleStatus } from './RoleStatus.enum';
import { RoleType } from './RoleType.enum';


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

// DTO Interface (API/DB contract)
export interface IRoles {
  roleId: string;
  userId: string;
  roleType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// Domain Model Class (uses enums for enum fields)
// Properties: '!' = required (definite assignment), '?' = optional (from schema)
export class Roles {
  roleId!: string;
  userId?: string;
  roleType!: RoleType;
  status!: RoleStatus;
  createdAt!: string;
  updatedAt!: string;

  constructor(data: Partial<Roles> = {}) {
    Object.assign(this, data);
  }

  // Convert from DTO (IRoles) to domain model
  static fromDto(dto: IRoles): Roles {
    return new Roles({
      roleId: dto.roleId ?? '',
      userId: dto.userId ?? '',
      roleType: RoleType[dto.roleType as keyof typeof RoleType] ?? RoleType.UNKNOWN,
      status: RoleStatus[dto.status as keyof typeof RoleStatus] ?? RoleStatus.UNKNOWN,
      createdAt: dto.createdAt ?? '',
      updatedAt: dto.updatedAt ?? '',
    });
  }

  // Convert domain model to DTO (IRoles)
  toDto(): IRoles {
    return {
      roleId: this.roleId ?? '',
      userId: this.userId ?? '',
      roleType: (this.roleType ?? RoleType.UNKNOWN).toString(),
      status: (this.status ?? RoleStatus.UNKNOWN).toString(),
      createdAt: this.createdAt ?? '',
      updatedAt: this.updatedAt ?? '',
    };
  }

  // Returns a DTO with all fields set to their default values
  static emptyDto(): IRoles {
    return {
      roleId: '',
      userId: '',
      roleType: RoleType.UNKNOWN.toString(),
      status: RoleStatus.UNKNOWN.toString(),
      createdAt: '',
      updatedAt: '',
    };
  }
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
