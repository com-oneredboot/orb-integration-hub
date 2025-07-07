/**
 * Applications model.
 */

// Import enums and models used in this model
import { ApplicationStatus } from './ApplicationStatusEnum';

// CreateInput
export type ApplicationsCreateInput = {
  applicationId: string;
  name: string;
  organizationId: string;
  ownerId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  apiKey: string;
  apiKeyNext: string | undefined;
  environments: string[];
};

// UpdateInput
export type ApplicationsUpdateInput = {
  applicationId: string;
  name: string;
  organizationId: string;
  ownerId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  apiKey: string;
  apiKeyNext: string | undefined;
  environments: string[];
};

// QueryInput
export type ApplicationsQueryByApplicationIdInput = {
  applicationId: string;
};


export type ApplicationsQueryByOrganizationIdInput = {
  organizationId: string;
};

// Response types
export type ApplicationsResponse = {
  StatusCode: number;
  Message: string;
  Data: Applications | null;
};

export type ApplicationsCreateResponse = {
  StatusCode: number;
  Message: string;
  Data: Applications | null;
};

export type ApplicationsUpdateResponse = {
  StatusCode: number;
  Message: string;
  Data: Applications | null;
};

export type ApplicationsListResponse = {
  StatusCode: number;
  Message: string;
  Data: Applications[] | null;
};

export interface IApplications {
  applicationId: string;
  name: string;
  organizationId: string;
  ownerId: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  apiKey: string;
  apiKeyNext: string | undefined;
  environments: string[];
}

export class Applications implements IApplications {
  applicationId = '';
  name = '';
  organizationId = '';
  ownerId = '';
  status = ApplicationStatus.UNKNOWN;
  createdAt = '';
  updatedAt = '';
  apiKey = '';
  apiKeyNext = '';
  environments = [];

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