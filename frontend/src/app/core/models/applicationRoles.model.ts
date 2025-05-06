/**
 * ApplicationRoles model.
 */

// Import enums used in this model
import { ApplicationRoleStatus } from './ApplicationRoleStatus.enum';

// CreateInput
export type ApplicationRolesCreateInput = {
  applicationId: string;
  roleId: string;
  description: string;
  status: ApplicationRoleStatus;
  createdAt: number;
  updatedAt: number;
};

// UpdateInput
export type ApplicationRolesUpdateInput = Partial<IApplicationRoles>;

// QueryBy<PartitionKey>Input
// QueryBy<SecondaryIndex>Input types
export type ApplicationRolesQueryByApplicationIdInput = {
    applicationId: string;
};
export type ApplicationRolesQueryByRoleIdInput = {
    roleId: string;
    applicationId?: string;
};

// Response types
export type ApplicationRolesCreateResponse = {
  statusCode: number;
  message: string;
  data: IApplicationRoles | null;
};
export type ApplicationRolesUpdateResponse = {
  statusCode: number;
  message: string;
  data: IApplicationRoles | null;
};
export type ApplicationRolesResponse = {
  ApplicationRolesQueryByApplicationId: {
    statusCode: number;
    message: string;
    data: IApplicationRoles | null;
  };
};

export interface IApplicationRoles {
  applicationId: string;
  roleId: string;
  description: string | undefined;
  status: ApplicationRoleStatus;
  createdAt: number;
  updatedAt: number;
}

export class ApplicationRoles implements IApplicationRoles {
  applicationId: string = '';
  roleId: string = '';
  description: string | undefined = '';
  status: ApplicationRoleStatus = ApplicationRoleStatus.UNKNOWN;
  createdAt: number = 0;
  updatedAt: number = 0;

  constructor(data: Partial<IApplicationRoles> = {}) {
    Object.entries(data).forEach(([key, value]) => {
      if (key in this) {
        if (key === 'status' && typeof value === 'string') {
          this.status = ApplicationRoleStatus[value as keyof typeof ApplicationRoleStatus] ?? ApplicationRoleStatus.UNKNOWN;
        } else 
        {
          this[key as keyof this] = value as any;
        }
      }
    });
  }
}
