/**
 *  DynamoDB model.
 */

// Import enums and models used in this model
import { ApplicationUserStatus } from './ApplicationUserStatus.enum';

// CreateInput
export type CreateInput = {
  applicationId: string;
  userId: string;
  roleId: string | undefined;
  status: string;
  createdAt: string;
  updatedAt: string;
};

// UpdateInput
export type UpdateInput = {
  applicationId: string;
  userId: string;
  roleId: string | undefined;
  status: string;
  createdAt: string;
  updatedAt: string;
};

// QueryInput
// Primary key queries
export type QueryByApplicationIdInput = {
  applicationId: string;
};

export type QueryByUserIdInput = {
  userId: string;
};

export type QueryByBothInput = {
  applicationId: string;
  userId: string;
};

// Secondary index queries

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
  applicationId: string;
  userId: string;
  roleId: string | undefined;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export class  implements I {
  applicationId = '';
  userId = '';
  roleId = '';
  status = '';
  createdAt = '';
  updatedAt = '';

  constructor(data: Partial<I> = {}) {
    Object.entries(data).forEach(([key, value]) => {
      if (key in this) {
        if (key === 'status' && typeof value === 'string') {
          this.status = ApplicationUserStatus[value as keyof typeof ApplicationUserStatus] ?? ApplicationUserStatus.UNKNOWN;
        } else 
        {
          this[key as keyof this] = value as this[keyof this];
        }
      }
    });
  }
} 