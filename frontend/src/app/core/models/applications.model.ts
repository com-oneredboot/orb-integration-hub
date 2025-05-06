/**
 * Applications model.
 */

// Import enums used in this model
import { ApplicationStatus } from './ApplicationStatus.enum';

// CreateInput
export type ApplicationsCreateInput = {
  applicationId: string;
  name: string;
  description: string;
  status: ApplicationStatus;
  createdAt: number;
  updatedAt: number;
  userId: string;
};

// UpdateInput
export type ApplicationsUpdateInput = Partial<IApplications>;

// QueryBy<PartitionKey>Input
// QueryBy<SecondaryIndex>Input types
export type ApplicationsQueryByApplicationIdInput = {
    applicationId: string;
};
export type ApplicationsQueryByNameInput = {
    name: string;
    applicationId?: string;
};

// Response types
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
export type ApplicationsResponse = {
  ApplicationsQueryByApplicationId: {
    statusCode: number;
    message: string;
    data: IApplications | null;
  };
};

export interface IApplications {
  applicationId: string;
  name: string;
  description: string;
  status: ApplicationStatus;
  createdAt: number;
  updatedAt: number;
  userId: string;
}

export class Applications implements IApplications {
  applicationId: string = '';
  name: string = '';
  description: string = '';
  status: ApplicationStatus = ApplicationStatus.UNKNOWN;
  createdAt: number = 0;
  updatedAt: number = 0;
  userId: string = '';

  constructor(data: Partial<IApplications> = {}) {
    Object.entries(data).forEach(([key, value]) => {
      if (key in this) {
        if (key === 'status' && typeof value === 'string') {
          this.status = ApplicationStatus[value as keyof typeof ApplicationStatus] ?? ApplicationStatus.UNKNOWN;
        } else 
        {
          this[key as keyof this] = value as any;
        }
      }
    });
  }
}
