/**
 * ApplicationUsers DynamoDB model.
 */

// Import enums and models used in this model
import { ApplicationUserStatus } from './ApplicationUserStatus.enum';

// CreateInput
export type ApplicationUsersCreateInput = {
  applicationId: string;
  userId: string;
  roleId: string | undefined;
  status: string;
  createdAt: string;
  updatedAt: string;
};

// UpdateInput
export type ApplicationUsersUpdateInput = {
  applicationId: string;
  userId: string;
  roleId: string | undefined;
  status: string;
  createdAt: string;
  updatedAt: string;
};

// QueryInput
// Primary key queries
export type ApplicationUsersQueryByApplicationIdInput = {
  applicationId: string;
};

export type ApplicationUsersQueryByUserIdInput = {
  userId: string;
};

export type ApplicationUsersQueryByBothInput = {
  applicationId: string;
  userId: string;
};

// Secondary index queries

// Response types
export type ApplicationUsersResponse = {
  statusCode: number;
  message: string;
  data: IApplicationUsers | null;
};

export type ApplicationUsersCreateResponse = {
  statusCode: number;
  message: string;
  data: IApplicationUsers | null;
};

export type ApplicationUsersUpdateResponse = {
  statusCode: number;
  message: string;
  data: IApplicationUsers | null;
};

export interface IApplicationUsers {
  applicationId: string;
  userId: string;
  roleId: string | undefined;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export class ApplicationUsers implements IApplicationUsers {
  applicationId = '';
  userId = '';
  roleId = '';
  status = '';
  createdAt = '';
  updatedAt = '';

  constructor(data: Partial<IApplicationUsers> = {}) {
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