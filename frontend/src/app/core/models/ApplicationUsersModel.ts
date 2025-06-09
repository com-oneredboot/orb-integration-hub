/**
 * ApplicationUsers model.
 */

// Import enums and models used in this model
import { ApplicationUserStatus } from './ApplicationUserStatusEnum';

// CreateInput
export type ApplicationUsersCreateInput = {
  applicationUserId: string;
  userId: string;
  applicationId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

// UpdateInput
export type ApplicationUsersUpdateInput = {
  applicationUserId: string;
  userId: string;
  applicationId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

// QueryInput
export type ApplicationUsersQueryByApplicationUserIdInput = {
  applicationUserId: string;
};


export type ApplicationUsersQueryByUserIdInput = {
  userId: string;
};
export type ApplicationUsersQueryByApplicationIdInput = {
  applicationId: string;
};

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
  applicationUserId: string;
  userId: string;
  applicationId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export class ApplicationUsers implements IApplicationUsers {
  applicationUserId = '';
  userId = '';
  applicationId = '';
  status = '';
  createdAt = '';
  updatedAt = '';

  constructor(data: Partial<IApplicationUsers> = {}) {
    Object.entries(data).forEach(([key, value]) => {
      if (key in this) {
        if (key === 'status' && typeof value === 'string') {
          this.status = ApplicationUserStatusEnum[value as keyof typeof ApplicationUserStatusEnum] ?? ApplicationUserStatusEnum.UNKNOWN;
        } else 
        {
          this[key as keyof this] = value as this[keyof this];
        }
      }
    });
  }
} 