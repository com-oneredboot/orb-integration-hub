/**
 *  DynamoDB model.
 */

// Import enums and models used in this model
import { RoleType } from './RoleType.enum';
import { UserStatus } from './UserStatus.enum';

// CreateInput
export type CreateInput = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  roleType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

// UpdateInput
export type UpdateInput = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  roleType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

// QueryInput
// Primary key queries
export type QueryByIdInput = {
  id: string;
};

export type QueryByEmailInput = {
  email: string;
};

export type QueryByBothInput = {
  id: string;
  email: string;
};

// Secondary index queries
export type QueryByRoleIdInput = {
  roleId: string;
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
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  roleType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export class  implements I {
  id = '';
  email = '';
  firstName = '';
  lastName = '';
  roleId = '';
  roleType = '';
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
          this.status = UserStatus[value as keyof typeof UserStatus] ?? UserStatus.UNKNOWN;
        } else 
        {
          this[key as keyof this] = value as this[keyof this];
        }
      }
    });
  }
} 