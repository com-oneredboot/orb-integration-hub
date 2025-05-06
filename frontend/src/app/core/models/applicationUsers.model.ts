/**
 * ApplicationUsers model.
 */

// Import enums used in this model
import { ApplicationUserStatus } from './ApplicationUserStatus.enum';

// CreateInput
export type ApplicationUsersCreateInput = {
  applicationId: string;
  userId: string;
  roleId: string;
  status: ApplicationUserStatus;
  createdAt: number;
  updatedAt: number;
};

// UpdateInput
export type ApplicationUsersUpdateInput = Partial<IApplicationUsers>;

// QueryBy<PartitionKey>Input
// QueryBy<SecondaryIndex>Input types
export type ApplicationUsersQueryByApplicationIdInput = {
    applicationId: string;
    roleId?: string;
    status?: string;
};
export type ApplicationUsersQueryByUserIdInput = {
    userId: string;
    applicationId?: string;
};

// Response types
export type ApplicationUsersCreateResponse = {
  statusCode: number;
  message: string;
  data: IApplicationUsers | null;
};
export type ApplicationUsersUpdateResponse = {
  statusCode: number;
  message: string;
  data: IApplicationUsers | null;
};
export type ApplicationUsersResponse = {
  ApplicationUsersQueryByApplicationId: {
    statusCode: number;
    message: string;
    data: IApplicationUsers | null;
  };
};

export interface IApplicationUsers {
  applicationId: string;
  userId: string;
  roleId: string | undefined;
  status: ApplicationUserStatus;
  createdAt: number;
  updatedAt: number;
}

export class ApplicationUsers implements IApplicationUsers {
  applicationId: string = '';
  userId: string = '';
  roleId: string | undefined = '';
  status: ApplicationUserStatus = ApplicationUserStatus.UNKNOWN;
  createdAt: number = 0;
  updatedAt: number = 0;

  constructor(data: Partial<IApplicationUsers> = {}) {
    Object.entries(data).forEach(([key, value]) => {
      if (key in this) {
        if (key === 'status' && typeof value === 'string') {
          this.status = ApplicationUserStatus[value as keyof typeof ApplicationUserStatus] ?? ApplicationUserStatus.UNKNOWN;
        } else 
        {
          this[key as keyof this] = value as any;
        }
      }
    });
  }
}
