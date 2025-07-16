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
  createdAt: number;
  updatedAt: number;
};

// UpdateInput
export type ApplicationUsersUpdateInput = {
  applicationUserId: string;
  userId: string;
  applicationId: string;
  status: string;
  createdAt: number;
  updatedAt: number;
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
  StatusCode: number;
  Message: string;
  Data: ApplicationUsers | null;
};

export type ApplicationUsersCreateResponse = {
  StatusCode: number;
  Message: string;
  Data: ApplicationUsers | null;
};

export type ApplicationUsersUpdateResponse = {
  StatusCode: number;
  Message: string;
  Data: ApplicationUsers | null;
};

export type ApplicationUsersListResponse = {
  StatusCode: number;
  Message: string;
  Data: ApplicationUsers[] | null;
};

// GraphQL Response Wrappers
export type ApplicationUsersCreateMutationResponse = {
  ApplicationUsersCreate: ApplicationUsersCreateResponse;
};

export type ApplicationUsersUpdateMutationResponse = {
  ApplicationUsersUpdate: ApplicationUsersUpdateResponse;
};

export type ApplicationUsersDeleteMutationResponse = {
  ApplicationUsersDelete: ApplicationUsersResponse;
};

export type ApplicationUsersQueryByApplicationUserIdResponse = {
  ApplicationUsersQueryByApplicationUserId: ApplicationUsersResponse;
};

export type ApplicationUsersQueryByUserIdResponse = {
  ApplicationUsersQueryByUserId: ApplicationUsersListResponse;
};
export type ApplicationUsersQueryByApplicationIdResponse = {
  ApplicationUsersQueryByApplicationId: ApplicationUsersListResponse;
};

export interface IApplicationUsers {
  applicationUserId: string;
  userId: string;
  applicationId: string;
  status: ApplicationUserStatus;
  createdAt: number;
  updatedAt: number;
}

export class ApplicationUsers implements IApplicationUsers {
  applicationUserId = '';
  userId = '';
  applicationId = '';
  status = ApplicationUserStatus.UNKNOWN;
  createdAt = 0;
  updatedAt = 0;

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