/**
 *  DynamoDB model.
 */

/*
 * schema.table: 
 * schema.name: Applications
 */

// Import enums and models used in this model
import { ApplicationType } from './ApplicationType.enum';
import { ApplicationStatus } from './ApplicationStatus.enum';

// CreateInput
export type ApplicationsCreateInput = {
  id: string;
  name: string;
  description: string | undefined;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

// UpdateInput
export type ApplicationsUpdateInput = {
  id: string;
  name: string;
  description: string | undefined;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

// QueryInput
// Primary key queries
export type ApplicationsQueryByIdInput = {
  id: string;
};

export type ApplicationsQueryByNameInput = {
  name: string;
};

export type ApplicationsQueryByBothInput = {
  id: string;
  name: string;
};

// Secondary index queries
export type ApplicationsQueryByStatusInput = {
  status: string;
};
export type ApplicationsQueryByTypeInput = {
  type: string;
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
  id: string;
  name: string;
  description: string | undefined;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export class Applications implements IApplications {
  id = '';
  name = '';
  description = '';
  type = '';
  status = '';
  createdAt = '';
  updatedAt = '';

  constructor(data: Partial<IApplications> = {}) {
    Object.entries(data).forEach(([key, value]) => {
      if (key in this) {
        if (key === 'type' && typeof value === 'string') {
          this.type = ApplicationType[value as keyof typeof ApplicationType] ?? ApplicationType.UNKNOWN;
        } else 
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