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
  createdAt: string;
  updatedAt: string;
};

// UpdateInput
export type OrganizationUsersUpdateInput = {
  userId: string;
  organizationId: string;
  role: string;
  status: string;
  invitedBy: string | undefined;
  createdAt: string;
  updatedAt: string;
};

// QueryInput
export type OrganizationUsersQueryByUserIdInput = {
  userId: string;
};

export type OrganizationUsersQueryByOrganizationIdInput = {
  organizationId: string;
};

export type OrganizationUsersQueryByBothInput = {
  userId: string;
  organizationId: string;
};

export type OrganizationUsersQueryByOrganizationIdInput = {
  organizationId: string;
};
export type OrganizationUsersQueryByUserIdInput = {
  userId: string;
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

export type OrganizationUsersQueryByUserIdResponse = {
  OrganizationUsersQueryByUserId: OrganizationUsersResponse;
};

export type OrganizationUsersQueryByOrganizationIdResponse = {
  OrganizationUsersQueryByOrganizationId: OrganizationUsersListResponse;
};
export type OrganizationUsersQueryByUserIdResponse = {
  OrganizationUsersQueryByUserId: OrganizationUsersListResponse;
};

export interface IOrganizationUsers {
  userId: string;
  organizationId: string;
  role: OrganizationUserRole;
  status: OrganizationUserStatus;
  invitedBy: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export class OrganizationUsers implements IOrganizationUsers {
  userId = '';
  organizationId = '';
  role = OrganizationUserRole.UNKNOWN;
  status = OrganizationUserStatus.UNKNOWN;
  invitedBy = '';
  createdAt = '';
  updatedAt = '';

  constructor(data: Partial<IOrganizationUsers> = {}) {
    Object.entries(data).forEach(([key, value]) => {
      if (key in this) {
        if (key === 'role' && typeof value === 'string') {
          this.role = OrganizationUserRole[value as keyof typeof OrganizationUserRole] ?? OrganizationUserRole.UNKNOWN;
        } else 
        if (key === 'status' && typeof value === 'string') {
          this.status = OrganizationUserStatus[value as keyof typeof OrganizationUserStatus] ?? OrganizationUserStatus.UNKNOWN;
        } else 
        {
          this[key as keyof this] = value as this[keyof this];
        }
      }
    });
  }
} 