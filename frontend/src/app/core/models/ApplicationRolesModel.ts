/**
 * ApplicationRoles model.
 */

// Import enums and models used in this model












import { RoleType } from './RoleTypeEnum';





import { RoleStatus } from './RoleStatusEnum';









// CreateInput
export type ApplicationRolesCreateInput = {

  applicationRoleId: string;

  userId: string;

  applicationId: string;

  roleId: string;

  roleName: string;

  roleType: string;

  permissions: string[];

  status: string;

  createdAt: number;

  updatedAt: number;

};

// UpdateInput
export type ApplicationRolesUpdateInput = {

  applicationRoleId: string;

  userId: string;

  applicationId: string;

  roleId: string;

  roleName: string;

  roleType: string;

  permissions: string[];

  status: string;

  createdAt: number;

  updatedAt: number;

};

// QueryInput
export type ApplicationRolesQueryByApplicationRoleIdInput = {
  applicationRoleId: string;
};




export type ApplicationRolesQueryByUserIdInput = {
  userId: string;
};

export type ApplicationRolesQueryByApplicationIdInput = {
  applicationId: string;
};

export type ApplicationRolesQueryByRoleIdInput = {
  roleId: string;
};


// Response types
export type ApplicationRolesResponse = {
  StatusCode: number;
  Message: string;
  Data: ApplicationRoles | null;
};

export type ApplicationRolesCreateResponse = {
  StatusCode: number;
  Message: string;
  Data: ApplicationRoles | null;
};

export type ApplicationRolesUpdateResponse = {
  StatusCode: number;
  Message: string;
  Data: ApplicationRoles | null;
};

export type ApplicationRolesListResponse = {
  StatusCode: number;
  Message: string;
  Data: ApplicationRoles[] | null;
};

// GraphQL Response Wrappers
export type ApplicationRolesCreateMutationResponse = {
  ApplicationRolesCreate: ApplicationRolesCreateResponse;
};

export type ApplicationRolesUpdateMutationResponse = {
  ApplicationRolesUpdate: ApplicationRolesUpdateResponse;
};

export type ApplicationRolesDeleteMutationResponse = {
  ApplicationRolesDelete: ApplicationRolesResponse;
};

export type ApplicationRolesQueryByApplicationRoleIdResponse = {
  ApplicationRolesQueryByApplicationRoleId: ApplicationRolesResponse;
};


export type ApplicationRolesQueryByUserIdResponse = {
  ApplicationRolesQueryByUserId: ApplicationRolesListResponse;
};

export type ApplicationRolesQueryByApplicationIdResponse = {
  ApplicationRolesQueryByApplicationId: ApplicationRolesListResponse;
};

export type ApplicationRolesQueryByRoleIdResponse = {
  ApplicationRolesQueryByRoleId: ApplicationRolesListResponse;
};


export interface IApplicationRoles {

  applicationRoleId: string;

  userId: string;

  applicationId: string;

  roleId: string;

  roleName: string;

  roleType: RoleType;

  permissions: string[];

  status: RoleStatus;

  createdAt: number;

  updatedAt: number;

}

export class ApplicationRoles implements IApplicationRoles {

  applicationRoleId = '';

  userId = '';

  applicationId = '';

  roleId = '';

  roleName = '';

  roleType = RoleType.UNKNOWN;

  permissions = [];

  status = RoleStatus.UNKNOWN;

  createdAt = 0;

  updatedAt = 0;


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
          this[key as keyof this] = value as this[keyof this];
        }
      }
    });
  }
} 