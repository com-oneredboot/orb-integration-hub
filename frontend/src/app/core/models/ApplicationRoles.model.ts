/**
 *  DynamoDB model.
 */

// Import enums and models used in this model
import { RoleType } from './RoleType.enum';
import { RoleStatus } from './RoleStatus.enum';

// CreateInput
export type CreateInput = {
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
export type UpdateInput = {
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
export type QueryByApplicationIdInput = {
  applicationId: string;
};

export type QueryByRoleIdInput = {
  roleId: string;
};

export type QueryByBothInput = {
  applicationId: string;
  roleId: string;
};

// Secondary index queries
export type QueryByUserIdInput = {
  userId: string;
};

// Response types
export type Response = {
  statusCode: number;
  message: string;
  data: I | null;
};

export type CreateResponse = {
  statusCode: number;
  message: string;
  data: I | null;
};

export type UpdateResponse = {
  statusCode: number;
  message: string;
  data: I | null;
};

export interface I {
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

export class  implements I {
  roleId = '';
  userId = '';
  applicationId = '';
  roleName = '';
  roleType = '';
  permissions = [];
  status = '';
  createdAt = '';
  updatedAt = '';

  constructor(data: Partial<I> = {}) {
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