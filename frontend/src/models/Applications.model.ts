/**
 * Applications DynamoDB model.
 */

// Import enums and models used in this model
import { ApplicationStatus } from './ApplicationStatus.enum';

// CreateInput
export type ApplicationsCreateInput = {
  applicationId: string;
  name: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
};

// UpdateInput
export type ApplicationsUpdateInput = {
  applicationId: string;
  name: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
};

// QueryInput
export type ApplicationsQueryByApplicationIdInput = {
  applicationId: string;
};

export type ApplicationsQueryByCreatedAtInput = {
  createdAt: string;
};

export type ApplicationsQueryByBothInput = {
  applicationId: string;
  createdAt: string;
};

export type ApplicationsQueryByNameInput = {
  name: string;
};

// Response types
export type ApplicationsResponse = {
  statusCode: number;
  message: string;
  data: IApplications | null;
};

export type ApplicationsCreateResponse = {
  statusCode: number;
  message: string;
  data: IApplications | null;
};

export type ApplicationsUpdateResponse = {
  statusCode: number;
  message: string;
  data: IApplications | null;
};

export interface IApplications {
  applicationId: string;
  name: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export class Applications implements IApplications {
  applicationId = '';
  name = '';
  description = '';
  status = '';
  createdAt = '';
  updatedAt = '';
  userId = '';

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