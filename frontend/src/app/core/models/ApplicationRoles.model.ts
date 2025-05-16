/**
 *  DynamoDB model.
 */

/*
 * schema.table: 
 * schema.name: ApplicationRoles
 */

// Import enums and models used in this model












import { RoleType } from './RoleType.enum';





import { RoleStatus } from './RoleStatus.enum';








// CreateInput
export type ApplicationRolesCreateInput = {

  applicationRoleId: string;

  userId: string;

  applicationId: string;

  roleId: string;

  roleName: string;

  roleType: string;

  permissions: any[];

  status: string;

  createdAt: string;

  updatedAt: string;

};

// UpdateInput
export type ApplicationRolesUpdateInput = {

  applicationRoleId: string;

  userId: string;

  applicationId: string;

  roleId: string;

  roleName: string;

  roleType: string;

  permissions: any[];

  status: string;

  createdAt: string;

  updatedAt: string;

};

// QueryInput
// Primary key queries
export type ApplicationRolesQueryByApplicationRoleIdInput = {
  applicationRoleId: string;
};




// Secondary index queries


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
  statusCode: number;
  message: string;
  data: IApplicationRoles | null;
};

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

export interface IApplicationRoles {

  applicationRoleId: string;

  userId: string;

  applicationId: string;

  roleId: string;

  roleName: string;

  roleType: string;

  permissions: any[];

  status: string;

  createdAt: string;

  updatedAt: string;

}

export class ApplicationRoles implements IApplicationRoles {

  applicationRoleId = '';

  userId = '';

  applicationId = '';

  roleId = '';

  roleName = '';

  roleType = '';

  permissions = [];

  status = '';

  createdAt = '';

  updatedAt = '';


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