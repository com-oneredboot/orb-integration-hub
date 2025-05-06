/**
 * Applications model.
 */

// Import enums used in this model
import { ApplicationStatus } from './ApplicationStatus.enum';

// CreateInput
export type ApplicationsCreateInput = {
  name: string;
  description: string;
  status: ApplicationStatus;
  created_at: number;
  updated_at: number;
  user_id: string;
};

// UpdateInput
export type ApplicationsUpdateInput = Partial<IApplications>;

// QueryBy<PartitionKey>Input
export type ApplicationsQueryByApplicationIdInput = {
  application_id: string;
};

// QueryBy<SecondaryIndex>Input types
export type ApplicationsQueryByNameInput = {
  name: string;  application_id: string;};

// Response types
export type ApplicationsCreateResponse = {
  StatusCode: number;
  Message: string;
  Data: IApplications | null;
};
export type ApplicationsUpdateResponse = {
  StatusCode: number;
  Message: string;
  Data: IApplications | null;
};
export type ApplicationsResponse = {
  ApplicationsQueryByApplicationId: {
    StatusCode: number;
    Message: string;
    Data: IApplications | null;
  };
};

export interface IApplications {
  application_id: string;
  name: string;
  description: string;
  status: ApplicationStatus;
  created_at: number;
  updated_at: number;
  user_id: string;
}

export class Applications implements IApplications {
  application_id: string = '';
  name: string = '';
  description: string = '';
  status: ApplicationStatus = ApplicationStatus.UNKNOWN;
  created_at: number = 0;
  updated_at: number = 0;
  user_id: string = '';

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
