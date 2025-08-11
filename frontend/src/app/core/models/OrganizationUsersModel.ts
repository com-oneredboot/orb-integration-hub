/**
 * OrganizationUsers model.
 */

// Import enums and models used in this model






import { OrganizationUserRole } from './OrganizationUserRoleEnum';



import { OrganizationUserStatus } from './OrganizationUserStatusEnum';











// CreateInput
export type OrganizationUsersCreateInput = {

  userId: string;

  organizationId: string;

  role: string;

  status: string;

  invitedBy: string | undefined;

  createdAt: number;

  updatedAt: number;

};

// UpdateInput
export type OrganizationUsersUpdateInput = {

  userId: string;

  organizationId: string;

  role: string;

  status: string;

  invitedBy: string | undefined;

  createdAt: number;

  updatedAt: number;

};

// QueryInput
export type OrganizationUsersQueryByOrganizationIdInput = {
  organizationId: string;
};


export type OrganizationUsersQueryByUserIdInput = {
  userId: string;
};

export type OrganizationUsersQueryByBothInput = {
  organizationId: string;
  userId: string;
};



export type OrganizationUsersQueryByUserIdInput = {
  userId: string;
};

export type OrganizationUsersQueryByOrganizationIdInput = {
  organizationId: string;
};


// Response types
export type OrganizationUsersResponse = {
  StatusCode: number;
  Message: string;
  Data: OrganizationUsers | null;
};

export type OrganizationUsersCreateResponse = {
  StatusCode: number;
  Message: string;
  Data: OrganizationUsers | null;
};

export type OrganizationUsersUpdateResponse = {
  StatusCode: number;
  Message: string;
  Data: OrganizationUsers | null;
};

export type OrganizationUsersListResponse = {
  StatusCode: number;
  Message: string;
  Data: OrganizationUsers[] | null;
};

// GraphQL Response Wrappers
export type OrganizationUsersCreateMutationResponse = {
  OrganizationUsersCreate: OrganizationUsersCreateResponse;
};

export type OrganizationUsersUpdateMutationResponse = {
  OrganizationUsersUpdate: OrganizationUsersUpdateResponse;
};

export type OrganizationUsersDeleteMutationResponse = {
  OrganizationUsersDelete: OrganizationUsersResponse;
};

export type OrganizationUsersQueryByOrganizationIdResponse = {
  OrganizationUsersQueryByOrganizationId: OrganizationUsersResponse;
};


export type OrganizationUsersQueryByUserIdResponse = {
  OrganizationUsersQueryByUserId: OrganizationUsersListResponse;
};

export type OrganizationUsersQueryByOrganizationIdResponse = {
  OrganizationUsersQueryByOrganizationId: OrganizationUsersListResponse;
};


export interface IOrganizationUsers {

  userId: string;

  organizationId: string;

  role: OrganizationUserRole;

  status: OrganizationUserStatus;

  invitedBy: string | undefined;

  createdAt: number;

  updatedAt: number;

}

export class OrganizationUsers implements IOrganizationUsers {

  userId = '';

  organizationId = '';

  role = OrganizationUserRole.ADMINISTRATOR;

  status = OrganizationUserStatus.ACTIVE;

  invitedBy = '';

  createdAt = 0;

  updatedAt = 0;


  constructor(data: Partial<IOrganizationUsers> = {}) {
    Object.entries(data).forEach(([key, value]) => {
      if (key in this) {






        if (key === 'role' && typeof value === 'string') {
          this.role = OrganizationUserRole[value as keyof typeof OrganizationUserRole] ?? OrganizationUserRole.ADMINISTRATOR;
        } else 



        if (key === 'status' && typeof value === 'string') {
          this.status = OrganizationUserStatus[value as keyof typeof OrganizationUserStatus] ?? OrganizationUserStatus.ACTIVE;
        } else 








        {
          this[key as keyof this] = value as this[keyof this];
        }
      }
    });
  }
} 