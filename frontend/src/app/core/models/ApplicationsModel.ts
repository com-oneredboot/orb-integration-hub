/**
 * Applications model.
 */

// Import enums and models used in this model
import { ApplicationStatus } from './ApplicationStatusEnum';

// CreateInput
export type ApplicationsCreateInput = {
  applicationId: string;
  name: string;
  ownerId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

// UpdateInput
export type ApplicationsUpdateInput = {
  applicationId: string;
  name: string;
  ownerId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

// QueryInput
export type ApplicationsQueryByApplicationIdInput = {
  applicationId: string;
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
  ownerId: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

export class Applications implements IApplications {
  applicationId = '';
  name = '';
  ownerId = '';
  status = ApplicationStatus.UNKNOWN;
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