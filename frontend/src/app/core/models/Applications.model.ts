/**
 * Generated TypeScript models for Applications
 * Generated at 2025-05-30T08:46:39.164804
 */

// Import enums and models used in this modelimport { ApplicationStatus } from './ApplicationStatus.enum';

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

// Model
export interface IApplications {
  applicationId: string;
  name: string;
  ownerId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export class Applications implements IApplications {
  applicationId = '';
  name = '';
  ownerId = '';
  status = '';
  createdAt = '';
  updatedAt = '';
  constructor(data: Partial<IApplications> = {}) {
    Object.entries(data).forEach(([key, value]) => {
      if (key in this) {
        if (key === 'status' && typeof value === 'string') {
          this.status = ApplicationStatus[value as keyof typeof ApplicationStatus] ?? ApplicationStatus.UNKNOWN;
        } else 
        {
          this[key as keyof this] = value as this[keyof this];
        }
      }
    });
  }
}


export interface Applications {
  applicationId: string;
  name: string;
  ownerId: string;
  status: ApplicationStatus;
  createdAt: Date;
  updatedAt: Date;
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
