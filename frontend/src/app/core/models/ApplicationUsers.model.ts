/**
 * Generated TypeScript models for ApplicationUsers
 * Generated at 2025-05-30T08:46:39.234099
 */

// Import enums and models used in this modelimport { ApplicationUserStatus } from './ApplicationUserStatus.enum';

// Input types
export interface ApplicationUsersCreateInput {
  applicationUserId: string;
  userId: string;
  applicationId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationUsersUpdateInput {
  applicationUserId?: string;
  userId?: string;
  applicationId?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Always include DeleteInput (PK fields only)
export interface ApplicationUsersDeleteInput {
  applicationUserId: string;
}

// Always include DisableInput (PK fields + disabled boolean)
export interface ApplicationUsersDisableInput {
  applicationUserId: string;
  disabled: boolean;
}

// QueryBy inputs for PK, SK, and all indexes
export interface ApplicationUsersQueryByApplicationUserIdInput {
  applicationUserId: string;
}
export interface ApplicationUsersQueryByUserIdInput {
  userId: string;
}
export interface ApplicationUsersQueryByApplicationIdInput {
  applicationId: string;
}

// Model
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
          this.status = ApplicationUserStatus[value as keyof typeof ApplicationUserStatus] ?? ApplicationUserStatus.UNKNOWN;
        } else 
        {
          this[key as keyof this] = value as this[keyof this];
        }
      }
    });
  }
}


export interface ApplicationUsers {
  applicationUserId: string;
  userId: string;
  applicationId: string;
  status: ApplicationUserStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ProperCase response types
export interface ApplicationUsersResponse {
  StatusCode: number;
  Message: string;
  Data: ApplicationUsers;
}

export interface ApplicationUsersListResponse {
  StatusCode: number;
  Message: string;
  Data: ApplicationUsers[];
}

// CRUD response aliases
export type ApplicationUsersCreateResponse = ApplicationUsersResponse;
export type ApplicationUsersUpdateResponse = ApplicationUsersResponse;
export type ApplicationUsersDeleteResponse = ApplicationUsersResponse;
export type ApplicationUsersDisableResponse = ApplicationUsersResponse;
