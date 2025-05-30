/**
 * Generated TypeScript models for ApplicationUsers
 * Generated at 2025-05-30T11:43:03.898310
 */

// Import enums and models used in this model
import { ApplicationUserStatus } from './ApplicationUserStatus.enum';


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

// DTO Interface (API/DB contract)
export interface IApplicationUsers {
  applicationUserId: string;
  userId: string;
  applicationId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// Domain Model Class (uses enums for enum fields)
// Properties: '!' = required (definite assignment), '?' = optional (from schema)
export class ApplicationUsers {
  applicationUserId!: string;
  userId!: string;
  applicationId!: string;
  status!: ApplicationUserStatus;
  createdAt!: string;
  updatedAt!: string;

  constructor(data: Partial<ApplicationUsers> = {}) {
    Object.assign(this, data);
  }

  // Convert from DTO (IApplicationUsers) to domain model
  static fromDto(dto: IApplicationUsers): ApplicationUsers {
    return new ApplicationUsers({
      applicationUserId: dto.applicationUserId,
      userId: dto.userId,
      applicationId: dto.applicationId,
      status: ApplicationUserStatus[dto.status as keyof typeof ApplicationUserStatus] ?? ApplicationUserStatus.UNKNOWN,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    });
  }

  // Convert domain model to DTO (IApplicationUsers)
  toDto(): IApplicationUsers {
    return {
      applicationUserId: this.applicationUserId,
      userId: this.userId,
      applicationId: this.applicationId,
      status: this.status.toString(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
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
