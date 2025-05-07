/**
 * ApplicationRoles model.
 */

// Import enums used in this model
import { RoleType } from './RoleType.enum';
import { RoleStatus } from './RoleStatus.enum';

// CreateInput
export type ApplicationRolesCreateInput = {
  roleId: string;
  userId: string;
  roleName: string;
  roleType: RoleType;
  permissions: string[];
  status: RoleStatus;
  createdAt: number;
  updatedAt: number;
};

// UpdateInput
export type ApplicationRolesUpdateInput = Partial<IApplicationRoles>;

// QueryBy<PartitionKey>Input
// QueryBy<SecondaryIndex>Input types
export type ApplicationRolesQueryByApplicationIdInput = {
    applicationId: string;
    roleId?: string;
};
export type ApplicationRolesQueryByUserIdInput = {
    userId: string;
    roleId?: string;
};
export type ApplicationRolesQueryByRoleIdInput = {
    roleId: string;
    roleType?: string;
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
  roleId: string;
  userId: string;
  applicationId: string;
  roleName: string;
  roleType: RoleType;
  permissions: string[];
  status: RoleStatus;
  createdAt: number;
  updatedAt: number;
}

export class ApplicationRoles implements IApplicationRoles {
  roleId: string = '';
  userId: string = '';
  applicationId: string = '';
  roleName: string = '';
  roleType: RoleType = RoleType.UNKNOWN;
  permissions: string[] = [];
  status: RoleStatus = RoleStatus.UNKNOWN;
  createdAt: number = 0;
  updatedAt: number = 0;

  constructor(data: Partial<IApplicationRoles> = {}) {
    Object.entries(data).forEach(([key, value]) => {
      if (key in this) {
        if (key === 'roleType' && typeof value === 'string') {
          this.roleType = RoleType[value as keyof typeof RoleType] ?? RoleType.UNKNOWN;
        } else 
        if (key === 'status' && typeof value === 'string') {
          this.status = RoleStatus[value as keyof typeof RoleStatus] ?? RoleStatus.UNKNOWN;
        } else 
        {
          this[key as keyof this] = value as any;
        }
      }
    });
  }
}
