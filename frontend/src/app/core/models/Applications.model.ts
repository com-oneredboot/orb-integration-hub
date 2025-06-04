/**
 * Generated TypeScript models for Applications
 * Generated at 2025-06-04T10:49:55.364298
 */

// Import enums and models used in this model
import { ApplicationStatus } from './ApplicationStatus.enum';


// Input types
export interface ApplicationsCreateInput {
  applicationId: string;
  name: string;
  ownerId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationsUpdateInput {
  applicationId?: string;
  name?: string;
  ownerId?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Always include DeleteInput (PK fields only)
export interface ApplicationsDeleteInput {
  applicationId: string;
}

// Always include DisableInput (PK fields + disabled boolean)
export interface ApplicationsDisableInput {
  applicationId: string;
  disabled: boolean;
}

// QueryBy inputs for PK, SK, and all indexes
export interface ApplicationsQueryByApplicationIdInput {
  applicationId: string;
}

// DTO Interface (API/DB contract)
export interface IApplications {
  applicationId: string;
  name: string;
  ownerId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// Domain Model Class (uses enums for enum fields)
// Properties: '!' = required (definite assignment), '?' = optional (from schema)
export class Applications {
  applicationId!: string;
  name!: string;
  ownerId!: string;
  status!: ApplicationStatus;
  createdAt!: string;
  updatedAt!: string;

  constructor(data: Partial<Applications> = {}) {
    Object.assign(this, data);
  }

  // Convert from DTO (IApplications) to domain model
  static fromDto(dto: IApplications): Applications {
    return new Applications({
      applicationId: dto.applicationId ?? '',
      name: dto.name ?? '',
      ownerId: dto.ownerId ?? '',
      status: ApplicationStatus[dto.status as keyof typeof ApplicationStatus] ?? ApplicationStatus.UNKNOWN,
      createdAt: dto.createdAt ?? '',
      updatedAt: dto.updatedAt ?? '',
    });
  }

  // Convert domain model to DTO (IApplications)
  toDto(): IApplications {
    return {
      applicationId: this.applicationId ?? '',
      name: this.name ?? '',
      ownerId: this.ownerId ?? '',
      status: this.status.toString(),
      createdAt: this.createdAt ?? '',
      updatedAt: this.updatedAt ?? '',
    };
  }
}


// ProperCase response types
export interface ApplicationsResponse {
  StatusCode: number;
  Message: string;
  Data: Applications;
}

export interface ApplicationsListResponse {
  StatusCode: number;
  Message: string;
  Data: Applications[];
}

// CRUD response aliases
export type ApplicationsCreateResponse = ApplicationsResponse;
export type ApplicationsUpdateResponse = ApplicationsResponse;
export type ApplicationsDeleteResponse = ApplicationsResponse;
export type ApplicationsDisableResponse = ApplicationsResponse;
