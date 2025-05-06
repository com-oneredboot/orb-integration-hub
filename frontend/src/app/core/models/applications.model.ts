/**
 * Applications model.
 */

// Import enums used in this model
import { ApplicationStatus } from './ApplicationStatus.enum';

export interface IApplications {
  application_id: string;
  name: string;
  description: string;
  status: ApplicationStatus;
  created_at: number;
  updated_at: number;
  user_id: string;
}

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

// Response types
export type ApplicationsCreateResponse = {
  StatusCode: number;
  Message: string;
  Data: IApplications;
};
export type ApplicationsUpdateResponse = {
  StatusCode: number;
  Message: string;
  Data: IApplications;
};
export type ApplicationsResponse = {
  ApplicationsQueryByApplicationId: {
    StatusCode: number;
    Message: string;
    Data: IApplications;
  };
};

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
        if (Array.isArray(value) && this[key] instanceof Array && this[key].length === 0) {
          this[key] = value as typeof this[key];
        } else if (typeof value === 'string' && this[key] instanceof Object && 'UNKNOWN' in this[key]) {
          this[key] = (this[key] as any)[value] || (this[key] as any).UNKNOWN;
        } else {
          this[key] = value as any;
        }
      }
    });
  }
}