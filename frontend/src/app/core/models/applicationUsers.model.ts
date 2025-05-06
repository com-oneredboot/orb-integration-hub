/**
 * ApplicationUsers model.
 */

// Import enums used in this model
import { ApplicationUserStatus } from './ApplicationUserStatus.enum';

// CreateInput
export type ApplicationUsersCreateInput = {
  user_id: string;
  role_id: string;
  status: ApplicationUserStatus;
  created_at: number;
  updated_at: number;
};

// UpdateInput
export type ApplicationUsersUpdateInput = Partial<IApplicationUsers>;

// QueryBy<PartitionKey>Input
export type ApplicationUsersQueryByApplicationIdInput = {
  application_id: string;
};

// QueryBy<SecondaryIndex>Input types
export type ApplicationUsersQueryByUserIdInput = {
  user_id: string;  application_id: string;};
export type ApplicationUsersQueryByApplicationIdInput = {
  application_id: string;  role_id: string;};
export type ApplicationUsersQueryByApplicationIdInput = {
  application_id: string;  status: string;};

// Response types
export type ApplicationUsersCreateResponse = {
  StatusCode: number;
  Message: string;
  Data: IApplicationUsers | null;
};
export type ApplicationUsersUpdateResponse = {
  StatusCode: number;
  Message: string;
  Data: IApplicationUsers | null;
};
export type ApplicationUsersResponse = {
  ApplicationUsersQueryByApplicationId: {
    StatusCode: number;
    Message: string;
    Data: IApplicationUsers | null;
  };
};

export interface IApplicationUsers {
  application_id: string;
  user_id: string;
  role_id: string;
  status: ApplicationUserStatus;
  created_at: number;
  updated_at: number;
}

export class ApplicationUsers implements IApplicationUsers {
  application_id: string = '';
  user_id: string = '';
  role_id: string = '';
  status: ApplicationUserStatus = ApplicationUserStatus.UNKNOWN;
  created_at: number = 0;
  updated_at: number = 0;

  constructor(data: Partial<IApplicationUsers> = {}) {
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
